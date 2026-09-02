import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { beforeEach, describe, expect, it } from "vitest";

import { runMigrations, type DatabaseHandle } from "../src/db/database.js";
import {
  ensureConversationSearchIndex,
  parseConversationSearchQuery,
  searchConversations,
} from "../src/modules/core/conversation-search.js";

let database: DatabaseHandle;

function freshDatabase(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  runMigrations(sqlite, resolve("migrations"));
  sqlite
    .prepare(
      `INSERT INTO owners (id, name, password_hash, created_at)
       VALUES ('owner', 'Oskar', 'hash', '2026-01-01T00:00:00.000Z'),
              ('other', 'Other', 'hash', '2026-01-01T00:00:00.000Z')`,
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO modes (id, name, rules, created_at, updated_at)
       VALUES ('kid', 'Kid Mode', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
              ('guest', 'Guest Mode', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    )
    .run();
  return { sqlite, close: () => sqlite.close(), ping: () => true };
}

function addConversation(input: {
  id: string;
  modeId?: string | null;
  ownerId?: string;
  status?: "active" | "archived" | "pinned";
  title?: string;
  kind?: "chat" | "inbox" | "task";
}): void {
  const now = "2026-08-01T00:00:00.000Z";
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_conversations
       (id, owner_id, title, created_at, updated_at, mode_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.ownerId ?? "owner",
      input.title ?? input.id,
      now,
      now,
      input.modeId ?? null,
    );
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads
       (id, owner_id, kind, title, status, conversation_id, created_at, updated_at, mode_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `thread-${input.id}`,
      input.ownerId ?? "owner",
      input.kind ?? "chat",
      input.title ?? input.id,
      input.status ?? "active",
      input.id,
      now,
      now,
      input.modeId ?? null,
    );
}

function addMessage(
  id: string,
  conversationId: string,
  content: string,
  createdAt = "2026-08-01T01:00:00.000Z",
): void {
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages
       (id, conversation_id, role, content, status, web_search_used, created_at)
       VALUES (?, ?, 'owner', ?, 'completed', 0, ?)`,
    )
    .run(id, conversationId, content, createdAt);
}

beforeEach(() => {
  database?.close();
  database = freshDatabase();
});

describe("local conversation search", () => {
  it("finds English keywords, Chinese words, and exact quoted phrases", () => {
    addConversation({ id: "main", title: "Groceries" });
    addMessage(
      "m1",
      "main",
      "We bought fresh milk at the corner market. 我们也在超市买了牛奶。",
    );

    expect(
      searchConversations(database, "owner", null, "fresh milk"),
    ).toHaveLength(1);
    expect(searchConversations(database, "owner", null, "牛奶")).toHaveLength(
      1,
    );
    expect(
      searchConversations(database, "owner", null, '"corner market"'),
    ).toHaveLength(1);
    expect(
      searchConversations(database, "owner", null, '"market corner"'),
    ).toHaveLength(0);
    expect(parseConversationSearchQuery('fresh "corner market"').match).toBe(
      '("fresh") AND ("corner market")',
    );
  });

  it("enforces Owner and Mode scope in the MATCH statement", () => {
    addConversation({ id: "user" });
    addConversation({ id: "kid", modeId: "kid" });
    addConversation({ id: "guest", modeId: "guest" });
    addConversation({ id: "other", ownerId: "other" });
    addMessage("m-user", "user", "shared needle user");
    addMessage("m-kid", "kid", "shared needle kid");
    addMessage("m-guest", "guest", "shared needle guest");
    addMessage("m-other", "other", "shared needle other");

    // User Mode is the established supervisory view over this Owner's Modes.
    expect(
      searchConversations(database, "owner", null, "shared needle").map(
        (row) => row.conversationId,
      ),
    ).toEqual(["guest", "kid", "user"]);
    // A Custom Mode cannot see User Mode or another Custom Mode.
    expect(
      searchConversations(database, "owner", "kid", "shared needle").map(
        (row) => row.conversationId,
      ),
    ).toEqual(["kid"]);
  });

  it("returns bounded deterministic results with archive and nearby context", () => {
    addConversation({ id: "archive", status: "archived", title: "Old plans" });
    addMessage(
      "before",
      "archive",
      "context before",
      "2026-08-01T01:00:00.000Z",
    );
    addMessage("match", "archive", "target phrase", "2026-08-01T02:00:00.000Z");
    addMessage("after", "archive", "context after", "2026-08-01T03:00:00.000Z");

    const [result] = searchConversations(database, "owner", null, "target", 1);
    expect(result).toMatchObject({
      messageId: "match",
      archived: true,
      title: "Old plans",
      before: { id: "before", content: "context before" },
      after: { id: "after", content: "context after" },
    });
    expect(result?.highlights).toEqual([{ start: 0, end: 6 }]);
  });

  it("updates and deletes the index in the canonical write transaction", () => {
    addConversation({ id: "changing" });
    addMessage("message", "changing", "old wording");
    expect(searchConversations(database, "owner", null, "old")).toHaveLength(1);

    database.sqlite
      .prepare("UPDATE ask_vaenyx_messages SET content = ? WHERE id = ?")
      .run("new wording", "message");
    expect(searchConversations(database, "owner", null, "old")).toHaveLength(0);
    expect(searchConversations(database, "owner", null, "new")).toHaveLength(1);

    database.sqlite
      .prepare("DELETE FROM ask_vaenyx_conversations WHERE id = ?")
      .run("changing");
    expect(searchConversations(database, "owner", null, "new")).toHaveLength(0);
    expect(
      database.sqlite
        .prepare("SELECT COUNT(*) AS count FROM conversation_message_search")
        .get(),
    ).toEqual({ count: 0 });
  });

  it("moves indexed Mode metadata with the canonical Conversation", () => {
    addConversation({ id: "moving" });
    addMessage("message", "moving", "mode migration needle");
    database.sqlite
      .prepare("UPDATE ask_vaenyx_conversations SET mode_id = ? WHERE id = ?")
      .run("kid", "moving");

    expect(
      database.sqlite
        .prepare(
          "SELECT mode_id FROM conversation_message_search WHERE message_id = ?",
        )
        .get("message"),
    ).toEqual({ mode_id: "kid" });
    expect(
      searchConversations(database, "owner", "kid", "migration needle"),
    ).toHaveLength(1);
  });

  it("repairs a damaged index from canonical messages", () => {
    addConversation({ id: "repair" });
    addMessage("message", "repair", "repair this local index");
    database.sqlite
      .prepare("DELETE FROM conversation_message_search WHERE message_id = ?")
      .run("message");
    expect(searchConversations(database, "owner", null, "repair")).toHaveLength(
      0,
    );
    expect(ensureConversationSearchIndex(database.sqlite)).toBe(true);
    expect(searchConversations(database, "owner", null, "repair")).toHaveLength(
      1,
    );
    expect(ensureConversationSearchIndex(database.sqlite)).toBe(false);
  });

  it("never indexes or previews credential values", () => {
    addConversation({ id: "secrets" });
    addMessage(
      "message",
      "secrets",
      "Use token=super-private-value for the telescope request",
    );
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_messages
         (id, conversation_id, role, content, status, web_search_used, created_at)
         VALUES ('failed', 'secrets', 'assistant', 'provider stderr raw-diagnostic',
                 'failed', 0, '2026-08-01T02:00:00.000Z')`,
      )
      .run();

    expect(
      searchConversations(database, "owner", null, "super-private-value"),
    ).toHaveLength(0);
    const [result] = searchConversations(database, "owner", null, "telescope");
    expect(result?.excerpt).toContain("token=<redacted>");
    expect(result?.excerpt).not.toContain("super-private-value");
    expect(result?.after).toBeNull();
    expect(
      searchConversations(database, "owner", null, "raw-diagnostic"),
    ).toHaveLength(0);
  });
});
