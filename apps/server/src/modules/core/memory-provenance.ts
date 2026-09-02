import { createHash, randomUUID } from "node:crypto";

import type { DatabaseHandle } from "../../db/database.js";

export type MemoryKind = "fact" | "profile";
export type MemorySourceKind =
  | "conversation"
  | "external"
  | "manual"
  | "project_memory"
  | "task"
  | "unavailable";

export interface MemoryAdmissionSource {
  sourceId?: string | null;
  sourceKind: MemorySourceKind;
  sourceMessageId?: string | null;
}

export interface MemoryProvenanceSource {
  admittedAt: string;
  admissionEventId: string;
  available: boolean;
  excluded: boolean;
  id: string;
  modeId: string | null;
  projectId: string | null;
  sourceId: string | null;
  sourceKind: MemorySourceKind;
  sourceMessageId: string | null;
  sourceTitle: string;
}

export interface MemoryProvenanceView {
  memoryId: string;
  memoryKind: MemoryKind;
  sources: MemoryProvenanceSource[];
}

export type ForgetOutcome = "forget" | "retain";
export type ForgetReason =
  | "independent_source"
  | "legacy_unavailable"
  | "selected_source_only";

export interface ForgetPreviewItem {
  memoryId: string;
  memoryKind: MemoryKind;
  outcome: ForgetOutcome;
  reason: ForgetReason;
  title: string;
}

export interface ConversationForgetPreview {
  conversationId: string;
  conversationTitle: string;
  forgettableCount: number;
  items: ForgetPreviewItem[];
  legacyUnknownCount: number;
  retainedCount: number;
  revision: string;
}

interface ProvenanceRow {
  admitted_at: string;
  admission_event_id: string;
  id: string;
  memory_id: string;
  memory_kind: MemoryKind;
  mode_id: string | null;
  project_id: string | null;
  removed_at: string | null;
  source_id: string | null;
  source_kind: MemorySourceKind;
  source_message_id: string | null;
}

interface CandidateSourceRow {
  mode_id: string | null;
  source_id: string | null;
  source_type: string;
  sources_json: string | null;
}

const PROFILE_BASELINES: Record<
  string,
  { category: string; summary: string; title: string }
> = {
  "owner-identity": {
    category: "identity",
    title: "Owner identity",
    summary:
      "Vaenyx only knows the Owner name until the Owner approves more personal context.",
  },
  "communication-style": {
    category: "communication",
    title: "Communication style",
    summary:
      "How the Owner prefers Vaenyx to explain, summarize, and ask questions.",
  },
  "stable-preferences": {
    category: "preferences",
    title: "Stable preferences",
    summary:
      "Long-term preferences that should shape future responses only after review.",
  },
  "decision-patterns": {
    category: "decisions",
    title: "Decision patterns",
    summary:
      "Repeated ways the Owner evaluates tradeoffs, risk, cost, time, and simplicity.",
  },
  "project-behaviour": {
    category: "projects",
    title: "Project behaviour",
    summary:
      "How the Owner tends to work across projects and what each project expects.",
  },
  "trust-by-project": {
    category: "trust",
    title: "Trust by Project",
    summary:
      "Which projects, skills, or workflows may deserve higher or lower autonomy later.",
  },
  "autonomy-suggestions": {
    category: "autonomy",
    title: "Autonomy suggestions",
    summary:
      "Possible future autonomy changes waiting for explicit Owner approval.",
  },
};

function sourceProjectId(
  database: DatabaseHandle,
  source: MemoryAdmissionSource,
): string | null {
  if (!source.sourceId) return null;
  if (source.sourceKind === "conversation") {
    const row = database.sqlite
      .prepare(
        `SELECT project_id FROM vaenyx_threads
         WHERE conversation_id = ? LIMIT 1`,
      )
      .get(source.sourceId) as { project_id: string | null } | undefined;
    return row?.project_id ?? null;
  }
  if (source.sourceKind === "task") {
    const row = database.sqlite
      .prepare(`SELECT project_id FROM tasks WHERE id = ?`)
      .get(source.sourceId) as { project_id: string | null } | undefined;
    return row?.project_id ?? null;
  }
  if (source.sourceKind === "project_memory") {
    const row = database.sqlite
      .prepare(`SELECT project_id FROM project_memories WHERE id = ?`)
      .get(source.sourceId) as { project_id: string } | undefined;
    return row?.project_id ?? null;
  }
  return null;
}

