import { randomUUID } from "node:crypto";

import type {
  AppProfile,
  AskVaenyxMessage,
  CreateTaskRequest,
  CreateAskVaenyxMessageResponse,
  SetTaskScheduleRequest,
  Skill,
  Task,
  TaskRun,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import { runForgeReadOnly } from "../harness/codex.js";
import { getDefaultProvider } from "../models/registry.js";
import {
  createAskVaenyxMessage,
  listAskVaenyxMessages,
  type CreateAskVaenyxMessageOptions,
} from "./ask-vaenyx.js";
import { listProjectMemories } from "./memory.js";
import { schedulePresenceAwarePush } from "./push.js";
import { pushLanguage } from "./push.js";
import { ensureTaskThread } from "./threads.js";
import { ownerSafeErrorText } from "../../runtime/owner-safe-errors.js";

const GENERAL_PROJECT_ID = "general";

interface TaskRow {
  id: string;
  title: string;
  request: string;
  result: string;
  status: "waiting" | "running" | "completed" | "failed";
  source: "owner" | "app";
  source_app_id: string | null;
  source_app_name: string | null;
  project_id: string;
  project_name: string;
  thread_id: string | null;
  thread_status: "active" | "pinned" | "archived" | null;
  thread_project_id: string | null;
  thread_project_name: string | null;
  source_chat_id: string | null;
  source_chat_title: string | null;
  skill_id: string | null;
  skill_name: string | null;
  provider: "mock-provider" | "openai-subscription-auth";
  harness: "mock-harness" | "codex-harness";
  agent: "Vaenyx" | "Forge";
  autonomy_level: 0;
  memory_used_count: number;
  created_at: string;
  completed_at: string | null;
  schedule_cadence: "hourly" | "daily" | "weekly" | "monthly" | null;
  schedule_time: string | null;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  next_run_at: string | null;
  schedule_enabled: number;
  schedule_paused_by_archive: number;
}

interface TaskConversationSeedRow {
  id: string;
  title: string;
  request: string;
  result: string;
  status: "waiting" | "running" | "completed" | "failed";
  project_id: string;
  created_at: string;
  completed_at: string | null;
  thread_id: string | null;
  conversation_id: string | null;
}

function createTaskBriefResult({
  memoryCount,
  projectName,
  request,
  skillName,
  sourceName,
}: {
  memoryCount: number;
  projectName: string;
  request: string;
  skillName: string;
  sourceName: string;
}): string {
  return [
    `Mock Vaenyx prepared a Task Brief for ${sourceName} in the ${projectName} project.`,
    `Selected skill: ${skillName}.`,
    "",
    "Goal",
    `Clarify and plan this request: ${request}`,
    "",
    "Current Situation",
    memoryCount > 0
      ? `Vaenyx can use ${memoryCount} approved project ${memoryCount === 1 ? "memory" : "memories"} as context.`
      : "No project memory was supplied for this brief.",
    "",
    "Needed Information",
    "- What exact outcome should be produced?",
    "- Are there examples, links, files, customers, or deadlines involved?",
    "- What should be avoided?",
    "",
    "Suggested Steps",
    "1. Restate the desired outcome in one sentence.",
    "2. Gather only the context needed for that outcome.",
    "3. Produce a small first version for Owner review.",
    "4. Wait for approval before any external action.",
    "",
    "Risks",
    "- Missing context may lead to a vague recommendation.",
    "- Vaenyx is currently Level 0, so this brief is advice only.",
    "",
    "Next Action",
    "Ask Forge to inspect relevant Vaenyx project context, or add project memory before running the brief again.",
  ].join("\n");
}

function createTaskSeedResult(row: TaskConversationSeedRow): string {
  const result = row.result.trim();
  if (result) return result;

  if (row.status === "running") {
    return "This task is still running. Ask Vaenyx for a status update or next step.";
  }

  if (row.status === "waiting") {
    return "This task is waiting to start. Ask Vaenyx what context is needed next.";
  }

  return "This task did not produce a visible result yet.";
}

function ensureTaskConversation(
  database: DatabaseHandle,
  taskId: string,
  ownerId: string,
): string {
  const task = database.sqlite
    .prepare(
      `SELECT tasks.id, tasks.title, tasks.request, tasks.result, tasks.status,
              tasks.project_id, tasks.created_at, tasks.completed_at,
              task_threads.id AS thread_id,
              task_threads.conversation_id
       FROM tasks
       LEFT JOIN vaenyx_threads AS task_threads
         ON task_threads.task_id = tasks.id
        AND task_threads.kind = 'task'
       WHERE tasks.id = ?
       LIMIT 1`,
    )
    .get(taskId) as TaskConversationSeedRow | undefined;

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  if (task.conversation_id) {
    return task.conversation_id;
  }

  const conversationId = randomUUID();
  const now = new Date().toISOString();
  const completedAt = task.completed_at ?? now;
  const seedResult = createTaskSeedResult(task);
  const assistantStatus = task.status === "failed" ? "failed" : "completed";

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_conversations (
        id, owner_id, title, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(conversationId, ownerId, task.title, task.created_at, completedAt);

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at
      ) VALUES (?, ?, 'owner', ?, 'completed', 0, ?)`,
    )
    .run(randomUUID(), conversationId, task.request, task.created_at);

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at
      ) VALUES (?, ?, 'assistant', ?, ?, 0, ?)`,
    )
    .run(
      randomUUID(),
      conversationId,
      seedResult,
      assistantStatus,
      completedAt,
    );

  ensureTaskThread(database, {
    taskId: task.id,
    ownerId,
    title: task.title,
    projectId: task.project_id,
    createdAt: task.created_at,
    updatedAt: completedAt,
  });

  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET conversation_id = ?, updated_at = ?
       WHERE task_id = ?
         AND kind = 'task'`,
    )
    .run(conversationId, completedAt, task.id);

  return conversationId;
}

function getForgeSkillInstructions(skillId: string | null | undefined): string {
  if (skillId !== "task-brief") {
    return "Answer the Owner clearly and concisely.";
  }

  return [
    "Produce a structured Task Brief using exactly these headings:",
    "Goal",
    "Current Situation",
    "Needed Information",
    "Suggested Steps",
    "Risks",
    "Next Action",
    "Keep it practical, concise, and suitable for Owner review.",
    "Do not claim that any external action was taken.",
  ].join("\n");
}

function getSourceChat(
  database: DatabaseHandle,
  sourceChatId: string | null | undefined,
  ownerId: string | null,
): { id: string; title: string } | null {
  if (!sourceChatId) return null;
  if (!ownerId) throw new Error("SOURCE_CHAT_NOT_FOUND");

  const conversation = database.sqlite
    .prepare(
      `SELECT id, title
       FROM ask_vaenyx_conversations
       WHERE id = ? AND owner_id = ?`,
    )
    .get(sourceChatId, ownerId) as { id: string; title: string } | undefined;

  if (!conversation) throw new Error("SOURCE_CHAT_NOT_FOUND");
  return conversation;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    request: row.request,
    result: row.result,
    status: row.status,
    source: row.source,
    sourceAppId: row.source_app_id,
    sourceAppName: row.source_app_name,
    projectId: row.project_id,
    projectName: row.project_name,
    threadId: row.thread_id,
    threadStatus: row.thread_status,
    threadProjectId: row.thread_project_id,
    threadProjectName: row.thread_project_name,
    sourceChatId: row.source_chat_id,
    sourceChatTitle: row.source_chat_title,
    skillId: row.skill_id,
    skillName: row.skill_name,
    provider: row.provider,
    harness: row.harness,
    agent: row.agent,
    autonomyLevel: row.autonomy_level,
    memoryUsedCount: row.memory_used_count,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    scheduleCadence: row.schedule_cadence,
    scheduleTime: row.schedule_time ?? null,
    scheduleDayOfWeek: row.schedule_day_of_week ?? null,
    scheduleDayOfMonth: row.schedule_day_of_month ?? null,
    nextRunAt: row.next_run_at,
    scheduleEnabled: row.schedule_enabled === 1,
    schedulePausedByArchive: row.schedule_paused_by_archive === 1,
  };
}

export function listSkills(database: DatabaseHandle): Skill[] {
  return database.sqlite
    .prepare("SELECT id, name, description FROM skills ORDER BY name")
    .all() as Skill[];
}

function listTaskProjectMemories(
  database: DatabaseHandle,
  projectId: string,
): ReturnType<typeof listProjectMemories> {
  if (projectId === GENERAL_PROJECT_ID) {
    return [];
  }

  return listProjectMemories(database, projectId);
}

export function listTasks(
  database: DatabaseHandle,
  modeId: string | null = null,
): Task[] {
  // Sandbox filter (Custom Mode M2): tasks belong to the mode they were
  // created in; User Mode (null) sees only User-Mode tasks.
  const rows = database.sqlite
    .prepare(
      `SELECT tasks.*, projects.name AS project_name, skills.name AS skill_name,
              app_profiles.name AS source_app_name,
              task_threads.id AS thread_id,
              task_threads.status AS thread_status,
              task_threads.project_id AS thread_project_id,
              thread_projects.name AS thread_project_name,
              task_threads.source_chat_id AS source_chat_id,
              source_chat.title AS source_chat_title
       FROM tasks
       JOIN projects ON projects.id = tasks.project_id
       LEFT JOIN skills ON skills.id = tasks.skill_id
       LEFT JOIN app_profiles ON app_profiles.id = tasks.source_app_id
       LEFT JOIN vaenyx_threads AS task_threads
         ON task_threads.task_id = tasks.id AND task_threads.kind = 'task'
       LEFT JOIN projects AS thread_projects
         ON thread_projects.id = task_threads.project_id
       LEFT JOIN ask_vaenyx_conversations AS source_chat
         ON source_chat.id = task_threads.source_chat_id
       WHERE ((? IS NULL AND tasks.mode_id IS NULL) OR tasks.mode_id = ?)
       ORDER BY tasks.created_at DESC`,
    )
    .all(modeId, modeId) as unknown as TaskRow[];

  return rows.map(toTask);
}

// Stamp a just-created task with the session's mode (Custom Mode M2). A
// separate statement so the three create paths don't each grow a column.
export function stampTaskMode(
  database: DatabaseHandle,
  taskId: string,
  modeId: string | null,
): void {
  if (!modeId) return;
  database.sqlite
    .prepare("UPDATE tasks SET mode_id = ? WHERE id = ?")
    .run(modeId, taskId);
  database.sqlite
    .prepare("UPDATE vaenyx_threads SET mode_id = ? WHERE task_id = ?")
    .run(modeId, taskId);
}

export function createMockTask(
  database: DatabaseHandle,
  input: CreateTaskRequest,
  sourceApp: AppProfile | null = null,
  ownerId: string | null = null,
): Task {
  const project = database.sqlite
    .prepare("SELECT id, name FROM projects WHERE id = ?")
    .get(input.projectId) as { id: string; name: string } | undefined;

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const skill = input.skillId
    ? (database.sqlite
        .prepare("SELECT id, name FROM skills WHERE id = ?")
        .get(input.skillId) as { id: string; name: string } | undefined)
    : undefined;

  if (input.skillId && !skill) {
    throw new Error("SKILL_NOT_FOUND");
  }

  const request = input.request.trim();
  const id = randomUUID();
  const now = new Date().toISOString();
  const title = request.length > 64 ? `${request.slice(0, 61)}...` : request;
  const source = sourceApp ? "app" : "owner";
  const sourceChat = getSourceChat(
    database,
    input.sourceChatId ?? null,
    ownerId,
  );
  // App requests never read project memory (an App Profile has no project /
  // memory access); only the Owner's own tasks read memory.
  const memories = sourceApp
    ? []
    : listTaskProjectMemories(database, project.id);
  const result =
    skill?.id === "task-brief"
      ? createTaskBriefResult({
          memoryCount: memories.length,
          projectName: project.name,
          request,
          skillName: skill.name,
          sourceName: sourceApp?.name ?? "the Owner",
        })
      : [
          `Mock Vaenyx received your request from ${sourceApp?.name ?? "the Owner"} in the ${project.name} project.`,
          `It used ${skill?.name ?? "no selected skill"} with the Mock Harness and Mock Provider.`,
          "No external service, real AI provider, file, or tool was used.",
          memories.length > 0
            ? `It read ${memories.length} project ${memories.length === 1 ? "memory" : "memories"}: ${memories.map((memory) => memory.title).join(", ")}.`
            : "It used no project memory.",
          `Your request: ${request}`,
        ].join("\n\n");

  database.sqlite
    .prepare(
      `INSERT INTO tasks (
        id, title, request, result, status, source, project_id, skill_id,
        provider, harness, agent, autonomy_level, created_at, completed_at, source_app_id,
        memory_used_count
      ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, 'mock-provider', 'mock-harness', 'Vaenyx', 0, ?, ?, ?, ?)`,
    )
    .run(
      id,
      title,
      request,
      result,
      source,
      project.id,
      skill?.id ?? null,
      now,
      now,
      sourceApp?.id ?? null,
      memories.length,
    );

  ensureTaskThread(database, {
    taskId: id,
    ownerId,
    title,
    projectId: project.id,
    sourceChatId: sourceChat?.id ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    title,
    request,
    result,
    status: "completed",
    source,
    sourceAppId: sourceApp?.id ?? null,
    sourceAppName: sourceApp?.name ?? null,
    projectId: project.id,
    projectName: project.name,
    threadId: id,
    threadStatus: "active",
    threadProjectId: project.id,
    threadProjectName: project.name,
    sourceChatId: sourceChat?.id ?? null,
    sourceChatTitle: sourceChat?.title ?? null,
    skillId: skill?.id ?? null,
    skillName: skill?.name ?? null,
    provider: "mock-provider",
    harness: "mock-harness",
    agent: "Vaenyx",
    autonomyLevel: 0,
    memoryUsedCount: memories.length,
    createdAt: now,
    completedAt: now,
    scheduleCadence: null,
    scheduleTime: null,
    scheduleDayOfWeek: null,
    scheduleDayOfMonth: null,
    nextRunAt: null,
    scheduleEnabled: false,
    schedulePausedByArchive: false,
  };
}

export async function createForgeTask(
  database: DatabaseHandle,
  input: CreateTaskRequest,
  ownerId: string | null = null,
): Promise<Task> {
  if (input.projectId !== "vaenyx") {
    throw new Error("FORGE_PROJECT_NOT_ALLOWED");
  }

  const project = database.sqlite
    .prepare("SELECT id, name FROM projects WHERE id = ?")
    .get(input.projectId) as { id: string; name: string } | undefined;
  const skill = input.skillId
    ? (database.sqlite
        .prepare("SELECT id, name FROM skills WHERE id = ?")
        .get(input.skillId) as { id: string; name: string } | undefined)
    : undefined;

  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (input.skillId && !skill) throw new Error("SKILL_NOT_FOUND");

  const request = input.request.trim();
  const id = randomUUID();
  const now = new Date().toISOString();
  const title = request.length > 64 ? `${request.slice(0, 61)}...` : request;
  const memories = listTaskProjectMemories(database, project.id);
  const sourceChat = getSourceChat(
    database,
    input.sourceChatId ?? null,
    ownerId,
  );

  database.sqlite
    .prepare(
      `INSERT INTO tasks (
        id, title, request, result, status, source, project_id, skill_id,
        provider, harness, agent, autonomy_level, created_at, completed_at,
        source_app_id, memory_used_count
      ) VALUES (?, ?, ?, '', 'running', 'owner', ?, ?,
        'openai-subscription-auth', 'codex-harness', 'Forge', 0, ?, NULL, NULL, ?)`,
    )
    .run(
      id,
      title,
      request,
      project.id,
      skill?.id ?? null,
      now,
      memories.length,
    );

  ensureTaskThread(database, {
    taskId: id,
    ownerId,
    title,
    projectId: project.id,
    sourceChatId: sourceChat?.id ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const prompt = buildForgePrompt({
    request,
    skillName: skill?.name,
    skillId: skill?.id ?? null,
    memories,
  });

  // Run Forge in the background so the request returns immediately with a
  // "running" task; the result + final status are written on completion. If the
  // server restarts mid-run, reconcileInterruptedTasks() marks it failed.
  void executeTaskRun(database, id, "manual", (signal) =>
    runForgeReadOnly(prompt, signal),
  );

  return {
    id,
    title,
    request,
    result: "",
    status: "running",
    source: "owner",
    sourceAppId: null,
    sourceAppName: null,
    projectId: project.id,
    projectName: project.name,
    threadId: id,
    threadStatus: "active",
    threadProjectId: project.id,
    threadProjectName: project.name,
    sourceChatId: sourceChat?.id ?? null,
    sourceChatTitle: sourceChat?.title ?? null,
    skillId: skill?.id ?? null,
    skillName: skill?.name ?? null,
    provider: "openai-subscription-auth",
    harness: "codex-harness",
    agent: "Forge",
    autonomyLevel: 0,
    memoryUsedCount: memories.length,
    createdAt: now,
    completedAt: null,
    scheduleCadence: null,
    scheduleTime: null,
    scheduleDayOfWeek: null,
    scheduleDayOfMonth: null,
    nextRunAt: null,
    scheduleEnabled: false,
    schedulePausedByArchive: false,
  };
}

// A research task: a chat-style turn (with web search) that can be scheduled.
// Unlike Forge it has no repository, so it works in any project and produces an
// answer rather than a code review.
export function createResearchTask(
  database: DatabaseHandle,
  input: CreateTaskRequest,
  ownerId: string | null = null,
): Task {
  const project = database.sqlite
    .prepare("SELECT id, name FROM projects WHERE id = ?")
    .get(input.projectId) as { id: string; name: string } | undefined;
  const skill = input.skillId
    ? (database.sqlite
        .prepare("SELECT id, name FROM skills WHERE id = ?")
        .get(input.skillId) as { id: string; name: string } | undefined)
    : undefined;
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (input.skillId && !skill) throw new Error("SKILL_NOT_FOUND");

  const request = input.request.trim();
  const id = randomUUID();
  const now = new Date().toISOString();
  // A supplied short title wins; deriving from the request is the fallback,
  // and for a long instruction it makes an unreadable header.
  const title =
    input.title?.trim() ||
    (request.length > 64 ? `${request.slice(0, 61)}...` : request);
  const memories = listTaskProjectMemories(database, project.id);
  const sourceChat = getSourceChat(
    database,
    input.sourceChatId ?? null,
    ownerId,
  );

  database.sqlite
    .prepare(
      `INSERT INTO tasks (
        id, title, request, result, status, source, project_id, skill_id,
        provider, harness, agent, autonomy_level, created_at, completed_at,
        source_app_id, memory_used_count
      ) VALUES (?, ?, ?, '', 'running', 'owner', ?, ?,
        'openai-subscription-auth', 'codex-harness', 'Vaenyx', 0, ?, NULL, NULL, ?)`,
    )
    .run(
      id,
      title,
      request,
      project.id,
      skill?.id ?? null,
      now,
      memories.length,
    );

  ensureTaskThread(database, {
    taskId: id,
    ownerId,
    title,
    projectId: project.id,
    sourceChatId: sourceChat?.id ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const context = [buildResearchContext(memories), RUN_RESULT_INSTRUCTION]
    .filter(Boolean)
    .join("\n\n");
  void executeTaskRun(database, id, "manual", (signal) =>
    getDefaultProvider()
      .sendChat([{ content: request, role: "owner" }], context, {
        signal,
      })
      .then((reply) => reply.answer),
  );

  return {
    id,
    title,
    request,
    result: "",
    status: "running",
    source: "owner",
    sourceAppId: null,
    sourceAppName: null,
    projectId: project.id,
    projectName: project.name,
    threadId: id,
    threadStatus: "active",
    threadProjectId: project.id,
    threadProjectName: project.name,
    sourceChatId: sourceChat?.id ?? null,
    sourceChatTitle: sourceChat?.title ?? null,
    skillId: skill?.id ?? null,
    skillName: skill?.name ?? null,
    provider: "openai-subscription-auth",
    harness: "codex-harness",
    agent: "Vaenyx",
    autonomyLevel: 0,
    memoryUsedCount: memories.length,
    createdAt: now,
    completedAt: null,
    scheduleCadence: null,
    scheduleTime: null,
    scheduleDayOfWeek: null,
    scheduleDayOfMonth: null,
    nextRunAt: null,
    scheduleEnabled: false,
    schedulePausedByArchive: false,
  };
}

// In-flight task executions, keyed by task id, so the Owner can cancel them.
const runningTasks = new Map<string, AbortController>();

// The model's live thinking for a run in flight, so the open task view can
// watch it work (Oskar, 2026-07-27). In-memory only: it exists while the run
// does and vanishes with it — the durable record is the run's result.
const liveRunThinking = new Map<string, string>();

export function appendRunThinking(taskId: string, text: string): void {
  const current = liveRunThinking.get(taskId) ?? "";
  liveRunThinking.set(taskId, (current + text).slice(-4000));
}

export function getRunThinking(taskId: string): string {
  return liveRunThinking.get(taskId) ?? "";
}

// Every run's result also lands in the task's conversation as a new assistant
// message (Owner decision 2026-07-22): the task page reads like received
// deliveries — newest at the bottom — while History keeps the per-run copies.
// Only an already-seeded conversation is appended to; an unopened task seeds
// lazily with the latest result anyway, so nothing is shown twice.
function appendRunResultToConversation(
  database: DatabaseHandle,
  taskId: string,
  result: string,
  status: "completed" | "failed",
  finishedAt: string,
): void {
  if (!result.trim()) return;
  try {
    // The thread rises in the sidebar the moment a run lands, whether or not
    // its conversation was ever opened (Oskar, 2026-08-12: a scheduled task
    // that wrote today sat buried under yesterday's chats — this bump used to
    // live BEHIND the conversation-exists check, and an unopened task has no
    // conversation yet). The sidebar orders by exactly this column.
    database.sqlite
      .prepare(
        `UPDATE vaenyx_threads SET updated_at = ?
         WHERE task_id = ? AND kind = 'task'`,
      )
      .run(finishedAt, taskId);
    const row = database.sqlite
      .prepare(
        `SELECT conversation_id FROM vaenyx_threads
         WHERE task_id = ? AND kind = 'task' AND conversation_id IS NOT NULL`,
      )
      .get(taskId) as { conversation_id: string } | undefined;
    if (!row) return;
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_messages (
          id, conversation_id, role, content, status, web_search_used, created_at
        ) VALUES (?, ?, 'assistant', ?, ?, 0, ?)`,
      )
      .run(randomUUID(), row.conversation_id, result, status, finishedAt);
    database.sqlite
      .prepare(
        `UPDATE ask_vaenyx_conversations SET updated_at = ? WHERE id = ?`,
      )
      .run(finishedAt, row.conversation_id);
  } catch {
    // Best-effort: a missed append never fails the run itself.
  }
}

