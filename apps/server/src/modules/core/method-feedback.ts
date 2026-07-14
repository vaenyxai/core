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
        output_valid, note, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    );
  return { id };
}
