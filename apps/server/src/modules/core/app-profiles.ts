import { createHash, randomBytes, randomUUID } from "node:crypto";

import type {
  AppProfile,
  AppProfileKind,
  CreateAppProfileRequest,
  CreateAppProfileResponse,
  UpdateAppProfileRequest,
} from "@vaenyx/contracts";
import type { FastifyRequest } from "fastify";

import type { DatabaseHandle } from "../../db/database.js";

import { readProfileCapabilities } from "./capabilities.js";
import { loadMethod } from "./methods.js";
import { loadRoutine } from "./routines.js";
import { decryptAppToken, encryptAppToken } from "./token-vault.js";

// Where Methods and Routines live on disk; both create/update need them to
// validate grants and pin version hashes.
export interface LibraryDirs {
  libraryDirectory: string;
  routinesDirectory: string;
}

interface AppProfileRow {
  id: string;
  name: string;
  token_prefix: string;
  kind: AppProfileKind;
  routine_id: string | null;
  routine_content_hash: string | null;
  output_format: "json";
  max_autonomy_level: 0;
  fetch_recipe: 0 | 1;
  send_feedback: 0 | 1;
  memory_write_policy: "none";
  enabled: 0 | 1;
  created_at: string;
}

function hashAppToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Reversible display copy (see token-vault.ts): the key never enters backups.

function allowedSkillIds(database: DatabaseHandle, profileId: string): string[] {
  return (
    database.sqlite
      .prepare(
        `SELECT skill_id
         FROM app_profile_skills
         WHERE app_profile_id = ?
         ORDER BY skill_id`,
      )
      .all(profileId) as { skill_id: string }[]
  ).map((row) => row.skill_id);
}

function allowedMethodIds(database: DatabaseHandle, profileId: string): string[] {
  return (
    database.sqlite
      .prepare(
        `SELECT method_id
         FROM app_profile_methods
         WHERE app_profile_id = ?
         ORDER BY method_id`,
      )
      .all(profileId) as { method_id: string }[]
  ).map((row) => row.method_id);
}

// How many App Profiles hold a grant for this method that no longer matches
// what the method now is. Editing a recipe moves the content hash, and those
// profiles will be refused (409) until they are granted the new version - the
// Owner is told the count before they apply an edit, not after an app breaks.
export function countStaleMethodGrants(
  database: DatabaseHandle,
  methodId: string,
  contentHash: string,
): number {
  const row = database.sqlite
    .prepare(
      `SELECT COUNT(*) AS n
       FROM app_profile_methods
       WHERE method_id = ? AND content_hash <> ?`,
    )
    .get(methodId, contentHash) as { n: number } | undefined;
  return row?.n ?? 0;
}

// The Owner edited their OWN method — every grant follows automatically
// ("token 全自动", Oskar 2026-07-28): the version lock exists so content
// cannot change behind an app's back WITHOUT the Owner; an origin:"self"
// method has no author but the Owner, so their edit IS the authorization and
// asking them to re-grant their own change is pure friction. Community-origin
// methods never come through here — third-party updates keep the re-grant
// gate. Returns how many grants moved.
export function relockMethodGrants(
  database: DatabaseHandle,
  methodId: string,
  contentHash: string,
): number {
  const result = database.sqlite
    .prepare(
      `UPDATE app_profile_methods
       SET content_hash = ?
       WHERE method_id = ? AND content_hash <> ?`,
    )
    .run(contentHash, methodId, contentHash);
  return Number(result.changes ?? 0);
}

// The content hash an App Profile pinned for a granted method (the version
// lock), or null if the method is not granted to this profile.
export function getAppProfileMethodLock(
  database: DatabaseHandle,
  profileId: string,
  methodId: string,
): string | null {
  const row = database.sqlite
    .prepare(
      `SELECT content_hash
       FROM app_profile_methods
       WHERE app_profile_id = ? AND method_id = ?`,
    )
    .get(profileId, methodId) as { content_hash: string } | undefined;

  return row?.content_hash ?? null;
}

// The Routine version a Routine Token pinned, or null if this profile is not a
// Routine Token for that routine (the routine-side version lock).
export function getAppProfileRoutineLock(
  database: DatabaseHandle,
  profileId: string,
  routineId: string,
): string | null {
  const row = database.sqlite
    .prepare(
      `SELECT routine_content_hash
       FROM app_profiles
       WHERE id = ? AND kind = 'routine' AND routine_id = ?`,
    )
    .get(profileId, routineId) as
    | { routine_content_hash: string | null }
    | undefined;

  return row?.routine_content_hash ?? null;
}

