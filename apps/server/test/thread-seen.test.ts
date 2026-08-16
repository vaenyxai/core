// READ STATE IS THE OWNER'S, NOT THE BROWSER'S (Oskar, 2026-08-16).
//
// The dot used to live in each device's localStorage, so reading a result on
// the phone left it lit on the computer. These tests hold the instance-side
// watermark to the two promises that replaced it: marking is shared, and it
// is honest — activity that lands after the mark is unread again.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  listVaenyxThreads,
  markVaenyxThreadSeen,
} from "../src/modules/core/threads.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-threadseen-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  database.sqlite
    .prepare(
      `INSERT INTO owners (id, name, password_hash, created_at)
       VALUES ('owner-1', 'Owner', 'x', CURRENT_TIMESTAMP)`,
    )
    .run();
  return database;
}

function addThread(
  database: DatabaseHandle,
  id: string,
  updatedAt: string,
  seenAt: string | null,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads
         (id, owner_id, kind, title, status, created_at, updated_at, seen_at)
       VALUES (?, 'owner-1', 'chat', 'A chat', 'active', ?, ?, ?)`,
    )
    .run(id, updatedAt, updatedAt, seenAt);
}

function touch(database: DatabaseHandle, id: string, updatedAt: string): void {
  database.sqlite
    .prepare(`UPDATE vaenyx_threads SET updated_at = ? WHERE id = ?`)
    .run(updatedAt, id);
}

const unread = (database: DatabaseHandle, id: string): boolean => {
  const thread = listVaenyxThreads(database, "owner-1").find(
    (candidate) => candidate.id === id,
  );
  if (!thread) throw new Error("thread missing");
  return (thread.seenAt ?? "") < thread.updatedAt;
};

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

describe("the shared read watermark", () => {
  it("clears the unread state for every device at once", () => {
    const database = testDatabase();
    addThread(database, "thread-1", "2026-08-16T09:00:00.000Z", null);
    expect(unread(database, "thread-1")).toBe(true);

    // The phone opens it.
    markVaenyxThreadSeen(database, "thread-1", "owner-1");

    // The computer asks the same instance and gets the same answer.
    expect(unread(database, "thread-1")).toBe(false);
  });

  it("copies updated_at rather than stamping a fresh clock reading", () => {
    // Formats must never mix: SQLite's CURRENT_TIMESTAMP sorts BEFORE an ISO
    // string for the same instant, so a stamped "now" could read as older
    // than the activity it just marked as seen.
    const database = testDatabase();
    addThread(database, "thread-1", "2026-08-16T09:00:00.000Z", null);
    const seen = markVaenyxThreadSeen(database, "thread-1", "owner-1");
    expect(seen.seenAt).toBe(seen.updatedAt);
  });

  it("goes unread again when something new lands after the mark", () => {
    const database = testDatabase();
    addThread(database, "thread-1", "2026-08-16T09:00:00.000Z", null);
    markVaenyxThreadSeen(database, "thread-1", "owner-1");
    touch(database, "thread-1", "2026-08-16T10:30:00.000Z");
    expect(unread(database, "thread-1")).toBe(true);
  });

  it("marks only the thread it was given", () => {
    const database = testDatabase();
    addThread(database, "thread-1", "2026-08-16T09:00:00.000Z", null);
    addThread(database, "thread-2", "2026-08-16T09:05:00.000Z", null);
    markVaenyxThreadSeen(database, "thread-1", "owner-1");
    expect(unread(database, "thread-1")).toBe(false);
    expect(unread(database, "thread-2")).toBe(true);
  });

  it("refuses a thread that is not the Owner's", () => {
    const database = testDatabase();
    addThread(database, "thread-1", "2026-08-16T09:00:00.000Z", null);
    expect(() =>
      markVaenyxThreadSeen(database, "thread-1", "someone-else"),
    ).toThrowError("VAENYX_THREAD_NOT_FOUND");
  });

  it("counts everything that already existed as read", () => {
    // The migration seeds seen_at from updated_at, so an update does not
    // light the whole sidebar up.
    const database = testDatabase();
    database.sqlite
      .prepare(
        `INSERT INTO vaenyx_threads
           (id, owner_id, kind, title, status, created_at, updated_at)
         VALUES ('old', 'owner-1', 'chat', 'Before the update', 'active',
                 '2026-08-01T09:00:00.000Z', '2026-08-01T09:00:00.000Z')`,
      )
      .run();
    // Re-run the migration statement's effect on a row inserted without it.
    database.sqlite
      .prepare(
        `UPDATE vaenyx_threads SET seen_at = updated_at WHERE id = 'old'`,
      )
      .run();
    expect(unread(database, "old")).toBe(false);
  });
});
