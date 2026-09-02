import type { DatabaseSync } from "node:sqlite";

import type {
  ConversationSearchContext,
  ConversationSearchHighlight,
  ConversationSearchResult,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import { indexableText, segmentWords } from "./text-index.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;
const MAX_QUERY_COMPONENTS = 12;
const MAX_QUERY_TOKENS = 24;
const EXCERPT_CONTEXT = 110;
const CONTEXT_LENGTH = 240;
const ANSI_ESCAPE_SEQUENCE = new RegExp(
  `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
  "g",
);

interface SearchComponent {
  display: string;
  phrase: boolean;
  words: string[];
}

interface ParsedSearchQuery {
  components: SearchComponent[];
  match: string | null;
}

interface SearchRow {
  conversation_id: string;
  created_at: string;
  message_id: string;
  mode_id: string | null;
  mode_name: string | null;
  rank: number;
  role: "assistant" | "owner";
  status: "active" | "archived" | "pinned" | null;
  task_id: string | null;
  thread_id: string | null;
  thread_kind: "chat" | "inbox" | "task" | null;
  title: string;
  content: string;
}

interface ContextRow {
  content: string;
  created_at: string;
  id: string;
  role: "assistant" | "owner";
}

/** Remove credential-shaped values before text reaches the search index. */
function stripControlCharacters(value: string): string {
  let safe = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    safe +=
      (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
        ? " "
        : character;
  }
  return safe;
}

export function redactConversationSearchText(value: unknown): string {
  return stripControlCharacters(
    String(value ?? "")
      .replace(ANSI_ESCAPE_SEQUENCE, "")
      .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer <redacted>")
      .replace(
        /\b(authorization|api[-_ ]?key|password|passwd|secret|token)\b\s*[:=]\s*[^\s,;]+/gi,
        "$1=<redacted>",
      )
      .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{8,}\b/gi, "<redacted>")
      .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "<redacted>")
      .replace(/\bAKIA[A-Z0-9]{16}\b/g, "<redacted>")
      .replace(
        /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
        "<redacted>",
      )
      .replace(/([a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:)[^@\s/]+@/gi, "$1<redacted>@")
      .replace(
        /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)* PRIVATE KEY-----/g,
        "<redacted>",
      ),
  );
}

/** The exact text stored in FTS: redacted first, then bilingual segmentation. */
export function conversationSearchIndexText(value: unknown): string {
  return indexableText(redactConversationSearchText(value));
}

/** Register before migrations because migration 0080's backfill calls it. */
export function registerConversationSearchFunctions(
  sqlite: DatabaseSync,
): void {
  sqlite.function(
    "vaenyx_conversation_search_text",
    { deterministic: true },
    conversationSearchIndexText,
  );
}

/** Detect a damaged projection and rebuild it atomically from canonical rows. */
export function ensureConversationSearchIndex(sqlite: DatabaseSync): boolean {
  const exists = sqlite
    .prepare(
      `SELECT 1 AS present FROM sqlite_schema
       WHERE type = 'table' AND name = 'conversation_message_search'`,
    )
    .get() as { present: number } | undefined;
  if (!exists) return false;

  const issue = sqlite
    .prepare(
      `SELECT 1 AS broken
       FROM (
         SELECT
           messages.id,
           COUNT(search.rowid) AS indexed_rows,
           MAX(CASE
             WHEN search.conversation_id = messages.conversation_id
              AND search.mode_id = COALESCE(conversations.mode_id, '')
              AND search.role = messages.role
              AND search.created_at = messages.created_at
              AND search.body = vaenyx_conversation_search_text(messages.content)
             THEN 1 ELSE 0 END) AS exact_row
         FROM ask_vaenyx_messages AS messages
         JOIN ask_vaenyx_conversations AS conversations
           ON conversations.id = messages.conversation_id
         LEFT JOIN conversation_message_search AS search
           ON search.message_id = messages.id
         WHERE NOT (messages.role = 'assistant' AND messages.status = 'failed')
         GROUP BY messages.id
         HAVING indexed_rows != 1 OR exact_row != 1
         UNION ALL
         SELECT 1, 0, 0
         FROM conversation_message_search AS search
         LEFT JOIN ask_vaenyx_messages AS messages
           ON messages.id = search.message_id
         WHERE messages.id IS NULL
            OR (messages.role = 'assistant' AND messages.status = 'failed')
       )
       LIMIT 1`,
    )
    .get() as { broken: number } | undefined;
  if (!issue) return false;

  sqlite.exec("BEGIN IMMEDIATE;");
  try {
    sqlite.exec("DELETE FROM conversation_message_search;");
    sqlite.exec(`
      INSERT INTO conversation_message_search (
        message_id, conversation_id, mode_id, role, created_at, body
      )
      SELECT
        messages.id,
        messages.conversation_id,
        COALESCE(conversations.mode_id, ''),
        messages.role,
        messages.created_at,
        vaenyx_conversation_search_text(messages.content)
      FROM ask_vaenyx_messages AS messages
      JOIN ask_vaenyx_conversations AS conversations
        ON conversations.id = messages.conversation_id
      WHERE NOT (messages.role = 'assistant' AND messages.status = 'failed');
    `);
    sqlite.exec("COMMIT;");
  } catch (error) {
    sqlite.exec("ROLLBACK;");
    throw error;
  }
  return true;
}

function quotedFtsToken(word: string): string {
  return `"${word.replace(/"/g, '""')}"`;
}

