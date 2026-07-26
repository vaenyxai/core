// The flywheel's outbound half (copy pack Part K). Nothing here sends anything
// yet — the transport is built next — but everything a send depends on lives
// here: what gets stripped, what gets held back, and the window in which the
// Owner can pull an item out.
//
// The shape of the deal, so the next person changing this file has it in front
// of them:
//
//   * Consent is taken ONCE, at activation (K3), on a surface describing the
//     whole mechanism. The 48-hour wait is a WITHDRAWAL CONTROL exercised under
//     that consent — it is not where agreement is given, because silence is
//     never agreement (Core Privacy Policy 7.2).
//   * Stripping is automatic and imperfect. That is exactly why the window
//     exists, and why no string may promise that what leaves is clean.
//   * Health, family and finance never ride the automatic path: they are held
//     for the always-ask (G4), every time, with no "always allow".
//   * Automatic to a person, never automatic to the public (K0). This queue
//     goes to one publisher who has chosen to receive; publishing to the
//     Community stays a deliberate act.
import { randomUUID } from "node:crypto";

import type { DatabaseHandle } from "../../db/database.js";

// Long enough for someone to notice and act, short enough that the flywheel
// still turns. Env-overridable so an operator can shorten it in testing.
export const WINDOW_HOURS = Number.parseInt(
  process.env.VAENYX_FLYWHEEL_WINDOW_HOURS ?? "48",
  10,
);

export interface Redaction {
  kind: "email" | "phone" | "card" | "id-number" | "url" | "money" | "address";
  original: string;
}

export interface StrippedValue {
  value: unknown;
  redactions: Redaction[];
}

const PATTERNS: { kind: Redaction["kind"]; re: RegExp; mask: string }[] = [
  { kind: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, mask: "[email]" },
  // Card-ish runs of 13-19 digits, spaces or dashes allowed.
  {
    kind: "card",
    re: /\b(?:\d[ -]?){13,19}\b/g,
    mask: "[card number]",
  },
  // Phone numbers: +country, or 8+ digits with separators.
  {
    kind: "phone",
    re: /\+?\d[\d\s().-]{7,}\d/g,
    mask: "[phone]",
  },
  { kind: "url", re: /https?:\/\/\S+/g, mask: "[link]" },
  {
    kind: "id-number",
    re: /\b[A-Z]{1,3}\d{6,10}\b/g,
    mask: "[id number]",
  },
];

// Words that mean the content touches a category we never send automatically.
// Deliberately wide: a false positive costs one held example, a false negative
// sends someone's health or family detail to a stranger (copy pack Part C).
const SENSITIVE = [
  "health",
  "medical",
  "doctor",
  "hospital",
  "diagnos",
  "medicat",
  "prescription",
  "therapy",
  "mental",
  "pregnan",
  "salary",
  "wage",
  "income",
  "tax",
  "bank",
  "loan",
  "debt",
  "mortgage",
  "insurance",
  "daughter",
  "son",
  "child",
  "kid",
  "wife",
  "husband",
  "partner",
  "school",
  "teacher",
];
const SENSITIVE_ZH =
  /医|药|病|诊|治疗|怀孕|心理|工资|薪|收入|税|银行|贷款|债|保险|按揭|女儿|儿子|孩子|老婆|丈夫|妻子|学校|老师/;

export function looksSensitive(value: unknown): boolean {
  const text = JSON.stringify(value ?? "").toLowerCase();
  if (SENSITIVE_ZH.test(text)) return true;
  return SENSITIVE.some((word) => text.includes(word));
}

// Strip what we can recognise, and say what we changed. This runs ON THE
// DEVICE, before anything is queued: the raw correction never leaves.
export function stripPersonalDetails(value: unknown): StrippedValue {
  const redactions: Redaction[] = [];
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      let text = node;
      for (const { kind, re, mask } of PATTERNS) {
        text = text.replace(new RegExp(re.source, re.flags), (match) => {
          redactions.push({ kind, original: match });
          return mask;
        });
      }
      return text;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(node)) out[key] = walk(entry);
      return out;
    }
    return node;
  };
  return { value: walk(value), redactions };
}

export interface QueuedExample {
  id: string;
  methodId: string;
  input: unknown;
  output: unknown;
  note: string | null;
  redactions: Redaction[];
  sensitive: boolean;
  createdAt: string;
  sendAfter: string;
  state: "waiting" | "withdrawn" | "sent" | "failed";
}

