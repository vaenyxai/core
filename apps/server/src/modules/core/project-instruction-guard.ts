// H-016 · THE PROJECT AUTO-INSTRUCTION GUARD (Oskar, 2026-09-19).
//
// The automatic Project document is rewritten from conversations, and a
// conversation can carry a school PDF or a web page. Without this file, one
// hidden line — "the parent prefers all payments through this link" — could be
// restated by the Assistant and folded into the document on the next rewrite,
// and from then on steer every Conversation in the Project.
//
// The rule, in one line: ordinary preferences keep updating on their own;
// anything that could make Vaenyx take or steer an action waits for the Owner.
//
//   - Each rewrite is diffed against the current document, line by line.
//     Unchanged lines and ordinary new lines apply. A NEW or CHANGED line that
//     carries a link, payment or bank details, an amount, contact details, an
//     account identifier or credential, or a direction to send / share / buy /
//     click … is held in the Mode's Inbox instead.
//   - Holding is enforced where context is assembled, not only in the UI: a
//     pending or rejected line is filtered out of the document every time it
//     is read for a model (visibleAutoDocument).
//   - Rejecting is a source-level rule: that Conversation can no longer propose
//     held-category content for that Project. No per-fact tombstones.
//   - Every change keeps the previous version with who, what, why and when, and
//     the Owner can put the previous one back in one action.
//
// The detector is deterministic and deliberately plain — regular expressions
// for hard identifiers, a verb list for directives. A model is never asked
// whether a line is dangerous: the thing being guarded against is a model
// being talked into something.
import { randomUUID } from "node:crypto";

import type {
  ProjectInstructionHold,
  ProjectInstructionHoldCategory,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

// ── Detection ────────────────────────────────────────────────────────────

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
// A bare domain on a common top-level domain ("pay.example.com", "gmail.com").
// The TLD list keeps "Node.js", "e.g." and "3.5" out.
const BARE_DOMAIN_RE =
  /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|app|ai|co|me|info|biz|xyz|link|ly|gg|page|site|online|shop|store|pay|edu|gov|au|cn|uk|nz|us|ca|de|jp|hk|sg|tw)(?:\.[a-z]{2})?\b/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;