// Detached Forge run. Writes the final result/status when done. Errors become a
// "failed" task instead of a stuck "running" one. A DB-closed error (server
// stopping) is swallowed; reconcileInterruptedTasks() cleans up on next start.
async function executeTaskRun(
  database: DatabaseHandle,
  id: string,
  trigger: "manual" | "schedule",
  run: (signal: AbortSignal) => Promise<string>,
): Promise<void> {
  // Each execution is a durable run; the task keeps the latest result/status.
  const runId = randomUUID();
  try {
    database.sqlite
      .prepare(
        `INSERT INTO task_runs (id, task_id, status, result, trigger, started_at, finished_at)
         VALUES (?, ?, 'running', '', ?, ?, NULL)`,
      )
      .run(runId, id, trigger, new Date().toISOString());
  } catch {
    // Database closed; nothing to record.
  }

  const controller = new AbortController();
  runningTasks.set(id, controller);

  let result: string;
  let status: "completed" | "failed";
  try {
    result = await run(controller.signal);
    status = "completed";
  } catch (error) {
    let failure: unknown = error;
    const code = error instanceof Error ? error.message : "CODEX_UNKNOWN_ERROR";
    // A boundary trip is the model deciding, on this one turn, to reach for a
    // tool it is not allowed. Nothing ran — the turn was refused — and the
    // same prompt usually goes straight through on the next attempt. A daily
    // 7am task whose whole value is being there at 7am should not be lost to
    // one such decision, so it gets exactly one more go (2026-07-27).
    if (
      code.startsWith("CODEX_ASK_VAENYX_BOUNDARY_VIOLATION") &&
      !controller.signal.aborted
    ) {
      try {
        result = await run(controller.signal);
        status = "completed";
        runningTasks.delete(id);
        return await finishTaskRun(
          database,
          id,
          runId,
          trigger,
          result,
          status,
        );
      } catch (retryError) {
        failure = retryError;
      }
    }
    result = ownerSafeErrorText(
      failure,
      trigger === "schedule" ? "scheduled-run" : "model-response",
      pushLanguage(),
    ).text;
    status = "failed";
  } finally {
    runningTasks.delete(id);
    liveRunThinking.delete(id);
  }

  await finishTaskRun(database, id, runId, trigger, result, status);
}

