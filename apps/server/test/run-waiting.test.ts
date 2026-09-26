// H-013 addendum (Oskar, 2026-09-27): a run is "waiting for you" only while
// Vaenyx asked a question in that run and the Owner has neither answered nor
// skipped it. These run a real task through the real finish, restart and
// answer paths with a stub model.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  listAskVaenyxMessages,
  resolveAskVaenyxStructuredQuestion,
} from "../src/modules/core/ask-vaenyx.js";
import {
  getLatestTaskRunProgress,
  reconcileInterruptedTasks,
  retryTask,
} from "../src/modules/core/tasks.js";
import { getModelRegistry } from "../src/modules/models/registry.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

afterAll(() => {
  for (const database of databases) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of directories) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-run-waiting-"));
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

const QUESTION_ANSWER = [
  "I found two venues that fit Saturday.",
  "",
  '<!--VAENYX_QUESTION_V1:{"prompt":"Which venue should I book?","options":["Scenic Hall","Harbour Room"]}-->',
].join("\n");

// One task; `opened` decides whether its Conversation already exists.
function seedTask(database: DatabaseHandle, opened: boolean): void {
  const sql = database.sqlite;
  sql
    .prepare("INSERT INTO owners (id, name, password_hash) VALUES (?, ?, ?)")
    .run("owner-1", "Owner", "x");
  sql
    .prepare(
      "INSERT INTO projects (id, name, description) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
    )
    .run("proj-1", "General", "");
  sql
    .prepare(
      `INSERT INTO tasks (id, title, request, result, status, source, project_id,
        provider, harness, agent)
       VALUES ('task-1', 'Book a venue', 'Book a venue for Saturday.', '',
        'completed', 'owner', 'proj-1', 'codex', 'codex-harness', 'Vaenyx')`,
    )
    .run();
  if (opened) {
    sql
      .prepare(
        "INSERT INTO ask_vaenyx_conversations (id, owner_id, title) VALUES (?, ?, ?)",
      )
      .run("conv-1", "owner-1", "Book a venue");
  }
  sql
    .prepare(
      `INSERT INTO vaenyx_threads (id, owner_id, kind, title, conversation_id, task_id)
       VALUES ('task-1', 'owner-1', 'task', 'Book a venue', ?, 'task-1')`,
    )
    .run(opened ? "conv-1" : null);
}

// The model answers from `replies` in order; a function reply may hold the
// turn open until the test releases it.
function stubModel(replies: Array<string | (() => Promise<string>)>): void {
  getModelRegistry().register(
    {
      id: "test-run-waiting",
      name: "Test run waiting",
      healthCheck: () => ({ detail: "test", ok: true }),
      sendChat: async () => {
        const next = replies.shift() ?? "Done.";
        const answer = typeof next === "string" ? next : await next();
        return { answer, webSearchUsed: false };
      },
    },
    true,
  );
}

async function runUntil(
  database: DatabaseHandle,
  state: string,
): Promise<NonNullable<ReturnType<typeof getLatestTaskRunProgress>>> {
  await vi.waitFor(() => {
    expect(getLatestTaskRunProgress(database, "task-1", null)?.state).toBe(
      state,
    );
  });
  return getLatestTaskRunProgress(database, "task-1", null)!;
}

function conversationOf(database: DatabaseHandle): string {
  return (
    database.sqlite
      .prepare(
        "SELECT conversation_id FROM vaenyx_threads WHERE task_id = 'task-1'",
      )
      .get() as { conversation_id: string }
  ).conversation_id;
}

function openQuestionId(database: DatabaseHandle): string {
  return (
    database.sqlite
      .prepare(
        "SELECT id FROM ask_vaenyx_structured_questions WHERE resolved_at IS NULL",
      )
      .get() as { id: string }
  ).id;
}

describe("a run waiting for the Owner", () => {
  it("waits on its question, survives a restart, resumes on the answer and settles on the reply", async () => {
    const database = createTestDatabase();
    seedTask(database, true);
    let release: (value: string) => void = () => undefined;
    stubModel([
      QUESTION_ANSWER,
      () =>
        new Promise<string>((resolveReply) => {
          release = resolveReply;
        }),
    ]);

    retryTask(database, "task-1");
    const waiting = await runUntil(database, "waiting_for_owner");
    expect(waiting.statusText).toBe(
      "Vaenyx asked you a question. Answer it to continue.",
    );
    // The card opens the question: the outcome message carries it.
    const asked = listAskVaenyxMessages(database, "conv-1", "owner-1").find(
      (message) => message.id === waiting.outcomeMessageId,
    );
    expect(asked?.parts?.[0]).toMatchObject({
      type: "structured-question",
      prompt: "Which venue should I book?",
      state: { status: "open" },
    });
    expect(asked?.content).not.toContain("VAENYX_QUESTION_V1");

    // A restart leaves an unanswered question waiting, not interrupted.
    reconcileInterruptedTasks(database);
    expect(getLatestTaskRunProgress(database, "task-1", null)).toEqual(waiting);

    // Answering resumes the run; the reply settles it.
    const answered = resolveAskVaenyxStructuredQuestion(
      database,
      "conv-1",
      "owner-1",
      null,
      openQuestionId(database),
      { kind: "choice", optionId: "option-1" },
    );
    const resumed = await runUntil(database, "running");
    expect(resumed.revision).toBeGreaterThan(waiting.revision);
    release("Booked Scenic Hall for Saturday.");
    const reply = await answered;
    const done = await runUntil(database, "completed");
    expect(done.outcomeMessageId).toBe(reply.messages.at(-1)?.id);
    expect(done.revision).toBeGreaterThan(resumed.revision);
  });

  it("seeds the Conversation of a never-opened task so its question has a home", async () => {
    const database = createTestDatabase();
    seedTask(database, false);
    stubModel([QUESTION_ANSWER]);

    retryTask(database, "task-1");
    const waiting = await runUntil(database, "waiting_for_owner");
    const conversationId = conversationOf(database);
    expect(waiting.conversationId).toBe(conversationId);
    const messages = listAskVaenyxMessages(database, conversationId, "owner-1");
    expect(
      messages.find((message) => message.id === waiting.outcomeMessageId)
        ?.parts?.[0]?.type,
    ).toBe("structured-question");
  });

  it("never waits for pending Inbox items — only for a question", async () => {
    const database = createTestDatabase();
    seedTask(database, true);
    database.sqlite
      .prepare(
        `INSERT INTO inbox_items (id, mode_id, source_kind, source_id)
         VALUES ('inbox-1', NULL, 'vaenyx_me_candidate', 'candidate-1')`,
      )
      .run();
    stubModel(["Saturday: Scenic Hall is free from 10am."]);

    retryTask(database, "task-1");
    await runUntil(database, "completed");
  });

  it("a Skip also resumes the run, and a follow-up question makes it wait again", async () => {
    const database = createTestDatabase();
    seedTask(database, true);
    stubModel([
      QUESTION_ANSWER,
      'Without a choice I need one detail.\n\n<!--VAENYX_QUESTION_V1:{"prompt":"How many guests?","options":["Under 20","20 or more"]}-->',
    ]);

    retryTask(database, "task-1");
    const first = await runUntil(database, "waiting_for_owner");
    await resolveAskVaenyxStructuredQuestion(
      database,
      "conv-1",
      "owner-1",
      null,
      openQuestionId(database),
      { kind: "skip" },
    );
    const again = getLatestTaskRunProgress(database, "task-1", null)!;
    expect(again.state).toBe("waiting_for_owner");
    expect(again.outcomeMessageId).not.toBe(first.outcomeMessageId);
  });

  it("a reply cut off by a restart is interrupted, with the answer kept", async () => {
    const database = createTestDatabase();
    seedTask(database, true);
    stubModel([QUESTION_ANSWER, () => new Promise<string>(() => undefined)]);

    retryTask(database, "task-1");
    await runUntil(database, "waiting_for_owner");
    void resolveAskVaenyxStructuredQuestion(
      database,
      "conv-1",
      "owner-1",
      null,
      openQuestionId(database),
      { kind: "choice", optionId: "option-2" },
    );
    await runUntil(database, "running");

    reconcileInterruptedTasks(database);
    const progress = getLatestTaskRunProgress(database, "task-1", null)!;
    expect(progress.state).toBe("interrupted");
    expect(progress.statusText).toContain("Your answer was saved");
    expect(
      database.sqlite
        .prepare(
          "SELECT resolution_display_text FROM ask_vaenyx_structured_questions",
        )
        .get(),
    ).toEqual({ resolution_display_text: "Harbour Room" });
  });
});
