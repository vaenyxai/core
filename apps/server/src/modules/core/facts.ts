// THE FACTS TABLE, and the rules that make it worth having.
//
// Four of them, and each exists because the obvious shortcut is measurably
// worse:
//
//  1. SQL DECIDES WHAT IS CURRENT. `WHERE valid_until IS NULL`, and superseding
//     is a timestamp comparison in recordFact below. A model is never asked
//     which of two facts is newer. It has no clock, it prefers fluent text to
//     recent text, and it degrades as context grows; `>` does not.
//  2. NOTHING IS UPDATED OR DELETED. A fact that stops being true gets a
//     valid_until and its replacement points back at it. That is what lets the
//     Owner ask what was true in March, and what lets every current answer name
//     the message it came from.
//  3. ISOLATION IS A WHERE CLAUSE. Every read takes a modeId and filters on it
//     in SQL. Not a sentence in a prompt asking the model to be careful — one
//     household member's medication must not surface in another's chat, and a
//     rule that lives in a prompt is a rule that leaks.
//  4. EXTERNAL CONTENT IS MARKED AND QUARANTINED. Anything that arrived through
//     the web or out of a file is source_kind 'external', can never be written
//     as an approved fact by the extractor, and carries the URL it came from.
import { randomUUID } from "node:crypto";

import type { DatabaseHandle } from "../../db/database.js";
import { isKnownFactSlot } from "./fact-slots.js";
import {
  addMemoryProvenance,
  type MemoryAdmissionSource,
} from "./memory-provenance.js";
import { indexableText, matchQuery } from "./text-index.js";

export type FactSourceKind = "external" | "manual" | "owner";

export interface Fact {
  confidence: number;
  eventTime: string | null;
  id: string;
  modeId: string | null;
  recordedAt: string;
  slot: string;
  sourceConversationId: string | null;
  sourceDetail: string | null;
  sourceKind: FactSourceKind;
  sourceMessageId: string | null;
  supersedesId: string | null;
  validUntil: string | null;
  value: string;
}

interface FactRow {
  confidence: number;
  event_time: string | null;
  id: string;
  mode_id: string | null;
  recorded_at: string;
  slot: string;
  source_conversation_id: string | null;
  source_detail: string | null;
  source_kind: string;
  source_message_id: string | null;
  supersedes_id: string | null;
  valid_until: string | null;
  value: string;
}

function toFact(row: FactRow): Fact {
  return {
    confidence: row.confidence,
    eventTime: row.event_time,
    id: row.id,
    modeId: row.mode_id,
    recordedAt: row.recorded_at,
    slot: row.slot,
    sourceConversationId: row.source_conversation_id,
    sourceDetail: row.source_detail,
    sourceKind: row.source_kind as FactSourceKind,
    sourceMessageId: row.source_message_id,
    supersedesId: row.supersedes_id,
    validUntil: row.valid_until,
    value: row.value,
  };
}

export class UnknownFactSlotError extends Error {
  constructor(slot: string) {
    super(`FACT_SLOT_UNKNOWN:${slot}`);
    this.name = "UnknownFactSlotError";
  }
}

export interface RecordFactInput {
  admissionEventId?: string;
  confidence?: number;
  /** When it was true in the world. Partial is fine: "2025-03", "2025". */
  eventTime?: string | null;
  modeId?: string | null;
  /** Defaults to now; injectable so the ordering rule can be tested. */
  recordedAt?: string;
  provenanceSources?: MemoryAdmissionSource[];
  slot: string;
  sourceConversationId?: string | null;
  sourceDetail?: string | null;
  sourceKind?: FactSourceKind;
  sourceMessageId?: string | null;
  value: string;
  withinTransaction?: boolean;
}

/**
 * Write a fact, retiring whatever this slot said before.
 *
 * 🔴 THE ORDERING RULE, which is the point of the whole table: an arriving
 * fact only supersedes the current one when it was RECORDED later. A fact
 * imported out of order — an old backup restored, a task run that finished
 * late — does not get to overwrite something newer just by arriving after it.
 * It is still stored, with its valid_until already set, so the history stays
 * complete and the current answer stays right.
 */