export function addMemoryProvenance(
  database: DatabaseHandle,
  input: {
    admittedAt?: string;
    admissionEventId: string;
    memoryId: string;
    memoryKind: MemoryKind;
    modeId: string | null;
    sources: MemoryAdmissionSource[];
  },
): void {
  const admittedAt = input.admittedAt ?? new Date().toISOString();
  const sources = input.sources.length
    ? input.sources
    : [{ sourceKind: "unavailable" as const }];
  for (const source of sources) {
    database.sqlite
      .prepare(
        `INSERT OR IGNORE INTO memory_provenance (
           id, memory_kind, memory_id, source_kind, source_id,
           source_message_id, mode_id, project_id, admission_event_id,
           admitted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.memoryKind,
        input.memoryId,
        source.sourceKind,
        source.sourceId ?? null,
        source.sourceMessageId ?? null,
        input.modeId,
        sourceProjectId(database, source),
        input.admissionEventId,
        admittedAt,
      );
  }
}

function parseCandidateJsonSources(
  raw: string | null,
): MemoryAdmissionSource[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const sources: MemoryAdmissionSource[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      const candidate = entry as {
        conversationId?: unknown;
        messageId?: unknown;
      };
      if (typeof candidate.conversationId !== "string") continue;
      const messageId =
        typeof candidate.messageId === "string" ? candidate.messageId : null;
      const key = `${candidate.conversationId}:${messageId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        sourceKind: "conversation",
        sourceId: candidate.conversationId,
        sourceMessageId: messageId,
      });
    }
    return sources;
  } catch {
    return [];
  }
}

export function candidateAdmissionSources(
  database: DatabaseHandle,
  candidateId: string,
): { modeId: string | null; sources: MemoryAdmissionSource[] } {
  const row = database.sqlite
    .prepare(
      `SELECT source_type, source_id, sources_json, mode_id
       FROM vaenyx_me_candidates WHERE id = ?`,
    )
    .get(candidateId) as CandidateSourceRow | undefined;
  if (!row) return { modeId: null, sources: [] };

  if (row.source_type === "chat_history") {
    const sources = parseCandidateJsonSources(row.sources_json);
    if (sources.length > 0) return { modeId: row.mode_id, sources };
    return {
      modeId: row.mode_id,
      sources: row.source_id
        ? [{ sourceKind: "conversation", sourceId: row.source_id }]
        : [{ sourceKind: "unavailable" }],
    };
  }

  const sourceKind: MemorySourceKind =
    row.source_type === "task_result"
      ? "task"
      : row.source_type === "project_memory"
        ? "project_memory"
        : row.source_type === "owner_manual"
          ? "manual"
          : "unavailable";
  return {
    modeId: row.mode_id,
    sources: [{ sourceKind, sourceId: row.source_id }],
  };
}

export function isMemorySourceExcluded(
  database: DatabaseHandle,
  sourceKind: "conversation" | "project_memory" | "task",
  sourceId: string,
  modeId: string | null,
): boolean {
  return Boolean(
    database.sqlite
      .prepare(
        `SELECT 1 FROM memory_source_exclusions
         WHERE source_kind = ? AND source_id = ? AND mode_id IS ?
           AND cleared_at IS NULL
         LIMIT 1`,
      )
      .get(sourceKind, sourceId, modeId),
  );
}

export function assertAdmissionSourcesAllowed(
  database: DatabaseHandle,
  sources: MemoryAdmissionSource[],
  modeId: string | null,
): void {
  for (const source of sources) {
    if (
      (source.sourceKind === "conversation" ||
        source.sourceKind === "project_memory" ||
        source.sourceKind === "task") &&
      source.sourceId &&
      isMemorySourceExcluded(
        database,
        source.sourceKind,
        source.sourceId,
        modeId,
      )
    ) {
      throw new Error("MEMORY_SOURCE_EXCLUDED");
    }
  }
}

