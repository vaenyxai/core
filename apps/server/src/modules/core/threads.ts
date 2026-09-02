import type {
  UpdateVaenyxThreadDetailsRequest,
  UpdateVaenyxThreadProjectRequest,
  UpdateVaenyxThreadStatusRequest,
  UpdateVaenyxThreadTitleRequest,
  VaenyxThread,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import { cancelPresenceAwarePush } from "./push.js";

interface VaenyxThreadRow {
  id: string;
  kind: "chat" | "task" | "inbox";
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
  seen_at: string | null;
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
    purpose: row.summary,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    seenAt: row.seen_at,
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
         vaenyx_threads.updated_at, vaenyx_threads.seen_at,
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
  modeId: string | null = null,
): VaenyxThread[] {
  // Sandbox filter (Custom Mode M2): a session sees only its own mode's
  // threads; User Mode (null) sees User-Mode threads. Sandboxes never see
  // each other; User Mode's god view over sandboxes is the M4 view window.
  const rows = database.sqlite
    .prepare(
      `${threadSelect}
       WHERE (vaenyx_threads.owner_id = ?
          OR vaenyx_threads.owner_id IS NULL)
         AND ((? IS NULL AND vaenyx_threads.mode_id IS NULL)
          OR vaenyx_threads.mode_id = ?)
       ORDER BY
         CASE vaenyx_threads.status WHEN 'pinned' THEN 0 ELSE 1 END,
         vaenyx_threads.updated_at DESC`,
    )
    .all(ownerId, modeId, modeId) as unknown as VaenyxThreadRow[];

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
  const now = new Date().toISOString();
  let archivedTaskId: string | null = null;
  let updated: VaenyxThread;
  let transactionOpen = false;

  try {
    // The thread status and its task schedule are one decision. BEGIN IMMEDIATE
    // also serialises this decision against a scheduler claim from another
    // connection: whichever wins first leaves one coherent state behind.
    database.sqlite.exec("BEGIN IMMEDIATE;");
    transactionOpen = true;
    const row = getThreadRow(database, threadId, ownerId);

    // 🔴 The Mode's permanent conversation stays pinned. Archiving it would
    // take it off the screen, which is deleting it as far as anybody looking
    // can tell, and un-pinning it would bury the one place Vaenyx speaks from.
    if (row.kind === "inbox") {
      throw new Error("THREAD_PROTECTED");
    }

    if (input.status === "archived" && row.task_id) {
      archivedTaskId = row.task_id;
      database.sqlite
        .prepare(
          `UPDATE tasks
           SET schedule_paused_by_archive =
                 CASE WHEN schedule_enabled = 1
                      THEN 1 ELSE schedule_paused_by_archive END,
               schedule_enabled = 0,
               next_run_at = NULL
           WHERE id = ?`,
        )
        .run(row.task_id);
    }

    database.sqlite
      .prepare(
        `UPDATE vaenyx_threads
         SET status = ?, updated_at = ?
         WHERE id = ?
           AND (owner_id = ? OR owner_id IS NULL)`,
      )
      .run(input.status, now, threadId, ownerId);

    updated = toThread(getThreadRow(database, threadId, ownerId));
    database.sqlite.exec("COMMIT;");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) database.sqlite.exec("ROLLBACK;");
    throw error;
  }

  // A result may already be waiting through the 35-second unseen window when
  // Archive lands. It belongs in history, but must not buzz about a
  // Conversation the Owner just made quiet.
  if (archivedTaskId) {
    cancelPresenceAwarePush(
      `scheduled-task:${archivedTaskId}`,
      "the scheduled Conversation was archived.",
    );
  }

  return updated;
}

/** The Owner has this thread open: everything in it up to its current
 *  activity counts as read, on every device (Oskar, 2026-08-16 — reading a
 *  result on the phone must clear the dot on the computer).
 *
 *  seen_at is copied FROM updated_at rather than stamped with a fresh clock
 *  reading: the two values are then always in the same format and the same
 *  timeline, so `updated_at > seen_at` cannot go wrong at a format seam, and
 *  a message landing a second later is honestly still unread. */
