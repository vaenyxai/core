import { randomUUID } from "node:crypto";

import type {
  AskVaenyxConversation,
  AskVaenyxMessage,
  CreateAskVaenyxConversationRequest,
  CreateAskVaenyxMessageResponse,
  ProjectMemory,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import { resolveProvider } from "../models/registry.js";
import { listProjectMemories } from "./memory.js";
import { noteProjectRoundCompleted } from "./project-auto-summary.js";
import {
  ensureChatThread,
  touchChatThread,
  updateChatThreadTitle,
} from "./threads.js";

interface AskVaenyxConversationRow {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  reasoning_effort: string | null;
  model_provider_id: string | null;
}

interface AskVaenyxMessageRow {
  id: string;
  conversation_id: string;
  role: "owner" | "assistant";
  content: string;
  status: "completed" | "failed";
  web_search_used: 0 | 1;
  created_at: string;
}

interface ConversationThreadContextRow {
  kind: "chat" | "task";
  project_id: string | null;
  project_name: string | null;
  instructions_manual: string | null;
  instructions_auto: string | null;
  task_id: string | null;
  task_title: string | null;
  task_request: string | null;
  task_result: string | null;
  task_status: "waiting" | "running" | "completed" | "failed" | null;
}

const DEFAULT_CHAT_TITLE = "New Vaenyx Chat";
const LEGACY_DEFAULT_CHAT_TITLE = "New Ask Vaenyx chat";
const GENERAL_PROJECT_ID = "general";
const MAX_PROJECT_MEMORIES_FOR_CHAT = 8;
const MAX_PROJECT_MEMORY_CONTENT_LENGTH = 1_500;

function toConversation(row: AskVaenyxConversationRow): AskVaenyxConversation {
  return {
    id: row.id,
    title: row.title,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reasoningEffort:
      (row.reasoning_effort as "low" | "medium" | "high" | null) ?? "medium",
    modelProviderId: row.model_provider_id ?? null,
  };
}

function toMessage(row: AskVaenyxMessageRow): AskVaenyxMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    status: row.status,
    webSearchUsed: row.web_search_used === 1,
    createdAt: row.created_at,
  };
}

function getAskVaenyxFailureMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "CODEX_UNKNOWN_ERROR";

  if (code === "CODEX_NOT_INSTALLED") {
    return "Vaenyx Chat could not start because the independent Codex CLI is not installed. Run Vaenyx-Connect-Codex.cmd, then try again.";
  }

  if (code === "CODEX_NOT_LOGGED_IN") {
    return "Vaenyx Chat could not start because Codex is not signed in. Run Vaenyx-Connect-Codex.cmd and sign in with ChatGPT.";
  }

  if (code === "CODEX_CHATGPT_REQUIRED") {
    return "Vaenyx Chat requires Codex to be signed in with ChatGPT Subscription Auth.";
  }

  if (code === "CODEX_ASK_VAENYX_BOUNDARY_VIOLATION") {
    return "Vaenyx Chat tried to use something outside this chat boundary, so Vaenyx stopped the reply. Chat may use web search, but not local commands, file changes, MCP tools, or permission requests.";
  }

  if (code === "CODEX_RETURNED_NO_ANSWER") {
    return "Vaenyx Chat connected, but did not return a visible answer.";
  }

  return `Vaenyx Chat could not complete this reply. Local error: ${code}`;
}

function getConversationRow(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
): AskVaenyxConversationRow {
  const row = database.sqlite
    .prepare(
      `SELECT ask_vaenyx_conversations.id, ask_vaenyx_conversations.title,
              ask_vaenyx_conversations.created_at, ask_vaenyx_conversations.updated_at,
              ask_vaenyx_conversations.reasoning_effort,
              ask_vaenyx_conversations.model_provider_id,
              COUNT(ask_vaenyx_messages.id) AS message_count
       FROM ask_vaenyx_conversations
       LEFT JOIN ask_vaenyx_messages
         ON ask_vaenyx_messages.conversation_id = ask_vaenyx_conversations.id
       WHERE ask_vaenyx_conversations.id = ?
         AND ask_vaenyx_conversations.owner_id = ?
       GROUP BY ask_vaenyx_conversations.id`,
    )
    .get(conversationId, ownerId) as AskVaenyxConversationRow | undefined;

  if (!row) {
    throw new Error("ASK_VAENYX_CONVERSATION_NOT_FOUND");
  }

  return row;
}