// Record the outcome and, for a scheduled run, tell the Owner's devices.
function finishTaskRun(
  database: DatabaseHandle,
  id: string,
  runId: string,
  trigger: "manual" | "schedule",
  result: string,
  status: "completed" | "failed",
): Promise<void> {
  const finishedAt = new Date().toISOString();
  try {
    database.sqlite
      .prepare(
        `UPDATE task_runs SET status = ?, result = ?, finished_at = ? WHERE id = ?`,
      )
      .run(status, result, finishedAt, runId);
    database.sqlite
      .prepare(
        `UPDATE tasks SET result = ?, status = ?, completed_at = ? WHERE id = ?`,
      )
      .run(result, status, finishedAt, id);
    appendRunResultToConversation(database, id, result, status, finishedAt);
    // Scheduled runs notify subscribed devices — but only if the result stays
    // unseen for ~30s (a device viewing the app counts as seen; see
    // schedulePresenceAwarePush). Manual runs never push: the Owner just
    // pressed the button and is looking at the task.
    if (
      trigger === "schedule" &&
      scheduledResultStillNotifiable(database, id)
    ) {
      const titleRow = database.sqlite
        .prepare("SELECT title, mode_id FROM tasks WHERE id = ?")
        .get(id) as { title: string; mode_id: string | null } | undefined;
      // In the app's language, not English under a Chinese title (Oskar,
      // 2026-08-22: 改成跟 app 语言走).
      const zh = pushLanguage() === "zh";
      const safeCode = result.match(/VX-[A-Z-]+/)?.[0] ?? "VX-REQUEST";
      schedulePresenceAwarePush(
        database,
        {
          title: titleRow?.title ?? (zh ? "Vaenyx 任务" : "Vaenyx task"),
          body:
            status === "completed"
              ? zh
                ? "有新结果了。"
                : "New result is ready."
              : zh
                ? `这次定时运行失败了(${safeCode})。打开这项任务查看原因并点重试。`
                : `The scheduled run failed (${safeCode}). Open this task for the safe reason and press Retry.`,
          // Open the task itself, not the home screen: a notification that
          // announces a result should land on that result.
          url: `/?task=${encodeURIComponent(id)}`,
        },
        "scheduled",
        // Only the devices in the mode this task belongs to (Oskar,
        // 2026-08-30): a kid-mode task's result must not buzz the Owner's
        // phone, and an Owner task must not buzz the kid's.
        { modeId: titleRow?.mode_id ?? null },
        {
          key: `scheduled-task:${id}`,
          shouldSend: () => scheduledResultStillNotifiable(database, id),
          suppressedReason:
            "the scheduled Conversation was archived before the notification was sent.",
        },
      );
    }
  } catch {
    // Server shutting down (database closed); reconcile handles it next start.
  }
  return Promise.resolve();
}

