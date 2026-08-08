// Vaenyx Library v2 — distribution reader (④).
//
// The community warehouse is published as static files on Cloudflare:
//   index.json                      the searchable catalogue (summaries only)
//   methods/<id>/{method.json,recipe.md,schema.json,manifest.json}
//   routines/<id>/{routine.json,manifest.json}
//
// The app reads ONLY this CDN, never GitHub. Browsing downloads the one small
// index; installing pulls just the chosen Routine and its Method dependencies and
// writes them into the local library — the hashed files (recipe/schema/manifest)
// byte-for-byte, with community provenance stamped onto the non-hashed identity
// files — so the existing loaders and the content-hash version lock accept them
// unchanged. fetch is injectable for tests.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type {
  CatalogueIndex,
  InstallRoutineResponse,
  LibraryMethod,
  LibraryMethodSummary,
  LibraryRoutineSummary,
} from "@vaenyx/contracts";

import { loadMethod, toLibraryMethod } from "./methods.js";
import { loadRoutine, toLibraryRoutine } from "./routines.js";

type FetchLike = typeof fetch;

// The fixed file contract (mirrors methods.ts / routines.ts). manifest is the
// only optional file; examples are not pulled at install time (v1).
const METHOD_REQUIRED = ["method.json", "recipe.md", "schema.json"] as const;

// ids come from the (untrusted) catalogue and client. Constrain them to the slug
// shape createMethod/createRoutineFromPlan emit, so they can never escape the
// library directory or inject into the CDN path when interpolated.
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

function assertSafeId(id: string): void {
  if (!SAFE_ID.test(id)) {
    throw new Error(`BAD_ID:${id}`);
  }
}

// Stamp "community" provenance onto an installed item's identity file
// (method.json / routine.json). Neither is byte-hashed — the method hash covers
// recipe/schema/manifest + version, and the routine hash is rebuilt from parsed
// fields — so adding this key never shifts a content hash or breaks a version
// lock. Every other (hashed) file is returned unchanged, byte-for-byte.
function stampCommunityOrigin(file: string, text: string): string {
  if (file !== "method.json" && file !== "routine.json") {
    return text;
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return `${JSON.stringify({ ...parsed, origin: "community" }, null, 2)}\n`;
  } catch {
    // Unparseable identity file — leave it as-is; the loader will skip the item.
    return text;
  }
}

// Fetch one file. A 404 is "absent": fatal for a required file, fine (null) for
// an optional one. Any other non-OK status, or an unreachable host, throws.
async function fetchFile(
  fetchImpl: FetchLike,
  url: string,
  required: boolean,
  signal?: AbortSignal,
): Promise<string | null> {
  let response: Response;
  try {
    response = await fetchImpl(url, { signal });
  } catch (error) {
    throw new Error(`CATALOGUE_UNREACHABLE:${url}`, { cause: error });
  }
  if (response.status === 404) {
    if (required) throw new Error(`MISSING_FILE:${url}`);
    return null;
  }
  if (!response.ok) {
    throw new Error(`FETCH_FAILED:${response.status}:${url}`);
  }
  return await response.text();
}

// Download + parse the single catalogue index. The shape is normalised
// defensively, so a malformed CDN file degrades to an empty catalogue.
export async function fetchCatalogue(
  baseUrl: string,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<CatalogueIndex> {
  const raw = await fetchFile(fetchImpl, `${baseUrl}/index.json`, true, signal);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "{}");
  } catch {
    return { schemaVersion: 1, methods: [], routines: [] };
  }
  const record = (parsed ?? {}) as Record<string, unknown>;
  return {
    schemaVersion:
      typeof record.schemaVersion === "number" ? record.schemaVersion : 1,
    methods: Array.isArray(record.methods)
      ? (record.methods as LibraryMethodSummary[])
      : [],
    routines: Array.isArray(record.routines)
      ? (record.routines as LibraryRoutineSummary[])
      : [],
  };
}

// Download one Method's fixed files from the catalogue and write them into the
// local library, community provenance stamped onto the identity file. Assumes the
// id is validated and the Method is not already installed. Shared by the Routine
// dependency install and the standalone Method install.
async function downloadMethod(
  fetchImpl: FetchLike,
  baseUrl: string,
  libraryDirectory: string,
  methodId: string,
  signal?: AbortSignal,
  // Where to write. An update downloads into a scratch folder first so a
  // failure part way through cannot leave a half-replaced Method on disk —
  // the shape that loads fine and then behaves like neither version.
  targetDirectory?: string,
): Promise<void> {
  const files: Record<string, string> = {};
  for (const file of METHOD_REQUIRED) {
    files[file] = (await fetchFile(
      fetchImpl,
      `${baseUrl}/methods/${methodId}/${file}`,
      true,
      signal,
    )) as string;
  }
  const manifest = await fetchFile(
    fetchImpl,
    `${baseUrl}/methods/${methodId}/manifest.json`,
    false,
    signal,
  );
  if (manifest !== null) files["manifest.json"] = manifest;

  const methodDir = targetDirectory ?? join(libraryDirectory, methodId);
  mkdirSync(methodDir, { recursive: true });
  for (const [file, text] of Object.entries(files)) {
    writeFileSync(join(methodDir, file), stampCommunityOrigin(file, text), "utf8");
  }
}