function titleFromMessage(content: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (!singleLine) return DEFAULT_CHAT_TITLE;
  return singleLine.length > 64 ? `${singleLine.slice(0, 61)}...` : singleLine;
}

function trimMemoryContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= MAX_PROJECT_MEMORY_CONTENT_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_PROJECT_MEMORY_CONTENT_LENGTH - 3)}...`;
}

function formatProjectMemoryContext(
  projectName: string,
  memories: ProjectMemory[],
): string {
  const memoryLines =
    memories.length === 0
      ? ["No approved project memories are saved for this project yet."]
      : memories.slice(0, MAX_PROJECT_MEMORIES_FOR_CHAT).map((memory, index) =>
          [
            `Memory ${index + 1}: ${memory.title}`,
            trimMemoryContent(memory.content),
          ].join("\n"),
        );

  return [
    `This conversation belongs to the ${projectName} project.`,
    "The following memories are approved project background. Use them only when relevant.",
    ...memoryLines,
  ].join("\n\n");
}

function getConversationProjectContext(
  database: DatabaseHandle,
  conversationId: string,
): string | undefined {
  const row = database.sqlite
    .prepare(
      `SELECT vaenyx_threads.kind, vaenyx_threads.project_id,
              projects.name AS project_name,
              projects.instructions_manual,
              projects.instructions_auto,
              tasks.id AS task_id,
              tasks.title AS task_title,
              tasks.request AS task_request,
              tasks.result AS task_result,
              tasks.status AS task_status
       FROM vaenyx_threads
       LEFT JOIN projects ON projects.id = vaenyx_threads.project_id
       LEFT JOIN tasks ON tasks.id = vaenyx_threads.task_id
       WHERE vaenyx_threads.conversation_id = ?
       LIMIT 1`,
    )
    .get(conversationId) as ConversationThreadContextRow | undefined;

  if (!row?.project_id) {
    return undefined;
  }

  const projectName = row.project_name ?? row.project_id;
  // Dual instruction windows (spec §7): the Owner's manual instructions and
  // Vaenyx's automatic summary Document both ride into every chat in the
  // project. Manual outranks automatic; the Owner's live words outrank both.
  const instructionContext =
    row.project_id === GENERAL_PROJECT_ID
      ? []
      : [
          row.instructions_manual?.trim()
            ? [
                `The Owner's standing instructions for the ${projectName} project (always follow these):`,
                row.instructions_manual.trim(),
              ].join("\n")
            : undefined,
          row.instructions_auto?.trim()
            ? [
                `Vaenyx's automatic summary of the Owner's preferences for the ${projectName} project (follow unless the Owner's message or their standing instructions say otherwise):`,
                row.instructions_auto.trim(),
              ].join("\n")
            : undefined,
        ].filter((part): part is string => Boolean(part));
  const projectMemoryContext =
    row.project_id === GENERAL_PROJECT_ID
      ? undefined
      : [
          ...instructionContext,
          formatProjectMemoryContext(
            projectName,
            listProjectMemories(database, row.project_id),
          ),
        ].join("\n\n");

  if (row.kind === "task") {
    const taskContext = [
      `This conversation is a follow-up inside a Vaenyx Task Thread in the ${projectName} project.`,
      row.task_title ? `Task title: ${row.task_title}` : undefined,
      row.task_status ? `Task status: ${row.task_status}` : undefined,
      row.task_request
        ? ["Original task request:", row.task_request].join("\n")
        : undefined,
      row.task_result
        ? ["Current task result:", row.task_result].join("\n")
        : undefined,
    ].filter(Boolean);

    return [taskContext.join("\n\n"), projectMemoryContext]
      .filter(Boolean)
      .join("\n\n");
  }

  if (row.project_id === GENERAL_PROJECT_ID) {
    return undefined;
  }

  return projectMemoryContext;
}

export function listAskVaenyxConversations(
  database: DatabaseHandle,
  ownerId: string,
): AskVaenyxConversation[] {
  const rows = database.sqlite
    .prepare(
      `SELECT ask_vaenyx_conversations.id, ask_vaenyx_conversations.title,
              ask_vaenyx_conversations.created_at, ask_vaenyx_conversations.updated_at,
              ask_vaenyx_conversations.reasoning_effort,
              ask_vaenyx_conversations.model_provider_id,
              COUNT(ask_vaenyx_messages.id) AS message_count
       FROM ask_vaenyx_conversations
       LEFT JOIN ask_vaenyx_messages
         ON ask_vaenyx_messages.conversation_id = ask_vaenyx_conversations.id
       WHERE ask_vaenyx_conversations.owner_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM vaenyx_threads
          WHERE vaenyx_threads.kind = 'task'
            AND vaenyx_threads.conversation_id = ask_vaenyx_conversations.id
        )
       GROUP BY ask_vaenyx_conversations.id
       ORDER BY ask_vaenyx_conversations.updated_at DESC`,
    )
    .all(ownerId) as unknown as AskVaenyxConversationRow[];

  return rows.map(toConversation);
}

