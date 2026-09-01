// THE PERMANENT CONVERSATION, AND THE THREE WAYS IT COULD HAVE STOPPED BEING
// PERMANENT.
//
// It is the fixed place Vaenyx speaks from, so "permanent" has to survive the
// ordinary things an Owner does to conversations: delete one, archive one, or
// end up with two of them and no idea which is real.
//
// Every guard reads `kind = 'inbox'` and nothing else. A title can be renamed —
// it IS the agent's name — and a hardcoded id is a second source of truth that
// drifts the first time somebody restores a backup.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { deleteAskVaenyxConversation } from "../src/modules/core/ask-vaenyx.js";
import {
  deleteInboxThreadForMode,
  ensureInboxThread,
  findInboxThread,
  isProtectedThread,
} from "../src/modules/core/inbox-thread.js";
import { updateVaenyxThreadStatus } from "../src/modules/core/threads.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-inboxthread-"));
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

describe("making the permanent conversation", () => {
  it("makes one, and gives the same one back next time", () => {
    const database = testDatabase();
    const first = ensureInboxThread(database, "owner-1", null, "Vaenyx");
    const second = ensureInboxThread(database, "owner-1", null, "Vaenyx");
    expect(second.id).toBe(first.id);
    const count = database.sqlite
      .prepare("SELECT COUNT(*) AS n FROM vaenyx_threads WHERE kind = 'inbox'")
      .get() as { n: number };
    expect(count.n).toBe(1);
  });

  it("gives each Mode its own", () => {
    const database = testDatabase();
    const user = ensureInboxThread(database, "owner-1", null, "Vaenyx");
    const yen = ensureInboxThread(database, "owner-1", "mode-yen", "Yen's");
    expect(yen.id).not.toBe(user.id);
    expect(findInboxThread(database, null)?.id).toBe(user.id);
    expect(findInboxThread(database, "mode-yen")?.id).toBe(yen.id);
  });

  it("arrives pinned, and is a real conversation with a composer", () => {
    const database = testDatabase();
    const inbox = ensureInboxThread(database, "owner-1", null, "Vaenyx");
    const row = database.sqlite
      .prepare(
        "SELECT status, conversation_id FROM vaenyx_threads WHERE id = ?",
      )
      .get(inbox.id) as { status: string; conversation_id: string };
    expect(row.status).toBe("pinned");
    // A thread with no conversation cannot be typed into, which would make it
    // a notification tray wearing a chat's clothes.
    expect(row.conversation_id).toBe(inbox.id);
  });
});

describe("the three ways it must not stop being permanent", () => {
  it("🔴 cannot be deleted", () => {
    // Deleting the CONVERSATION is how a thread actually dies — the thread row
    // cascades from it and there is no delete-thread route at all — so this is
    // the guard that matters.
    const database = testDatabase();
    const inbox = ensureInboxThread(database, "owner-1", null, "Vaenyx");
    expect(() =>
      deleteAskVaenyxConversation(database, inbox.conversationId, "owner-1"),
    ).toThrow(/CONVERSATION_PROTECTED/);
  });

  it("🔴 cannot be archived or un-pinned", () => {
    const database = testDatabase();
    const inbox = ensureInboxThread(database, "owner-1", null, "Vaenyx");
    expect(() =>
      updateVaenyxThreadStatus(database, inbox.id, "owner-1", {
        status: "archived",
      }),
    ).toThrow(/THREAD_PROTECTED/);
    expect(() =>
      updateVaenyxThreadStatus(database, inbox.id, "owner-1", {
        status: "active",
      }),
    ).toThrow(/THREAD_PROTECTED/);
  });

  it("leaves archived ordinary conversations deletable", () => {
    const database = testDatabase();
    ensureInboxThread(database, "owner-1", null, "Vaenyx");
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_conversations (id, owner_id, title)
         VALUES ('c1', 'owner-1', 'A chat')`,
      )
      .run();
    database.sqlite
      .prepare(
        `INSERT INTO vaenyx_threads (
           id, owner_id, kind, title, status, conversation_id
         ) VALUES ('t1', 'owner-1', 'chat', 'A chat', 'archived', 'c1')`,
      )
      .run();
    expect(isProtectedThread(database, "c1")).toBe(false);
    expect(() =>
      deleteAskVaenyxConversation(database, "c1", "owner-1"),
    ).not.toThrow();
  });
});

describe("when a Mode is deleted", () => {
  it("🔴 takes its inbox with it, so the unique index cannot block the delete", () => {
    // deleteMode sets mode_id = NULL across five tables. Without removing this
    // first, the Custom Mode's inbox would be dragged into User Mode where one
    // already exists, and the whole delete would fail part-way through.
    const database = testDatabase();
    ensureInboxThread(database, "owner-1", null, "Vaenyx");
    ensureInboxThread(database, "owner-1", "mode-yen", "Yen's");

    deleteInboxThreadForMode(database, "mode-yen");

    expect(findInboxThread(database, "mode-yen")).toBeNull();
    expect(findInboxThread(database, null)).not.toBeNull();
    // And the move that follows in deleteMode now succeeds.
    expect(() =>
      database.sqlite
        .prepare("UPDATE vaenyx_threads SET mode_id = NULL WHERE mode_id = ?")
        .run("mode-yen"),
    ).not.toThrow();
  });
});