export function recordFact(
  database: DatabaseHandle,
  input: RecordFactInput,
): Fact {
  if (!isKnownFactSlot(input.slot)) throw new UnknownFactSlotError(input.slot);
  const value = input.value.trim();
  if (!value) throw new Error("FACT_VALUE_EMPTY");

  const modeId = input.modeId ?? null;
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const id = randomUUID();
  const sources: MemoryAdmissionSource[] = input.provenanceSources ?? [
    input.sourceConversationId
      ? {
          sourceKind: "conversation",
          sourceId: input.sourceConversationId,
          sourceMessageId: input.sourceMessageId ?? null,
        }
      : input.sourceKind === "external"
        ? { sourceKind: "external", sourceId: input.sourceDetail ?? null }
        : { sourceKind: "manual" },
  ];
  const ownsTransaction = !input.withinTransaction;
  if (ownsTransaction) database.sqlite.exec("BEGIN IMMEDIATE;");

  try {
    const current = currentFactRow(database, input.slot, modeId);
    // Same value, same slot, still current: preserve the new independent
    // source even though there is deliberately no duplicate fact row.
    if (current && current.value === value) {
      addMemoryProvenance(database, {
        memoryKind: "fact",
        memoryId: current.id,
        modeId,
        sources,
        admissionEventId: input.admissionEventId ?? `fact:${current.id}`,
        admittedAt: recordedAt,
      });
      if (ownsTransaction) database.sqlite.exec("COMMIT;");
      return toFact(current);
    }

    const supersedes =
      current && current.recorded_at <= recordedAt ? current : null;
    const stale = Boolean(current) && !supersedes;

    database.sqlite
      .prepare(
        `INSERT INTO facts (
         id, mode_id, slot, value, event_time, recorded_at, valid_until,
         supersedes_id, source_message_id, source_conversation_id,
         source_kind, source_detail, confidence
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        modeId,
        input.slot,
        value,
        input.eventTime ?? null,
        recordedAt,
        // Arrived out of order: file it as already-retired rather than let it
        // shadow the newer truth.
        stale ? recordedAt : null,
        supersedes ? supersedes.id : null,
        input.sourceMessageId ?? null,
        input.sourceConversationId ?? null,
        input.sourceKind ?? "owner",
        input.sourceDetail ?? null,
        input.confidence ?? 0.5,
      );

    addMemoryProvenance(database, {
      memoryKind: "fact",
      memoryId: id,
      modeId,
      sources,
      admissionEventId: input.admissionEventId ?? `fact:${id}`,
      admittedAt: recordedAt,
    });

    if (supersedes) {
      database.sqlite
        .prepare(`UPDATE facts SET valid_until = ? WHERE id = ?`)
        .run(recordedAt, supersedes.id);
      // The retired row leaves the keyword index: search answers "what does
      // Vaenyx know", not "what did it once believe".
      database.sqlite
        .prepare(`DELETE FROM fact_search WHERE fact_id = ?`)
        .run(supersedes.id);
    }

    if (!stale) indexFact(database, id, modeId, input.slot, value);

    const row = database.sqlite
      .prepare(`SELECT * FROM facts WHERE id = ?`)
      .get(id) as unknown as FactRow;
    if (ownsTransaction) database.sqlite.exec("COMMIT;");
    return toFact(row);
  } catch (error) {
    if (ownsTransaction) database.sqlite.exec("ROLLBACK;");
    throw error;
  }
}

// The sandbox filter, written once. Same shape as project_memories (0042):
// User Mode is NULL and sees only NULL, a Custom Mode sees only its own.
// Parameterised rather than interpolated so there is one statement shape to
// reason about and no way to build a clause that quietly matches everything.
const MODE_CLAUSE = `((? IS NULL AND facts.mode_id IS NULL) OR facts.mode_id = ?)`;

function currentFactRow(
  database: DatabaseHandle,
  slot: string,
  modeId: string | null,
): FactRow | null {
  const row = database.sqlite
    .prepare(
      `SELECT * FROM facts
        WHERE slot = ? AND valid_until IS NULL AND ${MODE_CLAUSE}
        ORDER BY recorded_at DESC LIMIT 1`,
    )
    .get(slot, modeId, modeId) as unknown as FactRow | undefined;
  return row ?? null;
}

function indexFact(
  database: DatabaseHandle,
  factId: string,
  modeId: string | null,
  slot: string,
  value: string,
): void {
  // The slot name goes in beside the value so searching "address" finds the
  // address, not only its text.
  const body = indexableText(`${slot.replace(/[:_]/g, " ")} ${value}`);
  database.sqlite
    .prepare(
      `INSERT INTO fact_search (fact_id, mode_id, body) VALUES (?, ?, ?)`,
    )
    .run(factId, modeId ?? "", body);
}

/** Everything true right now, for one mode. The chat turn's read. */
export function listCurrentFacts(
  database: DatabaseHandle,
  modeId: string | null = null,
): Fact[] {
  const rows = database.sqlite
    .prepare(
      `SELECT * FROM facts
        WHERE valid_until IS NULL AND ${MODE_CLAUSE}
        ORDER BY slot ASC`,
    )
    .all(modeId, modeId) as unknown as FactRow[];
  return rows.map(toFact);
}

/** Everything this slot has ever been, newest first — the "where did I live
 *  in March" read. */
export function listFactHistory(
  database: DatabaseHandle,
  slot: string,
  modeId: string | null = null,
): Fact[] {
  const rows = database.sqlite
    .prepare(
      `SELECT * FROM facts
        WHERE slot = ? AND ${MODE_CLAUSE}
        ORDER BY recorded_at DESC`,
    )
    .all(slot, modeId, modeId) as unknown as FactRow[];
  return rows.map(toFact);
}

/**
 * Keyword search over current facts. No model, no vectors: the query goes
 * through the same tokeniser the rows did, which is the only reason Chinese
 * works at all here.
 */
export function searchFacts(
  database: DatabaseHandle,
  query: string,
  modeId: string | null = null,
  limit = 20,
): Fact[] {
  const match = matchQuery(query);
  if (!match) return [];
  const rows = database.sqlite
    .prepare(
      `SELECT facts.* FROM fact_search
         JOIN facts ON facts.id = fact_search.fact_id
        WHERE fact_search MATCH ?
          AND fact_search.mode_id = ?
          AND facts.valid_until IS NULL
        ORDER BY bm25(fact_search)
        LIMIT ?`,
    )
    .all(match, modeId ?? "", limit) as unknown as FactRow[];
  return rows.map(toFact);
}

/**
 * Retire a fact by hand — the Owner deleting something from the Vaenyx Me
 * screen. Still not a DELETE: the row stays, so "Vaenyx forgot that on
 * Tuesday" remains answerable and an approved fact can never vanish without
 * a trace.
 */
export function retireFact(
  database: DatabaseHandle,
  factId: string,
  when = new Date().toISOString(),
): boolean {
  const changes = database.sqlite
    .prepare(
      `UPDATE facts SET valid_until = ? WHERE id = ? AND valid_until IS NULL`,
    )
    .run(when, factId).changes;
  if (changes) {
    database.sqlite
      .prepare(`DELETE FROM fact_search WHERE fact_id = ?`)
      .run(factId);
  }
  return changes > 0;
}

/**
 * What the model is shown. Kept deliberately small and flat: this is the block
 * that goes into every turn, so it is a list of what is true, not an essay.
 * Externally-sourced facts say so on their own line — if one ever does get
 * approved, the model should treat it as a claim someone else made.
 */
export function formatFactsContext(facts: Fact[]): string | null {
  if (facts.length === 0) return null;
  const lines = facts.map((fact) => {
    const when = fact.eventTime ? ` (since ${fact.eventTime})` : "";
    const from =
      fact.sourceKind === "external"
        ? ` [from ${fact.sourceDetail ?? "an outside source"}, not the Owner]`
        : "";
    return `- ${fact.slot}: ${fact.value}${when}${from}`;
  });
  return [
    "What Vaenyx knows about the Owner (current values, kept up to date):",
    ...lines,
  ].join("\n");
}