function scheduledResultStillNotifiable(
  database: DatabaseHandle,
  taskId: string,
): boolean {
  const row = database.sqlite
    .prepare(
      `SELECT tasks.schedule_paused_by_archive,
              task_threads.status AS thread_status
       FROM tasks
       LEFT JOIN vaenyx_threads AS task_threads
         ON task_threads.task_id = tasks.id
        AND task_threads.kind = 'task'
       WHERE tasks.id = ?`,
    )
    .get(taskId) as
    | {
        schedule_paused_by_archive: number;
        thread_status: "active" | "pinned" | "archived" | null;
      }
    | undefined;

  return (
    row?.schedule_paused_by_archive === 0 &&
    (row.thread_status === "active" || row.thread_status === "pinned")
  );
}

// On startup, any task left "running" was interrupted by a restart/crash. Mark
// it failed so it is no longer stuck and the Owner can retry it.
export function reconcileInterruptedTasks(database: DatabaseHandle): number {
  const interrupted = database.sqlite
    .prepare("SELECT COUNT(*) AS total FROM tasks WHERE status = 'running'")
    .get() as { total: number };
  if (interrupted.total === 0) return 0;
  const now = new Date().toISOString();
  const message = ownerSafeErrorText(
    new Error("TASK_INTERRUPTED_BY_RESTART"),
    "scheduled-run",
    pushLanguage(),
  ).text;

  database.sqlite
    .prepare(
      `UPDATE task_runs
       SET status = 'failed', finished_at = ?,
           result = CASE WHEN result = '' THEN ? ELSE result END
       WHERE status = 'running'`,
    )
    .run(now, message);

  const result = database.sqlite
    .prepare(
      `UPDATE tasks
       SET status = 'failed',
           completed_at = ?,
           result = CASE WHEN result = '' THEN ? ELSE result END
       WHERE status = 'running'`,
    )
    .run(now, message);
  return Number(result.changes ?? 0);
}