// Install one catalogue Method on its own — the same download the Routine
// installer runs for each dependency, exposed directly so a Method can be pulled
// as a reusable building block. Loaded back through the normal loader so the
// content hash is computed the usual way.
//
// NEVER call this on a timer, on startup, or from a "keep my community items up
// to date" setting. Installing is the Owner's deliberate act, every time,
// including for an update (copy pack D6). An author who can change a repository
// still cannot reach anyone's machine — that gap is the strongest safety
// property Vaenyx has, and it exists only because nothing here runs by itself.
// When content genuinely must stop being used, that is a takedown plus index
// removal (ToS 8.5), which the operator controls and the author does not.
export async function installMethod(
  baseUrl: string,
  libraryDirectory: string,
  methodId: string,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<LibraryMethod> {
  assertSafeId(methodId);

  // Never clobber a Method the user already has (their local copy may be edited).
  if (loadMethod(libraryDirectory, methodId)) {
    throw new Error(`METHOD_EXISTS:${methodId}`);
  }

  await downloadMethod(fetchImpl, baseUrl, libraryDirectory, methodId, signal);

  const method = loadMethod(libraryDirectory, methodId);
  if (!method) {
    throw new Error(`INSTALL_LOAD_FAILED:${methodId}`);
  }
  return toLibraryMethod(method);
}

// Install one catalogue Routine and its Method dependencies into the local
// library. Order matters: deps land first, then the Routine folder, then it is
// loaded back through the normal loader so deps resolve + the hash is computed.
export async function installRoutine(
  baseUrl: string,
  routinesDirectory: string,
  libraryDirectory: string,
  routineId: string,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<InstallRoutineResponse> {
  assertSafeId(routineId);

  // Never clobber a Routine the user already has (their local copy may be
  // edited). Re-installing is an explicit delete-then-install.
  if (existsSync(join(routinesDirectory, routineId))) {
    throw new Error(`ROUTINE_EXISTS:${routineId}`);
  }

  // 1. Pull the Routine's own files first, so we know its declared deps.
  const routineJson = await fetchFile(
    fetchImpl,
    `${baseUrl}/routines/${routineId}/routine.json`,
    true,
    signal,
  );
  const routineManifest = await fetchFile(
    fetchImpl,
    `${baseUrl}/routines/${routineId}/manifest.json`,
    false,
    signal,
  );

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(routineJson ?? "{}") as Record<string, unknown>;
  } catch (error) {
    throw new Error(`ROUTINE_PARSE_FAILED:${routineId}`, { cause: error });
  }
  const deps = Array.isArray(meta.deps) ? meta.deps : [];

  // 2. Download each dependency Method not already installed (reuse local ones).
  const installedMethods: string[] = [];
  const skippedMethods: string[] = [];
  for (const dep of deps) {
    const methodId =
      dep && typeof dep === "object"
        ? (dep as Record<string, unknown>).methodId
        : undefined;
    if (typeof methodId !== "string") continue;
    assertSafeId(methodId);

    if (loadMethod(libraryDirectory, methodId)) {
      skippedMethods.push(methodId);
      continue;
    }

    await downloadMethod(fetchImpl, baseUrl, libraryDirectory, methodId, signal);
    installedMethods.push(methodId);
  }

  // 3. Write the Routine folder (only after every dep is on disk).
  const routineDir = join(routinesDirectory, routineId);
  mkdirSync(routineDir, { recursive: true });
  writeFileSync(
    join(routineDir, "routine.json"),
    stampCommunityOrigin("routine.json", routineJson as string),
    "utf8",
  );
  if (routineManifest !== null) {
    writeFileSync(join(routineDir, "manifest.json"), routineManifest, "utf8");
  }

  // 4. Load it back the normal way: resolves deps + computes the content hash.
  const routine = loadRoutine(routinesDirectory, libraryDirectory, routineId);
  if (!routine) {
    throw new Error(`INSTALL_LOAD_FAILED:${routineId}`);
  }

  return {
    routine: toLibraryRoutine(routine),
    installedMethods,
    skippedMethods,
  };
}

// UPDATING A COMMUNITY METHOD — the path that did not exist.
//
// installMethod refuses point-blank when the folder is already there, which is
// right for an install and left "update" with nowhere to go: the front end has
// had the whole update-detection UI for months, and its button called the
// install endpoint and therefore always answered 409. The feature was complete
// on screen and absent underneath.
//
// The difference between this and install is not the download. It is the two
// things that happen around it: the outgoing version is kept so the Owner can
// go back without a network, and the Owner's examples are left exactly where
// they are. A recipe belongs to its author; the examples never did.
export async function updateMethod(
  baseUrl: string,
  libraryDirectory: string,
  methodId: string,
  options: {
    /** Called with the current folder before it is replaced, so the caller can
     *  keep a way back. Separated out because catalogue.ts has no database. */
    keepRollback: (folder: string) => void;
    signal?: AbortSignal;
  },
  fetchImpl: FetchLike = fetch,
): Promise<LibraryMethod> {
  assertSafeId(methodId);
  const folder = join(libraryDirectory, methodId);
  if (!existsSync(folder)) {
    throw new Error(`METHOD_MISSING:${methodId}`);
  }

  // A way back FIRST. If the download fails half way, the copy on disk is
  // still the one that was working.
  options.keepRollback(folder);

  // Downloaded into a scratch folder and moved into place, so a failure part
  // way through cannot leave a half-updated Method behind — the shape that
  // would pass the loader and fail at run time.
  const staging = join(libraryDirectory, `.updating-${methodId}`);
  rmSync(staging, { force: true, recursive: true });
  try {
    await downloadMethod(fetchImpl, baseUrl, libraryDirectory, methodId, options.signal, staging);
    // The Owner's examples stay: they are theirs, they are not in the author's
    // package, and they are the regression suite the new version has to pass.
    const examples = join(folder, "examples");
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.name === "examples") continue;
      rmSync(join(folder, entry.name), { force: true, recursive: true });
    }
    for (const entry of readdirSync(staging, { withFileTypes: true })) {
      if (entry.name === "examples") continue;
      renameSync(join(staging, entry.name), join(folder, entry.name));
    }
    void examples;
  } finally {
    rmSync(staging, { force: true, recursive: true });
  }

  const method = loadMethod(libraryDirectory, methodId);
  if (!method) throw new Error(`UPDATE_LOAD_FAILED:${methodId}`);
  return toLibraryMethod(method);
}

