import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { runMigrations, type DatabaseHandle } from "../src/db/database.js";
import { deleteAskVaenyxConversationWithMemory } from "../src/modules/core/ask-vaenyx.js";
import {
  approveFactCandidate,
  idleConversations,
  queueProposedFacts,
} from "../src/modules/core/facts-extract.js";
import { listCurrentFacts, recordFact } from "../src/modules/core/facts.js";
import {
  addMemoryProvenance,
  forgetMemoryFromConversation,
  listMemoryProvenance,
  previewConversationForget,
  setConversationSourceExcluded,
} from "../src/modules/core/memory-provenance.js";

let database: DatabaseHandle;

function freshDatabase(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  runMigrations(sqlite, resolve("migrations"));
  sqlite
    .prepare(
      `INSERT INTO owners (id, name, password_hash)
       VALUES ('owner-1', 'Owner', 'test-only')`,
    )
    .run();
  return { close: () => sqlite.close(), ping: () => true, sqlite };
}

function addConversation(
  id: string,
  status: "active" | "archived" = "active",
  modeId: string | null = null,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_conversations (id, owner_id, title, mode_id)
       VALUES (?, 'owner-1', ?, ?)`,
    )
    .run(id, `Conversation ${id}`, modeId);
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (
         id, owner_id, kind, title, status, conversation_id, mode_id
       ) VALUES (?, 'owner-1', 'chat', ?, ?, ?, ?)`,
    )
    .run(`thread-${id}`, `Conversation ${id}`, status, id, modeId);
}

beforeEach(() => {
  database = freshDatabase();
});

describe("derived Memory provenance", () => {
  it("uses the current product name in untouched profile seeds", () => {
    const seeds = database.sqlite
      .prepare(
        `SELECT id, summary FROM vaenyx_me_items
         WHERE id IN ('owner-identity', 'communication-style')
         ORDER BY id`,
      )
      .all();

    expect(seeds).toEqual([
      {
        id: "communication-style",
        summary:
          "How the Owner prefers Vaenyx to explain, summarize, and ask questions.",
      },
      {
        id: "owner-identity",
        summary:
          "Vaenyx only knows the Owner name until the Owner approves more personal context.",
      },
    ]);
  });

  it("preserves source union and removes only the selected source", () => {
    addConversation("chat-one");
    addConversation("chat-two");
    const fact = recordFact(database, {
      admissionEventId: "approval-one",
      slot: "pet",
      sourceConversationId: "chat-one",
      sourceKind: "owner",
      value: "a cat called Mo",
    });
    recordFact(database, {
      admissionEventId: "approval-two",
      slot: "pet",
      sourceConversationId: "chat-two",
      sourceKind: "owner",
      value: "a cat called Mo",
    });

    expect(
      listMemoryProvenance(database, "fact", fact.id, null).sources,
    ).toHaveLength(2);
    setConversationSourceExcluded(database, {
      conversationId: "chat-two",
      excluded: true,
      modeId: null,
      ownerId: "owner-1",
    });
    const firstPreview = previewConversationForget(database, {
      conversationId: "chat-one",
      modeId: null,
      ownerId: "owner-1",
    });
    expect(firstPreview.items).toEqual([
      expect.objectContaining({
        memoryId: fact.id,
        outcome: "retain",
        reason: "independent_source",
      }),
    ]);
    forgetMemoryFromConversation(database, {
      action: "source_forget",
      conversationId: "chat-one",
      modeId: null,
      ownerId: "owner-1",
      previewRevision: firstPreview.revision,
    });
    expect(listCurrentFacts(database)).toHaveLength(1);
    expect(
      listMemoryProvenance(database, "fact", fact.id, null).sources,
    ).toEqual([expect.objectContaining({ sourceId: "chat-two" })]);

    const secondPreview = previewConversationForget(database, {
      conversationId: "chat-two",
      modeId: null,
      ownerId: "owner-1",
    });
    expect(secondPreview.items[0]).toMatchObject({
      outcome: "forget",
      reason: "selected_source_only",
    });
    forgetMemoryFromConversation(database, {
      action: "source_forget",
      conversationId: "chat-two",
      modeId: null,
      ownerId: "owner-1",
      previewRevision: secondPreview.revision,
    });
    expect(listCurrentFacts(database)).toHaveLength(0);
    expect(
      database.sqlite
        .prepare(`SELECT COUNT(*) AS count FROM memory_forget_events`)
        .get(),
    ).toEqual({ count: 2 });
  });

  it("labels unknown legacy provenance and refuses an overconfident forget", () => {
    addConversation("legacy-chat");
    const fact = recordFact(database, {
      admissionEventId: "known-source",
      slot: "school",
      sourceConversationId: "legacy-chat",
      sourceKind: "owner",
      value: "Ashgrove Primary",
    });
    addMemoryProvenance(database, {
      admissionEventId: "legacy-unavailable",
      memoryId: fact.id,
      memoryKind: "fact",
      modeId: null,
      sources: [{ sourceKind: "unavailable" }],
    });

    const preview = previewConversationForget(database, {
      conversationId: "legacy-chat",
      modeId: null,
      ownerId: "owner-1",
    });
    expect(preview.legacyUnknownCount).toBe(1);
    expect(preview.items[0]).toMatchObject({
      outcome: "retain",
      reason: "legacy_unavailable",
    });
  });
});