function conversationScope(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  modeId: string | null,
): { archived: boolean; projectId: string | null; title: string } {
  const row = database.sqlite
    .prepare(
      `SELECT c.title, t.project_id AS projectId, t.status
       FROM ask_vaenyx_conversations AS c
       LEFT JOIN vaenyx_threads AS t ON t.conversation_id = c.id
       WHERE c.id = ? AND c.owner_id = ? AND c.mode_id IS ?`,
    )
    .get(conversationId, ownerId, modeId) as
    | { projectId: string | null; status: string | null; title: string }
    | undefined;
  if (!row) throw new Error("ASK_VAENYX_CONVERSATION_NOT_FOUND");
  return {
    archived: row.status === "archived",
    projectId: row.projectId,
    title: row.title,
  };
}

export function setConversationSourceExcluded(
  database: DatabaseHandle,
  input: {
    conversationId: string;
    excluded: boolean;
    modeId: string | null;
    ownerId: string;
  },
): void {
  const scope = conversationScope(
    database,
    input.conversationId,
    input.ownerId,
    input.modeId,
  );
  const now = new Date().toISOString();
  const sourceKey = `conversation:${input.conversationId}`;
  database.sqlite
    .prepare(
      `INSERT INTO memory_source_exclusions (
         source_key, source_kind, source_id, mode_id, project_id,
         excluded_at, cleared_at, updated_at
       ) VALUES (?, 'conversation', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_key) DO UPDATE SET
         mode_id = excluded.mode_id,
         project_id = excluded.project_id,
         excluded_at = CASE
           WHEN excluded.cleared_at IS NULL THEN excluded.excluded_at
           ELSE memory_source_exclusions.excluded_at
         END,
         cleared_at = excluded.cleared_at,
         updated_at = excluded.updated_at`,
    )
    .run(
      sourceKey,
      input.conversationId,
      input.modeId,
      scope.projectId,
      now,
      input.excluded ? null : now,
      now,
    );
}

function sourceTitle(
  database: DatabaseHandle,
  row: ProvenanceRow,
): { available: boolean; title: string } {
  if (row.source_kind === "conversation" && row.source_id) {
    const source = database.sqlite
      .prepare(`SELECT title FROM ask_vaenyx_conversations WHERE id = ?`)
      .get(row.source_id) as { title: string } | undefined;
    if (!source) return { available: false, title: "Source unavailable" };
    if (row.source_message_id) {
      const message = database.sqlite
        .prepare(
          `SELECT 1 FROM ask_vaenyx_messages
           WHERE id = ? AND conversation_id = ?`,
        )
        .get(row.source_message_id, row.source_id);
      if (!message) return { available: false, title: source.title };
    }
    return { available: true, title: source.title };
  }
  if (row.source_kind === "task" && row.source_id) {
    const source = database.sqlite
      .prepare(`SELECT title FROM tasks WHERE id = ?`)
      .get(row.source_id) as { title: string } | undefined;
    return source
      ? { available: true, title: source.title }
      : { available: false, title: "Source unavailable" };
  }
  if (row.source_kind === "project_memory" && row.source_id) {
    const source = database.sqlite
      .prepare(`SELECT title FROM project_memories WHERE id = ?`)
      .get(row.source_id) as { title: string } | undefined;
    return source
      ? { available: true, title: source.title }
      : { available: false, title: "Source unavailable" };
  }
  if (row.source_kind === "manual") {
    return { available: true, title: "Added by the Owner" };
  }
  if (row.source_kind === "external") {
    return { available: Boolean(row.source_id), title: "External source" };
  }
  return { available: false, title: "Source unavailable" };
}

function memoryIsVisibleInMode(
  database: DatabaseHandle,
  memoryKind: MemoryKind,
  memoryId: string,
  modeId: string | null,
): boolean {
  if (memoryKind === "fact") {
    return Boolean(
      database.sqlite
        .prepare(`SELECT 1 FROM facts WHERE id = ? AND mode_id IS ?`)
        .get(memoryId, modeId),
    );
  }
  return Boolean(
    database.sqlite
      .prepare(
        `SELECT 1 FROM vaenyx_me_items AS items
         WHERE items.id = ?
           AND EXISTS (
             SELECT 1 FROM memory_provenance AS provenance
             WHERE provenance.memory_kind = 'profile'
               AND provenance.memory_id = items.id
               AND provenance.mode_id IS ?
           )`,
      )
      .get(memoryId, modeId),
  );
}

