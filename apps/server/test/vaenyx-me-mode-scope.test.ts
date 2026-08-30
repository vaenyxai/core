// A MODE IS A WALL. THE AUTO-LEARN SCAN WALKED THROUGH IT.
//
// Both scans read every task and every conversation on the machine with no
// mode filter, and the insert never wrote mode_id. So a household member's own
// chats inside their Custom Mode were summarised into proposals about the
// OWNER, filed under no Mode at all, and shown on the Owner's screen. A Custom
// Mode exists precisely so that what happens in it stays in it.
//
// The subtle half is `mode_id IS ?` rather than `= ?`: User Mode is NULL, and
// `= NULL` matches nothing in SQL, so the obvious version of this fix would
// have silently stopped User Mode scanning anything at all.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  createVaenyxMeCandidate,
  listVaenyxMeCandidates,
} from "../src/modules/core/vaenyx-me.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-scope-test-"));
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

function propose(
  database: DatabaseHandle,
  title: string,
  modeId: string | null,
) {
  return createVaenyxMeCandidate(
    database,
    {
      category: "communication",
      title,
      proposedSummary: "summary",
      proposedEvidence: "evidence",
      sourceType: "chat_history",
      confidence: 40,
      modeId,
    },
    "owner-1",
  );
}

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

describe("which Mode a proposal belongs to", () => {
  it("🔴 records the Mode it was made in", () => {
    // Before this, the column was never written, so every proposal ever made
    // reads as User Mode and nothing can be scoped after the fact.
    const database = testDatabase();
    propose(database, "from a custom mode", "mode-yen");
    const row = database.sqlite
      .prepare(
        "SELECT mode_id FROM vaenyx_me_candidates WHERE title = 'from a custom mode'",
      )
      .get() as { mode_id: string | null };
    expect(row.mode_id).toBe("mode-yen");
  });

  it("keeps User Mode as NULL, which is a value and not a gap", () => {
    const database = testDatabase();
    propose(database, "from user mode", null);
    const row = database.sqlite
      .prepare(
        "SELECT mode_id FROM vaenyx_me_candidates WHERE title = 'from user mode'",
      )
      .get() as { mode_id: string | null };
    expect(row.mode_id).toBeNull();
  });

  it("🔴 `IS` matches NULL where `=` would match nothing", () => {
    // The whole User Mode side of the filter rests on this. With `= ?` the
    // scan would quietly find zero rows and stop proposing anything at all —
    // a failure with no error attached to it.
    const database = testDatabase();
    propose(database, "user mode one", null);
    propose(database, "custom mode one", "mode-yen");

    const userMode = database.sqlite
      .prepare("SELECT title FROM vaenyx_me_candidates WHERE mode_id IS ?")
      .all(null) as { title: string }[];
    expect(userMode.map((row) => row.title)).toEqual(["user mode one"]);

    const custom = database.sqlite
      .prepare("SELECT title FROM vaenyx_me_candidates WHERE mode_id IS ?")
      .all("mode-yen") as { title: string }[];
    expect(custom.map((row) => row.title)).toEqual(["custom mode one"]);

    const withEquals = database.sqlite
      .prepare("SELECT title FROM vaenyx_me_candidates WHERE mode_id = ?")
      .all(null) as { title: string }[];
    expect(withEquals).toEqual([]);
  });

  it("🔴 each Mode's review list shows only its own proposals", () => {
    // The count on the badge was always scoped; the LIST behind it was not,
    // so a Custom Mode's Review panel showed the whole household's cards
    // (Oskar, 2026-08-30: 不同的 mode 是要分开的). Both directions matter:
    // the Mode must not see User Mode's, and User Mode must not see the
    // Mode's — its proposals are reviewed inside the Mode they belong to.
    const database = testDatabase();
    propose(database, "a", null);
    propose(database, "b", "mode-yen");
    expect(
      listVaenyxMeCandidates(database, null).map((item) => item.title),
    ).toEqual(["a"]);
    expect(
      listVaenyxMeCandidates(database, "mode-yen").map((item) => item.title),
    ).toEqual(["b"]);
  });
});