// UPDATING A COMMUNITY ROUTINE.
//
// This was missing and the gap was not theoretical: the update dialog offered
// the button for Routines too, and it called installRoutine, which refuses
// when the folder is already there. Every press answered 409.
//
// A Routine is not one file, so updating it is not one download:
//
//   • its own routine.json pins the VERSION of each Method it uses, so the
//     new Routine may need Methods the machine does not have yet, or newer
//     copies of ones it does
//   • a Method that some OTHER Routine also uses must not be quietly moved
//     underneath it — that Routine's author never tested the new one
//
// So: the Routine folder is replaced, missing dependencies are downloaded, and
// a dependency that is already installed is LEFT ALONE and reported. The Owner
// updates those deliberately, one at a time, seeing each one's consequences —
// which is the same rule as everywhere else here, for the same reason.
export async function updateRoutine(
  baseUrl: string,
  routinesDirectory: string,
  libraryDirectory: string,
  routineId: string,
  options: {
    keepRollback: (folder: string) => void;
    signal?: AbortSignal;
  },
  fetchImpl: FetchLike = fetch,
): Promise<InstallRoutineResponse> {
  assertSafeId(routineId);
  const routineDir = join(routinesDirectory, routineId);
  if (!existsSync(routineDir)) {
    throw new Error(`ROUTINE_MISSING:${routineId}`);
  }

  // A way back FIRST: if the download dies half way, what is on disk is still
  // the version that was working.
  options.keepRollback(routineDir);

  const routineJson = await fetchFile(
    fetchImpl,
    `${baseUrl}/routines/${routineId}/routine.json`,
    true,
    options.signal,
  );
  const routineManifest = await fetchFile(
    fetchImpl,
    `${baseUrl}/routines/${routineId}/manifest.json`,
    false,
    options.signal,
  );

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(routineJson ?? "{}") as Record<string, unknown>;
  } catch (error) {
    throw new Error(`ROUTINE_PARSE_FAILED:${routineId}`, { cause: error });
  }

  const installedMethods: string[] = [];
  const skippedMethods: string[] = [];
  for (const dep of Array.isArray(meta.deps) ? meta.deps : []) {
    const methodId =
      dep && typeof dep === "object"
        ? (dep as Record<string, unknown>).methodId
        : undefined;
    if (typeof methodId !== "string") continue;
    assertSafeId(methodId);
    if (loadMethod(libraryDirectory, methodId)) {
      // Already here. NOT overwritten: another Routine may depend on this
      // exact version, and the Owner's own examples live in it.
      skippedMethods.push(methodId);
      continue;
    }
    await downloadMethod(fetchImpl, baseUrl, libraryDirectory, methodId, options.signal);
    installedMethods.push(methodId);
  }

  mkdirSync(routineDir, { recursive: true });
  writeFileSync(
    join(routineDir, "routine.json"),
    stampCommunityOrigin("routine.json", routineJson as string),
    "utf8",
  );
  if (routineManifest !== null) {
    writeFileSync(join(routineDir, "manifest.json"), routineManifest, "utf8");
  }

  const routine = loadRoutine(routinesDirectory, libraryDirectory, routineId);
  if (!routine) throw new Error(`UPDATE_LOAD_FAILED:${routineId}`);
  return {
    routine: toLibraryRoutine(routine),
    installedMethods,
    skippedMethods,
  };
}
