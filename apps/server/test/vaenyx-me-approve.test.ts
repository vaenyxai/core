// Approving a second insight about the same part of a person must not delete
// the first. It used to, silently, and the Owner had already approved it.
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

import type { DatabaseHandle } from "../src/db/database.js";
import {
  approveVaenyxMeCandidate,
  createVaenyxMeCandidate,
} from "../src/modules/core/vaenyx-me.js";

let database: DatabaseHandle;

function freshDatabase(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE vaenyx_me_items (
      id TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_learned',
      evidence TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      mode_id TEXT
    );
    CREATE TABLE vaenyx_me_candidates (
      id TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      proposed_summary TEXT NOT NULL,
      proposed_evidence TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'owner_manual',
      source_id TEXT,
      confidence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending_review',
      review_note TEXT,
      created_by TEXT NOT NULL,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      proposed_slot TEXT,
      proposed_value TEXT,
      proposed_event_time TEXT,
      mode_id TEXT,
      sources_json TEXT
    );

    -- The inbox's reference record (0069): candidate creation writes into it,
    -- so this hand-built schema has to carry it too.
    CREATE TABLE inbox_items (
      id TEXT PRIMARY KEY NOT NULL,
      mode_id TEXT,
      source_kind TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE memory_provenance (
      id TEXT PRIMARY KEY NOT NULL, memory_kind TEXT NOT NULL,
      memory_id TEXT NOT NULL, source_kind TEXT NOT NULL, source_id TEXT,
      source_message_id TEXT, mode_id TEXT, project_id TEXT,
      admission_event_id TEXT NOT NULL, admitted_at TEXT NOT NULL,
      removed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX memory_provenance_identity_index ON memory_provenance (
      memory_kind, memory_id, source_kind, COALESCE(source_id, ''),
      COALESCE(source_message_id, ''), admission_event_id
    );
  `);
  // The shipped starting shape: one placeholder per category, unlearned.
  sqlite
    .prepare(
      `INSERT INTO vaenyx_me_items (id, category, title, summary, status, sort_order)
       VALUES ('seed-communication', 'communication', 'How I like to be talked to', '', 'not_learned', 10)`,
    )
    .run();
  return { close: () => sqlite.close(), ping: () => true, sqlite };
}

function propose(summary: string): string {
  return createVaenyxMeCandidate(
    database,
    {
      category: "communication",
      title: summary,
      proposedSummary: summary,
      proposedEvidence: "said so in a chat",
      confidence: 80,
    },
    "owner-1",
  ).id;
}

function approve(candidateId: string, summary: string): string {
  return approveVaenyxMeCandidate(
    database,
    candidateId,
    {
      title: summary,
      summary,
      evidence: "said so in a chat",
      confidence: 80,
    },
    "owner-1",
    null,
  ).itemId;
}

beforeEach(() => {
  database = freshDatabase();
});

describe("approving what Vaenyx worked out about you", () => {
  it("fills the empty placeholder for its category", () => {
    const itemId = approve(
      propose("Prefers short answers"),
      "Prefers short answers",
    );
    expect(itemId).toBe("seed-communication");
    const rows = database.sqlite
      .prepare(
        `SELECT status, summary FROM vaenyx_me_items WHERE category = 'communication'`,
      )
      .all() as unknown as { status: string; summary: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("approved");
  });

  it("does not overwrite a second approval onto the first", () => {
    // 🔴 THE BUG. The query took the first row in the category whatever its
    // state, so a second approval landed on top of an insight the Owner had
    // already accepted — gone, with no record it had ever existed.
    approve(propose("Prefers short answers"), "Prefers short answers");
    approve(
      propose("Dislikes being asked twice"),
      "Dislikes being asked twice",
    );

    const rows = database.sqlite
      .prepare(
        `SELECT summary FROM vaenyx_me_items
          WHERE category = 'communication' AND status = 'approved'
          ORDER BY summary`,
      )
      .all() as unknown as { summary: string }[];
    expect(rows.map((row) => row.summary)).toEqual([
      "Dislikes being asked twice",
      "Prefers short answers",
    ]);
  });

  it("refuses to approve the same candidate twice", () => {
    const candidateId = propose("Prefers short answers");
    approve(candidateId, "Prefers short answers");
    expect(() => approve(candidateId, "Prefers short answers")).toThrow(
      "VAENYX_ME_CANDIDATE_NOT_PENDING",
    );
  });
});
