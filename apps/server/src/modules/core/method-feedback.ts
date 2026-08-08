// Flywheel return — the local correction store ("本地纠错库", library-architecture
// §10). An external app (holding a Method Token with the sendFeedback bit) posts a
// user's correction here; we write it RAW into SQLite and nothing more. The iron
// rule is intake-only: this never changes a recipe, never auto-publishes, and never
// de-identifies-and-shares. De-identify + Owner preview/consent (§9) is a separate
// internal flow that turns a stored correction into a shared examples/*.json later.

import { randomUUID } from "node:crypto";

import type { MethodFeedbackReaction } from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

export interface RecordMethodFeedbackInput {
  methodId: string;
  appProfileId: string;
  appProfileName: string;
  // The version that produced the output (binds that version's content-hash).
  version: string;
  // The method's current content hash at ingest, for provenance (or null).
  contentHash: string | null;
  // Did `version` still match the current method version at ingest?
  versionMatched: boolean;
  reaction: MethodFeedbackReaction;
  // Arbitrary JSON payloads; `undefined` is stored as NULL.
  input: unknown;
  aiOutput: unknown;
  correctedOutput: unknown;
  // true/false if correctedOutput was schema-checked (version matched), else null.
  outputValid: boolean | null;
  // WHICH STEP OF WHICH ROUTINE. Absent for a Method used on its own; for a
  // multi-step Routine it is the difference between a correction landing on
  // the part that produced the mistake and landing on whichever part the app
  // found easiest to name.
  routineId?: string | null;
  stepId?: string | null;
  note: string | null;
  occurredAt: string | null;
}

function toJsonOrNull(value: unknown): string | null {
  if (value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    // Circular/unserialisable payloads degrade to null rather than failing intake.
    return null;
  }
}

export interface StoredMethodFeedback {
  id: string;
  appProfileName: string;
  reaction: MethodFeedbackReaction;
  input: unknown;
  aiOutput: unknown;
  correctedOutput: unknown;
  note: string | null;
  createdAt: string;
}

function parseJsonOrNull(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Corrections worth turning into examples: the Owner edited the output, and we
// still have both sides of the pair. Rejections and bare confirmations teach a
// model nothing, so they are not offered.
export function listAdoptableFeedback(
  database: DatabaseHandle,
  methodId: string,
  limit = 20,
): StoredMethodFeedback[] {
  const rows = database.sqlite
    .prepare(
      `SELECT id, app_profile_name, reaction, input, ai_output, corrected_output,
              note, created_at
         FROM method_feedback
        WHERE method_id = ? AND reaction = 'edited'
          AND input IS NOT NULL AND corrected_output IS NOT NULL
          -- Already kept ones are not waiting for anybody. Without this the
          -- same correction could be kept twice, weighting the few-shot
          -- towards one case, and the tick beside it died on every reload.
          AND adopted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ?`,
    )
    .all(methodId, limit) as {
    id: string;
    app_profile_name: string;
    reaction: MethodFeedbackReaction;
    input: string | null;
    ai_output: string | null;
    corrected_output: string | null;
    note: string | null;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    appProfileName: row.app_profile_name,
    reaction: row.reaction,
    input: parseJsonOrNull(row.input),
    aiOutput: parseJsonOrNull(row.ai_output),
    correctedOutput: parseJsonOrNull(row.corrected_output),
    note: row.note,
    createdAt: row.created_at,
  }));
}

export function getFeedbackById(
  database: DatabaseHandle,
  methodId: string,
  feedbackId: string,
): StoredMethodFeedback | null {
  const rows = database.sqlite
    .prepare(
      `SELECT id, app_profile_name, reaction, input, ai_output, corrected_output,
              note, created_at
         FROM method_feedback
        WHERE method_id = ? AND id = ?`,
    )
    .all(methodId, feedbackId) as {
    id: string;
    app_profile_name: string;
    reaction: MethodFeedbackReaction;
    input: string | null;
    ai_output: string | null;
    corrected_output: string | null;
    note: string | null;
    created_at: string;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    appProfileName: row.app_profile_name,
    reaction: row.reaction,
    input: parseJsonOrNull(row.input),
    aiOutput: parseJsonOrNull(row.ai_output),
    correctedOutput: parseJsonOrNull(row.corrected_output),
    note: row.note,
    createdAt: row.created_at,
  };
}

export function recordMethodFeedback(
  database: DatabaseHandle,
  input: RecordMethodFeedbackInput,
): { id: string } {
  const id = randomUUID();
  database.sqlite
    .prepare(
      `INSERT INTO method_feedback (
        id, method_id, app_profile_id, app_profile_name, version, content_hash,
        version_matched, reaction, input, ai_output, corrected_output,
        output_valid, note, occurred_at, routine_id, step_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.methodId,
      input.appProfileId,
      input.appProfileName,
      input.version,
      input.contentHash,
      input.versionMatched ? 1 : 0,
      input.reaction,
      toJsonOrNull(input.input),
      toJsonOrNull(input.aiOutput),
      toJsonOrNull(input.correctedOutput),
      input.outputValid === null ? null : input.outputValid ? 1 : 0,
      input.note,
      input.occurredAt,
      // Which step of which Routine this came from. Null for a correction
      // about a Method used on its own, which is unambiguous anyway.
      input.routineId ?? null,
      input.stepId ?? null,
    );
  return { id };
}

/**
 * This correction has been kept as an example, so it is no longer waiting for
 * anybody. Recording the moment rather than deleting the row: the correction
 * is the evidence of what an app actually sent, and the flywheel's own history
 * is worth more than the row is worth reclaiming.
 */
export function markFeedbackAdopted(
  database: DatabaseHandle,
  feedbackId: string,
  when: string,
): void {
  database.sqlite
    .prepare(
      `UPDATE method_feedback SET adopted_at = ?
        WHERE id = ? AND adopted_at IS NULL`,
    )
    .run(when, feedbackId);
}

/**
 * How many corrections are waiting for the Owner, per Method.
 *
 * The number behind the badge on the Methods tab. It has to be a real count of
 * things that can still be acted on — a badge that shows 3 when there is
 * nothing to do is how people learn to stop looking at badges.
 */
export function countPendingCorrections(
  database: DatabaseHandle,
): { methodId: string; count: number }[] {
  return database.sqlite
    .prepare(
      `SELECT method_id AS methodId, COUNT(*) AS count
         FROM method_feedback
        WHERE reaction = 'edited' AND adopted_at IS NULL
          AND input IS NOT NULL AND corrected_output IS NOT NULL
        GROUP BY method_id`,
    )
    .all() as { methodId: string; count: number }[];
}
