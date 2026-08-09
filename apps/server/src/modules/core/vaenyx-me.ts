import { randomUUID } from "node:crypto";

import type { VaenyxMeProfile } from "@vaenyx/contracts";
import type {
  ApproveVaenyxMeCandidateRequest,
  CreateVaenyxMeCandidateRequest,
  RejectVaenyxMeCandidateRequest,
  VaenyxMeCandidate,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import {
  applyTraitMergeGroups,
  listMergeableTraits,
  mergeDuplicateFacts,
  parseTraitMergeGroups,
  traitMergePrompt,
} from "./vaenyx-me-merge.js";

import { getDefaultProvider } from "../models/registry.js";

interface VaenyxMeItemRow {
  id: string;
  category: string;
  title: string;
  summary: string;
  status: "not_learned" | "pending_review" | "approved" | "rejected";
  evidence: string | null;
  confidence: number;
  updated_at: string;
}

interface VaenyxMeCandidateRow {
  id: string;
  category: string;
  title: string;
  proposed_summary: string;
  proposed_evidence: string;
  source_type:
    | "owner_manual"
    | "project_memory"
    | "task_result"
    | "forge_suggestion"
    | "system_seed"
    | "chat_history";
  source_id: string | null;
  confidence: number;
  status: "pending_review" | "approved" | "rejected" | "deleted";
  review_note: string | null;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApprovedItemRow {
  id: string;
}

const candidateSelect = `
  SELECT id, category, title, proposed_summary, proposed_evidence,
         source_type, source_id, confidence, status, review_note, created_by,
         reviewed_by, reviewed_at, created_at, updated_at,
         -- 🔴 These three decide WHICH approval path a candidate takes, so
         -- leaving them out of the SELECT silently merged the two: every fact
         -- proposal arrived at the client looking like a trait proposal and
         -- was approved as one, landing in vaenyx_me_items instead of facts.
         -- 0059 says in as many words that the shared table is split by
         -- proposed_slot; this is the line that has to read it.
         proposed_slot, proposed_value, proposed_event_time
  FROM vaenyx_me_candidates
`;

interface FactCandidateColumns {
  proposed_event_time?: string | null;
  proposed_slot?: string | null;
  proposed_value?: string | null;
}

function mapCandidate(
  row: FactCandidateColumns & VaenyxMeCandidateRow,
): VaenyxMeCandidate {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    proposedSummary: row.proposed_summary,
    proposedEvidence: row.proposed_evidence,
    sourceType: row.source_type,
    sourceId: row.source_id,
    confidence: row.confidence,
    status: row.status,
    reviewNote: row.review_note,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Set only on a proposed FACT. The review screen shows those differently
    // and approves them through a different path, because this one collapses
    // a whole category onto a single row.
    proposedSlot: row.proposed_slot ?? null,
    proposedValue: row.proposed_value ?? null,
    proposedEventTime: row.proposed_event_time ?? null,
  };
}

function cleanOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getCandidateRow(
  database: DatabaseHandle,
  candidateId: string,
): VaenyxMeCandidateRow | null {
  return (
    database.sqlite
      .prepare(`${candidateSelect} WHERE id = ?`)
      .get(candidateId) as VaenyxMeCandidateRow | undefined
  ) ?? null;
}

export function getVaenyxMeProfile(database: DatabaseHandle): VaenyxMeProfile {
  const rows = database.sqlite
    .prepare(
      `SELECT id, category, title, summary, status, evidence, confidence,
              updated_at
       FROM vaenyx_me_items
       ORDER BY sort_order, title`,
    )
    .all() as unknown as VaenyxMeItemRow[];

  return {
    ownerModel: "digital-self",
    items: rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      summary: row.summary,
      status: row.status,
      evidence: row.evidence,
      confidence: row.confidence,
      updatedAt: row.updated_at,
    })),
  };
}

export function listVaenyxMeCandidates(
  database: DatabaseHandle,
): VaenyxMeCandidate[] {
  const rows = database.sqlite
    .prepare(
      `${candidateSelect}
       WHERE status != 'deleted'
       ORDER BY
         CASE status
           WHEN 'pending_review' THEN 0
           WHEN 'approved' THEN 1
           WHEN 'rejected' THEN 2
           ELSE 3
         END,
         created_at DESC`,
    )
    .all() as unknown as VaenyxMeCandidateRow[];

  return rows.map(mapCandidate);
}