export function createAskVaenyxConversation(
  database: DatabaseHandle,
  ownerId: string,
  input: CreateAskVaenyxConversationRequest = {},
): AskVaenyxConversation {
  const id = randomUUID();
  const now = new Date().toISOString();
  const title = input.title?.trim() || DEFAULT_CHAT_TITLE;
  const projectId =
    input.projectId === undefined || input.projectId === null
      ? null
      : input.projectId.trim();
  const routineId = input.routineId?.trim() || null;

  if (projectId) {
    const project = database.sqlite
      .prepare("SELECT id FROM projects WHERE id = ?")
      .get(projectId) as { id: string } | undefined;

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }
  }

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_conversations (id, owner_id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, ownerId, title, now, now);
  ensureChatThread(database, {
    conversationId: id,
    ownerId,
    projectId,
    routineId,
    title,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    title,
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
    reasoningEffort: "medium",
    modelProviderId: null,
  };
}

export function setAskVaenyxReasoningEffort(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  effort: "low" | "medium" | "high",
): AskVaenyxConversation {
  const result = database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_conversations
       SET reasoning_effort = ?
       WHERE id = ? AND owner_id = ?`,
    )
    .run(effort, conversationId, ownerId);

  if (result.changes === 0) {
    throw new Error("ASK_VAENYX_CONVERSATION_NOT_FOUND");
  }

  return toConversation(getConversationRow(database, conversationId, ownerId));
}

export function setAskVaenyxChatProvider(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  providerId: string | null,
): AskVaenyxConversation {
  const result = database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_conversations
       SET model_provider_id = ?
       WHERE id = ? AND owner_id = ?`,
    )
    .run(providerId, conversationId, ownerId);

  if (result.changes === 0) {
    throw new Error("ASK_VAENYX_CONVERSATION_NOT_FOUND");
  }

  return toConversation(getConversationRow(database, conversationId, ownerId));
}

export function deleteAskVaenyxConversation(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
): AskVaenyxConversation {
  const conversation = toConversation(
    getConversationRow(database, conversationId, ownerId),
  );

  database.sqlite
    .prepare(
      `DELETE FROM ask_vaenyx_conversations
       WHERE id = ?
         AND owner_id = ?`,
    )
    .run(conversationId, ownerId);

  return conversation;
}

