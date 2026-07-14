import type {
  UpdateVaenyxThreadProjectRequest,
  UpdateVaenyxThreadStatusRequest,
  UpdateVaenyxThreadTitleRequest,
  VaenyxThread,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

interface VaenyxThreadRow {
  id: string;
  kind: "chat" | "task";
  title: string;
  project_id: string | null;
  project_name: string | null;
  status: "active" | "pinned" | "archived";
  source_chat_id: string | null;
  conversation_id: string | null;
  task_id: string | null;
  routine_id: string | null;
  summary: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

function toThread(row: VaenyxThreadRow): VaenyxThread {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    projectId: row.project_id,
    projectName: row.project_name,
    status: row.status,
    sourceChatId: row.source_chat_id,
    conversationId: row.conversation_id,
    taskId: row.task_id,
    routineId: row.routine_id,
    summary: row.summary,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resolveLocalOwnerId(
  database: DatabaseHandle,
  ownerId: string | null | undefined,
): string | null {
  if (ownerId) return ownerId;

  const row = database.sqlite
    .prepare("SELECT id FROM owners ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined;

  return row?.id ?? null;
}

const threadSelect = `
  SELECT vaenyx_threads.id, vaenyx_threads.kind, vaenyx_threads.title,
         vaenyx_threads.project_id, projects.name AS project_name,
         vaenyx_threads.status, vaenyx_threads.source_chat_id,
         vaenyx_threads.conversation_id, vaenyx_threads.task_id,
         vaenyx_threads.routine_id,
         vaenyx_threads.summary, vaenyx_threads.created_at,
         vaenyx_threads.updated_at,
         COALESCE((
           SELECT COUNT(*)
           FROM ask_vaenyx_messages
           WHERE ask_vaenyx_messages.conversation_id = vaenyx_threads.conversation_id
         ), 0) AS message_count
  FROM vaenyx_threads
  LEFT JOIN projects ON projects.id = vaenyx_threads.project_id
`;

export function listVaenyxThreads(
  database: DatabaseHandle,
  ownerId: string,
): VaenyxThread[] {
  const rows = database.sqlite
    .prepare(
      `${threadSelect}
       WHERE vaenyx_threads.owner_id = ?
          OR vaenyx_threads.owner_id IS NULL
       ORDER BY
         CASE vaenyx_threads.status WHEN 'pinned' THEN 0 ELSE 1 END,
         vaenyx_threads.updated_at DESC`,
    )
    .all(ownerId) as unknown as VaenyxThreadRow[];

  return rows.map(toThread);
}

function getThreadRow(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
): VaenyxThreadRow {
  const row = database.sqlite
    .prepare(
      `${threadSelect}
       WHERE vaenyx_threads.id = ?
         AND (vaenyx_threads.owner_id = ? OR vaenyx_threads.owner_id IS NULL)`,
    )
    .get(threadId, ownerId) as VaenyxThreadRow | undefined;

  if (!row) {
    throw new Error("VAENYX_THREAD_NOT_FOUND");
  }

  return row;
}

function assertProjectExists(
  database: DatabaseHandle,
  projectId: string | null,
): void {
  if (projectId === null) return;

  const project = database.sqlite
    .prepare("SELECT id FROM projects WHERE id = ?")
    .get(projectId) as { id: string } | undefined;

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
}

export function updateVaenyxThreadProject(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
  input: UpdateVaenyxThreadProjectRequest,
): VaenyxThread {
  const projectId =
    input.projectId === null ? null : input.projectId.trim() || null;

  assertProjectExists(database, projectId);
  const thread = getThreadRow(database, threadId, ownerId);
  const now = new Date().toISOString();

  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET project_id = ?, updated_at = ?
       WHERE id = ?
         AND (owner_id = ? OR owner_id IS NULL)`,
    )
    .run(projectId, now, threadId, ownerId);

  if (thread.task_id && projectId !== null) {
    database.sqlite
      .prepare("UPDATE tasks SET project_id = ? WHERE id = ?")
      .run(projectId, thread.task_id);
  }

  return toThread(getThreadRow(database, threadId, ownerId));
}

export function updateVaenyxThreadStatus(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
  input: UpdateVaenyxThreadStatusRequest,
): VaenyxThread {
  getThreadRow(database, threadId, ownerId);
  const now = new Date().toISOString();

  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET status = ?, updated_at = ?
       WHERE id = ?
         AND (owner_id = ? OR owner_id IS NULL)`,
    )
    .run(input.status, now, threadId, ownerId);

  return toThread(getThreadRow(database, threadId, ownerId));
}

export function updateVaenyxThreadTitle(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
  input: UpdateVaenyxThreadTitleRequest,
): VaenyxThread {
  const title = input.title.trim();

  if (!title) {
    throw new Error("VAENYX_THREAD_TITLE_REQUIRED");
  }

  const thread = getThreadRow(database, threadId, ownerId);
  const now = new Date().toISOString();

  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET title = ?, updated_at = ?
       WHERE id = ?
         AND (owner_id = ? OR owner_id IS NULL)`,
    )
    .run(title, now, threadId, ownerId);

  if (thread.conversation_id) {
    database.sqlite
      .prepare(
        `UPDATE ask_vaenyx_conversations
         SET title = ?, updated_at = ?
         WHERE id = ?
           AND owner_id = ?`,
      )
      .run(title, now, thread.conversation_id, ownerId);
  }

  if (thread.task_id) {
    database.sqlite
      .prepare("UPDATE tasks SET title = ? WHERE id = ?")
      .run(title, thread.task_id);
  }

  return toThread(getThreadRow(database, threadId, ownerId));
}

export function ensureChatThread(
  database: DatabaseHandle,
  input: {
    conversationId: string;
    ownerId: string;
    projectId?: string | null;
    routineId?: string | null;
    title: string;
    createdAt: string;
    updatedAt: string;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (
         id, owner_id, kind, title, project_id, status, conversation_id,
         routine_id, created_at, updated_at
       ) VALUES (?, ?, 'chat', ?, ?, 'active', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         owner_id = excluded.owner_id,
         title = excluded.title,
         project_id = excluded.project_id,
         conversation_id = excluded.conversation_id,
         routine_id = COALESCE(excluded.routine_id, routine_id),
         updated_at = excluded.updated_at`,
    )
    .run(
      input.conversationId,
      input.ownerId,
      input.title,
      input.projectId ?? null,
      input.conversationId,
      input.routineId ?? null,
      input.createdAt,
      input.updatedAt,
    );
}

// Attach (or change) the Routine on an existing chat thread — the "+" entry that
// turns an ongoing chat into a routine chat at any point. Pass null to detach.
export function setThreadRoutine(
  database: DatabaseHandle,
  conversationId: string,
  routineId: string | null,
  updatedAt: string,
): void {
  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET routine_id = ?, updated_at = ?
       WHERE conversation_id = ?`,
    )
    .run(routineId, updatedAt, conversationId);
}

export function updateChatThreadTitle(
  database: DatabaseHandle,
  conversationId: string,
  title: string,
  updatedAt: string,
): void {
  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET title = ?, updated_at = ?
       WHERE conversation_id = ?`,
    )
    .run(title, updatedAt, conversationId);
}

export function touchChatThread(
  database: DatabaseHandle,
  conversationId: string,
  updatedAt: string,
): void {
  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET updated_at = ?
       WHERE conversation_id = ?`,
    )
    .run(updatedAt, conversationId);
}

export function ensureTaskThread(
  database: DatabaseHandle,
  input: {
    taskId: string;
    ownerId?: string | null;
    title: string;
    projectId: string;
    sourceChatId?: string | null;
    createdAt: string;
    updatedAt: string;
  },
): void {
  const ownerId = resolveLocalOwnerId(database, input.ownerId);

  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (
         id, owner_id, kind, title, project_id, status, source_chat_id, task_id,
         created_at, updated_at
       ) VALUES (?, ?, 'task', ?, ?, 'active', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         owner_id = excluded.owner_id,
         title = excluded.title,
         project_id = excluded.project_id,
         source_chat_id = COALESCE(excluded.source_chat_id, source_chat_id),
         task_id = excluded.task_id,
         updated_at = excluded.updated_at`,
    )
    .run(
      input.taskId,
      ownerId,
      input.title,
      input.projectId,
      input.sourceChatId ?? null,
      input.taskId,
      input.createdAt,
      input.updatedAt,
    );
}