export function createVaenyxMeCandidate(
  database: DatabaseHandle,
  input: CreateVaenyxMeCandidateRequest,
  ownerId: string,
): VaenyxMeCandidate {
  const id = randomUUID();

  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_me_candidates (
        id, category, title, proposed_summary, proposed_evidence, source_type,
        source_id, confidence, status, created_by, mode_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`,
    )
    .run(
      id,
      input.category.trim(),
      input.title.trim(),
      input.proposedSummary.trim(),
      input.proposedEvidence.trim(),
      input.sourceType ?? "owner_manual",
      input.sourceId ?? null,
      input.confidence,
      ownerId,
      // Which Mode this belongs to. NULL is User Mode and is a real value
      // here, not "unknown" — it is what every existing row already means.
      input.modeId ?? null,
    );

  // The inbox's own record of the reference (H-001): one row per Mode and
  // source, deduplicated by the unique index rather than by hoping. OR IGNORE
  // because a merged replacement can share a source lineage with what it
  // replaced, and a duplicate reference is a fact already on file, not an
  // error.
  database.sqlite
    .prepare(
      `INSERT OR IGNORE INTO inbox_items (id, mode_id, source_kind, source_id)
       VALUES (?, ?, 'vaenyx_me_candidate', ?)`,
    )
    .run(`inbox-${id}`, input.modeId ?? null, id);

  return mapCandidate(getCandidateRow(database, id)!);
}

const VAENYX_ME_SCAN_CATEGORIES = [
  "identity",
  "communication",
  "preferences",
  "decisions",
  "projects",
  "trust",
  "autonomy",
];

interface ScanTaskRow {
  id: string;
  title: string;
  request: string;
  result: string;
}

interface ExtractedTrait {
  category: string;
  title: string;
  summary: string;
  evidence: string;
}

function parseTraitJson(text: string): {
  category?: string | null;
  title?: string;
  summary?: string;
  evidence?: string;
} | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as {
      category?: string | null;
      title?: string;
      summary?: string;
      evidence?: string;
    };
  } catch {
    return null;
  }
}

async function extractTrait(
  activity: string,
  fallbackEvidence: string,
  signal?: AbortSignal,
): Promise<ExtractedTrait | null> {
  const prompt = [
    "You infer ONE stable trait about the Owner from a sample of their own activity.",
    "Pick exactly one category id from: identity, communication, preferences, decisions, projects, trust, autonomy.",
    "Be conservative: most activity reveals nothing durable. Only propose a trait when it clearly does.",
    'Reply with ONLY JSON: {"category":"<id>","title":"<short label>","summary":"<one sentence about the Owner>","evidence":"<one short sentence: why>"}',
    'If nothing stable is revealed, reply with exactly: {"category":null}',
    "",
    activity,
  ].join("\n");

  let answer: string;
  try {
    const response = await getDefaultProvider().sendChat(
      [{ role: "owner", content: prompt }],
      undefined,
      { signal },
    );
    answer = response.answer;
  } catch {
    return null;
  }

  const parsed = parseTraitJson(answer);
  const category = parsed?.category;
  if (!category || !VAENYX_ME_SCAN_CATEGORIES.includes(category)) return null;
  const summary = parsed?.summary?.trim();
  if (!summary) return null;

  return {
    category,
    title: (parsed?.title?.trim() || category).slice(0, 120),
    summary: summary.slice(0, 2000),
    evidence: (parsed?.evidence?.trim() || fallbackEvidence).slice(0, 2000),
  };
}

// Auto-learn (behind the scenes): read recent completed tasks and propose stable
// Owner traits as PENDING candidates. Nothing is written to Vaenyx Me directly —
// every trait still passes the Owner-approval gate, honouring the Evolution rule.
export async function scanVaenyxMeFromTasks(
  database: DatabaseHandle,
  ownerId: string,
  modeId: string | null,
  signal?: AbortSignal,
): Promise<{ created: number }> {
  const tasks = database.sqlite
    .prepare(
      `SELECT id, title, request, result
       FROM tasks
       WHERE status = 'completed'
         AND TRIM(result) != ''
         -- IS, not =, because User Mode is NULL and = never matches NULL.
         AND mode_id IS ?
         AND id NOT IN (
           SELECT source_id FROM vaenyx_me_candidates
           WHERE source_type = 'task_result' AND source_id IS NOT NULL
         )
       ORDER BY created_at DESC
       LIMIT 4`,
    )
    .all(modeId) as unknown as ScanTaskRow[];

  let created = 0;
  for (const task of tasks) {
    if (signal?.aborted) break;
    const trait = await extractTrait(
      `Owner request: ${task.request}\nResult: ${task.result.slice(0, 2000)}`,
      `Inferred from the task "${task.title}".`,
      signal,
    );
    if (!trait) continue;
    createVaenyxMeCandidate(
      database,
      {
        category: trait.category,
        title: trait.title,
        proposedSummary: trait.summary,
        proposedEvidence: trait.evidence,
        sourceType: "task_result",
        sourceId: task.id,
        confidence: 45,
        modeId,
      },
      ownerId,
    );
    created += 1;
  }

  return { created };
}

interface ScanChatRow {
  id: string;
  title: string;
}

// Auto-learn from the Owner's own chats — the richest source of stable traits.
export async function scanVaenyxMeFromChats(
  database: DatabaseHandle,
  ownerId: string,
  modeId: string | null,
  signal?: AbortSignal,
): Promise<{ created: number }> {
  const conversations = database.sqlite
    .prepare(
      `SELECT c.id, c.title
       FROM ask_vaenyx_conversations c
       WHERE c.owner_id = ?
         -- IS, not =, because User Mode is NULL and = never matches NULL.
         AND c.mode_id IS ?
         AND c.id NOT IN (
           SELECT source_id FROM vaenyx_me_candidates
           WHERE source_type = 'chat_history' AND source_id IS NOT NULL
         )
         AND (
           SELECT COUNT(*) FROM ask_vaenyx_messages m
           WHERE m.conversation_id = c.id AND m.role = 'owner'
         ) >= 2
       ORDER BY c.updated_at DESC
       LIMIT 4`,
    )
    .all(ownerId, modeId) as unknown as ScanChatRow[];

  let created = 0;
  for (const conversation of conversations) {
    if (signal?.aborted) break;
    const lines = database.sqlite
      .prepare(
        `SELECT content FROM ask_vaenyx_messages
         WHERE conversation_id = ? AND role = 'owner'
         ORDER BY created_at
         LIMIT 12`,
      )
      .all(conversation.id) as unknown as { content: string }[];
    const transcript = lines
      .map((line) => line.content)
      .join("\n")
      .slice(0, 2500);
    if (!transcript.trim()) continue;
    const trait = await extractTrait(
      `The Owner's own messages in a chat titled "${conversation.title}":\n${transcript}`,
      `Inferred from your chat "${conversation.title}".`,
      signal,
    );
    if (!trait) continue;
    createVaenyxMeCandidate(
      database,
      {
        category: trait.category,
        title: trait.title,
        proposedSummary: trait.summary,
        proposedEvidence: trait.evidence,
        sourceType: "chat_history",
        sourceId: conversation.id,
        confidence: 40,
        modeId,
      },
      ownerId,
    );
    created += 1;
  }

  return { created };
}