function buildForgePrompt(args: {
  request: string;
  skillName?: string;
  skillId: string | null;
  memories: ReturnType<typeof listTaskProjectMemories>;
}): string {
  const memoryContext =
    args.memories.length === 0
      ? "No Vaenyx project memories were supplied."
      : args.memories
          .map((memory) => `Memory: ${memory.title}\n${memory.content}`)
          .join("\n\n");
  return [
    "Answer the Owner's request by inspecting only the current Vaenyx repository.",
    "This is a read-only task. Do not modify files, use network tools, or request elevated permissions.",
    `Selected skill: ${args.skillName ?? "Forge Read-only Review"}.`,
    getForgeSkillInstructions(args.skillId),
    memoryContext,
    `Owner request: ${args.request}`,
  ].join("\n\n");
}

type Cadence = "hourly" | "daily" | "weekly" | "monthly";

interface ScheduleSpec {
  cadence: Cadence;
  time: string | null; // "HH:MM" local
  dayOfWeek: number | null; // 0-6 (Sun-Sat), weekly
  dayOfMonth: number | null; // 1-31, monthly
}

function parseTimeOfDay(time: string | null): {
  hours: number;
  minutes: number;
} {
  if (!time) return { hours: 9, minutes: 0 };
  const [rawH, rawM] = time.split(":");
  const hours = Number.parseInt(rawH ?? "", 10);
  const minutes = Number.parseInt(rawM ?? "", 10);
  return {
    hours: Number.isInteger(hours) && hours >= 0 && hours <= 23 ? hours : 9,
    minutes:
      Number.isInteger(minutes) && minutes >= 0 && minutes <= 59 ? minutes : 0,
  };
}