export function markVaenyxThreadSeen(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
): VaenyxThread {
  getThreadRow(database, threadId, ownerId);

  database.sqlite
    .prepare(
      `UPDATE vaenyx_threads
       SET seen_at = updated_at
       WHERE id = ?
         AND (owner_id = ? OR owner_id IS NULL)`,
    )
    .run(threadId, ownerId);

  return toThread(getThreadRow(database, threadId, ownerId));
}

export function updateVaenyxThreadTitle(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
  input: UpdateVaenyxThreadTitleRequest,
): VaenyxThread {
  const current = getThreadRow(database, threadId, ownerId);
  return updateVaenyxThreadDetails(database, threadId, ownerId, {
    title: input.title,
    purpose: current.summary ?? "",
  });
}

function oneLine(value: string): string {
  let safe = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    safe += code < 32 || code === 127 ? " " : character;
  }
  return safe.replace(/\s+/g, " ").trim();
}

export function updateVaenyxThreadDetails(
  database: DatabaseHandle,
  threadId: string,
  ownerId: string,
  input: UpdateVaenyxThreadDetailsRequest,
): VaenyxThread {
  const title = oneLine(input.title);
  const purpose = oneLine(input.purpose) || null;

  if (!title) {
    throw new Error("VAENYX_THREAD_TITLE_REQUIRED");
  }

  const thread = getThreadRow(database, threadId, ownerId);
  const now = new Date().toISOString();
  let transactionOpen = false;

  try {
    database.sqlite.exec("BEGIN IMMEDIATE;");
    transactionOpen = true;
    database.sqlite
      .prepare(
        `UPDATE vaenyx_threads
         SET title = ?, summary = ?, updated_at = ?
         WHERE id = ?
           AND (owner_id = ? OR owner_id IS NULL)`,
      )
      .run(title, purpose, now, threadId, ownerId);

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

    database.sqlite.exec("COMMIT;");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) database.sqlite.exec("ROLLBACK;");
    throw error;
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
  // seen_at is seeded on INSERT only: a thread the Owner just made is not
  // "unread" — they are looking at it. Later activity bumps updated_at alone
  // (the conflict branch), which is exactly what unread means.
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (
         id, owner_id, kind, title, project_id, status, conversation_id,
         routine_id, created_at, updated_at, seen_at, mode_id
       ) VALUES (?, ?, 'chat', ?, ?, 'active', ?, ?, ?, ?, ?,
         (SELECT mode_id FROM ask_vaenyx_conversations WHERE id = ?))
       ON CONFLICT(id) DO UPDATE SET
         owner_id = excluded.owner_id,
         title = excluded.title,
         project_id = excluded.project_id,
         conversation_id = excluded.conversation_id,
         routine_id = COALESCE(excluded.routine_id, routine_id),
         mode_id = excluded.mode_id,
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
      input.updatedAt,
      input.conversationId,
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

  // Same seeding rule as ensureChatThread: born read (the request is the
  // Owner's own words); only later runs make it unread.
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_threads (
         id, owner_id, kind, title, project_id, status, source_chat_id, task_id,
         created_at, updated_at, seen_at, mode_id
       ) VALUES (?, ?, 'task', ?, ?, 'active', ?, ?, ?, ?, ?,
         (SELECT mode_id FROM tasks WHERE id = ?))
       ON CONFLICT(id) DO UPDATE SET
         owner_id = excluded.owner_id,
         title = excluded.title,
         project_id = excluded.project_id,
         source_chat_id = COALESCE(excluded.source_chat_id, source_chat_id),
         task_id = excluded.task_id,
         mode_id = excluded.mode_id,
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
      input.updatedAt,
      input.taskId,
    );
}