// Run every auto-learn source the Owner has, returning the total proposed.
export async function scanVaenyxMe(
  database: DatabaseHandle,
  ownerId: string,
  modeId: string | null,
  signal?: AbortSignal,
): Promise<{ created: number }> {
  const fromTasks = await scanVaenyxMeFromTasks(
    database,
    ownerId,
    modeId,
    signal,
  );
  const fromChats = await scanVaenyxMeFromChats(
    database,
    ownerId,
    modeId,
    signal,
  );
  const created = fromTasks.created + fromChats.created;

  // Merge on EVERY pass, not only ones that added something (Oskar,
  // 2026-08-09, second ruling — the first pass left pairs he could see were
  // the same thing, and a merge gated on "something new arrived" can never
  // take a second look at what is already sitting there). The scan is daily
  // now, so the worst case is one model call a day, and only when at least
  // two traits are pending. The timestamp is observability, not a gate.
  await mergePendingCandidates(database, ownerId, modeId, signal);
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES ('me_merge_ran_at', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .run(new Date().toISOString());
  return { created };
}

/**
 * One merge pass for one Mode's pending queue.
 *
 * Facts first (exact SQL: same slot + same value, newest kept), then traits
 * (the model groups same-thing proposals; every group is re-validated here and
 * anything doubtful is dropped rather than repaired). The model only ever
 * groups and rephrases — nothing it says can approve, reject or delete.
 */
export async function mergePendingCandidates(
  database: DatabaseHandle,
  ownerId: string,
  modeId: string | null,
  signal?: AbortSignal,
): Promise<{ merged: number }> {
  let merged = mergeDuplicateFacts(database, modeId);

  const traits = listMergeableTraits(database, modeId);
  if (traits.length >= 2) {
    try {
      const response = await getDefaultProvider().sendChat(
        [{ role: "owner", content: traitMergePrompt(traits) }],
        undefined,
        { signal },
      );
      const groups = parseTraitMergeGroups(response.answer, traits);
      merged += applyTraitMergeGroups(database, groups, traits, modeId, ownerId);
    } catch {
      // No model, no merge — the queue is merely longer, never wrong. The next
      // scan pass tries again.
    }
  }
  return { merged };
}

// Auto-run entry for the scheduler: resolve the single Owner and scan. No-ops
// quietly if there is no Owner yet or the model channel isn't ready.
export async function autoScanVaenyxMe(database: DatabaseHandle): Promise<void> {
  const owner = database.sqlite
    .prepare("SELECT id FROM owners ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined;
  if (!owner) return;
  // The background pass runs as the Owner in User Mode. It must not reach into
  // a Custom Mode: nobody is looking at that screen, and a leak made by a timer
  // is one nobody would ever catch.
  await scanVaenyxMe(database, owner.id, null);
}

export function approveVaenyxMeCandidate(
  database: DatabaseHandle,
  candidateId: string,
  input: ApproveVaenyxMeCandidateRequest,
  ownerId: string,
): { candidate: VaenyxMeCandidate; itemId: string } {
  const candidate = getCandidateRow(database, candidateId);

  if (!candidate || candidate.status === "deleted") {
    throw new Error("VAENYX_ME_CANDIDATE_NOT_FOUND");
  }

  if (candidate.status !== "pending_review") {
    throw new Error("VAENYX_ME_CANDIDATE_NOT_PENDING");
  }

  const now = new Date().toISOString();
  let itemId: string;

  database.sqlite.exec("BEGIN IMMEDIATE;");

  try {
    // 🔴 FILL AN EMPTY SLOT, NEVER OVERWRITE A LEARNED ONE.
    //
    // Vaenyx Me starts as seven placeholders, one per category, at
    // 'not_learned' (0009). Approving something is meant to FILL the empty one
    // for its category — and that is what this query used to do for the first
    // approval and only the first. It took the first row in the category
    // whatever its state, so approving a SECOND insight about, say,
    // communication silently overwrote the first with no record anywhere that
    // it had ever existed. The Owner had approved it; it was simply gone.
    //
    // So: an unlearned placeholder is filled, and a category whose placeholder
    // is already taken gains another row instead. Seven is where the screen
    // starts, not a ceiling — the chat context already reads up to twelve.
    const existingItem = database.sqlite
      .prepare(
        `SELECT id
         FROM vaenyx_me_items
         WHERE category = ? AND status <> 'approved'
         ORDER BY sort_order, title
         LIMIT 1`,
      )
      .get(candidate.category) as ApprovedItemRow | undefined;

    if (existingItem) {
      itemId = existingItem.id;
      database.sqlite
        .prepare(
          `UPDATE vaenyx_me_items
           SET title = ?, summary = ?, status = 'approved', evidence = ?,
               confidence = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.title.trim(),
          input.summary.trim(),
          input.evidence.trim(),
          input.confidence,
          now,
          itemId,
        );
    } else {
      itemId = `approved-${candidate.id}`;
      database.sqlite
        .prepare(
          `INSERT INTO vaenyx_me_items (
            id, category, title, summary, status, evidence, confidence,
            sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'approved', ?, ?, 100, ?, ?)`,
        )
        .run(
          itemId,
          candidate.category,
          input.title.trim(),
          input.summary.trim(),
          input.evidence.trim(),
          input.confidence,
          now,
          now,
        );
    }

    database.sqlite
      .prepare(
        `UPDATE vaenyx_me_candidates
         SET title = ?, proposed_summary = ?, proposed_evidence = ?,
             confidence = ?, status = 'approved', review_note = ?,
             reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.summary.trim(),
        input.evidence.trim(),
        input.confidence,
        cleanOptionalText(input.reviewNote),
        ownerId,
        now,
        now,
        candidateId,
      );

    database.sqlite.exec("COMMIT;");
  } catch (error) {
    database.sqlite.exec("ROLLBACK;");
    throw error;
  }

  return {
    candidate: mapCandidate(getCandidateRow(database, candidateId)!),
    itemId,
  };
}

export function rejectVaenyxMeCandidate(
  database: DatabaseHandle,
  candidateId: string,
  input: RejectVaenyxMeCandidateRequest,
  ownerId: string,
): VaenyxMeCandidate {
  const candidate = getCandidateRow(database, candidateId);

  if (!candidate || candidate.status === "deleted") {
    throw new Error("VAENYX_ME_CANDIDATE_NOT_FOUND");
  }

  if (candidate.status !== "pending_review") {
    throw new Error("VAENYX_ME_CANDIDATE_NOT_PENDING");
  }

  const now = new Date().toISOString();
  database.sqlite
    .prepare(
      `UPDATE vaenyx_me_candidates
       SET status = 'rejected', review_note = ?, reviewed_by = ?,
           reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(cleanOptionalText(input.reviewNote), ownerId, now, now, candidateId);

  return mapCandidate(getCandidateRow(database, candidateId)!);
}

export function deleteVaenyxMeCandidate(
  database: DatabaseHandle,
  candidateId: string,
  ownerId: string,
): VaenyxMeCandidate {
  const candidate = getCandidateRow(database, candidateId);

  if (!candidate || candidate.status === "deleted") {
    throw new Error("VAENYX_ME_CANDIDATE_NOT_FOUND");
  }

  const now = new Date().toISOString();
  database.sqlite
    .prepare(
      `UPDATE vaenyx_me_candidates
       SET status = 'deleted', reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(ownerId, now, now, candidateId);

  return mapCandidate(getCandidateRow(database, candidateId)!);
}
