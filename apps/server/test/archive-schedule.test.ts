import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { deleteAskVaenyxConversation } from "../src/modules/core/ask-vaenyx.js";
import {
  getPushDiagnostics,
  schedulePresenceAwarePush,
} from "../src/modules/core/push.js";
import { runDueTasks, setTaskSchedule } from "../src/modules/core/tasks.js";
import { updateVaenyxThreadStatus } from "../src/modules/core/threads.js";

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
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-archive-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  database.sqlite
    .prepare("INSERT INTO owners (id, name, password_hash) VALUES (?, ?, ?)")
    .run("owner-1", "Owner", "x");
  database.sqlite
    .prepare(
      "INSERT INTO projects (id, name, description) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
    )
    .run("project-1", "Project", "Test project");
  return database;
}

function seedTaskThread(
  database: DatabaseHandle,
  id: string,
  options: {
    cadence?: "hourly" | "daily" | "weekly" | "monthly" | null;
    enabled?: boolean;
    nextRunAt?: string | null;
    status?: "active" | "pinned" | "archived";
  } = {},
): void {
  const cadence = options.cadence === undefined ? "weekly" : options.cadence;
  const enabled = options.enabled ?? true;
  database.sqlite
    .prepare(
      `INSERT INTO tasks (
         id, title, request, result, status, source, project_id, provider,
         harness, agent, schedule_cadence, schedule_time,
         schedule_day_of_week, schedule_enabled, next_run_at
       ) VALUES (?, ?, 'Do the task', '', 'completed', 'owner', 'project-1',
         'codex', 'codex-harness', 'Vaenyx', ?, '07:30', 2, ?, ?)`,
    )
    .run(
      id,
      `Task ${id}`,
      cadence,
      enabled ? 1 : 0,
      options.nextRunAt === undefined
        ? enabled
          ? "2026-09-02T00:00:00.000Z"
          : null
        : options.nextRunAt,
    );
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (
         id, owner_id, kind, title, project_id, status, task_id
       ) VALUES (?, 'owner-1', 'task', ?, 'project-1', ?, ?)`,
    )
    .run(`thread-${id}`, `Task ${id}`, options.status ?? "active", id);
}

function readSchedule(database: DatabaseHandle, taskId: string) {
  return database.sqlite
    .prepare(
      `SELECT schedule_cadence, schedule_time, schedule_day_of_week,
              schedule_day_of_month, schedule_enabled, next_run_at,
              schedule_paused_by_archive
       FROM tasks WHERE id = ?`,
    )
    .get(taskId) as {
    schedule_cadence: string | null;
    schedule_time: string | null;
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
    schedule_enabled: number;
    next_run_at: string | null;
    schedule_paused_by_archive: number;
  };
}

describe("Archive and Schedule semantics", () => {
  it("atomically pauses an enabled Schedule, preserves its setup, and Restore stays paused", () => {
    const database = createTestDatabase();
    seedTaskThread(database, "scheduled");

    updateVaenyxThreadStatus(database, "thread-scheduled", "owner-1", {
      status: "archived",
    });

    expect(readSchedule(database, "scheduled")).toEqual({
      schedule_cadence: "weekly",
      schedule_time: "07:30",
      schedule_day_of_week: 2,
      schedule_day_of_month: null,
      schedule_enabled: 0,
      next_run_at: null,
      schedule_paused_by_archive: 1,
    });

    updateVaenyxThreadStatus(database, "thread-scheduled", "owner-1", {
      status: "active",
    });
    expect(readSchedule(database, "scheduled").schedule_enabled).toBe(0);
    expect(readSchedule(database, "scheduled").schedule_paused_by_archive).toBe(
      1,
    );

    const resumed = setTaskSchedule(database, "scheduled", {
      cadence: "weekly",
      enabled: true,
      time: "07:30",
      dayOfWeek: 2,
    });
    expect(resumed.scheduleEnabled).toBe(true);
    expect(resumed.schedulePausedByArchive).toBe(false);
    expect(resumed.nextRunAt).not.toBeNull();
  });

  it("distinguishes a Schedule the Owner had already disabled", () => {
    const database = createTestDatabase();
    seedTaskThread(database, "already-off", { enabled: false });

    updateVaenyxThreadStatus(database, "thread-already-off", "owner-1", {
      status: "archived",
    });
    updateVaenyxThreadStatus(database, "thread-already-off", "owner-1", {
      status: "active",
    });

    const schedule = readSchedule(database, "already-off");
    expect(schedule.schedule_cadence).toBe("weekly");
    expect(schedule.schedule_time).toBe("07:30");
    expect(schedule.schedule_enabled).toBe(0);
    expect(schedule.schedule_paused_by_archive).toBe(0);
  });

  it("applies the same pause and restore semantics to every bulk item", () => {
    const database = createTestDatabase();
    seedTaskThread(database, "bulk-a");
    seedTaskThread(database, "bulk-b");

    for (const id of ["bulk-a", "bulk-b"]) {
      updateVaenyxThreadStatus(database, `thread-${id}`, "owner-1", {
        status: "archived",
      });
    }
    for (const id of ["bulk-a", "bulk-b"]) {
      expect(readSchedule(database, id).schedule_paused_by_archive).toBe(1);
      updateVaenyxThreadStatus(database, `thread-${id}`, "owner-1", {
        status: "active",
      });
      expect(readSchedule(database, id).schedule_enabled).toBe(0);
    }
  });

  it("fences a due row when Archive wins after polling but before claim", () => {
    const database = createTestDatabase();
    seedTaskThread(database, "race", {
      nextRunAt: "2000-01-01T00:00:00.000Z",
    });

    const launched = runDueTasks(database, () => {
      updateVaenyxThreadStatus(database, "thread-race", "owner-1", {
        status: "archived",
      });
    });

    expect(launched).toBe(0);
    expect(
      database.sqlite
        .prepare("SELECT COUNT(*) AS n FROM task_runs WHERE task_id = ?")
        .get("race"),
    ).toEqual({ n: 0 });
    expect(readSchedule(database, "race").next_run_at).toBeNull();
  });

  it("never claims an archived task even if stale database state says enabled after restart", () => {
    const database = createTestDatabase();
    seedTaskThread(database, "restart", {
      nextRunAt: "2000-01-01T00:00:00.000Z",
      status: "archived",
    });

    expect(runDueTasks(database)).toBe(0);
    expect(
      database.sqlite
        .prepare("SELECT COUNT(*) AS n FROM task_runs WHERE task_id = ?")
        .get("restart"),
    ).toEqual({ n: 0 });
  });

  it("cancels a scheduled-result notification that is still waiting when Archive lands", () => {
    vi.useFakeTimers();
    try {
      const database = createTestDatabase();
      seedTaskThread(database, "pending-push");
      schedulePresenceAwarePush(
        database,
        { title: "Task", body: "Ready", url: "/?task=pending-push" },
        "scheduled",
        { modeId: null },
        { key: "scheduled-task:pending-push" },
      );

      updateVaenyxThreadStatus(database, "thread-pending-push", "owner-1", {
        status: "archived",
      });
      vi.advanceTimersByTime(40_000);

      expect(getPushDiagnostics(database).lastResult).toContain(
        "scheduled Conversation was archived",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses Resume while the Conversation is still Archived", () => {
    const database = createTestDatabase();
    seedTaskThread(database, "no-resume");
    updateVaenyxThreadStatus(database, "thread-no-resume", "owner-1", {
      status: "archived",
    });

    expect(() =>
      setTaskSchedule(database, "no-resume", {
        cadence: "weekly",
        enabled: true,
        time: "07:30",
        dayOfWeek: 2,
      }),
    ).toThrow("TASK_THREAD_ARCHIVED");
  });

  it("keeps Project, Memory and Routine data, and only permits delete from Archived", () => {
    const database = createTestDatabase();
    database.sqlite
      .prepare(
        "INSERT INTO project_memories (id, project_id, title, content) VALUES (?, ?, ?, ?)",
      )
      .run("memory-1", "project-1", "Memory", "Keep me");
    database.sqlite
      .prepare(
        "INSERT INTO routine_journal (id, routine_id, content) VALUES (?, ?, ?)",
      )
      .run("journal-1", "shared-routine", "Keep me too");
    database.sqlite
      .prepare(
        "INSERT INTO ask_vaenyx_conversations (id, owner_id, title) VALUES (?, ?, ?)",
      )
      .run("conversation-1", "owner-1", "Routine chat");
    database.sqlite
      .prepare(
        `INSERT INTO vaenyx_threads (
           id, owner_id, kind, title, project_id, status, conversation_id,
           routine_id
         ) VALUES (
           'thread-chat', 'owner-1', 'chat', 'Routine chat', 'project-1',
           'active', 'conversation-1', 'shared-routine'
         )`,
      )
      .run();

    expect(() =>
      deleteAskVaenyxConversation(database, "conversation-1", "owner-1"),
    ).toThrow("CONVERSATION_NOT_ARCHIVED");

    updateVaenyxThreadStatus(database, "thread-chat", "owner-1", {
      status: "archived",
    });
    expect(
      database.sqlite
        .prepare(
          "SELECT project_id, routine_id FROM vaenyx_threads WHERE id = ?",
        )
        .get("thread-chat"),
    ).toEqual({ project_id: "project-1", routine_id: "shared-routine" });
    expect(
      database.sqlite
        .prepare("SELECT content FROM project_memories WHERE id = ?")
        .get("memory-1"),
    ).toEqual({ content: "Keep me" });

    deleteAskVaenyxConversation(database, "conversation-1", "owner-1");
    expect(
      database.sqlite
        .prepare("SELECT content FROM routine_journal WHERE id = ?")
        .get("journal-1"),
    ).toEqual({ content: "Keep me too" });
  });
});
