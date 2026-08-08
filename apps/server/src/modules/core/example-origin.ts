// WHOSE EXAMPLE IS THIS — recorded now, used properly later.
//
// The sharing flow is not built and must not be until there is a redaction
// pipeline: the Terms forbid a publish submission carrying Examples or raw
// corrections, and say that allowing it later requires on-device redaction, a
// preview of exactly what would be sent, and explicit consent.
//
// What this file does today is smaller and worth doing anyway: it keeps the
// distinction the rules will need. An example that came WITH an item belongs
// to its author and is replaced when they publish a new set; one this
// household produced by using the thing is theirs, is never replaced, and
// never leaves the machine. Recording that from now on means switching the
// feature on later is adding a rule rather than trying to reconstruct a
// history nobody kept.
import type { DatabaseHandle } from "../../db/database.js";

export type ExampleOrigin = "author" | "mine";

export interface ExampleProvenance {
  contributed: boolean;
  exampleFile: string;
  methodId: string;
  origin: ExampleOrigin;
  recordedAt: string;
  sourceApp: string | null;
}

export function recordExampleOrigin(
  database: DatabaseHandle,
  input: {
    exampleFile: string;
    methodId: string;
    origin: ExampleOrigin;
    sourceApp?: string | null;
    sourceKeyId?: string | null;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO example_origins (
         method_id, example_file, origin, source_app, source_key_id, recorded_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(method_id, example_file) DO UPDATE SET
         origin = excluded.origin,
         source_app = excluded.source_app,
         source_key_id = excluded.source_key_id`,
    )
    .run(
      input.methodId,
      input.exampleFile,
      input.origin,
      input.sourceApp ?? null,
      input.sourceKeyId ?? null,
      new Date().toISOString(),
    );
}

/** What the Method screen shows: "Examples: 8 from the author · 12 of yours".
 *  Anything with no record is counted as this household's, which is true —
 *  nothing has ever shipped an example with an item. */
export function countExamplesByOrigin(
  database: DatabaseHandle,
  methodId: string,
  totalOnDisk: number,
): { author: number; mine: number } {
  const row = database.sqlite
    .prepare(
      `SELECT
         SUM(CASE WHEN origin = 'author' THEN 1 ELSE 0 END) AS author,
         COUNT(*) AS known
       FROM example_origins WHERE method_id = ?`,
    )
    .get(methodId) as unknown as { author: number | null; known: number } | undefined;
  const author = row?.author ?? 0;
  return { author, mine: Math.max(0, totalOnDisk - author) };
}

export function listExampleProvenance(
  database: DatabaseHandle,
  methodId: string,
): ExampleProvenance[] {
  const rows = database.sqlite
    .prepare(
      `SELECT method_id AS methodId, example_file AS exampleFile, origin,
              source_app AS sourceApp, recorded_at AS recordedAt,
              contributed
         FROM example_origins WHERE method_id = ?
        ORDER BY example_file ASC`,
    )
    .all(methodId) as unknown as (Omit<ExampleProvenance, "contributed"> & {
    contributed: number;
  })[];
  return rows.map((row) => ({ ...row, contributed: row.contributed === 1 }));
}