// Next run timestamp (ISO) at or after `from`, in the server's local time zone.
// hourly = +1h (time/day ignored); daily/weekly/monthly land on the chosen time
// (and weekday / day-of-month), rolling forward to the next match.
export function computeNextRun(spec: ScheduleSpec, from: number): string {
  if (spec.cadence === "hourly") {
    return new Date(from + 60 * 60 * 1000).toISOString();
  }

  const { hours, minutes } = parseTimeOfDay(spec.time);
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);

  if (spec.cadence === "daily") {
    if (next.getTime() <= from) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (spec.cadence === "weekly") {
    const target =
      spec.dayOfWeek != null && spec.dayOfWeek >= 0 && spec.dayOfWeek <= 6
        ? spec.dayOfWeek
        : next.getDay();
    let delta = (target - next.getDay() + 7) % 7;
    if (delta === 0 && next.getTime() <= from) delta = 7;
    next.setDate(next.getDate() + delta);
    return next.toISOString();
  }

  // monthly
  const dom =
    spec.dayOfMonth != null && spec.dayOfMonth >= 1 ? spec.dayOfMonth : 1;
  const clampToMonth = (date: Date): void => {
    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    date.setDate(Math.min(dom, lastDay));
  };
  clampToMonth(next);
  if (next.getTime() <= from) {
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    clampToMonth(next);
  }
  return next.toISOString();
}

// Owner sets/clears a task's schedule. Off by default; enabling a cadence is the
// Owner's explicit approval for the task to re-run on its own. Only read-only
// Forge (Vaenyx repo) tasks actually execute on a schedule today, so a scheduled
// run produces information and never acts outside the repo (autonomyLevel 0).
export function setTaskSchedule(
  database: DatabaseHandle,
  taskId: string,
  input: SetTaskScheduleRequest,
): Task {
  const existing = database.sqlite
    .prepare(
      `SELECT tasks.id, tasks.mode_id,
              task_threads.status AS thread_status
       FROM tasks
       LEFT JOIN vaenyx_threads AS task_threads
         ON task_threads.task_id = tasks.id
        AND task_threads.kind = 'task'
       WHERE tasks.id = ?`,
    )
    .get(taskId) as
    | {
        id: string;
        mode_id: string | null;
        thread_status: "active" | "pinned" | "archived" | null;
      }
    | undefined;
  if (!existing) throw new Error("TASK_NOT_FOUND");

  const enabled = input.enabled && input.cadence !== null;
  if (enabled && existing.thread_status === "archived") {
    throw new Error("TASK_THREAD_ARCHIVED");
  }
  const time = input.time ?? null;
  const dayOfWeek = input.dayOfWeek ?? null;
  const dayOfMonth = input.dayOfMonth ?? null;
  const nextRunAt =
    enabled && input.cadence
      ? computeNextRun(
          { cadence: input.cadence, time, dayOfWeek, dayOfMonth },
          Date.now(),
        )
      : null;

  database.sqlite
    .prepare(
      `UPDATE tasks
       SET schedule_cadence = ?, schedule_time = ?, schedule_day_of_week = ?,
           schedule_day_of_month = ?, schedule_enabled = ?, next_run_at = ?,
           schedule_paused_by_archive = 0
       WHERE id = ?`,
    )
    .run(
      input.cadence,
      time,
      dayOfWeek,
      dayOfMonth,
      enabled ? 1 : 0,
      nextRunAt,
      taskId,
    );

  const updated = listTasks(database, existing.mode_id).find(
    (task) => task.id === taskId,
  );
  if (!updated) throw new Error("TASK_NOT_FOUND");
  return updated;
}

function buildResearchContext(
  memories: ReturnType<typeof listTaskProjectMemories>,
): string | undefined {
  if (memories.length === 0) return undefined;
  return memories
    .map((memory) => `Memory: ${memory.title}\n${memory.content}`)
    .join("\n\n");
}

// A run must hand back the finished, ready-to-read deliverable — without this
// the model tends to return a thin recap (~300 chars) instead of the thing the
// Owner actually wants to read.
// "Not an acknowledgement" is in here because it happened, twice: with the
// tuning discussion in view, the model read the run as "the Owner restated
// their preferences" and replied 收到/明白 + a bullet list of the rules —
// a receipt where the newspaper should be (Oskar, 2026-07-27).
const RUN_RESULT_INSTRUCTION =
  "This is a background run of a saved task, executing NOW. Produce the complete, ready-to-read deliverable itself — organized for reading, with source links where relevant. Never reply with an acknowledgement, a confirmation of rules, a restatement of preferences, or a plan: if you find yourself writing '收到', '明白', 'Understood' or listing the task's own settings, stop and produce the actual result instead.";

// How many past deliveries the next run is told about, and how much of each.
// Five days of a daily task is enough for it to see its own habits; more than
// that costs tokens to say the same thing.
const DELIVERED_RUNS_IN_CONTEXT = 5;
const DELIVERED_RUN_EXCERPT = 1200;