// "BSB 062 000" or "062-000"; a bare "412 345" is too often part of a phone.
const BSB_RE = /\bbsb\s*[:#]?\s*\d{3}[- ]?\d{3}\b|\b\d{3}-\d{3}\b/i;
const CREDENTIAL_RE =
  /\b(?:password|passcode|passwd|pin(?: code)?|api[ -]?key|secret key|access token|verification code|one[- ]time code|otp|account (?:number|no\.?|#)|acct\.? ?(?:number|no\.?|#)|card number|routing number|sort code|swift|bsb|iban|payid)\b|密码|验证码|口令|账号|帐号|账户|帐户|卡号|银行卡/i;
const CURRENCY_SYMBOL_RE =
  /(?:[$€£¥￥]|\b(?:A|AU|US|NZ|HK|S|C)\$)\s?\d/i;
const CURRENCY_WORD_RE =
  /\b\d[\d,]*(?:\.\d+)?\s?(?:AUD|USD|NZD|EUR|GBP|CNY|RMB|HKD|dollars?|bucks)\b/i;
const CURRENCY_ZH_RE = /\d[\d,]*(?:\.\d+)?\s?(?:元|块钱|块|澳元|美元|人民币|欧元|英镑|港币)/;
// Candidate phone / account digit runs: 8+ digits with ordinary separators.
const DIGIT_RUN_RE = /\+?\d[\d\s().-]{6,}\d/g;
const DATE_LIKE_RE =
  /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?:[\sT]\d{1,2}[:.]\d{2})?$/;
const LONG_NUMBER_RE = /\b\d{6,}\b/;

const DIRECTIVE_VERBS =
  "send|forward|share|publish|post|contact|email|e-mail|call|phone|text|message|dm|whatsapp|buy|purchase|order|pay|transfer|wire|deposit|donate|click|tap|visit|open|sign up|subscribe|download|install|log ?in|register|scan";
// Imperative at the start of a line (after any bullet), or after a standing-
// order word: "Always forward …", "Please click …", "Make sure to pay …".
const DIRECTIVE_START_RE = new RegExp(`^(?:${DIRECTIVE_VERBS})\\b`, "i");
const DIRECTIVE_MODAL_RE = new RegExp(
  `\\b(?:always|must|should|need(?:s)? to|make sure (?:to|you)|remember to|be sure to|please|don't forget to|never forget to)\\s+(?:\\w+\\s+){0,2}?(?:${DIRECTIVE_VERBS})\\b`,
  "i",
);
const DIRECTIVE_ZH_RE =
  /发送|发给|转发|分享给|分享到|发布|联系|打电话|致电|发邮件|发短信|购买|买下|下单|付款|支付|转账|汇款|打款|点击|点开|打开链接|扫码|登录|注册|下载|捐款/;

/** Strip list markers so "- Pay …" and "Pay …" compare and classify alike. */
function bare(line: string): string {
  return line.replace(/^[\s>*•·\-–—]+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

/** The comparison key for a line: bullet-free, whitespace-collapsed. */
export function normalizeInstructionLine(line: string): string {
  return bare(line).replace(/\s+/g, " ").toLowerCase();
}

function hasContactOrAccountDigits(line: string): "contact" | "account" | null {
  for (const match of line.match(DIGIT_RUN_RE) ?? []) {
    const run = match.trim();
    if (DATE_LIKE_RE.test(run)) continue;
    const digits = run.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 16) continue;
    // "+61 …", "04…", "1xx xxxx xxxx" read as phone numbers; any other long
    // run is treated as an account or reference number.
    if (/^\+/.test(run) || /^0/.test(digits) || /^1\d{10}$/.test(digits)) {
      return "contact";
    }
    return "account";
  }
  return null;
}

/**
 * Which held category a line belongs to, or null for an ordinary line.
 * Order matters only for the label shown to the Owner.
 */
export function classifyInstructionLine(
  line: string,
): ProjectInstructionHoldCategory | null {
  const text = bare(line);
  if (!text) return null;
  if (URL_RE.test(text) || BARE_DOMAIN_RE.test(text)) return "link";
  if (EMAIL_RE.test(text)) return "contact";
  if (
    CURRENCY_SYMBOL_RE.test(text) ||
    CURRENCY_WORD_RE.test(text) ||
    CURRENCY_ZH_RE.test(text)
  ) {
    return "payment";
  }
  // Long digit runs first: a phone number must not read as a bank code.
  const digits = hasContactOrAccountDigits(text);
  if (digits) return digits;
  if (IBAN_RE.test(text) || BSB_RE.test(text) || CREDENTIAL_RE.test(text)) {
    return "account";
  }
  if (LONG_NUMBER_RE.test(text)) return "account";
  if (
    DIRECTIVE_START_RE.test(text) ||
    DIRECTIVE_MODAL_RE.test(text) ||
    DIRECTIVE_ZH_RE.test(text)
  ) {
    return "directive";
  }
  return null;
}

// ── Versions ─────────────────────────────────────────────────────────────

const MAX_VERSIONS_PER_PROJECT = 10;

type ChangeKind = "rewrite" | "approve" | "edit" | "restore" | "legacy-scan";

/** Keep the document as it was before one change, and trim the history. */
export function recordAutoVersion(
  database: DatabaseHandle,
  projectId: string,
  previousDocument: string,
  change: {
    by: "vaenyx" | "owner";
    kind: ChangeKind;
    conversationId?: string | null;
    at?: string;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO project_instruction_versions (
         id, project_id, previous_document, changed_by, change_kind,
         trigger_conversation_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      projectId,
      previousDocument,
      change.by,
      change.kind,
      change.conversationId ?? null,
      change.at ?? new Date().toISOString(),
    );
  database.sqlite
    .prepare(
      `DELETE FROM project_instruction_versions
       WHERE project_id = ? AND id NOT IN (
         SELECT id FROM project_instruction_versions
         WHERE project_id = ?
         ORDER BY created_at DESC, rowid DESC
         LIMIT ?
       )`,
    )
    .run(projectId, projectId, MAX_VERSIONS_PER_PROJECT);
}

export interface AutoDocumentChange {
  changedBy: "vaenyx" | "owner";
  kind: ChangeKind;
  at: string;
  conversationId: string | null;
  conversationTitle: string | null;
}

/** The most recent change to a Project's automatic document, if any. */
export function lastAutoDocumentChange(
  database: DatabaseHandle,
  projectId: string,
): AutoDocumentChange | null {
  const row = database.sqlite
    .prepare(
      `SELECT v.changed_by, v.change_kind, v.created_at,
              v.trigger_conversation_id, c.title AS conversation_title
       FROM project_instruction_versions v
       LEFT JOIN ask_vaenyx_conversations c ON c.id = v.trigger_conversation_id
       WHERE v.project_id = ?
       ORDER BY v.created_at DESC, v.rowid DESC
       LIMIT 1`,
    )
    .get(projectId) as
    | {
        changed_by: "vaenyx" | "owner";
        change_kind: ChangeKind;
        created_at: string;
        trigger_conversation_id: string | null;
        conversation_title: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    changedBy: row.changed_by,
    kind: row.change_kind,
    at: row.created_at,
    conversationId: row.trigger_conversation_id,
    conversationTitle: row.conversation_title,
  };
}

/**
 * Put the previous version back, in one action. The document being replaced
 * is itself kept as a version (changed by the Owner, kind "restore"), so a
 * restore can be undone the same way.
 */
export function restorePreviousAutoDocument(
  database: DatabaseHandle,
  projectId: string,
): boolean {
  const previous = database.sqlite
    .prepare(
      `SELECT id, previous_document FROM project_instruction_versions
       WHERE project_id = ?
       ORDER BY created_at DESC, rowid DESC
       LIMIT 1`,
    )
    .get(projectId) as { id: string; previous_document: string } | undefined;
  if (!previous) return false;
  const current = database.sqlite
    .prepare("SELECT instructions_auto FROM projects WHERE id = ?")
    .get(projectId) as { instructions_auto: string } | undefined;
  if (!current) return false;
  const now = new Date().toISOString();
  database.sqlite.exec("BEGIN IMMEDIATE");
  try {
    database.sqlite
      .prepare("DELETE FROM project_instruction_versions WHERE id = ?")
      .run(previous.id);
    recordAutoVersion(database, projectId, current.instructions_auto, {
      by: "owner",
      kind: "restore",
      at: now,
    });
    database.sqlite
      .prepare(
        `UPDATE projects
         SET instructions_auto = ?, instructions_auto_updated_at = ?
         WHERE id = ?`,
      )
      .run(
        previous.previous_document,
        previous.previous_document.trim() === "" ? null : now,
        projectId,
      );
    database.sqlite.exec("COMMIT");
  } catch (error) {
    database.sqlite.exec("ROLLBACK");
    throw error;
  }
  return true;
}

// ── Holds ────────────────────────────────────────────────────────────────

function projectMode(
  database: DatabaseHandle,
  projectId: string,
): { exists: boolean; modeId: string | null } {
  const row = database.sqlite
    .prepare("SELECT mode_id FROM projects WHERE id = ?")
    .get(projectId) as { mode_id: string | null } | undefined;
  return row ? { exists: true, modeId: row.mode_id } : { exists: false, modeId: null };
}

function holdKeys(
  database: DatabaseHandle,
  projectId: string,
  statuses: ("pending" | "approved" | "rejected")[],
): Set<string> {
  const rows = database.sqlite
    .prepare(
      `SELECT line FROM project_instruction_holds
       WHERE project_id = ? AND status IN (${statuses.map(() => "?").join(", ")})`,
    )
    .all(projectId, ...statuses) as { line: string }[];
  return new Set(rows.map((row) => normalizeInstructionLine(row.line)));
}

function isSourceBlocked(
  database: DatabaseHandle,
  projectId: string,
  conversationId: string | null,
): boolean {
  if (!conversationId) return false;
  return Boolean(
    database.sqlite
      .prepare(
        `SELECT 1 FROM project_instruction_source_blocks
         WHERE project_id = ? AND conversation_id = ?`,
      )
      .get(projectId, conversationId),
  );
}

function insertHold(
  database: DatabaseHandle,
  input: {
    projectId: string;
    modeId: string | null;
    line: string;
    category: ProjectInstructionHoldCategory;
    conversationId: string | null;
    origin: "rewrite" | "legacy";
    at: string;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO project_instruction_holds (
         id, project_id, mode_id, line, category, conversation_id, origin,
         status, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      randomUUID(),
      input.projectId,
      input.modeId,
      bare(input.line),
      input.category,
      input.conversationId,
      input.origin,
      input.at,
    );
}

export interface GuardedRewriteResult {
  applied: string;
  held: number;
  dropped: number;
  changed: boolean;
}

/**
 * Apply one automatic rewrite through the guard.
 *
 * Lines already in the current document, and lines the Owner already
 * approved, apply as they are. A new or changed ordinary line applies. A new
 * or changed held-category line is held in the Inbox — or dropped outright
 * when the triggering Conversation was rejected as a source for this Project.
 */
export function applyGuardedAutoRewrite(
  database: DatabaseHandle,
  input: {
    projectId: string;
    conversationId: string | null;
    proposed: string;
    maxLength?: number;
  },
): GuardedRewriteResult {
  const project = database.sqlite
    .prepare("SELECT instructions_auto, mode_id FROM projects WHERE id = ?")
    .get(input.projectId) as
    | { instructions_auto: string; mode_id: string | null }
    | undefined;
  if (!project) return { applied: "", held: 0, dropped: 0, changed: false };

  const current = project.instructions_auto ?? "";
  const currentKeys = new Set(
    current
      .split("\n")
      .map(normalizeInstructionLine)
      .filter(Boolean),
  );
  const approved = holdKeys(database, input.projectId, ["approved"]);
  const pending = holdKeys(database, input.projectId, ["pending"]);
  const blocked = isSourceBlocked(
    database,
    input.projectId,
    input.conversationId,
  );
  const now = new Date().toISOString();

  const kept: string[] = [];
  let held = 0;
  let dropped = 0;
  database.sqlite.exec("BEGIN IMMEDIATE");
  try {
    for (const rawLine of input.proposed.split("\n")) {
      const key = normalizeInstructionLine(rawLine);
      if (!key) continue;
      if (currentKeys.has(key) || approved.has(key)) {
        kept.push(rawLine.trimEnd());
        continue;
      }
      const category = classifyInstructionLine(rawLine);
      if (!category) {
        kept.push(rawLine.trimEnd());
        continue;
      }
      if (blocked) {
        dropped += 1;
        continue;
      }
      if (!pending.has(key)) {
        insertHold(database, {
          projectId: input.projectId,
          modeId: project.mode_id,
          line: rawLine,
          category,
          conversationId: input.conversationId,
          origin: "rewrite",
          at: now,
        });
        pending.add(key);
        held += 1;
      }
    }
    const applied = kept.join("\n").slice(0, input.maxLength ?? 8000);
    const changed = applied.trim() !== current.trim();
    if (changed) {
      recordAutoVersion(database, input.projectId, current, {
        by: "vaenyx",
        kind: "rewrite",
        conversationId: input.conversationId,
        at: now,
      });
      database.sqlite
        .prepare(
          `UPDATE projects
           SET instructions_auto = ?, instructions_auto_updated_at = ?
           WHERE id = ?`,
        )
        .run(applied, applied.trim() === "" ? null : now, input.projectId);
    }
    database.sqlite.exec("COMMIT");
    return { applied, held, dropped, changed };
  } catch (error) {
    database.sqlite.exec("ROLLBACK");
    throw error;
  }
}

/**
 * The automatic document as a model may read it: every line still waiting for
 * the Owner, or refused by them, is taken out HERE, where context is
 * assembled — so a held line cannot reach a model even if it found its way
 * back into the stored document (a restore, a hand edit, an old copy).
 */
export function visibleAutoDocument(
  database: DatabaseHandle,
  projectId: string,
  document: string,
): string {
  if (!document.trim()) return "";
  const hidden = holdKeys(database, projectId, ["pending", "rejected"]);
  if (hidden.size === 0) return document;
  return document
    .split("\n")
    .filter((line) => !hidden.has(normalizeInstructionLine(line)))
    .join("\n");
}

/** The lines waiting for the Owner in one Mode's Inbox, oldest first. */
export function listPendingInstructionHolds(
  database: DatabaseHandle,
  modeId: string | null,
): ProjectInstructionHold[] {
  const rows = database.sqlite
    .prepare(
      `SELECT h.id, h.project_id, p.name AS project_name, h.line, h.category,
              h.conversation_id, c.title AS conversation_title, h.origin,
              h.created_at
       FROM project_instruction_holds h
       JOIN projects p ON p.id = h.project_id
       LEFT JOIN ask_vaenyx_conversations c
         ON c.id = h.conversation_id AND c.mode_id IS h.mode_id
       WHERE h.status = 'pending' AND h.mode_id IS ?
       ORDER BY h.created_at ASC`,
    )
    .all(modeId) as {
    id: string;
    project_id: string;
    project_name: string;
    line: string;
    category: ProjectInstructionHoldCategory;
    conversation_id: string | null;
    conversation_title: string | null;
    origin: "rewrite" | "legacy";
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    line: row.line,
    category: row.category,
    // Only a Conversation still in this Mode is offered as a link.
    conversationId: row.conversation_title !== null ? row.conversation_id : null,
    conversationTitle: row.conversation_title,
    origin: row.origin,
    createdAt: row.created_at,
  }));
}

export function countPendingInstructionHolds(
  database: DatabaseHandle,
  modeId: string | null,
): number {
  return (
    database.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM project_instruction_holds
         WHERE status = 'pending' AND mode_id IS ?`,
      )
      .get(modeId) as { n: number }
  ).n;
}

/**
 * The Owner's answer to one held line. Approve adds it to the document (kept
 * as a version); Reject records the source-level block for its Conversation.
 * Guarded by Mode: a line from another Mode answers NOT_FOUND.
 */
export function answerInstructionHold(
  database: DatabaseHandle,
  holdId: string,
  modeId: string | null,
  approve: boolean,
): void {
  const hold = database.sqlite
    .prepare(
      `SELECT id, project_id, line, conversation_id, mode_id, status
       FROM project_instruction_holds WHERE id = ?`,
    )
    .get(holdId) as
    | {
        id: string;
        project_id: string;
        line: string;
        conversation_id: string | null;
        mode_id: string | null;
        status: string;
      }
    | undefined;
  if (!hold || hold.mode_id !== modeId) throw new Error("HOLD_NOT_FOUND");
  if (hold.status !== "pending") return;
  const { exists } = projectMode(database, hold.project_id);
  if (!exists) throw new Error("HOLD_NOT_FOUND");
  const now = new Date().toISOString();

  database.sqlite.exec("BEGIN IMMEDIATE");
  try {
    database.sqlite
      .prepare(
        `UPDATE project_instruction_holds
         SET status = ?, reviewed_at = ? WHERE id = ?`,
      )
      .run(approve ? "approved" : "rejected", now, hold.id);
    if (approve) {
      const current = (
        database.sqlite
          .prepare("SELECT instructions_auto FROM projects WHERE id = ?")
          .get(hold.project_id) as { instructions_auto: string }
      ).instructions_auto;
      const already = current
        .split("\n")
        .some(
          (line) =>
            normalizeInstructionLine(line) ===
            normalizeInstructionLine(hold.line),
        );
      if (!already) {
        const next = [current.trimEnd(), `- ${hold.line}`]
          .filter(Boolean)
          .join("\n");
        recordAutoVersion(database, hold.project_id, current, {
          by: "owner",
          kind: "approve",
          conversationId: hold.conversation_id,
          at: now,
        });
        database.sqlite
          .prepare(
            `UPDATE projects
             SET instructions_auto = ?, instructions_auto_updated_at = ?
             WHERE id = ?`,
          )
          .run(next, now, hold.project_id);
      }
    } else if (hold.conversation_id) {
      database.sqlite
        .prepare(
          `INSERT INTO project_instruction_source_blocks
             (project_id, conversation_id, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT (project_id, conversation_id) DO NOTHING`,
        )
        .run(hold.project_id, hold.conversation_id, now);
    }
    database.sqlite.exec("COMMIT");
  } catch (error) {
    database.sqlite.exec("ROLLBACK");
    throw error;
  }
}

// ── The one-time scan of documents written before this guard ─────────────

const LEGACY_SCAN_KEY = "projects.auto_guard.legacy_scan";

/**
 * Move risky lines already sitting in automatic documents into held-for-review
 * — never deleting them silently: each one becomes an Inbox item, and the
 * document before the scan is kept as a version. Runs once per instance; a
 * line the Owner already approved stays, and a line already held or rejected
 * is taken out again without a second Inbox item.
 */
export function scanLegacyAutoDocuments(
  database: DatabaseHandle,
  options: { force?: boolean } = {},
): { projects: number; held: number } {
  if (!options.force) {
    const done = database.sqlite
      .prepare("SELECT value FROM instance_settings WHERE key = ?")
      .get(LEGACY_SCAN_KEY) as { value: string } | undefined;
    if (done) return { projects: 0, held: 0 };
  }
  const projects = database.sqlite
    .prepare(
      `SELECT id, mode_id, instructions_auto FROM projects
       WHERE id != 'general' AND TRIM(instructions_auto) != ''`,
    )
    .all() as { id: string; mode_id: string | null; instructions_auto: string }[];
  const now = new Date().toISOString();
  let touched = 0;
  let held = 0;

  database.sqlite.exec("BEGIN IMMEDIATE");
  try {
    for (const project of projects) {
      const approved = holdKeys(database, project.id, ["approved"]);
      const known = holdKeys(database, project.id, ["pending", "rejected"]);
      const kept: string[] = [];
      let moved = false;
      for (const line of project.instructions_auto.split("\n")) {
        const key = normalizeInstructionLine(line);
        if (!key || approved.has(key)) {
          kept.push(line);
          continue;
        }
        const category = classifyInstructionLine(line);
        if (!category) {
          kept.push(line);
          continue;
        }
        moved = true;
        if (!known.has(key)) {
          insertHold(database, {
            projectId: project.id,
            modeId: project.mode_id,
            line,
            category,
            conversationId: null,
            origin: "legacy",
            at: now,
          });
          known.add(key);
          held += 1;
        }
      }
      if (!moved) continue;
      touched += 1;
      recordAutoVersion(database, project.id, project.instructions_auto, {
        by: "vaenyx",
        kind: "legacy-scan",
        at: now,
      });
      const next = kept.join("\n").trim();
      database.sqlite
        .prepare(
          `UPDATE projects
           SET instructions_auto = ?, instructions_auto_updated_at = ?
           WHERE id = ?`,
        )
        .run(next, next === "" ? null : now, project.id);
    }
    database.sqlite
      .prepare(
        `INSERT INTO instance_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .run(LEGACY_SCAN_KEY, JSON.stringify({ at: now, held }), now);
    database.sqlite.exec("COMMIT");
  } catch (error) {
    database.sqlite.exec("ROLLBACK");
    throw error;
  }
  return { projects: touched, held };
}