describe("source exclusion", () => {
  it("blocks scans, queueing, and approval until the Owner allows the source", () => {
    addConversation("excluded-chat");
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_messages (
           id, conversation_id, role, content, created_at
         ) VALUES ('message-1', 'excluded-chat', 'owner', 'I have a dog.', '2020-01-01T00:00:00.000Z')`,
      )
      .run();
    queueProposedFacts(database, {
      conversationId: "excluded-chat",
      modeId: null,
      ownerId: "owner-1",
      proposals: [{ evidence: "I have a dog.", slot: "pet", value: "a dog" }],
    });
    const candidate = database.sqlite
      .prepare(
        `SELECT id FROM vaenyx_me_candidates WHERE proposed_slot = 'pet'`,
      )
      .get() as { id: string };

    setConversationSourceExcluded(database, {
      conversationId: "excluded-chat",
      excluded: true,
      modeId: null,
      ownerId: "owner-1",
    });
    expect(idleConversations(database, Date.now(), 0)).toEqual([]);
    expect(
      queueProposedFacts(database, {
        conversationId: "excluded-chat",
        modeId: null,
        ownerId: "owner-1",
        proposals: [{ evidence: "I have a dog.", slot: "pet", value: "a dog" }],
      }),
    ).toBe(0);
    expect(() =>
      approveFactCandidate(database, candidate.id, "owner-1", null),
    ).toThrow("MEMORY_SOURCE_EXCLUDED");
    expect(listCurrentFacts(database)).toEqual([]);

    setConversationSourceExcluded(database, {
      conversationId: "excluded-chat",
      excluded: false,
      modeId: null,
      ownerId: "owner-1",
    });
    expect(() =>
      approveFactCandidate(database, candidate.id, "owner-1", null),
    ).not.toThrow();
  });
});

describe("permanent Conversation deletion", () => {
  it("rolls back a stale preview and atomically forgets with a current one", () => {
    addConversation("delete-chat", "archived");
    recordFact(database, {
      admissionEventId: "delete-source",
      slot: "employer",
      sourceConversationId: "delete-chat",
      sourceKind: "owner",
      value: "Ashgrove Joinery",
    });
    const preview = previewConversationForget(database, {
      conversationId: "delete-chat",
      modeId: null,
      ownerId: "owner-1",
      requireArchived: true,
    });

    expect(() =>
      deleteAskVaenyxConversationWithMemory(
        database,
        "delete-chat",
        "owner-1",
        { memoryAction: "forget", modeId: null, previewRevision: "stale" },
      ),
    ).toThrow("MEMORY_PREVIEW_CHANGED");
    expect(
      database.sqlite
        .prepare(
          `SELECT id FROM ask_vaenyx_conversations WHERE id = 'delete-chat'`,
        )
        .get(),
    ).toEqual({ id: "delete-chat" });
    expect(listCurrentFacts(database)).toHaveLength(1);

    deleteAskVaenyxConversationWithMemory(database, "delete-chat", "owner-1", {
      memoryAction: "forget",
      modeId: null,
      previewRevision: preview.revision,
    });
    expect(
      database.sqlite
        .prepare(
          `SELECT id FROM ask_vaenyx_conversations WHERE id = 'delete-chat'`,
        )
        .get(),
    ).toBeUndefined();
    expect(listCurrentFacts(database)).toHaveLength(0);
  });

  it("keeps learned Memory when the Owner explicitly chooses that option", () => {
    addConversation("keep-chat", "archived");
    const fact = recordFact(database, {
      admissionEventId: "keep-source",
      slot: "vehicle",
      sourceConversationId: "keep-chat",
      sourceKind: "owner",
      value: "blue hatchback",
    });
    const preview = previewConversationForget(database, {
      conversationId: "keep-chat",
      modeId: null,
      ownerId: "owner-1",
      requireArchived: true,
    });
    deleteAskVaenyxConversationWithMemory(database, "keep-chat", "owner-1", {
      memoryAction: "keep",
      modeId: null,
      previewRevision: preview.revision,
    });

    expect(listCurrentFacts(database)).toHaveLength(1);
    expect(
      listMemoryProvenance(database, "fact", fact.id, null).sources[0],
    ).toMatchObject({
      available: false,
      sourceId: "keep-chat",
    });
  });
});