export function listMemoryProvenance(
  database: DatabaseHandle,
  memoryKind: MemoryKind,
  memoryId: string,
  modeId: string | null,
): MemoryProvenanceView {
  if (!memoryIsVisibleInMode(database, memoryKind, memoryId, modeId)) {
    throw new Error("MEMORY_NOT_FOUND");
  }
  const rows = database.sqlite
    .prepare(
      `SELECT * FROM memory_provenance
       WHERE memory_kind = ? AND memory_id = ? AND mode_id IS ?
         AND removed_at IS NULL
       ORDER BY admitted_at, id`,
    )
    .all(memoryKind, memoryId, modeId) as unknown as ProvenanceRow[];
  return {
    memoryKind,
    memoryId,
    sources: rows.map((row) => {
      const resolved = sourceTitle(database, row);
      const excludable =
        row.source_kind === "conversation" ||
        row.source_kind === "task" ||
        row.source_kind === "project_memory";
      return {
        id: row.id,
        sourceKind: row.source_kind,
        sourceId: row.source_id,
        sourceMessageId: row.source_message_id,
        modeId: row.mode_id,
        projectId: row.project_id,
        admissionEventId: row.admission_event_id,
        admittedAt: row.admitted_at,
        available: resolved.available,
        excluded:
          excludable && row.source_id
            ? isMemorySourceExcluded(
                database,
                row.source_kind as "conversation" | "project_memory" | "task",
                row.source_id,
                row.mode_id,
              )
            : false,
        sourceTitle: resolved.title,
      };
    }),
  };
}

function itemTitle(
  database: DatabaseHandle,
  memoryKind: MemoryKind,
  memoryId: string,
): string | null {
  if (memoryKind === "fact") {
    const row = database.sqlite
      .prepare(
        `SELECT slot, value FROM facts
         WHERE id = ? AND valid_until IS NULL`,
      )
      .get(memoryId) as { slot: string; value: string } | undefined;
    return row ? `${row.slot.replace(/[:_]/g, " ")}: ${row.value}` : null;
  }
  const row = database.sqlite
    .prepare(
      `SELECT title FROM vaenyx_me_items
       WHERE id = ? AND status = 'approved'`,
    )
    .get(memoryId) as { title: string } | undefined;
  return row?.title ?? null;
}

function previewRevision(
  conversationId: string,
  items: ForgetPreviewItem[],
  rows: ProvenanceRow[],
): string {
  const evidence = {
    conversationId,
    items: [...items].sort((left, right) =>
      `${left.memoryKind}:${left.memoryId}`.localeCompare(
        `${right.memoryKind}:${right.memoryId}`,
      ),
    ),
    provenanceIds: rows.map((row) => row.id).sort(),
  };
  return createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
}

export function previewConversationForget(
  database: DatabaseHandle,
  input: {
    conversationId: string;
    modeId: string | null;
    ownerId: string;
    requireArchived?: boolean;
  },
): ConversationForgetPreview {
  const scope = conversationScope(
    database,
    input.conversationId,
    input.ownerId,
    input.modeId,
  );
  if (input.requireArchived && !scope.archived) {
    throw new Error("CONVERSATION_NOT_ARCHIVED");
  }

  const selected = database.sqlite
    .prepare(
      `SELECT * FROM memory_provenance
       WHERE source_kind = 'conversation' AND source_id = ? AND mode_id IS ?
         AND removed_at IS NULL
       ORDER BY memory_kind, memory_id, admitted_at, id`,
    )
    .all(input.conversationId, input.modeId) as unknown as ProvenanceRow[];
  const keys = new Map<string, ProvenanceRow>();
  for (const row of selected)
    keys.set(`${row.memory_kind}:${row.memory_id}`, row);

  const items: ForgetPreviewItem[] = [];
  const revisionRows: ProvenanceRow[] = [];
  for (const selectedRow of keys.values()) {
    const title = itemTitle(
      database,
      selectedRow.memory_kind,
      selectedRow.memory_id,
    );
    if (!title) continue;
    const allRows = database.sqlite
      .prepare(
        `SELECT * FROM memory_provenance
         WHERE memory_kind = ? AND memory_id = ? AND removed_at IS NULL
         ORDER BY admitted_at, id`,
      )
      .all(
        selectedRow.memory_kind,
        selectedRow.memory_id,
      ) as unknown as ProvenanceRow[];
    revisionRows.push(...allRows);
    const hasUnavailable = allRows.some(
      (row) => row.source_kind === "unavailable",
    );
    const hasIndependent = allRows.some(
      (row) =>
        !(
          row.source_kind === "conversation" &&
          row.source_id === input.conversationId
        ) &&
        // Exclusion is prospective: it blocks new learning, but does not erase
        // provenance that was already admitted. That independent source keeps
        // the Memory until the Owner explicitly forgets it too.
        row.source_kind !== "unavailable",
    );
    const reason: ForgetReason = hasUnavailable
      ? "legacy_unavailable"
      : hasIndependent
        ? "independent_source"
        : "selected_source_only";
    items.push({
      memoryKind: selectedRow.memory_kind,
      memoryId: selectedRow.memory_id,
      title,
      outcome: reason === "selected_source_only" ? "forget" : "retain",
      reason,
    });
  }

  const forgettableCount = items.filter(
    (item) => item.outcome === "forget",
  ).length;
  const legacyUnknownCount = items.filter(
    (item) => item.reason === "legacy_unavailable",
  ).length;
  return {
    conversationId: input.conversationId,
    conversationTitle: scope.title,
    items,
    forgettableCount,
    retainedCount: items.length - forgettableCount,
    legacyUnknownCount,
    revision: previewRevision(input.conversationId, items, revisionRows),
  };
}