export function listAskVaenyxMessages(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
): AskVaenyxMessage[] {
  getConversationRow(database, conversationId, ownerId);

  const rows = database.sqlite
    .prepare(
      `SELECT id, conversation_id, role, content, status, web_search_used, created_at
       FROM ask_vaenyx_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
    )
    .all(conversationId) as unknown as AskVaenyxMessageRow[];

  return rows.map(toMessage);
}

export interface CreateAskVaenyxMessageOptions {
  onOwnerMessage?: (message: AskVaenyxMessage) => void;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
  // Library v2 (AI-driven): when set, the reply may briefly offer this Routine at
  // the end (the classifier returned "suggest-routine"). Never forces a mention.
  suggestRoutine?: { name: string; description: string };
  // suggest-task: the reply may briefly offer to run it as a background task.
  suggestTask?: boolean;
}

export async function createAskVaenyxMessage(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  content: string,
  options?: CreateAskVaenyxMessageOptions,
): Promise<CreateAskVaenyxMessageResponse> {
  const conversation = getConversationRow(database, conversationId, ownerId);
  const now = new Date().toISOString();
  const ownerMessageId = randomUUID();
  const trimmedContent = content.trim();

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at
      ) VALUES (?, ?, 'owner', ?, 'completed', 0, ?)`,
    )
    .run(ownerMessageId, conversationId, trimmedContent, now);

  if (
    conversation.message_count === 0 &&
    [DEFAULT_CHAT_TITLE, LEGACY_DEFAULT_CHAT_TITLE].includes(conversation.title)
  ) {
    const nextTitle = titleFromMessage(trimmedContent);
    database.sqlite
      .prepare(
        `UPDATE ask_vaenyx_conversations
         SET title = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(nextTitle, now, conversationId);
    updateChatThreadTitle(database, conversationId, nextTitle, now);
  }

  // Emit the owner message immediately so a streaming client can echo it
  // before the model reply begins.
  options?.onOwnerMessage?.({
    id: ownerMessageId,
    conversationId,
    role: "owner",
    content: trimmedContent,
    status: "completed",
    webSearchUsed: false,
    createdAt: now,
  });

  const MAX_HISTORY_MESSAGES = 30;
  const history = listAskVaenyxMessages(database, conversationId, ownerId)
    // Never replay canned failure strings back into the model context, or one
    // transient error permanently poisons the thread (improvement plan B4).
    .filter(
      (message) =>
        !(message.role === "assistant" && message.status === "failed"),
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      content: message.content,
      role: message.role,
    }));

  let assistantContent: string;
  let assistantStatus: "completed" | "failed";
  let webSearchUsed = false;
  let streamed = "";

  const baseContext = getConversationProjectContext(database, conversationId);
  let projectContext = baseContext;
  if (options?.suggestRoutine) {
    const suggestion = options.suggestRoutine;
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}The Owner has a saved Routine "${suggestion.name}" — ${suggestion.description}. If it genuinely fits what they are asking, briefly offer it at the very end of your reply (for example: "Want me to use ${suggestion.name} for this?") and stop there. If it does not clearly fit, ignore this note entirely.`;
  }
  if (options?.suggestTask) {
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}This may be a job better run in the background (it takes time, or could repeat). If so, briefly offer at the very end to run it as a background task (for example: "Want me to run this as a background task?") and stop there. If not, ignore this note.`;
  }

  try {
    const settingsRow = database.sqlite
      .prepare(
        `SELECT reasoning_effort, model_provider_id FROM ask_vaenyx_conversations WHERE id = ?`,
      )
      .get(conversationId) as
      | { reasoning_effort: string | null; model_provider_id: string | null }
      | undefined;
    const result = await resolveProvider(
      settingsRow?.model_provider_id,
    ).sendChat(history, projectContext, {
      onDelta: options?.onDelta
        ? (delta) => {
            streamed += delta;
            options.onDelta?.(delta);
          }
        : undefined,
      signal: options?.signal,
      reasoningEffort: settingsRow?.reasoning_effort ?? "medium",
    });
    assistantContent = result.answer;
    assistantStatus = "completed";
    webSearchUsed = result.webSearchUsed;
  } catch (error) {
    // If the turn was stopped mid-stream, keep the partial text the Owner
    // already saw instead of replacing it with a generic failure message.
    const partial = streamed.trim();
    assistantContent = partial
      ? `${partial}\n\n_(stopped)_`
      : getAskVaenyxFailureMessage(error);
    assistantStatus = "failed";
  }

  const assistantMessageId = randomUUID();
  const completedAt = new Date().toISOString();

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at
      ) VALUES (?, ?, 'assistant', ?, ?, ?, ?)`,
    )
    .run(
      assistantMessageId,
      conversationId,
      assistantContent,
      assistantStatus,
      webSearchUsed ? 1 : 0,
      completedAt,
    );

  database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_conversations
       SET updated_at = ?
       WHERE id = ?`,
    )
    .run(completedAt, conversationId);
  touchChatThread(database, conversationId, completedAt);

  // Project auto-summary cadence (spec §7): count this completed round and,
  // when due, rewrite the project's automatic instruction Document in the
  // background. The reply is already stored — this can never affect the chat.
  if (assistantStatus === "completed") {
    try {
      noteProjectRoundCompleted(
        database,
        conversationId,
        (
          database.sqlite
            .prepare(
              "SELECT model_provider_id FROM ask_vaenyx_conversations WHERE id = ?",
            )
            .get(conversationId) as
            | { model_provider_id: string | null }
            | undefined
        )?.model_provider_id ?? null,
      );
    } catch {
      // Counting must never break the chat response.
    }
  }

  return {
    conversation: toConversation(
      getConversationRow(database, conversationId, ownerId),
    ),
    messages: [
      {
        id: ownerMessageId,
        conversationId,
        role: "owner",
        content: trimmedContent,
        status: "completed",
        webSearchUsed: false,
        createdAt: now,
      },
      {
        id: assistantMessageId,
        conversationId,
        role: "assistant",
        content: assistantContent,
        status: assistantStatus,
        webSearchUsed,
        createdAt: completedAt,
      },
    ],
  };
}
