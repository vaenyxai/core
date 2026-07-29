import { randomUUID } from "node:crypto";

import type {
  AskVaenyxConversation,
  AskVaenyxMessage,
  CreateAskVaenyxConversationRequest,
  CreateAskVaenyxMessageResponse,
  ImageAnnotationItem,
  ProjectMemory,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import type { ModelProvider } from "../models/provider.js";
import { getModelRegistry, resolveProvider } from "../models/registry.js";
import { listProjectMemories } from "./memory.js";
import { noteProjectRoundCompleted } from "./project-auto-summary.js";
import { schedulePresenceAwarePush } from "./push.js";
import {
  buildImagePrompt,
  generateImage,
  isImageFollowUp,
  getImageEngineStatus,
  looksLikeImageRequest,
} from "./image-gen.js";
import {
  DOCUMENT_GATE_PAGES,
  DOCUMENT_NATIVE_PROVIDER_IDS,
  extractDocumentText,
  inspectDocument,
  readDocument,
} from "./documents.js";
import {
  annotateImage,
  describeImage,
  imageDataUrl,
  imageFilePath,
  readImage,
  VISION_DIRECT_PROVIDER_IDS,
} from "./vision.js";
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
  model_name: string | null;
}

interface AskVaenyxMessageRow {
  id: string;
  conversation_id: string;
  role: "owner" | "assistant";
  content: string;
  status: "completed" | "failed";
  web_search_used: 0 | 1;
  created_at: string;
  voice: 0 | 1;
  audio_id: string | null;
  image_id: string | null;
  image_prompt: string | null;
  image_annotations: string | null;
  document_id: string | null;
  document_name: string | null;
  document_pages: number | null;
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

// Did this conversation already produce a generated picture? Decides whether a
// bare follow-up ("再来一张") should draw again. Assistant messages only: a
// photo the Owner attached is not a picture Vaenyx made.
function conversationHasGeneratedImage(
  database: DatabaseHandle,
  conversationId: string,
): boolean {
  const row = database.sqlite
    .prepare(
      `SELECT 1 FROM ask_vaenyx_messages
        WHERE conversation_id = ? AND role = 'assistant' AND image_id IS NOT NULL
        ORDER BY created_at DESC LIMIT 1`,
    )
    .get(conversationId);
  return row !== undefined;
}

// Any photo at all (owner-attached or generated): gates whether the judge is
// offered "annotate" — marking needs a picture to mark.
export function conversationHasPhoto(
  database: DatabaseHandle,
  conversationId: string,
): boolean {
  const row = database.sqlite
    .prepare(
      `SELECT 1 FROM ask_vaenyx_messages
        WHERE conversation_id = ? AND image_id IS NOT NULL
        LIMIT 1`,
    )
    .get(conversationId);
  return row !== undefined;
}

// How many recent messages ride into the model verbatim. Everything older is
// compacted (see compactConversationHistory) rather than dropped.
const MAX_HISTORY_MESSAGES = 30;
// Rewriting the summary costs a model call, so it only happens once this many
// further messages have aged out of the window.
const SUMMARY_REFRESH_EVERY = 10;
// The Owner's approved profile, capped so a long profile cannot crowd out the
// conversation itself.
const MAX_OWNER_PROFILE_ITEMS = 12;

// The long-conversation memory (Oskar, 2026-07-29). A chat used to forget its
// own beginning: only the last 30 messages reached the model and the rest were
// simply dropped. Now everything that ages out is folded into a rolling
// summary — recursively, so the summary of the first 100 messages becomes part
// of the summary of the first 200 — and that summary rides every later turn.
// Best-effort by design: a failed compaction returns the previous summary (or
// none) and the reply proceeds; memory is never a reason to lose an answer.
async function compactConversationHistory(
  database: DatabaseHandle,
  conversationId: string,
  usableHistory: AskVaenyxMessage[],
  provider: ModelProvider,
  signal?: AbortSignal,
): Promise<string | null> {
  const olderCount = Math.max(0, usableHistory.length - MAX_HISTORY_MESSAGES);
  const row = database.sqlite
    .prepare(
      `SELECT history_summary, history_summary_count
       FROM ask_vaenyx_conversations WHERE id = ?`,
    )
    .get(conversationId) as
    | { history_summary: string | null; history_summary_count: number }
    | undefined;
  const storedSummary = row?.history_summary?.trim() || null;
  const storedCount = row?.history_summary_count ?? 0;

  const formatSummary = (summary: string): string =>
    `Earlier in this conversation (a summary of the ${storedCount > 0 ? "older" : "earlier"} messages, which are no longer shown in full):\n${summary}`;

  if (olderCount === 0) return null;
  if (storedSummary && olderCount - storedCount < SUMMARY_REFRESH_EVERY) {
    return formatSummary(storedSummary);
  }

  // Only the messages that have aged out since the last summary need reading;
  // the previous summary carries everything before them.
  const fresh = usableHistory.slice(storedCount, olderCount);
  if (fresh.length === 0) {
    return storedSummary ? formatSummary(storedSummary) : null;
  }
  const transcript = fresh
    .map(
      (message) =>
        `${message.role === "owner" ? "Owner" : "Vaenyx"}: ${message.content.slice(0, 2000)}`,
    )
    .join("\n");

  try {
    const result = await provider.sendChat(
      [
        {
          role: "owner",
          content: [
            "Update the running summary of a conversation so nothing important is lost when the older messages stop being shown in full.",
            "Keep it SHORT and factual: bullet lines, one fact per line — decisions made, things the Owner stated about themselves or their situation, open threads, and anything they asked you to remember.",
            "Drop small talk and anything already superseded. Write in the language the conversation is in. No preamble, no headings — lines only.",
            "",
            storedSummary
              ? `Summary so far:\n${storedSummary}\n`
              : "There is no summary yet.\n",
            "New messages to fold in:",
            transcript,
          ].join("\n"),
        },
      ],
      undefined,
      { ...(signal ? { signal } : {}) },
    );
    const summary = result.answer.trim().slice(0, 4000);
    if (!summary) return storedSummary ? formatSummary(storedSummary) : null;
    database.sqlite
      .prepare(
        `UPDATE ask_vaenyx_conversations
         SET history_summary = ?, history_summary_count = ?
         WHERE id = ?`,
      )
      .run(summary, olderCount, conversationId);
    return formatSummary(summary);
  } catch {
    // A failed compaction must never cost the Owner their answer.
    return storedSummary ? formatSummary(storedSummary) : null;
  }
}

// The long-term memory layer: the Owner's OWN approved Vaenyx Me profile.
// Only approved items — a candidate Vaenyx guessed at but the Owner never
// confirmed has no business steering replies (the Evolution rule: Vaenyx
// proposes, the Owner decides).
function formatVaenyxMeContext(database: DatabaseHandle): string | null {
  const rows = database.sqlite
    .prepare(
      `SELECT title, summary FROM vaenyx_me_items
       WHERE status = 'approved'
       ORDER BY sort_order, title
       LIMIT ?`,
    )
    .all(MAX_OWNER_PROFILE_ITEMS) as { title: string; summary: string }[];
  if (rows.length === 0) return null;
  const lines = rows
    .map((item) => `- ${item.title}: ${item.summary.trim().slice(0, 300)}`)
    .join("\n");
  return [
    "What you know about the Owner (their own profile, which they approved — treat it as background, never contradict what they say in this conversation):",
    lines,
  ].join("\n");
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
    modelName: row.model_name ?? null,
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
    voice: row.voice === 1,
    audioId: row.audio_id ?? null,
    imageId: row.image_id ?? null,
    imagePrompt: row.image_prompt ?? null,
    imageAnnotations: parseAnnotations(row.image_annotations),
    documentId: row.document_id ?? null,
    documentName: row.document_name ?? null,
    documentPages: row.document_pages ?? null,
  };
}

