// ONE INBOX PER MODE, ENFORCED BY THE DATABASE.
//
// The permanent conversation Vaenyx speaks from has to be exactly one per Mode
// and impossible to duplicate. Application code can be bypassed by the next
// person to add a code path; a unique index cannot.
//
// The trap this test exists for: `UNIQUE(mode_id)` looks like it says one per
// Mode, and in SQL it does not. Every NULL is distinct from every other NULL,
// so a bare unique column would constrain every Custom Mode and leave User
// Mode — the one every household has, and the one that matters most —
// completely unconstrained. COALESCE(mode_id, '') makes User Mode a value like
// any other.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-inbox-test-"));
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

function addThread(
  database: DatabaseHandle,
  id: string,
  kind: string,
  modeId: string | null,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (id, kind, title, status, mode_id)
       VALUES (?, ?, 'Vaenyx', 'pinned', ?)`,
    )
    .run(id, kind, modeId);
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

describe("the permanent inbox thread", () => {
  it("is a kind the table now accepts", () => {
    const database = testDatabase();
    expect(() => addThread(database, "inbox-user", "inbox", null)).not.toThrow();
  });

  it("🔴 cannot be duplicated in User Mode, where mode_id is NULL", () => {
    // The whole reason the index is on COALESCE(mode_id, '') and not on
    // mode_id. With a bare unique column this insert succeeds.
    const database = testDatabase();
    addThread(database, "inbox-user", "inbox", null);
    expect(() => addThread(database, "inbox-user-2", "inbox", null)).toThrow(
      /UNIQUE/,
    );
  });

  it("cannot be duplicated inside a Custom Mode either", () => {
    const database = testDatabase();
    addThread(database, "inbox-yen", "inbox", "mode-yen");
    expect(() => addThread(database, "inbox-yen-2", "inbox", "mode-yen")).toThrow(
      /UNIQUE/,
    );
  });

  it("allows exactly one per Mode, side by side", () => {
    const database = testDatabase();
    addThread(database, "inbox-user", "inbox", null);
    addThread(database, "inbox-yen", "inbox", "mode-yen");
    addThread(database, "inbox-sam", "inbox", "mode-sam");
    const rows = database.sqlite
      .prepare("SELECT COUNT(*) AS n FROM vaenyx_threads WHERE kind = 'inbox'")
      .get() as { n: number };
    expect(rows.n).toBe(3);
  });

  it("leaves ordinary threads alone", () => {
    // The partial index must not touch chats, which are many per Mode.
    const database = testDatabase();
    addThread(database, "c1", "chat", null);
    addThread(database, "c2", "chat", null);
    addThread(database, "t1", "task", "mode-yen");
    addThread(database, "t2", "task", "mode-yen");
    const rows = database.sqlite
      .prepare("SELECT COUNT(*) AS n FROM vaenyx_threads WHERE kind != 'inbox'")
      .get() as { n: number };
    expect(rows.n).toBe(4);
  });

  it("still refuses a kind nobody defined", () => {
    const database = testDatabase();
    expect(() => addThread(database, "x", "nonsense", null)).toThrow(/CHECK/);
  });
});
