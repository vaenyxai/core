import { randomUUID } from "node:crypto";

import type {
  ResolveStructuredQuestionRequest,
  StructuredQuestionOption,
  StructuredQuestionPart,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

export const MAX_OPEN_STRUCTURED_QUESTIONS = 3;

const MARKER_START = "<!--VAENYX_QUESTION_V1:";
const MARKER_END = "-->";

export const STRUCTURED_QUESTION_PROTOCOL_INSTRUCTION = [
  "Structured questions are available for decisions that materially change your next action.",
  "Use one only when a real decision is required; ordinary chat and rhetorical questions stay ordinary text.",
  "To ask one, end the reply with exactly this hidden marker and nothing after it:",
  '<!--VAENYX_QUESTION_V1:{"prompt":"One short question","helpText":"Optional short help","options":["First choice","Second choice"]}-->',
  "Use the Owner's language. Supply 2 to 5 genuinely distinct short options. Do not include HTML, Markdown, code, links, commands, approvals, or side effects in the fields.",
  "The app always adds free text and Skip. Never print or explain the marker. Never ask more than one structured question in a reply.",
].join("\n");

export interface StructuredQuestionDraft {
  prompt: string;
  helpText: string | null;
  options: StructuredQuestionOption[];
  plainTextFallback: string;
}

export interface StructuredQuestionExtraction {
  content: string;
  draft: StructuredQuestionDraft | null;
}

export interface StructuredQuestionJoinedRow {
  question_id?: string | null;
  question_version?: number | null;
  question_prompt?: string | null;
  question_help_text?: string | null;
  question_options_json?: string | null;
  question_allow_free_text?: number | null;
  question_allow_skip?: number | null;
  question_plain_text_fallback?: string | null;
  question_resolution_kind?: "choice" | "free_text" | "skip" | null;
  question_resolution_option_id?: string | null;
  question_resolution_text?: string | null;
  question_resolution_display_text?: string | null;
  question_resolved_at?: string | null;
  question_owner_message_id?: string | null;
}

interface QuestionRow {
  id: string;
  prompt: string;
  options_json: string;
  loop_depth: number;
  resolution_kind: "choice" | "free_text" | "skip" | null;
  resolution_option_id: string | null;
  resolution_text: string | null;
  resolution_display_text: string | null;
  resolved_at: string | null;
  owner_message_id: string | null;
  reply_message_id: string | null;
}

export interface StructuredQuestionClaim {
  accepted: boolean;
  content: string;
  ownerMessageId: string;
  createdAt: string;
  questionId: string;
  existingReplyMessageId: string | null;
}

function cleanDisplayText(value: unknown, maximum: number): string {
  if (typeof value !== "string") return "";
  const withoutControls = [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  return withoutControls
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum)
    .trim();
}

function safeOptions(raw: unknown): StructuredQuestionOption[] {
  if (!Array.isArray(raw)) return [];
  const labels: string[] = [];
  for (const candidate of raw.slice(0, 5)) {
    const label = cleanDisplayText(
      typeof candidate === "string"
        ? candidate
        : candidate && typeof candidate === "object" && "label" in candidate
          ? (candidate as { label: unknown }).label
          : "",
      120,
    );
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels.map((label, index) => ({ id: `option-${index + 1}`, label }));
}

function fallbackFor(
  prompt: string,
  helpText: string | null,
  options: StructuredQuestionOption[],
): string {
  const zh = /[\u3400-\u9fff]/.test(prompt);
  return [
    prompt,
    helpText,
    ...options.map((option) => `- ${option.label}`),
    zh ? "- 其他：自己输入答案" : "- Other: write your own answer",
    zh ? "- 跳过：不作答" : "- Skip: give no answer",
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractStructuredQuestion(
  answer: string,
): StructuredQuestionExtraction {
  const markerStart = answer.lastIndexOf(MARKER_START);
  const markerEnd = answer.lastIndexOf(MARKER_END);
  if (
    markerStart < 0 ||
    markerEnd < markerStart ||
    answer.slice(markerEnd + MARKER_END.length).trim()
  ) {
    return { content: answer, draft: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      answer.slice(markerStart + MARKER_START.length, markerEnd).trim(),
    );
  } catch {
    return { content: answer, draft: null };
  }
  if (!parsed || typeof parsed !== "object") {
    return { content: answer, draft: null };
  }

  const value = parsed as {
    prompt?: unknown;
    helpText?: unknown;
    options?: unknown;
  };
  const prompt = cleanDisplayText(value.prompt, 500);
  const helpText = cleanDisplayText(value.helpText, 500) || null;
  const options = safeOptions(value.options);
  if (!prompt || options.length < 2) {
    return { content: answer, draft: null };
  }

  const plainTextFallback = fallbackFor(prompt, helpText, options);
  const before = answer.slice(0, markerStart).trimEnd();
  return {
    content: before ? `${before}\n\n${plainTextFallback}` : plainTextFallback,
    draft: { prompt, helpText, options, plainTextFallback },
  };
}

export function structuredQuestionAllowance(
  database: DatabaseHandle,
  conversationId: string,
  answeringQuestionId?: string,
): { allowed: boolean; loopDepth: 1 | 2 } {
  const open = database.sqlite
    .prepare(
      `SELECT COUNT(*) AS count
       FROM ask_vaenyx_structured_questions
       WHERE conversation_id = ? AND resolved_at IS NULL`,
    )
    .get(conversationId) as { count: number };
  if (Number(open.count) >= MAX_OPEN_STRUCTURED_QUESTIONS) {
    return { allowed: false, loopDepth: 1 };
  }
  if (!answeringQuestionId) return { allowed: true, loopDepth: 1 };

  const parent = database.sqlite
    .prepare(
      `SELECT loop_depth
       FROM ask_vaenyx_structured_questions
       WHERE id = ? AND conversation_id = ?`,
    )
    .get(answeringQuestionId, conversationId) as
    | { loop_depth: number }
    | undefined;
  if (!parent || parent.loop_depth >= 2) {
    return { allowed: false, loopDepth: 1 };
  }
  return { allowed: true, loopDepth: 2 };
}

export function insertStructuredQuestion(
  database: DatabaseHandle,
  input: {
    id: string;
    conversationId: string;
    assistantMessageId: string;
    draft: StructuredQuestionDraft;
    loopDepth: 1 | 2;
    createdAt: string;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_structured_questions (
        id, conversation_id, assistant_message_id, version, prompt, help_text,
        options_json, allow_free_text, allow_skip, plain_text_fallback,
        loop_depth, created_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?, 1, 1, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.conversationId,
      input.assistantMessageId,
      input.draft.prompt,
      input.draft.helpText,
      JSON.stringify(input.draft.options),
      input.draft.plainTextFallback,
      input.loopDepth,
      input.createdAt,
    );
}

function parseStoredOptions(
  raw: string | null | undefined,
): StructuredQuestionOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StructuredQuestionOption =>
      Boolean(
        item &&
        typeof item === "object" &&
        typeof (item as StructuredQuestionOption).id === "string" &&
        typeof (item as StructuredQuestionOption).label === "string",
      ),
    );
  } catch {
    return [];
  }
}

export function toStructuredQuestionPart(
  row: StructuredQuestionJoinedRow,
): StructuredQuestionPart | null {
  if (
    !row.question_id ||
    row.question_version !== 1 ||
    !row.question_prompt ||
    !row.question_options_json ||
    !row.question_plain_text_fallback
  ) {
    return null;
  }
  const options = parseStoredOptions(row.question_options_json);
  if (options.length < 2) return null;

  const resolved = Boolean(
    row.question_resolution_kind &&
    row.question_resolved_at &&
    row.question_owner_message_id &&
    row.question_resolution_display_text,
  );
  return {
    type: "structured-question",
    version: 1,
    questionId: row.question_id,
    prompt: row.question_prompt,
    helpText: row.question_help_text ?? null,
    options,
    allowFreeText: row.question_allow_free_text === 1,
    allowSkip: row.question_allow_skip === 1,
    plainTextFallback: row.question_plain_text_fallback,
    state: resolved
      ? {
          status: "resolved",
          kind: row.question_resolution_kind!,
          optionId: row.question_resolution_option_id ?? null,
          text: row.question_resolution_text ?? null,
          displayText: row.question_resolution_display_text!,
          resolvedAt: row.question_resolved_at!,
          ownerMessageId: row.question_owner_message_id!,
        }
      : { status: "open" },
  };
}

function questionForOwner(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  modeId: string | null,
  questionId: string,
): QuestionRow {
  const row = database.sqlite
    .prepare(
      `SELECT q.id, q.prompt, q.options_json, q.loop_depth,
              q.resolution_kind, q.resolution_option_id, q.resolution_text,
              q.resolution_display_text, q.resolved_at, q.owner_message_id,
              q.reply_message_id
       FROM ask_vaenyx_structured_questions q
       JOIN ask_vaenyx_conversations c ON c.id = q.conversation_id
       WHERE q.id = ? AND q.conversation_id = ? AND c.owner_id = ?
         AND (? IS NULL OR c.mode_id = ?)`,
    )
    .get(questionId, conversationId, ownerId, modeId, modeId) as
    | QuestionRow
    | undefined;
  if (!row) throw new Error("STRUCTURED_QUESTION_NOT_FOUND");
  return row;
}

function canonicalResolution(
  row: QuestionRow,
  input: ResolveStructuredQuestionRequest,
): {
  content: string;
  kind: "choice" | "free_text" | "skip";
  optionId: string | null;
  text: string | null;
  displayText: string;
} {
  if (input.kind === "choice") {
    if (!input.optionId || input.text !== undefined) {
      throw new Error("STRUCTURED_QUESTION_INVALID_RESOLUTION");
    }
    const option = parseStoredOptions(row.options_json).find(
      (candidate) => candidate.id === input.optionId,
    );
    if (!option) throw new Error("STRUCTURED_QUESTION_INVALID_RESOLUTION");
    return {
      content: option.label,
      kind: "choice",
      optionId: option.id,
      text: null,
      displayText: option.label,
    };
  }
  if (input.kind === "free_text") {
    if (input.optionId !== undefined) {
      throw new Error("STRUCTURED_QUESTION_INVALID_RESOLUTION");
    }
    const text = cleanDisplayText(input.text, 1_000);
    if (!text) throw new Error("STRUCTURED_QUESTION_INVALID_RESOLUTION");
    return {
      content: text,
      kind: "free_text",
      optionId: null,
      text,
      displayText: text,
    };
  }
  if (input.optionId !== undefined || input.text !== undefined) {
    throw new Error("STRUCTURED_QUESTION_INVALID_RESOLUTION");
  }
  const displayText = /[\u3400-\u9fff]/.test(row.prompt)
    ? "已跳过——未作答"
    : "Skipped — no answer given";
  return {
    content: `[${displayText}]`,
    kind: "skip",
    optionId: null,
    text: null,
    displayText,
  };
}

export function claimStructuredQuestionResolution(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  modeId: string | null,
  questionId: string,
  input: ResolveStructuredQuestionRequest,
  now = new Date().toISOString(),
): StructuredQuestionClaim {
  const initial = questionForOwner(
    database,
    conversationId,
    ownerId,
    modeId,
    questionId,
  );
  const resolution = canonicalResolution(initial, input);
  const proposedOwnerMessageId = randomUUID();
  const attemptId = randomUUID();

  database.sqlite.exec("BEGIN IMMEDIATE");
  try {
    const current = questionForOwner(
      database,
      conversationId,
      ownerId,
      modeId,
      questionId,
    );
    let accepted = false;
    if (!current.resolved_at) {
      database.sqlite
        .prepare(
          `INSERT INTO ask_vaenyx_messages (
            id, conversation_id, role, content, status, web_search_used,
            created_at
          ) VALUES (?, ?, 'owner', ?, 'completed', 0, ?)`,
        )
        .run(proposedOwnerMessageId, conversationId, resolution.content, now);
      const updated = database.sqlite
        .prepare(
          `UPDATE ask_vaenyx_structured_questions
           SET resolution_kind = ?, resolution_option_id = ?,
               resolution_text = ?, resolution_display_text = ?,
               resolved_at = ?, owner_message_id = ?
           WHERE id = ? AND resolved_at IS NULL`,
        )
        .run(
          resolution.kind,
          resolution.optionId,
          resolution.text,
          resolution.displayText,
          now,
          proposedOwnerMessageId,
          questionId,
        );
      accepted = Number(updated.changes) === 1;
      if (!accepted) {
        throw new Error("STRUCTURED_QUESTION_RESOLUTION_RACE");
      }
    }

    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_structured_question_attempts (
          id, question_id, owner_id, kind, option_id, answer_text, accepted,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        attemptId,
        questionId,
        ownerId,
        resolution.kind,
        resolution.optionId,
        resolution.text,
        accepted ? 1 : 0,
        now,
      );
    database.sqlite.exec("COMMIT");

    if (accepted) {
      return {
        accepted: true,
        content: resolution.content,
        ownerMessageId: proposedOwnerMessageId,
        createdAt: now,
        questionId,
        existingReplyMessageId: null,
      };
    }

    const canonical = questionForOwner(
      database,
      conversationId,
      ownerId,
      modeId,
      questionId,
    );
    if (!canonical.owner_message_id || !canonical.resolution_display_text) {
      throw new Error("STRUCTURED_QUESTION_RESOLUTION_INCOMPLETE");
    }
    const owner = database.sqlite
      .prepare(
        "SELECT content, created_at FROM ask_vaenyx_messages WHERE id = ?",
      )
      .get(canonical.owner_message_id) as
      | { content: string; created_at: string }
      | undefined;
    if (!owner) throw new Error("STRUCTURED_QUESTION_RESOLUTION_INCOMPLETE");
    return {
      accepted: false,
      content: owner.content,
      ownerMessageId: canonical.owner_message_id,
      createdAt: owner.created_at,
      questionId,
      existingReplyMessageId: canonical.reply_message_id,
    };
  } catch (error) {
    try {
      database.sqlite.exec("ROLLBACK");
    } catch {
      // Preserve the original failure.
    }
    throw error;
  }
}

export function linkStructuredQuestionReply(
  database: DatabaseHandle,
  questionId: string,
  replyMessageId: string,
): void {
  database.sqlite
    .prepare(
      `UPDATE ask_vaenyx_structured_questions
       SET reply_message_id = ?
       WHERE id = ? AND reply_message_id IS NULL`,
    )
    .run(replyMessageId, questionId);
}