function parse(value: string, fallback: unknown = null): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function queueExample(
  database: DatabaseHandle,
  input: { methodId: string; input: unknown; output: unknown; note?: string | null },
  nowMs = Date.now(),
): QueuedExample {
  const strippedInput = stripPersonalDetails(input.input);
  const strippedOutput = stripPersonalDetails(input.output);
  const redactions = [...strippedInput.redactions, ...strippedOutput.redactions];
  const sensitive =
    looksSensitive(input.input) || looksSensitive(input.output);
  const id = randomUUID();
  const sendAfter = new Date(
    nowMs + WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  database.sqlite
    .prepare(
      `INSERT INTO flywheel_queue
        (id, method_id, input, output, note, redactions, sensitive, send_after)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.methodId,
      JSON.stringify(strippedInput.value),
      JSON.stringify(strippedOutput.value),
      input.note ?? null,
      JSON.stringify(redactions),
      sensitive ? 1 : 0,
      sendAfter,
    );

  return {
    id,
    methodId: input.methodId,
    input: strippedInput.value,
    output: strippedOutput.value,
    note: input.note ?? null,
    redactions,
    sensitive,
    createdAt: new Date(nowMs).toISOString(),
    sendAfter,
    state: "waiting",
  };
}

export function listQueue(database: DatabaseHandle): QueuedExample[] {
  const rows = database.sqlite
    .prepare(
      `SELECT * FROM flywheel_queue WHERE state = 'waiting'
        ORDER BY send_after ASC`,
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    methodId: String(row.method_id),
    input: parse(String(row.input)),
    output: parse(String(row.output)),
    note: row.note === null ? null : String(row.note),
    redactions: parse(String(row.redactions), []) as Redaction[],
    sensitive: row.sensitive === 1,
    createdAt: String(row.created_at),
    sendAfter: String(row.send_after),
    state: "waiting",
  }));
}

// The Owner pulling an item out. Withdrawal is the point of the window, so it
// is always available while the item is still waiting.
export function withdrawQueued(
  database: DatabaseHandle,
  id: string,
): boolean {
  const result = database.sqlite
    .prepare(
      "UPDATE flywheel_queue SET state = 'withdrawn' WHERE id = ? AND state = 'waiting'",
    )
    .run(id);
  return (result.changes ?? 0) > 0;
}

// What is ready to go: past its window, still waiting, and not sensitive.
// Sensitive items are NEVER swept — they wait for the always-ask (G4), which
// is a separate, per-item question with no "always allow".
export function listDue(
  database: DatabaseHandle,
  nowMs = Date.now(),
): QueuedExample[] {
  const now = new Date(nowMs).toISOString();
  const rows = database.sqlite
    .prepare(
      `SELECT * FROM flywheel_queue
        WHERE state = 'waiting' AND sensitive = 0 AND send_after <= ?
        ORDER BY send_after ASC`,
    )
    .all(now) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    methodId: String(row.method_id),
    input: parse(String(row.input)),
    output: parse(String(row.output)),
    note: row.note === null ? null : String(row.note),
    redactions: parse(String(row.redactions), []) as Redaction[],
    sensitive: false,
    createdAt: String(row.created_at),
    sendAfter: String(row.send_after),
    state: "waiting",
  }));
}

export function markSent(database: DatabaseHandle, id: string): void {
  database.sqlite
    .prepare(
      "UPDATE flywheel_queue SET state = 'sent', sent_at = datetime('now') WHERE id = ?",
    )
    .run(id);
}

// The contributor ID (K10). Local, permanent, and NOT a credential: a person
// who cannot see their own ID cannot tell us which contributions are theirs,
// and so cannot exercise their access and correction rights. It is kept out of
// example CONTENT for a different reason — content is what leaks, and an ID
// written into content survives de-identification because it does not look
// like personal information.
export function getContributorId(database: DatabaseHandle): string {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = 'contributor_id'")
    .get() as { value: string } | undefined;
  if (row?.value) return row.value;
  const id = `vx-${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES ('contributor_id', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO NOTHING`,
    )
    .run(id);
  // Re-read: a concurrent call may have won the insert, and the ID must be the
  // same one forever — a reset would break the credit it exists to carry.
  const stored = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = 'contributor_id'")
    .get() as { value: string } | undefined;
  return stored?.value ?? id;
}
