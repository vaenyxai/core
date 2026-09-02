import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  advanceTaskRunProgress,
  cancelTask,
  getLatestTaskRunProgress,
  listTaskRuns,
  reconcileInterruptedTasks,
} from "../src/modules/core/tasks.js";

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
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-progress-"));
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

function seedRunningTask(database: DatabaseHandle): void {
  database.sqlite
    .prepare("INSERT INTO owners (id, name, password_hash) VALUES (?, ?, ?)")
    .run("owner-1", "Owner", "x");
  database.sqlite
    .prepare(
      "INSERT INTO projects (id, name, description) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
    )
    .run("project-1", "General", "");
  database.sqlite
    .prepare(
      `INSERT INTO tasks (
        id, title, request, result, status, source, project_id,
        provider, harness, agent, mode_id
       ) VALUES (
        'task-1', 'Durable work', 'Do the work', '', 'running', 'owner',
        'project-1', 'codex', 'codex-harness', 'Vaenyx', NULL
       )`,
    )
    .run();
  database.sqlite
    .prepare(
      `INSERT INTO task_runs (
        id, task_id, status, result, trigger, started_at, finished_at,
        progress_revision, progress_state, progress_current_step,
        progress_completed_steps_json, progress_status_text, progress_updated_at
       ) VALUES (
        'run-1', 'task-1', 'running', '', 'manual',
        '2026-09-02T00:00:00.000Z', NULL, 1, 'queued', 'Preparing task',
        '[]', 'Queued to start.', '2026-09-02T00:00:00.000Z'
       )`,
    )
    .run();
}

describe("durable task progress", () => {
  it("keeps one bounded snapshot and ignores stale revisions", () => {
    const database = createTestDatabase();
    seedRunningTask(database);

    advanceTaskRunProgress(database, "run-1", 5, {
      state: "waiting_for_owner",
      currentStep: "Waiting\u0000 for your choice",
      completedSteps: Array.from({ length: 20 }, (_, index) => `Step ${index}`),
      statusText: "x".repeat(400),
    });
    advanceTaskRunProgress(database, "run-1", 3, {
      state: "running",
      currentStep: "Stale update",
      completedSteps: [],
      statusText: "This must not win.",
    });

    const progress = getLatestTaskRunProgress(database, "task-1", null);
    expect(progress).toMatchObject({
      revision: 5,
      state: "waiting_for_owner",
      currentStep: "Waiting  for your choice",
    });
    expect(progress?.completedSteps).toHaveLength(12);
    expect(progress?.completedSteps[0]).toBe("Step 8");
    expect(progress?.statusText).toHaveLength(240);
    expect(listTaskRuns(database, "task-1", null)[0]?.progress).toEqual(
      progress,
    );
  });

  it("enforces the active Mode before returning progress or history", () => {
    const database = createTestDatabase();
    seedRunningTask(database);

    expect(getLatestTaskRunProgress(database, "task-1", null)?.runId).toBe(
      "run-1",
    );
    expect(() =>
      getLatestTaskRunProgress(database, "task-1", "mode-elsewhere"),
    ).toThrow("TASK_NOT_FOUND");
    expect(() =>
      listTaskRuns(database, "task-1", "mode-elsewhere"),
    ).toThrow("TASK_NOT_FOUND");
  });

  it("reconciles a restart into an explicit interrupted state", () => {
    const database = createTestDatabase();
    seedRunningTask(database);

    expect(reconcileInterruptedTasks(database)).toBe(1);
    const progress = getLatestTaskRunProgress(database, "task-1", null);
    expect(progress).toMatchObject({
      revision: 100,
      state: "interrupted",
      currentStep: null,
      completedSteps: ["Started"],
      statusText: "Task was interrupted by a restart. Retry when ready.",
    });
    expect(progress?.finishedAt).not.toBeNull();
  });

  it("records cancellation as its own terminal progress state", () => {
    const database = createTestDatabase();
    seedRunningTask(database);

    expect(cancelTask(database, "task-1", null)).toMatchObject({
      status: "failed",
      result: "This task was cancelled.",
    });
    expect(getLatestTaskRunProgress(database, "task-1", null)).toMatchObject({
      revision: 100,
      state: "cancelled",
      currentStep: null,
      statusText: "Task was cancelled. Retry when ready.",
    });
  });
});