function recentCompletedRuns(
  database: DatabaseHandle,
  taskId: string,
  limit: number,
): { result: string; finished_at: string }[] {
  return database.sqlite
    .prepare(
      `SELECT result, finished_at FROM task_runs
       WHERE task_id = ? AND status = 'completed' AND result != ''
       ORDER BY finished_at DESC
       LIMIT ?`,
    )
    .all(taskId, limit) as { result: string; finished_at: string }[];
}

// What a recurring task has ALREADY given the Owner — and the standing order
// not to give it again.
//
// This block exists because of the opposite mistake. Every run used to be
// handed its own previous outputs inside the "honor any format, scope or
// preference agreed there" transcript, which is the strongest possible
// instruction to produce that same thing once more: a daily news task spent
// each morning re-reporting the previous morning, from the same handful of
// sources (Oskar, 2026-08-07 — "每天推送的都是类似的新闻,广度不够"). The
// format was never the problem; treating delivered CONTENT as a template was.
function buildDeliveredContext(
  database: DatabaseHandle,
  taskId: string,
): string | undefined {
  const runs = recentCompletedRuns(database, taskId, DELIVERED_RUNS_IN_CONTEXT);
  if (runs.length === 0) return undefined;
  const delivered = runs
    .map(
      (run) =>
        `--- already delivered ${run.finished_at} ---\n${run.result.slice(0, DELIVERED_RUN_EXCERPT)}`,
    )
    .join("\n\n");
  return [
    `This task has run before. The Owner has ALREADY READ everything below, so this run's job is what they do not have yet.`,
    `- Do not deliver an item that already appears below. If one of them has materially changed, lead with WHAT CHANGED and say so — never restate it as though it were new.`,
    `- Widen the net on purpose: sources, subtopics and angles the runs below never touched. Returning to the same few sources every run is exactly the failure this instruction exists to prevent.`,
    `- Prefer what is genuinely new since ${runs[0]?.finished_at ?? "the last run"}.`,
    `- If there is honestly nothing new worth their time, say so in one line. Padding with what they have already read is worse than a short answer.`,
    `The FORMAT and scope of the runs below are settled — keep them. It is the CONTENT that has to be new.`,
    delivered,
  ].join("\n");
}

function buildTaskConversationContext(
  database: DatabaseHandle,
  taskId: string,
): string | undefined {
  const row = database.sqlite
    .prepare(
      `SELECT conversation_id FROM vaenyx_threads
       WHERE task_id = ? AND kind = 'task' AND conversation_id IS NOT NULL`,
    )
    .get(taskId) as { conversation_id: string } | undefined;
  if (!row) return undefined;
  const messages = database.sqlite
    .prepare(
      `SELECT role, content FROM ask_vaenyx_messages
       WHERE conversation_id = ? AND status != 'failed'
       ORDER BY created_at DESC
       LIMIT 10`,
    )
    .all(row.conversation_id) as { role: string; content: string }[];
  // Past run results are posted into this same conversation, so without this
  // they would arrive here too — under the "honor this" framing that
  // buildDeliveredContext exists to undo. A wider net than the digest itself,
  // so an older delivery still sitting in the window is caught as well.
  const deliveredBefore = new Set(
    recentCompletedRuns(database, taskId, 40).map((run) => run.result),
  );
  const discussion = messages.filter(
    (message) =>
      message.role === "owner" || !deliveredBefore.has(message.content),
  );
  if (discussion.length === 0) return undefined;
  const transcript = discussion
    .reverse()
    .map(
      (message) =>
        `${message.role === "owner" ? "Owner" : "Vaenyx"}: ${message.content.slice(0, 1500)}`,
    )
    .join("\n");
  return `The Owner and Vaenyx have discussed this task before. Honor any format, scope or preference agreed there — but that discussion is FINISHED SETTINGS, not the current request. Do not reply to it and do not confirm it; apply it silently to this run's deliverable:\n${transcript}`;
}

// Re-run a codex-harness task by id: Forge (read-only repo) or Vaenyx research
// (web-search chat). Rebuilds inputs from the stored request, marks it running,
// and executes in the background. Shared by the scheduler and manual retry.
function runTaskById(
  database: DatabaseHandle,
  taskId: string,
  trigger: "manual" | "schedule",
): boolean {
  const scheduleFence =
    trigger === "schedule"
      ? ` AND tasks.schedule_enabled = 1
          AND NOT EXISTS (
            SELECT 1 FROM vaenyx_threads
            WHERE vaenyx_threads.task_id = tasks.id
              AND vaenyx_threads.kind = 'task'
              AND vaenyx_threads.status = 'archived'
          )`
      : "";
  const task = database.sqlite
    .prepare(
      `SELECT tasks.id, tasks.request, tasks.skill_id, tasks.project_id,
              tasks.agent
       FROM tasks
       WHERE tasks.id = ?
         AND tasks.harness = 'codex-harness'${scheduleFence}`,
    )
    .get(taskId) as
    | {
        id: string;
        request: string;
        skill_id: string | null;
        project_id: string;
        agent: "Vaenyx" | "Forge";
      }
    | undefined;
  if (!task) return false;

  const memories = listTaskProjectMemories(database, task.project_id);
  let run: (signal: AbortSignal) => Promise<string>;
  if (task.agent === "Forge") {
    const skill = task.skill_id
      ? (database.sqlite
          .prepare("SELECT id, name FROM skills WHERE id = ?")
          .get(task.skill_id) as { id: string; name: string } | undefined)
      : undefined;
    const prompt = buildForgePrompt({
      request: task.request,
      skillName: skill?.name,
      skillId: skill?.id ?? null,
      memories,
    });
    run = (signal) => runForgeReadOnly(prompt, signal);
  } else {
    const context = [
      buildResearchContext(memories),
      buildTaskConversationContext(database, task.id),
      buildDeliveredContext(database, task.id),
      RUN_RESULT_INSTRUCTION,
    ]
      .filter(Boolean)
      .join("\n\n");
    run = (signal) =>
      getDefaultProvider()
        .sendChat([{ content: task.request, role: "owner" }], context, {
          signal,
          onThinking: (text) => appendRunThinking(task.id, text),
        })
        .then((reply) => reply.answer);
  }

  const started = database.sqlite
    .prepare(
      `UPDATE tasks
       SET status = 'running', result = '', completed_at = NULL
       WHERE id = ?
         AND status != 'running'${scheduleFence}`,
    )
    .run(taskId);
  if (started.changes === 0) return false;
  void executeTaskRun(database, taskId, trigger, run);
  return true;
}