function parseAnnotations(
  raw: string | null | undefined,
): ImageAnnotationItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ImageAnnotationItem[]) : null;
  } catch {
    // A corrupt row just means no overlay; the photo itself is untouched.
    return null;
  }
}

function getAskVaenyxFailureMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "CODEX_UNKNOWN_ERROR";

  if (code === "MODE_LOCAL_ONLY_UNAVAILABLE") {
    return "This mode allows the local model only, and no local model is connected. The account owner can connect one under Models (Local model), or relax this mode's restriction.";
  }

  if (code === "CODEX_NOT_INSTALLED") {
    return "Vaenyx Chat could not start because the independent Codex CLI is not installed. Run Vaenyx-Connect-Codex.cmd, then try again.";
  }

  if (code === "CODEX_NOT_LOGGED_IN") {
    return "Vaenyx Chat could not start because Codex is not signed in. Run Vaenyx-Connect-Codex.cmd and sign in with ChatGPT.";
  }

  if (code === "CODEX_CHATGPT_REQUIRED") {
    return "Vaenyx Chat requires Codex to be signed in with ChatGPT Subscription Auth.";
  }

  if (code.startsWith("CODEX_ASK_VAENYX_BOUNDARY_VIOLATION")) {
    const what = code.split(":")[1];
    return `Vaenyx Chat tried to use something outside this chat boundary, so Vaenyx stopped the reply${
      what ? ` (${what})` : ""
    }. Chat may use web search, but not local commands, file changes, MCP tools, or permission requests.`;
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
              ask_vaenyx_conversations.model_name,
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
  modeId: string | null = null,
): AskVaenyxConversation[] {
  // Sandbox filter (Custom Mode M2): conversations stay inside the mode
  // they were started in; User Mode (null) sees only User-Mode chats.
  const rows = database.sqlite
    .prepare(
      `SELECT ask_vaenyx_conversations.id, ask_vaenyx_conversations.title,
              ask_vaenyx_conversations.created_at, ask_vaenyx_conversations.updated_at,
              ask_vaenyx_conversations.reasoning_effort,
              ask_vaenyx_conversations.model_provider_id,
              ask_vaenyx_conversations.model_name,
              COUNT(ask_vaenyx_messages.id) AS message_count
       FROM ask_vaenyx_conversations
       LEFT JOIN ask_vaenyx_messages
         ON ask_vaenyx_messages.conversation_id = ask_vaenyx_conversations.id
       WHERE ask_vaenyx_conversations.owner_id = ?
        AND ((? IS NULL AND ask_vaenyx_conversations.mode_id IS NULL)
          OR ask_vaenyx_conversations.mode_id = ?)
        AND NOT EXISTS (
          SELECT 1
          FROM vaenyx_threads
          WHERE vaenyx_threads.kind = 'task'
            AND vaenyx_threads.conversation_id = ask_vaenyx_conversations.id
        )
       GROUP BY ask_vaenyx_conversations.id
       ORDER BY ask_vaenyx_conversations.updated_at DESC`,
    )
    .all(ownerId, modeId, modeId) as unknown as AskVaenyxConversationRow[];

  return rows.map(toConversation);
}

