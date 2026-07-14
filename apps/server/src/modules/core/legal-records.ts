// Local legal acknowledgement / consent records (copy pack clause 2.3). Every
// gated acknowledgement and recorded consent choice is appended here with the
// key name, the legal.copyVersion in force, the rendered language (EN/ZH), the
// profile it was given by, an optional choice, and a timestamp. Append-only: the
// latest row per (profile, key) is the current state, and a copy-version change
// re-gates rather than silently carrying an old consent forward.
import type { DatabaseHandle } from "../../db/database.js";

export interface LegalAcknowledgement {
  keyName: string;
  copyVersion: string;
  language: string;
  choice: string | null;
  createdAt: string;
}

export function recordLegalAcknowledgement(
  database: DatabaseHandle,
  input: {
    keyName: string;
    copyVersion: string;
    language: string;
    profileId: string;
    choice?: string | null;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO legal_acknowledgements
         (key_name, copy_version, language, profile_id, choice)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.keyName,
      input.copyVersion,
      input.language,
      input.profileId,
      input.choice ?? null,
    );
}

// The latest row per key for one profile (most recent id wins). Callers compare
// the stored copy_version to the current one to decide whether a gate re-fires.
export function listLegalAcknowledgements(
  database: DatabaseHandle,
  profileId: string,
): LegalAcknowledgement[] {
  const rows = database.sqlite
    .prepare(
      `SELECT key_name, copy_version, language, choice, created_at
         FROM legal_acknowledgements
        WHERE profile_id = ?
          AND id IN (
            SELECT MAX(id) FROM legal_acknowledgements
             WHERE profile_id = ?
             GROUP BY key_name
          )
        ORDER BY key_name`,
    )
    .all(profileId, profileId) as Array<{
    key_name: string;
    copy_version: string;
    language: string;
    choice: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    keyName: row.key_name,
    copyVersion: row.copy_version,
    language: row.language,
    choice: row.choice,
    createdAt: row.created_at,
  }));
}
