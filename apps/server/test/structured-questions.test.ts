import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { beforeEach, describe, expect, it } from "vitest";

import { runMigrations, type DatabaseHandle } from "../src/db/database.js";
import {
  claimStructuredQuestionResolution,
  extractStructuredQuestion,
  insertStructuredQuestion,
  structuredQuestionAllowance,
} from "../src/modules/core/structured-questions.js";

let database: DatabaseHandle;

function freshDatabase(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  runMigrations(sqlite, resolve("migrations"));
  sqlite
    .prepare(
      `INSERT INTO owners (id, name, password_hash, created_at)
       VALUES ('owner', 'Oskar', 'hash', '2026-01-01T00:00:00.000Z')`,
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_conversations
       (id, owner_id, title, created_at, updated_at)
       VALUES ('chat', 'owner', 'Choices', ?, ?)`,
    )
    .run("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
  return { sqlite, close: () => sqlite.close(), ping: () => true };
}

function addQuestion(
  id: string,
  messageId: string,
  loopDepth: 1 | 2 = 1,
): void {
  const draft = extractStructuredQuestion(
    'Choose.\n<!--VAENYX_QUESTION_V1:{"prompt":"Which route?","options":["Scenic","Fast"]}-->',
  ).draft!;
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages
       (id, conversation_id, role, content, status, web_search_used, created_at)
       VALUES (?, 'chat', 'assistant', ?, 'completed', 0, ?)`,
    )
    .run(messageId, draft.plainTextFallback, "2026-01-01T00:00:01.000Z");
  insertStructuredQuestion(database, {
    id,
    conversationId: "chat",
    assistantMessageId: messageId,
    draft,
    loopDepth,
    createdAt: "2026-01-01T00:00:01.000Z",
  });
}

beforeEach(() => {
  database?.close();
  database = freshDatabase();
});

describe("structured questions", () => {
  it("extracts one safe v1 part and leaves a complete plain-text fallback", () => {
    const result = extractStructuredQuestion(
      'I need one decision.\n<!--VAENYX_QUESTION_V1:{"prompt":"Which <route>?","helpText":"Pick one\\u0000 now","options":["Scenic","Fast","Fast"]}-->',
    );
    expect(result.draft).toMatchObject({
      prompt: "Which route?",
      helpText: "Pick one now",
      options: [
        { id: "option-1", label: "Scenic" },
        { id: "option-2", label: "Fast" },
      ],
    });
    expect(result.content).not.toContain("VAENYX_QUESTION");
    expect(result.content).toContain("Other: write your own answer");
    expect(result.content).toContain("Skip: give no answer");
    expect(
      extractStructuredQuestion(
        '<!--VAENYX_QUESTION_V1:{"prompt":"Only one","options":["One"]}-->',
      ).draft,
    ).toBeNull();
  });

  it("makes the first resolution canonical and audits every retry", () => {
    addQuestion("question", "assistant");
    const first = claimStructuredQuestionResolution(
      database,
      "chat",
      "owner",
      null,
      "question",
      { kind: "choice", optionId: "option-1" },
      "2026-01-01T00:00:02.000Z",
    );
    const retry = claimStructuredQuestionResolution(
      database,
      "chat",
      "owner",
      null,
      "question",
      { kind: "skip" },
      "2026-01-01T00:00:03.000Z",
    );

    expect(first).toMatchObject({ accepted: true, content: "Scenic" });
    expect(retry).toMatchObject({
      accepted: false,
      content: "Scenic",
      ownerMessageId: first.ownerMessageId,
    });
    expect(
      database.sqlite
        .prepare(
          `SELECT resolution_kind, resolution_option_id,
                  resolution_display_text
           FROM ask_vaenyx_structured_questions WHERE id = 'question'`,
        )
        .get(),
    ).toEqual({
      resolution_kind: "choice",
      resolution_option_id: "option-1",
      resolution_display_text: "Scenic",
    });
    expect(
      database.sqlite
        .prepare(
          `SELECT COUNT(*) AS count, SUM(accepted) AS accepted
           FROM ask_vaenyx_structured_question_attempts
           WHERE question_id = 'question'`,
        )
        .get(),
    ).toEqual({ count: 2, accepted: 1 });
  });

  it("accepts bounded free text and records Skip as no answer", () => {
    addQuestion("free", "assistant-free");
    addQuestion("skip", "assistant-skip");

    const free = claimStructuredQuestionResolution(
      database,
      "chat",
      "owner",
      null,
      "free",
      { kind: "free_text", text: "  Take <the> train  " },
    );
    const skipped = claimStructuredQuestionResolution(
      database,
      "chat",
      "owner",
      null,
      "skip",
      { kind: "skip" },
    );

    expect(free.content).toBe("Take the train");
    expect(skipped.content).toBe("[Skipped — no answer given]");
    expect(
      database.sqlite
        .prepare(
          `SELECT resolution_kind, resolution_option_id, resolution_text
           FROM ask_vaenyx_structured_questions WHERE id = 'skip'`,
        )
        .get(),
    ).toEqual({
      resolution_kind: "skip",
      resolution_option_id: null,
      resolution_text: null,
    });
  });

  it("caps open questions and stops a third question in one answer chain", () => {
    addQuestion("one", "assistant-one", 1);
    expect(structuredQuestionAllowance(database, "chat", "one")).toEqual({
      allowed: true,
      loopDepth: 2,
    });
    addQuestion("two", "assistant-two", 2);
    expect(structuredQuestionAllowance(database, "chat", "two")).toEqual({
      allowed: false,
      loopDepth: 1,
    });
    addQuestion("three", "assistant-three", 1);
    expect(structuredQuestionAllowance(database, "chat")).toEqual({
      allowed: false,
      loopDepth: 1,
    });
  });
});