export function createAskVaenyxConversation(
  database: DatabaseHandle,
  ownerId: string,
  input: CreateAskVaenyxConversationRequest = {},
  modeId: string | null = null,
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
      `INSERT INTO ask_vaenyx_conversations (id, owner_id, title, created_at, updated_at, mode_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, ownerId, title, now, now, modeId);
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
    modelName: null,
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

export function setAskVaenyxChatModel(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  model: string | null,
): AskVaenyxConversation {
  const result = database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_conversations
       SET model_name = ?
       WHERE id = ? AND owner_id = ?`,
    )
    .run(model, conversationId, ownerId);

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

  // image_prompt rides along (it was silently missing from this SELECT, so a
  // reopened chat lost the F5 "prompt sent" line), and each photo brings any
  // stored marks with it so the overlay survives reopening.
  const rows = database.sqlite
    .prepare(
      `SELECT m.id, m.conversation_id, m.role, m.content, m.status,
              m.web_search_used, m.created_at, m.voice, m.audio_id, m.image_id,
              m.image_prompt, m.document_id, m.document_name, m.document_pages,
              a.items AS image_annotations
       FROM ask_vaenyx_messages m
       LEFT JOIN image_annotations a ON a.image_id = m.image_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
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
  // create-*: the Owner asked Vaenyx to BUILD a new Method/Routine. An offer
  // card under the reply opens the real creation flow — the model must point
  // there and never claim to have created anything itself.
  suggestCreate?: "method" | "routine";
  // clarify-create (spec §2a phase 2): the Owner wants something built but the
  // description is not enough to build from. This reply must only ask the given
  // clarifying question — nothing is built on this turn.
  clarifyCreate?: string;
  // Voice turn: the saved recording's id. Marks both sides as voice bubbles
  // and asks the model for a short spoken-style reply.
  voiceAudioId?: string;
  // Phase B: an uploaded photo's id attached to this owner message; handed to
  // the main model directly when it reads images.
  imageId?: string;
  // draw verdict: the message classifier (the ONE per-message judgment) already
  // decided this asks for a picture and produced the English prompt. The turn
  // generates with it instead of judging again.
  imagePrompt?: string;
  // annotate verdict from the same judge: mark the conversation's latest photo
  // (dots + names) before replying.
  annotate?: boolean;
  // A PDF fed with this message, and the Owner's answer to the M1 cost gate.
  // The gate is enforced HERE as well as in the UI: a document at or above the
  // threshold without an acknowledgement is refused, so a modified client
  // cannot spend the Owner's model quota without telling them first.
  documentId?: string;
  documentName?: string;
  documentAcknowledged?: boolean;
  // Live progress for the Owner (Oskar, 2026-07-27): what the turn is doing
  // while nothing is streaming yet ("image-generating"…), and the model's own
  // thinking where the backend exposes it. Both vanish when the reply lands.
  onStatus?: (code: string) => void;
  onThinking?: (text: string) => void;
  // The analysed photo, handed to the client the moment the turn knows it will
  // echo it — long before the reply is written. Without this the picture only
  // appeared when the whole answer landed, so it showed up last despite
  // sitting first (Oskar, 2026-07-29).
  onEchoImage?: (imageId: string) => void;
  // Where stored photos live (needed to build the data URL for the model).
  dataDirectory?: string;
  // Where the model keys live. Needed so a photo can still be READ when the
  // chat model cannot see images: the vision model describes it and the
  // description rides along as context.
  secretsDirectory?: string;
}

// Insert a Vaenyx-authored status note into a conversation (e.g. "✔ Routine X
// is built"). It is a normal assistant message: the Owner sees it in place and
// the model sees it in history on later turns — the chat "knows" what happened.
export function appendAssistantNote(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  content: string,
): AskVaenyxMessage {
  getConversationRow(database, conversationId, ownerId);
  const id = randomUUID();
  const now = new Date().toISOString();
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at
      ) VALUES (?, ?, 'assistant', ?, 'completed', 0, ?)`,
    )
    .run(id, conversationId, content.trim(), now);
  database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_conversations SET updated_at = ? WHERE id = ?`,
    )
    .run(now, conversationId);
  touchChatThread(database, conversationId, now);
  return {
    id,
    conversationId,
    role: "assistant",
    content: content.trim(),
    status: "completed",
    webSearchUsed: false,
    createdAt: now,
  };
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

  // The M1 cost gate, enforced server-side: a document at or above the page
  // threshold cannot be read until the Owner has answered the gate. The money
  // is theirs, so the rule cannot live only in the screen they were shown.
  let documentPages: number | null = null;
  if (options?.documentId && options.dataDirectory) {
    const file = readDocument(options.dataDirectory, options.documentId);
    if (!file) throw new Error("DOCUMENT_NOT_FOUND");
    const facts = await inspectDocument(file);
    documentPages = facts.pages;
    if (facts.pages >= DOCUMENT_GATE_PAGES && !options.documentAcknowledged) {
      throw new Error("DOCUMENT_COST_NOT_ACKNOWLEDGED");
    }
  }

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at,
        voice, audio_id, image_id, document_id, document_name, document_pages
      ) VALUES (?, ?, 'owner', ?, 'completed', 0, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      ownerMessageId,
      conversationId,
      trimmedContent,
      now,
      options?.voiceAudioId ? 1 : 0,
      options?.voiceAudioId ?? null,
      options?.imageId ?? null,
      options?.documentId ?? null,
      options?.documentName ?? null,
      documentPages,
    );

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
    voice: Boolean(options?.voiceAudioId),
    audioId: options?.voiceAudioId ?? null,
    imageId: options?.imageId ?? null,
  });

  const usableHistory = listAskVaenyxMessages(database, conversationId, ownerId)
    // Never replay canned failure strings back into the model context, or one
    // transient error permanently poisons the thread (improvement plan B4).
    .filter(
      (message) =>
        !(message.role === "assistant" && message.status === "failed"),
    );
  const history = usableHistory
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      content: message.content,
      role: message.role,
    }));
  let assistantContent: string;
  let assistantStatus: "completed" | "failed";
  let webSearchUsed = false;
  let streamed = "";
  let generatedImageId: string | null = null;
  // The exact sentence that reached the image provider, stored with the reply
  // and shown beside the picture — F5's closing sentence promises it, and the
  // main model can word things the Owner never typed.
  let sentImagePrompt: string | null = null;
  // The analysed photo, echoed back with the answer (marked) — see the
  // parallel marking below.
  let echoImageId: string | null = null;
  let echoMarks: Promise<unknown> | null = null;

  const baseContext = getConversationProjectContext(database, conversationId);
  let projectContext = baseContext;
  // Custom Mode M3: a conversation inside a mode carries the mode's
  // natural-language rules as standing instructions, and "local only"
  // hard-forces the local model further down (code is the floor — the
  // rules text can only make things stricter, never looser).
  const modeRow = database.sqlite
    .prepare(
      `SELECT modes.name AS name, modes.rules AS rules,
              modes.local_only AS local_only, modes.agent_name AS agent_name
       FROM ask_vaenyx_conversations
       JOIN modes ON modes.id = ask_vaenyx_conversations.mode_id
       WHERE ask_vaenyx_conversations.id = ?`,
    )
    .get(conversationId) as
    | {
        name: string;
        rules: string;
        local_only: number;
        agent_name: string;
      }
    | undefined;
  // A mode may name its own assistant (spec §6): tell the model who it is
  // here, so the name in the UI and the voice in the replies agree.
  if (modeRow?.agent_name.trim()) {
    projectContext = `In this conversation you are called "${modeRow.agent_name.trim()}". Answer to that name.${projectContext ? `\n\n${projectContext}` : ""}`;
  }
  if (modeRow?.rules.trim()) {
    projectContext = `Custom Mode rules — this conversation runs inside the restricted mode "${modeRow.name}". The account owner set these standing rules; they override any conflicting request made in this conversation: ${modeRow.rules.trim()}${projectContext ? `\n\n${projectContext}` : ""}`;
  }
  if (options?.suggestRoutine) {
    const suggestion = options.suggestRoutine;
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}The Owner has a saved Routine "${suggestion.name}" — ${suggestion.description}. If it genuinely fits what they are asking, briefly offer it at the very end of your reply (for example: "Want me to use ${suggestion.name} for this?") and stop there. If it does not clearly fit, ignore this note entirely.`;
  }
  if (options?.suggestTask) {
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}This may be a job better run in the background (it takes time, or could repeat). If so, briefly offer at the very end to run it as a background task (for example: "Want me to run this as a background task?") and stop there. If not, ignore this note.`;
  }
  if (options?.suggestCreate) {
    const kind = options.suggestCreate === "method" ? "Method" : "Routine";
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}The Owner asked Vaenyx to CREATE a new ${kind}, and Vaenyx has ALREADY STARTED building it in the background — a confirmation message will appear in this chat when it is saved to the Library. Briefly tell the Owner it is being built now and the confirmation will show up here shortly. Do NOT claim it is already finished, do NOT output configuration JSON, and do NOT invent admin tools or extra steps.`;
  }
  if (options?.clarifyCreate) {
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}The Owner asked Vaenyx to BUILD something, but the description is not yet enough to build from. Reply ONLY with one short clarifying question, in the Owner's language, so the build can start from their answer. A good question to ask (use it as-is or sharpen it): "${options.clarifyCreate}". Nothing is being built yet — do NOT claim anything was created or started, do NOT output configuration, and do NOT ask more than one question.`;
  }
  if (options?.voiceAudioId) {
    projectContext = `${projectContext ? `${projectContext}\n\n` : ""}This is a VOICE conversation turn — the Owner spoke this message and your reply will be read aloud. Answer the way you would speak: at most 2–3 short sentences, plain conversational language, no lists, no markdown, no links, no code. If the complete answer is genuinely long, give the one-sentence essence and offer to expand in text.`;
  }

  try {
    const settingsRow = database.sqlite
      .prepare(
        `SELECT reasoning_effort, model_provider_id, model_name FROM ask_vaenyx_conversations WHERE id = ?`,
      )
      .get(conversationId) as
      | {
          reasoning_effort: string | null;
          model_provider_id: string | null;
          model_name: string | null;
        }
      | undefined;
    let provider = resolveProvider(settingsRow?.model_provider_id);
    // "Local model only" (spec 建议 F): enforced in code, not by the rules
    // text — the mode's chats can only ever reach the local backend, which
    // also means no cloud calls and no web access for them.
    if (modeRow?.local_only === 1) {
      const localProvider = getModelRegistry().get("local");
      if (!localProvider) {
        throw new Error("MODE_LOCAL_ONLY_UNAVAILABLE");
      }
      provider = localProvider;
    }

    // A document fed to this turn. A backend that reads PDFs natively gets the
    // FILE (every page as picture and text — the path M1 warns about); any
    // other backend gets locally extracted text, which is cheaper and loses
    // the drawings, so the gate's sentence is never shown for it.
    let documentBase64: string | undefined;
    let documentText = "";
    if (options?.documentId && options.dataDirectory) {
      const file = readDocument(options.dataDirectory, options.documentId);
      if (file) {
        if (DOCUMENT_NATIVE_PROVIDER_IDS.includes(provider.id)) {
          documentBase64 = file.toString("base64");
        } else {
          try {
            documentText = await extractDocumentText(file);
          } catch {
            // Unreadable here means the upload check already passed but the
            // text layer is unusable (a scan): the reply says so plainly.
            documentText = "";
          }
        }
      }
    }

    // Long-conversation memory (Oskar, 2026-07-29): what has aged out of the
    // message window rides along as a rolling summary, so a long thread stops
    // forgetting its own beginning. Regenerated only when enough new messages
    // have aged out — never on every turn.
    const historySummary = await compactConversationHistory(
      database,
      conversationId,
      usableHistory,
      provider,
      options?.signal,
    );
    // What Vaenyx knows about the Owner (their APPROVED Vaenyx Me profile) is
    // the long-term memory layer: it rides every chat, so something learned
    // once does not have to be repeated in each new conversation.
    const ownerProfile = formatVaenyxMeContext(database);
    const documentContext = documentText
      ? [
          `The Owner attached a document${options?.documentName ? ` (${options.documentName})` : ""}. This backend cannot read PDFs directly, so its TEXT was extracted locally — drawings, tables and layout are not visible to you. Say so if the answer would depend on them.`,
          documentText.slice(0, 120_000),
        ].join("\n")
      : null;
    projectContext =
      [historySummary, ownerProfile, projectContext, documentContext]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join("\n\n") || undefined;

    // Phase B: a vision-direct backend sees the photo first-hand. The most
    // recent photo in the last few messages rides along too, so follow-up
    // questions about it ("what's the jar on the left?") keep working.
    // Codex takes the photo as a file path; key-based backends as a data URL —
    // both are offered and each provider reads its own form.
    let imageAttachment: string | undefined;
    let imageAttachmentPath: string | undefined;
    if (
      options?.dataDirectory &&
      VISION_DIRECT_PROVIDER_IDS.includes(provider.id)
    ) {
      const effectiveImageId =
        options.imageId ??
        (
          database.sqlite
            .prepare(
              `SELECT image_id FROM ask_vaenyx_messages
               WHERE conversation_id = ? AND image_id IS NOT NULL
               ORDER BY created_at DESC LIMIT 1`,
            )
            .get(conversationId) as { image_id: string } | undefined
        )?.image_id;
      if (effectiveImageId) {
        const recentWithImage = listAskVaenyxMessages(
          database,
          conversationId,
          ownerId,
        )
          .slice(-10)
          .some((message) => message.imageId === effectiveImageId);
        if (recentWithImage) {
          imageAttachment =
            imageDataUrl(options.dataDirectory, effectiveImageId) ?? undefined;
          imageAttachmentPath =
            imageFilePath(options.dataDirectory, effectiveImageId) ?? undefined;
        }
      }
    }
    // The photo is kept and shown either way. What changes is how the model
    // gets to read it: a vision-capable backend sees the picture itself; any
    // other backend gets the vision model's description as context. The
    // Owner's own message is never replaced by that text — the photo stays a
    // photo in the conversation (Oskar, 2026-07-26).
    let photoContext = "";
    if (
      options?.imageId &&
      options.dataDirectory &&
      options.secretsDirectory &&
      !imageAttachment
    ) {
      try {
        const found = readImage(options.dataDirectory, options.imageId);
        if (found) {
          const described = await describeImage(
            options.secretsDirectory,
            found.image,
            found.mimeType,
            "en",
          );
          if (described.trim()) {
            photoContext = `The Owner attached a photo with this message. This backend cannot see images, so a vision model read it. Its description:\n${described.trim()}`;
          }
        }
      } catch {
        // No vision model, or it refused: the photo is still attached to the
        // message and visible; the model simply does not get a description.
      }
    }
    let contextWithPhoto = photoContext
      ? [projectContext, photoContext].filter(Boolean).join("\n\n")
      : projectContext;

    // A photo sent for analysis comes BACK with the answer, marked ("你的回复
    // 里面再把那个图片再来一次,然后叠加上识别图片内容的工具", Oskar
    // 2026-07-29): the reply carries the same picture with dots and names, and
    // the written summary sits under it. The marking runs in parallel with the
    // model call, so it costs no extra wall time.
    if (options?.imageId && options.dataDirectory && options.secretsDirectory) {
      echoImageId = options.imageId;
      const photoId = options.imageId;
      // Tell the client NOW: the picture appears with the first words, not
      // after them.
      options.onEchoImage?.(photoId);
      const found = readImage(options.dataDirectory, photoId);
      const secrets = options.secretsDirectory;
      if (found) {
        echoMarks = annotateImage(
          secrets,
          found.image,
          found.mimeType,
          /[一-鿿]/.test(content) ? "zh" : "en",
        )
          .then((items) => {
            database.sqlite
              .prepare(
                `INSERT INTO image_annotations (image_id, items, created_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(image_id) DO UPDATE SET items = excluded.items,
                   created_at = excluded.created_at`,
              )
              .run(photoId, JSON.stringify(items), new Date().toISOString());
          })
          .catch(() => {
            // Best-effort: the reply still echoes the photo, just unmarked.
          });
      }
    }

    // Marking a photo — the judge understood the Owner wants the things in an
    // existing photo pointed out ON the picture ("标出来", any wording). Runs
    // BEFORE the model speaks, same truth-note pattern as generation: the
    // reply narrates what actually happened, never a guess.
    if (options?.annotate && options.dataDirectory && options.secretsDirectory) {
      options.onStatus?.("annotating");
      const latestPhoto = database.sqlite
        .prepare(
          `SELECT image_id FROM ask_vaenyx_messages
           WHERE conversation_id = ? AND image_id IS NOT NULL
           ORDER BY created_at DESC LIMIT 1`,
        )
        .get(conversationId) as { image_id: string } | undefined;
      let annotateNote =
        "The Owner asked for the photo to be marked, but no photo could be found in this conversation. Say so briefly.";
      if (latestPhoto) {
        try {
          const found = readImage(options.dataDirectory, latestPhoto.image_id);
          if (found) {
            const items = await annotateImage(
              options.secretsDirectory,
              found.image,
              found.mimeType,
              /[一-鿿]/.test(content) ? "zh" : "en",
            );
            database.sqlite
              .prepare(
                `INSERT INTO image_annotations (image_id, items, created_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(image_id) DO UPDATE SET items = excluded.items,
                   created_at = excluded.created_at`,
              )
              .run(
                latestPhoto.image_id,
                JSON.stringify(items),
                new Date().toISOString(),
              );
            annotateNote = `The system just MARKED the conversation's latest photo: each of these items now has a visible dot and name label on the picture the Owner sees — ${items
              .map((item) => item.name)
              .join(
                ", ",
              )}. Refer to the marks naturally; never claim you cannot mark photos.`;
          }
        } catch {
          annotateNote =
            "The system tried to mark the photo the Owner asked about and FAILED. Say so plainly and suggest trying again.";
        }
      }
      contextWithPhoto = [contextWithPhoto, annotateNote]
        .filter(Boolean)
        .join("\n\n");
    }

    // Making a picture — BEFORE the model speaks, so it narrates the truth
    // instead of guessing. The first version generated after the reply, and
    // the model cheerfully announced "here is your new cat photo" for a turn
    // where nothing was generated at all (Oskar, 2026-07-27): it cannot know
    // what it cannot see, so the outcome is now handed to it in context.
    if (
      options?.dataDirectory &&
      options?.secretsDirectory &&
      getImageEngineStatus(options.secretsDirectory).connected
    ) {
      // The classifier that already judges every message (routine / task /
      // create) now judges draw too, and sends its verdict here as
      // options.imagePrompt — one judgment per message, no second call
      // (Oskar, 2026-07-27). The obvious phrasings keep a keyword fast path
      // as a belt-and-braces for callers that skipped classification.
      const suppliedPrompt = options?.imagePrompt?.trim() || null;
      const fastYes =
        looksLikeImageRequest(content) ||
        (isImageFollowUp(content) &&
          conversationHasGeneratedImage(database, conversationId));
      if (suppliedPrompt || fastYes) {
        let imageNote: string;
        try {
          // English prompt first: the image model reads English, not the
          // Owner's language (see buildImagePrompt for the landscape story).
          // The judge usually handed the prompt over with its verdict.
          if (!suppliedPrompt) options?.onStatus?.("image-prompt");
          const imagePrompt =
            suppliedPrompt ?? (await buildImagePrompt(provider, content));
          options?.onStatus?.("image-generating");
          generatedImageId = await generateImage(
            options.secretsDirectory,
            options.dataDirectory,
            imagePrompt,
          );
          sentImagePrompt = imagePrompt;
          imageNote = `The system just generated a real image for the Owner's request (prompt used: "${imagePrompt}") and it is attached to your reply. Refer to it naturally, but do not describe details you cannot see.`;
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const detail = message.split(":").slice(2).join(":").trim();
          imageNote = `The system tried to generate the image the Owner asked for and FAILED${
            detail ? ` (provider said: ${detail})` : ""
          }. Say so plainly. Do not claim any picture was made.`;
        }
        contextWithPhoto = [contextWithPhoto, imageNote]
          .filter(Boolean)
          .join("\n\n");
      } else {
        contextWithPhoto = [
          contextWithPhoto,
          "No image is being generated this turn. You cannot create images yourself — never claim a picture was made or attached.",
        ]
          .filter(Boolean)
          .join("\n\n");
      }
    }

    options?.onStatus?.("answering");
    const result = await provider.sendChat(history, contextWithPhoto, {
      onDelta: options?.onDelta
        ? (delta) => {
            streamed += delta;
            options.onDelta?.(delta);
          }
        : undefined,
      onThinking: options?.onThinking,
      signal: options?.signal,
      reasoningEffort: settingsRow?.reasoning_effort ?? "medium",
      ...(settingsRow?.model_name ? { model: settingsRow.model_name } : {}),
      ...(imageAttachment ? { imageDataUrl: imageAttachment } : {}),
      ...(imageAttachmentPath ? { imagePath: imageAttachmentPath } : {}),
      ...(documentBase64 ? { documentBase64 } : {}),
      ...(options?.documentName
        ? { documentName: options.documentName }
        : {}),
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

  // A failed TURN does not ship a generated image: the picture belonged to a
  // reply that never happened.
  if (assistantStatus === "failed") {
    generatedImageId = null;
    echoImageId = null;
  }
  // Let the parallel marking land before the reply is written, so the echoed
  // photo appears already marked instead of popping its dots in a moment
  // later. Best-effort — a slow engine never blocks the answer for long.
  if (echoMarks) {
    await Promise.race([
      echoMarks,
      new Promise((resolveRace) => setTimeout(resolveRace, 8000)),
    ]);
  }

  const assistantMessageId = randomUUID();
  const completedAt = new Date().toISOString();

  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages (
        id, conversation_id, role, content, status, web_search_used, created_at,
        voice, image_id, image_prompt
      ) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      assistantMessageId,
      conversationId,
      assistantContent,
      assistantStatus,
      webSearchUsed ? 1 : 0,
      completedAt,
      options?.voiceAudioId && assistantStatus === "completed" ? 1 : 0,
      // A generated picture wins; otherwise the analysed photo comes back
      // with the answer (marked), which is what the Owner is looking at.
      generatedImageId ?? echoImageId,
      generatedImageId ? sentImagePrompt : null,
    );

  database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_conversations
       SET updated_at = ?
       WHERE id = ?`,
    )
    .run(completedAt, conversationId);
  touchChatThread(database, conversationId, completedAt);

  // A finished reply nobody sees within ~30s pushes the phone (Owner rule
  // 2026-07-23) — the same presence gate as scheduled runs, so watching the
  // screen stays quiet and walking away buzzes. Failed replies stay silent:
  // they are visible on return and retryable there.
  if (assistantStatus === "completed") {
    const titleRow = database.sqlite
      .prepare("SELECT title FROM ask_vaenyx_conversations WHERE id = ?")
      .get(conversationId) as { title: string } | undefined;
    schedulePresenceAwarePush(
      database,
      {
        title: titleRow?.title?.trim() || "Vaenyx",
        body: assistantContent.replace(/\s+/g, " ").trim().slice(0, 90),
        // Straight to the conversation the reply is in.
        url: `/?chat=${encodeURIComponent(conversationId)}`,
      },
      "chat",
    );
  }

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
    // Read the two messages BACK from the database rather than describing them
    // here: the row is the truth, and hand-built copies kept losing what the
    // turn had just attached — the echoed photo and its marks vanished the
    // moment the reply landed, because this object did not mention them
    // (Oskar, 2026-07-29).
    messages: listAskVaenyxMessages(database, conversationId, ownerId).filter(
      (message) =>
        message.id === ownerMessageId || message.id === assistantMessageId,
    ),
  };
}
