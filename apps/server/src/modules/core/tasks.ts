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
import { ensureTaskThread } from "./threads.js";

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
    .run(id, title, request, project.id, skill?.id ?? null, now, memories.length);

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
  const title = request.length > 64 ? `${request.slice(0, 61)}...` : request;
  const memories = listTaskProjectMemories(database, project.id);
  const sourceChat = getSourceChat(database, input.sourceChatId ?? null, ownerId);

  database.sqlite
    .prepare(
      `INSERT INTO tasks (
        id, title, request, result, status, source, project_id, skill_id,
        provider, harness, agent, autonomy_level, created_at, completed_at,
        source_app_id, memory_used_count
      ) VALUES (?, ?, ?, '', 'running', 'owner', ?, ?,
        'openai-subscription-auth', 'codex-harness', 'Vaenyx', 0, ?, NULL, NULL, ?)`,
    )
    .run(id, title, request, project.id, skill?.id ?? null, now, memories.length);

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
    getDefaultProvider().sendChat([{ content: request, role: "owner" }], context, {
      signal,
    }).then((reply) => reply.answer),
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
  };
}

// In-flight task executions, keyed by task id, so the Owner can cancel them.
const runningTasks = new Map<string, AbortController>();

const TASK_ERROR_COPY: Record<string, string> = {
  CODEX_TASK_CANCELLED: "This task was cancelled.",
  CODEX_NOT_INSTALLED:
    "Forge could not start because the independent Codex CLI is not installed.",
  CODEX_NOT_LOGGED_IN: "Forge could not start because Codex is not signed in.",
  CODEX_CHATGPT_REQUIRED:
    "Forge requires Codex to be signed in with ChatGPT Subscription Auth.",
  CODEX_DID_NOT_INSPECT_REPOSITORY:
    "Forge did not inspect the Vaenyx repository before answering, so Vaenyx rejected the result.",
  CODEX_READ_ONLY_BOUNDARY_VIOLATION:
    "Forge attempted an action outside its read-only safety boundary, so Vaenyx stopped the task.",
  CODEX_REPOSITORY_BOUNDARY_VIOLATION:
    "Forge attempted to inspect outside the Vaenyx repository, so Vaenyx stopped the task.",
};

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
    database.sqlite
      .prepare(
        `UPDATE vaenyx_threads SET updated_at = ?
         WHERE task_id = ? AND kind = 'task'`,
      )
      .run(finishedAt, taskId);
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
    const code = error instanceof Error ? error.message : "CODEX_UNKNOWN_ERROR";
    result =
      TASK_ERROR_COPY[code] ??
      `This task could not complete. Local error: ${code}`;
    status = "failed";
  } finally {
    runningTasks.delete(id);
  }

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
    if (trigger === "schedule") {
      const titleRow = database.sqlite
        .prepare("SELECT title FROM tasks WHERE id = ?")
        .get(id) as { title: string } | undefined;
      schedulePresenceAwarePush(database, {
        title: titleRow?.title ?? "Vaenyx task",
        body:
          status === "completed"
            ? "New result is ready."
            : "The scheduled run failed.",
        url: "/",
      });
    }
  } catch {
    // Server shutting down (database closed); reconcile handles it next start.
  }
}