/** Parse normal words and double-quoted phrases into one injection-safe MATCH. */
export function parseConversationSearchQuery(query: string): ParsedSearchQuery {
  const components: SearchComponent[] = [];
  const source = query.trim().slice(0, 200);
  const expression = /"([^"]+)"|(\S+)/g;
  let tokenCount = 0;
  let match: RegExpExecArray | null;

  while (
    components.length < MAX_QUERY_COMPONENTS &&
    (match = expression.exec(source)) !== null
  ) {
    const phrase = match[1] !== undefined;
    const display = (match[1] ?? match[2] ?? "").trim();
    if (!display) continue;
    const words = segmentWords(display).slice(
      0,
      Math.max(0, MAX_QUERY_TOKENS - tokenCount),
    );
    if (words.length === 0) continue;
    components.push({ display, phrase, words });
    tokenCount += words.length;
    if (tokenCount >= MAX_QUERY_TOKENS) break;
  }

  const clauses = components.map((component) =>
    component.phrase
      ? `"${component.words.map((word) => word.replace(/"/g, '""')).join(" ")}"`
      : component.words.map(quotedFtsToken).join(" AND "),
  );
  return {
    components,
    match:
      clauses.length > 0
        ? clauses.map((clause) => `(${clause})`).join(" AND ")
        : null,
  };
}

function compactText(value: unknown): string {
  return redactConversationSearchText(value).replace(/\s+/g, " ").trim();
}

