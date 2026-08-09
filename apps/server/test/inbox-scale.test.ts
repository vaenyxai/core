// THE INBOX AT THE SIZE IT ACTUALLY RUNS AT (H-001 acceptance).
//
// The criteria demand coverage with at least 25 candidates, not a three-item
// example — because the failures worth catching here are scale failures:
// counts bleeding across Modes, dedup quietly not holding, the folding floor
// picking from the wrong pool. All of that passes trivially at n=3.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { createVaenyxMeCandidate } from "../src/modules/core/vaenyx-me.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-scale-test-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

function seedMany(
  database: DatabaseHandle,
  count: number,
  modeId: string | null,
): void {
  for (let index = 0; index < count; index += 1) {
    createVaenyxMeCandidate(
      database,
      {
        category: "communication",
        title: `t-${modeId ?? "user"}-${index}`,
        proposedSummary: "summary",
        proposedEvidence: "evidence",
        sourceType: "chat_history",
        confidence: 40,
        modeId,
      },
      "owner-1",
    );
  }
}

const pendingCount = (database: DatabaseHandle, modeId: string | null) =>
  (
    database.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM vaenyx_me_candidates
          WHERE status = 'pending_review' AND mode_id IS ?`,
      )
      .get(modeId) as { n: number }
  ).n;

afterEach(() => {
  for (const database of databases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("the inbox with a real-sized queue", () => {
  it("🔴 26 User Mode items and 5 Custom Mode items never share a count", () => {
    const database = testDatabase();
    seedMany(database, 26, null);
    seedMany(database, 5, "mode-yen");

    // The per-Mode count is exactly the SQL the /v1/inbox route runs. User
    // Mode must not swallow the Custom Mode's five, and vice versa.
    expect(pendingCount(database, null)).toBe(26);
    expect(pendingCount(database, "mode-yen")).toBe(5);
  });

  it("records one inbox reference per candidate, in the right Mode", () => {
    const database = testDatabase();
    seedMany(database, 26, null);
    seedMany(database, 5, "mode-yen");

    const references = database.sqlite
      .prepare(
        `SELECT COALESCE(mode_id, '') AS mode, COUNT(*) AS n
           FROM inbox_items GROUP BY 1 ORDER BY 1`,
      )
      .all() as { mode: string; n: number }[];
    expect(references).toEqual([
      { mode: "", n: 26 },
      { mode: "mode-yen", n: 5 },
    ]);
  });

  it("🔴 the same source cannot enter one Mode's inbox twice", () => {
    // Dedup is the unique index, not politeness in the insert path — proven by
    // inserting the duplicate reference directly.
    const database = testDatabase();
    seedMany(database, 1, null);
    const sourceId = (
      database.sqlite
        .prepare("SELECT source_id AS id FROM inbox_items LIMIT 1")
        .get() as { id: string }
    ).id;
    expect(() =>
      database.sqlite
        .prepare(
          `INSERT INTO inbox_items (id, mode_id, source_kind, source_id)
           VALUES ('another-row', NULL, 'vaenyx_me_candidate', ?)`,
        )
        .run(sourceId),
    ).toThrow(/UNIQUE/);
  });

  it("refuses a source kind nobody has defined yet", () => {
    const database = testDatabase();
    expect(() =>
      database.sqlite
        .prepare(
          `INSERT INTO inbox_items (id, mode_id, source_kind, source_id)
           VALUES ('x', NULL, 'task_failure', 's')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });
});