// On startup, any task left "running" was interrupted by a restart/crash. Mark
// it failed so it is no longer stuck and the Owner can retry it.
export function reconcileInterruptedTasks(database: DatabaseHandle): number {
  const now = new Date().toISOString();
  const message =
    "This task was interrupted when Vaenyx restarted. Run it again to retry.";

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
    .prepare("SELECT id FROM tasks WHERE id = ?")
    .get(taskId) as { id: string } | undefined;
  if (!existing) throw new Error("TASK_NOT_FOUND");

  const enabled = input.enabled && input.cadence !== null;
  const time = input.time ?? null;
  const dayOfWeek = input.dayOfWeek ?? null;
  const dayOfMonth = input.dayOfMonth ?? null;
  const nextRunAt =
    enabled && input.cadence
      ? computeNextRun({ cadence: input.cadence, time, dayOfWeek, dayOfMonth }, Date.now())
      : null;

  database.sqlite
    .prepare(
      `UPDATE tasks
       SET schedule_cadence = ?, schedule_time = ?, schedule_day_of_week = ?,
           schedule_day_of_month = ?, schedule_enabled = ?, next_run_at = ?
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

  const updated = listTasks(database).find((task) => task.id === taskId);
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
const RUN_RESULT_INSTRUCTION =
  "This is a background run of a saved task. Produce the complete, ready-to-read result now — organized for reading, with source links where relevant — not a plan, and not a recap of what you would do.";

// Any format, scope or preference the Owner tuned in the task's conversation
// carries into every later run — chatting with the task IS how it is tuned.
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
  if (messages.length === 0) return undefined;
  const transcript = messages
    .reverse()
    .map(
      (message) =>
        `${message.role === "owner" ? "Owner" : "Vaenyx"}: ${message.content.slice(0, 1500)}`,
    )
    .join("\n");
  return `The Owner and Vaenyx have discussed this task before. Honor any format, scope or preference agreed in that discussion:\n${transcript}`;
}

// Re-run a codex-harness task by id: Forge (read-only repo) or Vaenyx research
// (web-search chat). Rebuilds inputs from the stored request, marks it running,
// and executes in the background. Shared by the scheduler and manual retry.
function runTaskById(
  database: DatabaseHandle,
  taskId: string,
  trigger: "manual" | "schedule",
): boolean {
  const task = database.sqlite
    .prepare(
      "SELECT id, request, skill_id, project_id, agent FROM tasks WHERE id = ? AND harness = 'codex-harness'",
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
      RUN_RESULT_INSTRUCTION,
    ]
      .filter(Boolean)
      .join("\n\n");
    run = (signal) =>
      getDefaultProvider().sendChat([{ content: task.request, role: "owner" }], context, {
        signal,
      }).then((reply) => reply.answer);
  }

  database.sqlite
    .prepare(
      "UPDATE tasks SET status = 'running', result = '', completed_at = NULL WHERE id = ?",
    )
    .run(taskId);
  void executeTaskRun(database, taskId, trigger, run);
  return true;
}

// The scheduler tick: run every enabled task whose next run is due. Skips tasks
// already running, queues the next run, and records each as a scheduled run.
export function runDueTasks(database: DatabaseHandle): number {
  const now = Date.now();
  const dueRows = database.sqlite
    .prepare(
      `SELECT id, schedule_cadence, schedule_time, schedule_day_of_week,
              schedule_day_of_month
       FROM tasks
       WHERE schedule_enabled = 1
         AND status != 'running'
         AND harness = 'codex-harness'
         AND next_run_at IS NOT NULL
         AND next_run_at <= ?`,
    )
    .all(new Date(now).toISOString()) as {
    id: string;
    schedule_cadence: Cadence | null;
    schedule_time: string | null;
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
  }[];

  for (const due of dueRows) {
    database.sqlite
      .prepare("UPDATE tasks SET next_run_at = ? WHERE id = ?")
      .run(
        due.schedule_cadence
          ? computeNextRun(
              {
                cadence: due.schedule_cadence,
                time: due.schedule_time,
                dayOfWeek: due.schedule_day_of_week,
                dayOfMonth: due.schedule_day_of_month,
              },
              now,
            )
          : null,
        due.id,
      );
    runTaskById(database, due.id, "schedule");
  }

  return dueRows.length;
}

// Manually re-run a failed/completed Forge task. Returns the now-running task.
export function retryTask(database: DatabaseHandle, taskId: string): Task {
  const existing = database.sqlite
    .prepare("SELECT id, status, harness FROM tasks WHERE id = ?")
    .get(taskId) as
    | { id: string; status: string; harness: string }
    | undefined;
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