function mergeHighlights(
  highlights: ConversationSearchHighlight[],
): ConversationSearchHighlight[] {
  const sorted = [...highlights].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  const merged: ConversationSearchHighlight[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function excerptFor(
  content: string,
  parsed: ParsedSearchQuery,
): { excerpt: string; highlights: ConversationSearchHighlight[] } {
  const safe = compactText(content);
  const lower = safe.toLocaleLowerCase();
  const needles = parsed.components.flatMap((component) => {
    const phrase = component.display.toLocaleLowerCase();
    return component.phrase && lower.includes(phrase)
      ? [phrase]
      : component.words;
  });
  const firstPositions = needles
    .map((needle) => lower.indexOf(needle))
    .filter((position) => position >= 0);
  const first = firstPositions.length > 0 ? Math.min(...firstPositions) : 0;
  const start = Math.max(0, first - EXCERPT_CONTEXT);
  const end = Math.min(safe.length, first + EXCERPT_CONTEXT);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < safe.length ? "…" : "";
  const body = safe.slice(start, end);
  const bodyLower = body.toLocaleLowerCase();
  const highlights: ConversationSearchHighlight[] = [];

  for (const needle of needles) {
    if (!needle) continue;
    let at = bodyLower.indexOf(needle);
    while (at >= 0) {
      highlights.push({
        start: prefix.length + at,
        end: prefix.length + at + needle.length,
      });
      at = bodyLower.indexOf(needle, at + Math.max(1, needle.length));
    }
  }
  return {
    excerpt: `${prefix}${body}${suffix}`,
    highlights: mergeHighlights(highlights),
  };
}

function contextMessage(
  row: ContextRow | undefined,
): ConversationSearchContext | null {
  if (!row) return null;
  const content = compactText(row.content);
  return {
    id: row.id,
    role: row.role,
    content:
      content.length > CONTEXT_LENGTH
        ? `${content.slice(0, CONTEXT_LENGTH)}…`
        : content,
    createdAt: row.created_at,
  };
}

function nearbyMessage(
  database: DatabaseHandle,
  row: SearchRow,
  direction: "after" | "before",
): ConversationSearchContext | null {
  const before = direction === "before";
  const operator = before ? "<" : ">";
  const order = before ? "DESC" : "ASC";
  const found = database.sqlite
    .prepare(
      `SELECT id, role, content, created_at
       FROM ask_vaenyx_messages
       WHERE conversation_id = ?
         AND NOT (role = 'assistant' AND status = 'failed')
         AND (created_at ${operator} ? OR (created_at = ? AND id ${operator} ?))
       ORDER BY created_at ${order}, id ${order}
       LIMIT 1`,
    )
    .get(
      row.conversation_id,
      row.created_at,
      row.created_at,
      row.message_id,
    ) as ContextRow | undefined;
  return contextMessage(found);
}

/** Local-only search; owner and Mode scope are enforced inside MATCH SQL. */
export function searchConversations(
  database: DatabaseHandle,
  ownerId: string,
  modeId: string | null,
  query: string,
  requestedLimit = DEFAULT_LIMIT,
): ConversationSearchResult[] {
  const parsed = parseConversationSearchQuery(query);
  if (!parsed.match) return [];
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(requestedLimit)));
  const rows = database.sqlite
    .prepare(
      `SELECT
         messages.id AS message_id,
         messages.conversation_id,
         messages.role,
         messages.content,
         messages.created_at,
         conversations.title,
         conversations.mode_id,
         modes.name AS mode_name,
         threads.id AS thread_id,
         threads.kind AS thread_kind,
         threads.status,
         threads.task_id,
         bm25(conversation_message_search) AS rank
       FROM conversation_message_search
       JOIN ask_vaenyx_messages AS messages
         ON messages.id = conversation_message_search.message_id
       JOIN ask_vaenyx_conversations AS conversations
         ON conversations.id = messages.conversation_id
       LEFT JOIN vaenyx_threads AS threads
         ON threads.conversation_id = conversations.id
       LEFT JOIN modes ON modes.id = conversations.mode_id
       WHERE conversation_message_search MATCH ?
         AND conversations.owner_id = ?
         AND (? IS NULL OR conversations.mode_id = ?)
       ORDER BY rank ASC, messages.created_at DESC, messages.id ASC
       LIMIT ?`,
    )
    .all(
      parsed.match,
      ownerId,
      modeId,
      modeId,
      limit,
    ) as unknown as SearchRow[];

  return rows.map((row) => {
    const excerpt = excerptFor(row.content, parsed);
    return {
      messageId: row.message_id,
      conversationId: row.conversation_id,
      threadId: row.thread_id,
      threadKind: row.thread_kind,
      taskId: row.task_id,
      title: row.title,
      role: row.role,
      messageCreatedAt: row.created_at,
      excerpt: excerpt.excerpt,
      highlights: excerpt.highlights,
      before: nearbyMessage(database, row, "before"),
      after: nearbyMessage(database, row, "after"),
      archived: row.status === "archived",
      modeId: row.mode_id,
      modeName: row.mode_name,
    };
  });
}
