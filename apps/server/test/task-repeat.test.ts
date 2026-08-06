import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { getModelRegistry } from "../src/modules/models/registry.js";
import { retryTask } from "../src/modules/core/tasks.js";

// A recurring task used to be handed its own previous outputs inside the
// "honor any format, scope or preference" transcript — which is an
// instruction to produce that same thing again, and is why a daily news task
// re-reported the same stories every morning (Oskar, 2026-08-07). These tests
// hold the fix in place: delivered CONTENT arrives under a do-not-repeat
// heading, and never under the honor-this one.

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

const YESTERDAY_DELIVERY =
  "1. Royal Commission terms of reference still unpublished.\n2. ABS building approvals due Friday.";

function seedTask(database: DatabaseHandle): string {
  const sql = database.sqlite;
  sql
    .prepare("INSERT INTO owners (id, name, password_hash) VALUES (?, ?, ?)")
    .run("owner-1", "Owner", "x");
  sql
    .prepare(
      "INSERT INTO projects (id, name, description) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
    )
    .run("proj-1", "News", "");
  sql
    .prepare(
      `INSERT INTO tasks (id, title, request, result, status, source, project_id,
        provider, harness, agent)
       VALUES (?, ?, ?, '', 'completed', 'owner', 'proj-1', 'codex', 'codex-harness', 'Vaenyx')`,
    )
    .run("task-1", "Construction news", "Today's construction news, please.");
  sql
    .prepare(
      "INSERT INTO ask_vaenyx_conversations (id, owner_id, title) VALUES (?, ?, ?)",
    )
    .run("conv-1", "owner-1", "Construction news");
  sql
    .prepare(
      `INSERT INTO vaenyx_threads (id, owner_id, kind, title, conversation_id, task_id)
       VALUES (?, ?, 'task', ?, ?, ?)`,
    )
    .run("thread-1", "owner-1", "Construction news", "conv-1", "task-1");
  // Yesterday's run: recorded as a run AND posted into the task's chat, which
  // is exactly how the real thing stores it.
  sql
    .prepare(
      `INSERT INTO task_runs (id, task_id, status, result, trigger, started_at, finished_at)
       VALUES (?, ?, 'completed', ?, 'schedule', ?, ?)`,
    )
    .run(
      "run-1",
      "task-1",
      YESTERDAY_DELIVERY,
      "2026-08-06T21:00:00.000Z",
      "2026-08-06T21:02:00.000Z",
    );
  sql
    .prepare(
      `INSERT INTO ask_vaenyx_messages (id, conversation_id, role, content, status,
        web_search_used, created_at)
       VALUES (?, ?, 'assistant', ?, 'completed', 0, ?)`,
    )
    .run("msg-1", "conv-1", YESTERDAY_DELIVERY, "2026-08-06T21:02:00.000Z");
  return "task-1";
}

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-taskrepeat-"));
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

// Runs the task for real and hands back the context the provider was given.
async function contextForNextRun(database: DatabaseHandle): Promise<string> {
  let captured = "";
  let resolveSeen: (value: string) => void = () => undefined;
  const seen = new Promise<string>((resolveContext) => {
    resolveSeen = resolveContext;
  });
  getModelRegistry().register(
    {
      id: "test-capture",
      name: "Test capture",
      healthCheck: () => ({ detail: "test", ok: true }),
      sendChat: (_messages, projectContext) => {
        captured = projectContext ?? "";
        resolveSeen(captured);
        return Promise.resolve({ answer: "new answer", webSearchUsed: false });
      },
    },
    true,
  );
  retryTask(database, "task-1");
  return await seen;
}

describe("a recurring task is told not to repeat itself", () => {
  it("hands the previous delivery over as delivered, never as a template", async () => {
    const database = createTestDatabase();
    seedTask(database);
    const context = await contextForNextRun(database);

    // The delivery is there, once, under the do-not-repeat heading.
    expect(context).toContain("already delivered");
    expect(context).toContain(YESTERDAY_DELIVERY);
    expect(context).toContain("ALREADY READ");
    expect(context).toContain("Widen the net on purpose");
    // …and the honour-this transcript, which is what made it repeat, is not
    // where that delivery ended up.
    const honourIndex = context.indexOf("FINISHED SETTINGS");
    const deliveredIndex = context.indexOf("already delivered");
    if (honourIndex >= 0) {
      const honourBlock = context.slice(honourIndex, deliveredIndex);
      expect(honourBlock).not.toContain(YESTERDAY_DELIVERY);
    }
  });

  it("says nothing about repeats on a task's first ever run", async () => {
    const database = createTestDatabase();
    seedTask(database);
    database.sqlite.prepare("DELETE FROM task_runs").run();
    database.sqlite.prepare("DELETE FROM ask_vaenyx_messages").run();
    const context = await contextForNextRun(database);

    expect(context).not.toContain("already delivered");
    expect(context).not.toContain("ALREADY READ");
  });

  it("keeps the Owner's own instructions as settings to honour", async () => {
    const database = createTestDatabase();
    seedTask(database);
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_messages (id, conversation_id, role, content, status,
          web_search_used, created_at)
         VALUES (?, ?, 'owner', ?, 'completed', 0, ?)`,
      )
      .run(
        "msg-2",
        "conv-1",
        "Keep it to five bullets and always link the source.",
        "2026-08-06T22:00:00.000Z",
      );
    const context = await contextForNextRun(database);

    expect(context).toContain("FINISHED SETTINGS");
    expect(context).toContain("Keep it to five bullets");
  });
});