// The scheduler tick: run every enabled task whose next run is due. Skips tasks
// already running, atomically claims the due timestamp, queues the next run,
// and records each as a scheduled run. The optional hook is a deterministic
// test seam for "Archive wins after polling but before claim".
export function runDueTasks(
  database: DatabaseHandle,
  beforeClaim?: (taskId: string) => void,
): number {
  const now = Date.now();
  const dueAt = new Date(now).toISOString();
  const dueRows = database.sqlite
    .prepare(
      `SELECT tasks.id, tasks.schedule_cadence, tasks.schedule_time,
              tasks.schedule_day_of_week, tasks.schedule_day_of_month,
              tasks.next_run_at
       FROM tasks
       WHERE tasks.schedule_enabled = 1
         AND tasks.status != 'running'
         AND tasks.harness = 'codex-harness'
         AND tasks.next_run_at IS NOT NULL
         AND tasks.next_run_at <= ?
         AND NOT EXISTS (
           SELECT 1 FROM vaenyx_threads
           WHERE vaenyx_threads.task_id = tasks.id
             AND vaenyx_threads.kind = 'task'
             AND vaenyx_threads.status = 'archived'
         )`,
    )
    .all(dueAt) as {
    id: string;
    schedule_cadence: Cadence | null;
    schedule_time: string | null;
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
    next_run_at: string;
  }[];

  let launched = 0;
  for (const due of dueRows) {
    beforeClaim?.(due.id);
    const successor = due.schedule_cadence
      ? computeNextRun(
          {
            cadence: due.schedule_cadence,
            time: due.schedule_time,
            dayOfWeek: due.schedule_day_of_week,
            dayOfMonth: due.schedule_day_of_month,
          },
          now,
        )
      : null;
    // The original due timestamp is the claim token. A competing scheduler,
    // or Archive's transaction, changes it first and makes this UPDATE a no-op.
    const claim = database.sqlite
      .prepare(
        `UPDATE tasks
         SET next_run_at = ?
         WHERE id = ?
           AND schedule_enabled = 1
           AND status != 'running'
           AND harness = 'codex-harness'
           AND next_run_at = ?
           AND next_run_at <= ?
           AND NOT EXISTS (
             SELECT 1 FROM vaenyx_threads
             WHERE vaenyx_threads.task_id = tasks.id
               AND vaenyx_threads.kind = 'task'
               AND vaenyx_threads.status = 'archived'
           )`,
      )
      .run(successor, due.id, due.next_run_at, dueAt);
    if (claim.changes === 0) continue;
    if (runTaskById(database, due.id, "schedule")) launched += 1;
  }

  return launched;
}

// Manually re-run a failed/completed Forge task. Returns the now-running task.
export function retryTask(database: DatabaseHandle, taskId: string): Task {
  const existing = database.sqlite
    .prepare("SELECT id, status, harness FROM tasks WHERE id = ?")
    .get(taskId) as { id: string; status: string; harness: string } | undefined;
  if (!existing) throw new Error("TASK_NOT_FOUND");
  if (existing.status === "running") throw new Error("TASK_ALREADY_RUNNING");
  if (existing.harness !== "codex-harness") {
    throw new Error("TASK_NOT_RETRIABLE");
  }

  runTaskById(database, taskId, "manual");

  const updated = listTasks(database).find((task) => task.id === taskId);
  if (!updated) throw new Error("TASK_NOT_FOUND");
  return updated;
}

// Cancel a running task: abort the Codex child and mark the task/run failed.
export function cancelTask(database: DatabaseHandle, taskId: string): Task {
  runningTasks.get(taskId)?.abort();

  const now = new Date().toISOString();
  const message = "This task was cancelled.";
  database.sqlite
    .prepare(
      `UPDATE task_runs SET status = 'failed', finished_at = ?,
           result = CASE WHEN result = '' THEN ? ELSE result END
       WHERE task_id = ? AND status = 'running'`,
    )
    .run(now, message, taskId);
  database.sqlite
    .prepare(
      "UPDATE tasks SET status = 'failed', completed_at = ?, result = ? WHERE id = ? AND status = 'running'",
    )
    .run(now, message, taskId);

  const updated = listTasks(database).find((task) => task.id === taskId);
  if (!updated) throw new Error("TASK_NOT_FOUND");
  return updated;
}

export function listTaskRuns(
  database: DatabaseHandle,
  taskId: string,
): TaskRun[] {
  const rows = database.sqlite
    .prepare(
      `SELECT id, task_id, status, result, trigger, started_at, finished_at
       FROM task_runs WHERE task_id = ? ORDER BY started_at DESC`,
    )
    .all(taskId) as {
    id: string;
    task_id: string;
    status: "running" | "completed" | "failed";
    result: string;
    trigger: "manual" | "schedule";
    started_at: string;
    finished_at: string | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    status: row.status,
    result: row.result,
    trigger: row.trigger,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}

export function listTaskMessages(
  database: DatabaseHandle,
  taskId: string,
  ownerId: string,
): AskVaenyxMessage[] {
  const conversationId = ensureTaskConversation(database, taskId, ownerId);
  return listAskVaenyxMessages(database, conversationId, ownerId);
}

export async function createTaskMessage(
  database: DatabaseHandle,
  taskId: string,
  ownerId: string,
  content: string,
  options?: CreateAskVaenyxMessageOptions,
): Promise<CreateAskVaenyxMessageResponse> {
  const conversationId = ensureTaskConversation(database, taskId, ownerId);
  return createAskVaenyxMessage(
    database,
    conversationId,
    ownerId,
    content,
    options,
  );
}