function forgetProfileItem(
  database: DatabaseHandle,
  memoryId: string,
  now: string,
): void {
  if (memoryId.startsWith("approved-")) {
    database.sqlite
      .prepare(`DELETE FROM vaenyx_me_items WHERE id = ?`)
      .run(memoryId);
    return;
  }
  const baseline = PROFILE_BASELINES[memoryId];
  if (baseline) {
    database.sqlite
      .prepare(
        `UPDATE vaenyx_me_items
         SET category = ?, title = ?, summary = ?, status = 'not_learned',
             evidence = NULL, confidence = 0, updated_at = ?
         WHERE id = ?`,
      )
      .run(baseline.category, baseline.title, baseline.summary, now, memoryId);
    return;
  }
  database.sqlite
    .prepare(
      `UPDATE vaenyx_me_items
       SET status = 'not_learned', evidence = NULL, confidence = 0,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(now, memoryId);
}

function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function forgetMemoryFromConversation(
  database: DatabaseHandle,
  input: {
    action: "conversation_delete_forget" | "source_forget";
    conversationId: string;
    modeId: string | null;
    ownerId: string;
    previewRevision: string;
    requireArchived?: boolean;
    withinTransaction?: boolean;
  },
): ConversationForgetPreview {
  const preview = previewConversationForget(database, input);
  if (preview.revision !== input.previewRevision) {
    throw new Error("MEMORY_PREVIEW_CHANGED");
  }
  const now = new Date().toISOString();
  if (!input.withinTransaction) database.sqlite.exec("BEGIN IMMEDIATE;");
  try {
    for (const item of preview.items) {
      database.sqlite
        .prepare(
          `UPDATE memory_provenance SET removed_at = ?
           WHERE memory_kind = ? AND memory_id = ?
             AND source_kind = 'conversation' AND source_id = ?
             AND mode_id IS ? AND removed_at IS NULL`,
        )
        .run(
          now,
          item.memoryKind,
          item.memoryId,
          input.conversationId,
          input.modeId,
        );
      if (item.outcome === "forget") {
        if (item.memoryKind === "fact") {
          database.sqlite
            .prepare(
              `UPDATE facts SET valid_until = ?
               WHERE id = ? AND valid_until IS NULL`,
            )
            .run(now, item.memoryId);
          database.sqlite
            .prepare(`DELETE FROM fact_search WHERE fact_id = ?`)
            .run(item.memoryId);
        } else {
          forgetProfileItem(database, item.memoryId, now);
        }
      }
      database.sqlite
        .prepare(
          `INSERT INTO memory_forget_events (
             id, action, memory_kind, memory_id_hash, source_id_hash,
             result, reason, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          input.action,
          item.memoryKind,
          hashId(item.memoryId),
          hashId(input.conversationId),
          item.outcome === "forget" ? "forgotten" : "retained",
          item.reason,
          now,
        );
    }
    if (!input.withinTransaction) database.sqlite.exec("COMMIT;");
  } catch (error) {
    if (!input.withinTransaction) database.sqlite.exec("ROLLBACK;");
    throw error;
  }
  return preview;
}
