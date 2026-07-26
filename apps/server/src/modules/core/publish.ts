// Publishing a Method to the community warehouse (library-architecture §16). The
// backend commits the Method's declarative files (read byte-for-byte from disk, so
// the published copy hashes identically to the local one) plus an updated index.json
// to the GitHub warehouse, attributed to the Owner's linked Google identity. The
// app only ever READS the warehouse via Cloudflare; this is the one write path, and
// it is Owner-only. Personal correction data is never published — only the recipe,
// schemas and manifest.

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PublishCredentials } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";

import type { PublisherIdentityRow } from "./google-auth.js";
import { loadMethod } from "./methods.js";
import { loadRoutine } from "./routines.js";

type FetchLike = typeof fetch;

const GH_API = "https://api.github.com";

export interface CommitFile {
  path: string;
  content: string;
}

export interface PublishResult {
  itemId: string;
  version: string;
  contentHash: string;
  commitSha: string;
  url: string;
}

async function gh<T>(
  fetchImpl: FetchLike,
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetchImpl(`${GH_API}${path}`, {
    method,
    headers: {
      authorization: `token ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "vaenyx-publish",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GITHUB_${response.status}:${path}:${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

async function getDefaultBranch(
  fetchImpl: FetchLike,
  token: string,
  repo: string,
): Promise<string> {
  const info = await gh<{ default_branch?: string }>(
    fetchImpl,
    token,
    "GET",
    `/repos/${repo}`,
  );
  return info.default_branch || "main";
}

// One atomic commit of several files via the Git Data API (blobs inlined into the
// tree): get ref -> base tree -> new tree -> new commit -> move the branch ref.
async function commitFiles(
  fetchImpl: FetchLike,
  credentials: PublishCredentials,
  branch: string,
  files: CommitFile[],
  message: string,
  author: { name: string; email: string },
): Promise<string> {
  const token = credentials.githubToken;
  const repo = credentials.warehouseRepo;

  const ref = await gh<{ object: { sha: string } }>(
    fetchImpl,
    token,
    "GET",
    `/repos/${repo}/git/ref/heads/${branch}`,
  );
  const baseCommitSha = ref.object.sha;
  const baseCommit = await gh<{ tree: { sha: string } }>(
    fetchImpl,
    token,
    "GET",
    `/repos/${repo}/git/commits/${baseCommitSha}`,
  );
  const tree = await gh<{ sha: string }>(
    fetchImpl,
    token,
    "POST",
    `/repos/${repo}/git/trees`,
    {
      base_tree: baseCommit.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content,
      })),
    },
  );
  const commit = await gh<{ sha: string }>(
    fetchImpl,
    token,
    "POST",
    `/repos/${repo}/git/commits`,
    {
      message,
      tree: tree.sha,
      parents: [baseCommitSha],
      author: {
        name: author.name,
        email: author.email || "noreply@vaenyx.local",
        date: new Date().toISOString(),
      },
    },
  );
  await gh(fetchImpl, token, "PATCH", `/repos/${repo}/git/refs/heads/${branch}`, {
    sha: commit.sha,
  });
  return commit.sha;
}

export interface PublishMethodParams {
  credentials: PublishCredentials;
  libraryDirectory: string;
  catalogueBaseUrl: string;
}

export async function publishMethod(
  params: PublishMethodParams,
  database: DatabaseHandle,
  methodId: string,
  identity: PublisherIdentityRow,
  fetchImpl: FetchLike = fetch,
): Promise<PublishResult> {
  const method = loadMethod(params.libraryDirectory, methodId);
  if (!method) throw new Error(`METHOD_NOT_FOUND:${methodId}`);

  // Hashed files byte-for-byte; method.json stamped with the publisher as owner
  // (not hashed). The warehouse Action rebuilds index.json itself.
  const files = collectMethodFiles(
    params.libraryDirectory,
    methodId,
    identity.name,
  );

  const branch = await getDefaultBranch(
    fetchImpl,
    params.credentials.githubToken,
    params.credentials.warehouseRepo,
  );

  const commitSha = await commitFiles(
    fetchImpl,
    params.credentials,
    branch,
    files,
    `Publish method ${method.id} v${method.version} (by ${identity.name})`,
    { name: identity.name, email: identity.email },
  );

  // Record locally for the "Published" badge + change detection.
  recordPublished(
    database,
    "method",
    method.id,
    method.contentHash,
    identity,
    commitSha,
  );

  return {
    itemId: method.id,
    version: method.version,
    contentHash: method.contentHash,
    commitSha,
    url: params.catalogueBaseUrl,
  };
}

// Collect a method's publishable files: hashed files byte-for-byte + method.json
// with the publisher stamped as `owner` (method.json is not hashed, so this never
// shifts the content hash). Used both for a method publish and for a routine's
// dependency methods.
export function collectMethodFiles(
  libraryDirectory: string,
  methodId: string,
  ownerName: string,
): CommitFile[] {
  const dir = join(libraryDirectory, methodId);
  const files: CommitFile[] = [];
  for (const file of ["recipe.md", "schema.json"]) {
    files.push({
      path: `methods/${methodId}/${file}`,
      content: readFileSync(join(dir, file), "utf8"),
    });
  }
  const manifestPath = join(dir, "manifest.json");
  if (existsSync(manifestPath)) {
    files.push({
      path: `methods/${methodId}/manifest.json`,
      content: readFileSync(manifestPath, "utf8"),
    });
  }
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(
      readFileSync(join(dir, "method.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    meta = {};
  }
  meta.owner = ownerName;
  files.push({
    path: `methods/${methodId}/method.json`,
    content: `${JSON.stringify(meta, null, 2)}\n`,
  });
  return files;
}

function recordPublished(
  database: DatabaseHandle,
  kind: "method" | "routine",
  itemId: string,
  contentHash: string,
  identity: PublisherIdentityRow,
  commitSha: string,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO published_items (
        id, kind, item_id, content_hash, publisher_identity_id, publisher_name, commit_sha
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(kind, item_id) DO UPDATE SET
        content_hash = excluded.content_hash,
        publisher_identity_id = excluded.publisher_identity_id,
        publisher_name = excluded.publisher_name,
        commit_sha = excluded.commit_sha,
        published_at = CURRENT_TIMESTAMP`,
    )
    .run(
      randomUUID(),
      kind,
      itemId,
      contentHash,
      identity.id,
      identity.name,
      commitSha,
    );
}

export interface PublishRoutineParams {
  credentials: PublishCredentials;
  libraryDirectory: string;
  routinesDirectory: string;
  catalogueBaseUrl: string;
}

// Publish a Routine + its dependency Methods to the warehouse, so the whole thing
// installs from the store. routine.json/method.json get the publisher stamped as
// owner (not hashed); the warehouse Action rebuilds index.json.
export async function publishRoutine(
  params: PublishRoutineParams,
  database: DatabaseHandle,
  routineId: string,
  identity: PublisherIdentityRow,
  fetchImpl: FetchLike = fetch,
): Promise<PublishResult> {
  const routine = loadRoutine(
    params.routinesDirectory,
    params.libraryDirectory,
    routineId,
  );
  if (!routine) throw new Error(`ROUTINE_NOT_FOUND:${routineId}`);
  if (!routine.resolved) {
    throw new Error(`ROUTINE_UNRESOLVED:${routine.missingDeps.join(",")}`);
  }

  const files: CommitFile[] = [];
  // routine.json with owner stamped (owner is not part of the routine hash).
  const rdir = join(params.routinesDirectory, routineId);
  let rmeta: Record<string, unknown>;
  try {
    rmeta = JSON.parse(
      readFileSync(join(rdir, "routine.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    rmeta = {};
  }
  rmeta.owner = identity.name;
  files.push({
    path: `routines/${routineId}/routine.json`,
    content: `${JSON.stringify(rmeta, null, 2)}\n`,
  });
  const rManifest = join(rdir, "manifest.json");
  if (existsSync(rManifest)) {
    files.push({
      path: `routines/${routineId}/manifest.json`,
      content: readFileSync(rManifest, "utf8"),
    });
  }

  // Publish each dependency Method alongside, so the Routine resolves on install.
  const depMethods: { id: string; contentHash: string }[] = [];
  for (const dep of routine.deps) {
    const depMethod = loadMethod(params.libraryDirectory, dep.methodId);
    if (!depMethod) throw new Error(`METHOD_NOT_FOUND:${dep.methodId}`);
    files.push(
      ...collectMethodFiles(
        params.libraryDirectory,
        dep.methodId,
        identity.name,
      ),
    );
    depMethods.push({ id: dep.methodId, contentHash: depMethod.contentHash });
  }

  const branch = await getDefaultBranch(
    fetchImpl,
    params.credentials.githubToken,
    params.credentials.warehouseRepo,
  );
  const commitSha = await commitFiles(
    fetchImpl,
    params.credentials,
    branch,
    files,
    `Publish routine ${routine.id} v${routine.version} (by ${identity.name})`,
    { name: identity.name, email: identity.email },
  );

  recordPublished(
    database,
    "routine",
    routine.id,
    routine.contentHash,
    identity,
    commitSha,
  );
  for (const dep of depMethods) {
    recordPublished(database, "method", dep.id, dep.contentHash, identity, commitSha);
  }

  return {
    itemId: routine.id,
    version: routine.version,
    contentHash: routine.contentHash,
    commitSha,
    url: params.catalogueBaseUrl,
  };
}

export function listPublishedIds(
  database: DatabaseHandle,
  kind: "method" | "routine",
): string[] {
  return (
    database.sqlite
      .prepare(
        "SELECT item_id FROM published_items WHERE kind = ? ORDER BY item_id",
      )
      .all(kind) as { item_id: string }[]
  ).map((row) => row.item_id);
}

// Published items whose local copy has since changed (copy pack G5). The hash
// recorded at publish time is compared with what the files hash to now, so an
// edited Method shows "changed since you published it" instead of looking
// identical to the version the community actually has. Publishing again is the
// Owner's call and theirs alone: an edit must never publish itself, because
// every publication is a fresh acceptance of the Contributor Agreement.
export function listStalePublishedIds(
  database: DatabaseHandle,
  kind: "method" | "routine",
  currentHash: (id: string) => string | null,
): string[] {
  const rows = database.sqlite
    .prepare(
      "SELECT item_id, content_hash FROM published_items WHERE kind = ? ORDER BY item_id",
    )
    .all(kind) as { item_id: string; content_hash: string }[];
  return rows
    .filter((row) => {
      const local = currentHash(row.item_id);
      // Gone from the library: nothing to compare, and nothing to republish.
      return local !== null && local !== row.content_hash;
    })
    .map((row) => row.item_id);
}

// --- Central publish service path (core-cloud) --------------------------------
// When config.publishServiceUrl is set, the app collects the same declarative
// files but hands them to the operator-hosted service (which holds the bot token)
// instead of committing directly. These helpers expose the collection + local
// recording for that path, leaving the operator-direct functions above untouched.

export interface RoutineFiles {
  files: CommitFile[];
  version: string;
  contentHash: string;
  depMethods: { id: string; contentHash: string }[];
}

// Collect a routine's publishable files (routine.json stamped + optional manifest
// + every dependency method) without committing. Same shape publishRoutine sends
// to GitHub. Throws ROUTINE_NOT_FOUND / ROUTINE_UNRESOLVED / METHOD_NOT_FOUND.
export function collectRoutineFiles(
  routinesDirectory: string,
  libraryDirectory: string,
  routineId: string,
  publisherName: string,
): RoutineFiles {
  const routine = loadRoutine(routinesDirectory, libraryDirectory, routineId);
  if (!routine) throw new Error(`ROUTINE_NOT_FOUND:${routineId}`);
  if (!routine.resolved) {
    throw new Error(`ROUTINE_UNRESOLVED:${routine.missingDeps.join(",")}`);
  }

  const files: CommitFile[] = [];
  const rdir = join(routinesDirectory, routineId);
  let rmeta: Record<string, unknown>;
  try {
    rmeta = JSON.parse(
      readFileSync(join(rdir, "routine.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    rmeta = {};
  }
  rmeta.owner = publisherName;
  files.push({
    path: `routines/${routineId}/routine.json`,
    content: `${JSON.stringify(rmeta, null, 2)}\n`,
  });
  const rManifest = join(rdir, "manifest.json");
  if (existsSync(rManifest)) {
    files.push({
      path: `routines/${routineId}/manifest.json`,
      content: readFileSync(rManifest, "utf8"),
    });
  }

  const depMethods: { id: string; contentHash: string }[] = [];
  for (const dep of routine.deps) {
    const depMethod = loadMethod(libraryDirectory, dep.methodId);
    if (!depMethod) throw new Error(`METHOD_NOT_FOUND:${dep.methodId}`);
    files.push(...collectMethodFiles(libraryDirectory, dep.methodId, publisherName));
    depMethods.push({ id: dep.methodId, contentHash: depMethod.contentHash });
  }

  return {
    files,
    version: routine.version,
    contentHash: routine.contentHash,
    depMethods,
  };
}

// Record a service-published item locally so the "Published" badge works. The
// identity lives in the central service, so publisher_identity_id is null and
// only the public display name is stored.
export function recordServicePublish(
  database: DatabaseHandle,
  kind: "method" | "routine",
  itemId: string,
  contentHash: string,
  publisherName: string,
  commitSha: string,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO published_items (
        id, kind, item_id, content_hash, publisher_identity_id, publisher_name, commit_sha
      ) VALUES (?, ?, ?, ?, NULL, ?, ?)
      ON CONFLICT(kind, item_id) DO UPDATE SET
        content_hash = excluded.content_hash,
        publisher_identity_id = excluded.publisher_identity_id,
        publisher_name = excluded.publisher_name,
        commit_sha = excluded.commit_sha,
        published_at = CURRENT_TIMESTAMP`,
    )
    .run(randomUUID(), kind, itemId, contentHash, publisherName, commitSha);
}
