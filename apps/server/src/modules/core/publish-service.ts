// Client for the operator-hosted core-cloud publish service. When
// config.publishServiceUrl is set, publishing goes through here: the Owner's
// stored session token authenticates, the service holds the bot token and
// commits on their behalf. The token lives in publish_service_session (local,
// owner-scoped) and only ever leaves as a Bearer header to the service.
import type { DatabaseHandle } from "../../db/database.js";

import type { CommitFile } from "./publish.js";

export interface ServiceIdentity {
  displayName: string;
  banned: boolean;
}

export interface ServicePublishInput {
  kind: "method" | "routine";
  itemId: string;
  version: string;
  contentHash: string;
  files: CommitFile[];
  // G2/G2a acceptance carried by every publish (copy pack clause 2.3; the
  // service enforces it and records the rows server-side after success).
  acceptance: {
    copyVersion: string;
    language: string;
    agreementVersion?: string;
    warrantyConfirmed: true;
  };
}

// --- session token storage (one row per owner) ---

export function getServiceSession(
  database: DatabaseHandle,
  ownerId: string,
): { token: string; displayName: string } | null {
  const row = database.sqlite
    .prepare(
      "SELECT token, display_name FROM publish_service_session WHERE owner_id = ?",
    )
    .get(ownerId) as { token: string; display_name: string } | undefined;
  return row ? { token: row.token, displayName: row.display_name } : null;
}

export function saveServiceSession(
  database: DatabaseHandle,
  ownerId: string,
  token: string,
  displayName: string,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO publish_service_session (owner_id, token, display_name)
       VALUES (?, ?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET
         token = excluded.token,
         display_name = excluded.display_name,
         created_at = CURRENT_TIMESTAMP`,
    )
    .run(ownerId, token, displayName);
}

export function clearServiceSession(
  database: DatabaseHandle,
  ownerId: string,
): void {
  database.sqlite
    .prepare("DELETE FROM publish_service_session WHERE owner_id = ?")
    .run(ownerId);
}

// --- service calls ---

// GET /me — confirm the token is still valid and read the current display name.
// Null = not authenticated / service unreachable.
export async function fetchServiceIdentity(
  serviceUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ServiceIdentity | null> {
  try {
    const res = await fetchImpl(`${serviceUrl}/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      displayName?: unknown;
      banned?: unknown;
    };
    if (typeof data.displayName !== "string") return null;
    return { displayName: data.displayName, banned: Boolean(data.banned) };
  } catch {
    return null;
  }
}

// GET/POST /admin/publishing — the operator's emergency stop. Paused means the
// service refuses every publish, the operator's own included. It lives on the
// service, not in a deploy, so stopping abuse is a switch rather than a release.
export async function fetchPublishingPause(
  serviceUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ paused: boolean; envOverride: boolean } | null> {
  try {
    const res = await fetchImpl(`${serviceUrl}/admin/publishing`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      paused?: unknown;
      envOverride?: unknown;
    };
    return {
      paused: Boolean(data.paused),
      envOverride: Boolean(data.envOverride),
    };
  } catch {
    return null;
  }
}

export async function setPublishingPause(
  serviceUrl: string,
  token: string,
  paused: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const res = await fetchImpl(`${serviceUrl}/admin/publishing`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ paused }),
  });
  if (!res.ok) throw new Error("PUBLISH_PAUSE_FAILED");
  return paused;
}

// POST /publish — hand the collected declarative files to the service, which
// stamps the byline, commits with the bot token, and returns the commit sha.
export async function publishViaService(
  serviceUrl: string,
  token: string,
  input: ServicePublishInput,
  fetchImpl: typeof fetch = fetch,
): Promise<{ commitSha: string; url: string }> {
  const res = await fetchImpl(`${serviceUrl}/publish`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SERVICE_PUBLISH_${res.status}:${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { commitSha?: unknown; url?: unknown };
  if (typeof data.commitSha !== "string") {
    throw new Error("SERVICE_PUBLISH_NO_SHA");
  }
  return {
    commitSha: data.commitSha,
    url: typeof data.url === "string" ? data.url : "",
  };
}

// GET /acceptance — the account's recorded publish-flow acceptances (latest per
// key). Null = the route does not exist (an older deployed service) — callers
// skip the ensure step, matching that build's non-enforcement. Any OTHER
// failure (network, 5xx, malformed body) returns "unavailable" so callers block
// with a retryable error instead of silently skipping the consent check.
export async function fetchServiceAcceptances(
  serviceUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Array<{ keyName: string; copyVersion: string }> | null | "unavailable"> {
  try {
    const res = await fetchImpl(`${serviceUrl}/acceptance`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { records?: unknown };
    if (!Array.isArray(data.records)) return "unavailable";
    return (data.records as Array<{ keyName?: unknown; copyVersion?: unknown }>)
      .filter(
        (row) =>
          typeof row.keyName === "string" && typeof row.copyVersion === "string",
      )
      .map((row) => ({
        keyName: row.keyName as string,
        copyVersion: row.copyVersion as string,
      }));
  } catch {
    return "unavailable";
  }
}

// POST /acceptance — record one publish-flow acceptance (e.g. the G3a overseas
// consent) against the signed-in account.
export async function recordServiceAcceptance(
  serviceUrl: string,
  token: string,
  input: {
    keyName: string;
    copyVersion: string;
    language: string;
    agreementVersion?: string;
    contributionId?: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`${serviceUrl}/acceptance`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// PATCH /me — change the public display name (the community byline). Returns the
// saved name.
export async function updateServiceDisplayName(
  serviceUrl: string,
  token: string,
  displayName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${serviceUrl}/me`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SERVICE_DISPLAY_NAME_${res.status}:${text.slice(0, 120)}`);
  }
  const data = (await res.json()) as { displayName?: unknown };
  return typeof data.displayName === "string" ? data.displayName : displayName;
}