function toAppProfile(database: DatabaseHandle, row: AppProfileRow): AppProfile {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    kind: row.kind,
    allowedRoutineId: row.routine_id,
    allowedSkillIds: allowedSkillIds(database, row.id),
    allowedMethodIds: allowedMethodIds(database, row.id),
    // What this key may DO, as opposed to which Methods it may call. Read
    // through the same function the run path uses, so the card can never claim
    // a capability the run would strip — `fetching` above all.
    capabilities: readProfileCapabilities(database, row.id),
    fetchRecipe: Boolean(row.fetch_recipe),
    sendFeedback: Boolean(row.send_feedback),
    outputFormat: row.output_format,
    maxAutonomyLevel: row.max_autonomy_level,
    memoryWritePolicy: row.memory_write_policy,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
  };
}

const profileSelect = "SELECT app_profiles.* FROM app_profiles";

export function listAppProfiles(database: DatabaseHandle): AppProfile[] {
  const rows = database.sqlite
    .prepare(`${profileSelect} ORDER BY app_profiles.created_at DESC`)
    .all() as unknown as AppProfileRow[];

  return rows.map((row) => toAppProfile(database, row));
}

export function createAppProfile(
  database: DatabaseHandle,
  input: CreateAppProfileRequest,
  dirs: LibraryDirs,
  secretsDirectory: string,
): CreateAppProfileResponse {
  const kind: AppProfileKind = input.kind ?? "method";

  const token = `vaenyx_app_${randomBytes(32).toString("base64url")}`;
  const tokenPrefix = `${token.slice(0, 18)}...`;
  const tokenCipher = encryptAppToken(secretsDirectory, token);
  const id = randomUUID();

  // ── Relay key: the Subscription Door's own kind. Binds nothing — no Method,
  // no Routine — because its job is the door, not the Library. It starts with
  // the two capabilities the door actually serves (vision, reading; text is
  // the door itself and is not one of the seven), so a freshly issued key
  // works for what it was issued for instead of failing its first photo.
  // fetching stays impossible via NEVER_VIA_TOKEN whatever is written here.
  if (kind === "relay") {
    database.sqlite
      .prepare(
        `INSERT INTO app_profiles (
          id, name, token_hash, token_prefix, token_cipher, kind, capabilities
        ) VALUES (?, ?, ?, ?, ?, 'relay', ?)`,
      )
      .run(
        id,
        input.name.trim(),
        hashAppToken(token),
        tokenPrefix,
        tokenCipher,
        JSON.stringify(["vision", "reading"]),
      );

    const profile = listAppProfiles(database).find((item) => item.id === id);
    if (!profile) {
      throw new Error("APP_PROFILE_NOT_FOUND");
    }
    return { profile, token };
  }

  // ── Routine Token: references exactly one Routine; pin its version. ──────────
  if (kind === "routine") {
    if (!input.allowedRoutineId) {
      throw new Error("NO_CAPABILITY");
    }
    const routine = loadRoutine(
      dirs.routinesDirectory,
      dirs.libraryDirectory,
      input.allowedRoutineId,
    );
    if (!routine) {
      throw new Error("ROUTINE_NOT_FOUND");
    }
    if (!routine.resolved) {
      throw new Error(`ROUTINE_UNRESOLVED:${routine.missingDeps.join(",")}`);
    }

    database.sqlite
      .prepare(
        `INSERT INTO app_profiles (
          id, name, token_hash, token_prefix, token_cipher, kind, routine_id, routine_content_hash
        ) VALUES (?, ?, ?, ?, ?, 'routine', ?, ?)`,
      )
      .run(
        id,
        input.name.trim(),
        hashAppToken(token),
        tokenPrefix,
        tokenCipher,
        routine.id,
        routine.contentHash,
      );

    const profile = listAppProfiles(database).find((item) => item.id === id);
    if (!profile) {
      throw new Error("APP_PROFILE_NOT_FOUND");
    }
    return { profile, token };
  }

  // ── Method Token: bundles 1+ Methods (and/or legacy Skills). ────────────────
  const uniqueSkillIds = [...new Set(input.allowedSkillIds ?? [])];
  const uniqueMethodIds = [...new Set(input.allowedMethodIds ?? [])];

  // A profile with no Skill and no Method could do nothing; reject it as a
  // likely mistake (the cross-array rule the schema cannot express).
  if (uniqueSkillIds.length === 0 && uniqueMethodIds.length === 0) {
    throw new Error("NO_CAPABILITY");
  }

  if (uniqueSkillIds.length > 0) {
    const foundSkills = database.sqlite
      .prepare(
        `SELECT id FROM skills WHERE id IN (${uniqueSkillIds.map(() => "?").join(", ")})`,
      )
      .all(...uniqueSkillIds) as { id: string }[];

    if (foundSkills.length !== uniqueSkillIds.length) {
      throw new Error("SKILL_NOT_FOUND");
    }
  }

  // Validate each granted Method exists on disk and capture its content hash to
  // pin the version (the lock verified at run time).
  const methodHashes = new Map<string, string>();
  for (const methodId of uniqueMethodIds) {
    const method = loadMethod(dirs.libraryDirectory, methodId);
    if (!method) {
      throw new Error("METHOD_NOT_FOUND");
    }
    methodHashes.set(methodId, method.contentHash);
  }

  database.sqlite.exec("BEGIN IMMEDIATE;");

  try {
    database.sqlite
      .prepare(
        `INSERT INTO app_profiles (
          id, name, token_hash, token_prefix, token_cipher, fetch_recipe, send_feedback
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name.trim(),
        hashAppToken(token),
        tokenPrefix,
        tokenCipher,
        input.fetchRecipe ? 1 : 0,
        input.sendFeedback ? 1 : 0,
      );

    const addSkill = database.sqlite.prepare(
      "INSERT INTO app_profile_skills (app_profile_id, skill_id) VALUES (?, ?)",
    );

    for (const skillId of uniqueSkillIds) {
      addSkill.run(id, skillId);
    }

    const addMethod = database.sqlite.prepare(
      "INSERT INTO app_profile_methods (app_profile_id, method_id, content_hash) VALUES (?, ?, ?)",
    );

    for (const [methodId, contentHash] of methodHashes) {
      addMethod.run(id, methodId, contentHash);
    }

    database.sqlite.exec("COMMIT;");
  } catch (error) {
    database.sqlite.exec("ROLLBACK;");
    throw error;
  }

  const profile = listAppProfiles(database).find((item) => item.id === id);

  if (!profile) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  return { profile, token };
}

// Edit an existing Token. The kind is fixed at creation; only the grant changes.
// The token (identity) is never touched. Grants are re-validated and their current
// content hash re-pinned, so editing also refreshes a stale version lock.
export function updateAppProfile(
  database: DatabaseHandle,
  profileId: string,
  input: UpdateAppProfileRequest,
  dirs: LibraryDirs,
): AppProfile {
  const existing = database.sqlite
    .prepare("SELECT kind FROM app_profiles WHERE id = ?")
    .get(profileId) as { kind: AppProfileKind } | undefined;

  if (!existing) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  // ── Routine Token: swap which Routine it runs, re-pinning the version. ───────
  if (existing.kind === "routine") {
    if (!input.allowedRoutineId) {
      throw new Error("NO_CAPABILITY");
    }
    const routine = loadRoutine(
      dirs.routinesDirectory,
      dirs.libraryDirectory,
      input.allowedRoutineId,
    );
    if (!routine) {
      throw new Error("ROUTINE_NOT_FOUND");
    }
    if (!routine.resolved) {
      throw new Error(`ROUTINE_UNRESOLVED:${routine.missingDeps.join(",")}`);
    }

    database.sqlite
      .prepare(
        "UPDATE app_profiles SET routine_id = ?, routine_content_hash = ? WHERE id = ?",
      )
      .run(routine.id, routine.contentHash, profileId);

    const profile = listAppProfiles(database).find(
      (item) => item.id === profileId,
    );
    if (!profile) {
      throw new Error("APP_PROFILE_NOT_FOUND");
    }
    return profile;
  }

  // ── Method Token: replace its Methods + fetchRecipe. ────────────────────────
  const uniqueMethodIds = [...new Set(input.allowedMethodIds ?? [])];
  const existingSkillIds = allowedSkillIds(database, profileId);

  if (uniqueMethodIds.length === 0 && existingSkillIds.length === 0) {
    throw new Error("NO_CAPABILITY");
  }

  const methodHashes = new Map<string, string>();
  for (const methodId of uniqueMethodIds) {
    const method = loadMethod(dirs.libraryDirectory, methodId);
    if (!method) {
      throw new Error("METHOD_NOT_FOUND");
    }
    methodHashes.set(methodId, method.contentHash);
  }

  database.sqlite.exec("BEGIN IMMEDIATE;");

  try {
    database.sqlite
      .prepare(
        "UPDATE app_profiles SET fetch_recipe = ?, send_feedback = ? WHERE id = ?",
      )
      .run(input.fetchRecipe ? 1 : 0, input.sendFeedback ? 1 : 0, profileId);

    database.sqlite
      .prepare("DELETE FROM app_profile_methods WHERE app_profile_id = ?")
      .run(profileId);

    const addMethod = database.sqlite.prepare(
      "INSERT INTO app_profile_methods (app_profile_id, method_id, content_hash) VALUES (?, ?, ?)",
    );

    for (const [methodId, contentHash] of methodHashes) {
      addMethod.run(profileId, methodId, contentHash);
    }

    database.sqlite.exec("COMMIT;");
  } catch (error) {
    database.sqlite.exec("ROLLBACK;");
    throw error;
  }

  const profile = listAppProfiles(database).find((item) => item.id === profileId);

  if (!profile) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  return profile;
}

// Issue a fresh token for an existing profile. The original token is only ever
// stored as an irreversible hash, so it can never be shown again; this is the
// way to recover access — it rotates to a new token (shown once) and the old one
// stops working immediately. Identity (the profile id) and all grants are kept.
export function regenerateAppProfileToken(
  database: DatabaseHandle,
  profileId: string,
  secretsDirectory: string,
): CreateAppProfileResponse {
  const token = `vaenyx_app_${randomBytes(32).toString("base64url")}`;
  const tokenPrefix = `${token.slice(0, 18)}...`;

  // key_version counts every rotation, wherever it came from (the Owner's
  // Settings or the app's own rotate call): the app can display "key v3" and
  // the Owner can see that a key has been moving. The old key stops working
  // the instant this runs — same UPDATE, same hash column.
  const result = database.sqlite
    .prepare(
      `UPDATE app_profiles
       SET token_hash = ?, token_prefix = ?, token_cipher = ?,
           key_version = key_version + 1, key_rotated_at = ?
       WHERE id = ?`,
    )
    .run(
      hashAppToken(token),
      tokenPrefix,
      encryptAppToken(secretsDirectory, token),
      new Date().toISOString(),
      profileId,
    );

  if (result.changes === 0) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  const profile = listAppProfiles(database).find((item) => item.id === profileId);

  if (!profile) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  return { profile, token };
}

// The key's own passport, for the app that holds it: version, dates, the last
// four characters (enough to recognise which key is in its settings, never
// enough to use). No cipher, no hash, no full secret — a status answer must
// stay worthless to a thief.
export function appProfileKeyInfo(
  database: DatabaseHandle,
  profileId: string,
): {
  version: number;
  createdAt: string;
  rotatedAt: string | null;
  hint: string;
} {
  const row = database.sqlite
    .prepare(
      `SELECT key_version, key_rotated_at, created_at, token_prefix
       FROM app_profiles WHERE id = ?`,
    )
    .get(profileId) as
    | {
        key_version: number;
        key_rotated_at: string | null;
        created_at: string;
        token_prefix: string;
      }
    | undefined;
  if (!row) throw new Error("APP_PROFILE_NOT_FOUND");
  return {
    version: row.key_version,
    createdAt: row.created_at,
    rotatedAt: row.key_rotated_at,
    hint: row.token_prefix,
  };
}

// Re-view an existing Token (Owner-only, display purposes). Null when the
// profile predates the cipher column or the ciphertext cannot be decrypted —
// those tokens are unrecoverable by design (only hash + prefix exist); a
// reset issues a fresh, recoverable one.
export function revealAppProfileToken(
  database: DatabaseHandle,
  profileId: string,
  secretsDirectory: string,
): string | null {
  const row = database.sqlite
    .prepare("SELECT token_cipher FROM app_profiles WHERE id = ?")
    .get(profileId) as { token_cipher: string | null } | undefined;
  if (!row) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }
  if (!row.token_cipher) return null;
  return decryptAppToken(secretsDirectory, row.token_cipher);
}

export function disableAppProfile(
  database: DatabaseHandle,
  profileId: string,
): AppProfile {
  const result = database.sqlite
    .prepare("UPDATE app_profiles SET enabled = 0 WHERE id = ?")
    .run(profileId);

  if (result.changes === 0) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  const profile = listAppProfiles(database).find((item) => item.id === profileId);

  if (!profile) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  return profile;
}

// Re-enable a previously disabled Token. Identity + grants are untouched; the
// same token authenticates again.
export function enableAppProfile(
  database: DatabaseHandle,
  profileId: string,
): AppProfile {
  const result = database.sqlite
    .prepare("UPDATE app_profiles SET enabled = 1 WHERE id = ?")
    .run(profileId);

  if (result.changes === 0) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  const profile = listAppProfiles(database).find((item) => item.id === profileId);

  if (!profile) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }

  return profile;
}

// Permanently delete a Token (App Profile). Its Skill/Method grant rows drop via
// ON DELETE CASCADE. The token can never authenticate again.
export function deleteAppProfile(
  database: DatabaseHandle,
  profileId: string,
): void {
  const result = database.sqlite
    .prepare("DELETE FROM app_profiles WHERE id = ?")
    .run(profileId);

  if (result.changes === 0) {
    throw new Error("APP_PROFILE_NOT_FOUND");
  }
}

export function authenticateAppProfile(
  database: DatabaseHandle,
  request: FastifyRequest,
): AppProfile | null {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token.startsWith("vaenyx_app_")) {
    return null;
  }

  const row = database.sqlite
    .prepare(
      `${profileSelect}
       WHERE app_profiles.token_hash = ? AND app_profiles.enabled = 1`,
    )
    .get(hashAppToken(token)) as unknown as AppProfileRow | undefined;

  return row ? toAppProfile(database, row) : null;
}
