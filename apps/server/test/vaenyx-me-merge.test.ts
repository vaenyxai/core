// MERGING PROPOSALS WITHOUT LETTING THE MODEL DECIDE ANYTHING.
//
// The model only groups and rephrases; every rule about what may actually be
// merged lives in code, and each of those rules is a refusal. These tests hold
// the refusals, because a merge pass that does less than it could is a mild
// inefficiency — one that merges the wrong things rewrites what the Owner is
// being asked to approve.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  applyTraitMergeGroups,
  listMergeableTraits,
  mergeDuplicateFacts,
  parseTraitMergeGroups,
  type MergeableTrait,
} from "../src/modules/core/vaenyx-me-merge.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-merge-test-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

function trait(id: string, category = "communication"): MergeableTrait {
  return {
    id,
    category,
    title: `title ${id}`,
    summary: `summary ${id}`,
    evidence: `evidence ${id}`,
    confidence: 40,
  };
}

function seed(
  database: DatabaseHandle,
  id: string,
  options: { slot?: string; value?: string; createdAt?: string } = {},
): void {
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_me_candidates
         (id, category, title, proposed_summary, proposed_evidence,
          source_type, confidence, status, created_by,
          proposed_slot, proposed_value, created_at)
       VALUES (?, 'home', ?, 'summary', 'evidence ' || ?, 'chat_history', 40,
               'pending_review', 'owner-1', ?, ?, ?)`,
    )
    .run(
      id,
      id,
      id,
      options.slot ?? null,
      options.value ?? null,
      options.createdAt ?? "2026-08-01 00:00:00",
    );
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("reading the model's grouping without trusting it", () => {
  const pool = [trait("a"), trait("b"), trait("c", "preferences")];

  it("accepts a clean group", () => {
    const groups = parseTraitMergeGroups(
      '{"groups":[{"ids":["a","b"],"title":"Merged","summary":"One sentence."}]}',
      pool,
    );
    expect(groups).toEqual([
      { ids: ["a", "b"], title: "Merged", summary: "One sentence." },
    ]);
  });

  it("🔴 refuses a group that mixes categories", () => {
    // "The same thing" across categories is the model overreaching, not a
    // duplicate — blending them would rewrite what is being proposed.
    const groups = parseTraitMergeGroups(
      '{"groups":[{"ids":["a","c"],"title":"X","summary":"Y"}]}',
      pool,
    );
    expect(groups).toEqual([]);
  });

  it("refuses invented ids, twice-claimed ids, and groups of one", () => {
    expect(
      parseTraitMergeGroups(
        '{"groups":[{"ids":["a","ghost"],"title":"X","summary":"Y"}]}',
        pool,
      ),
    ).toEqual([]);
    expect(
      parseTraitMergeGroups(
        '{"groups":[{"ids":["a","b"],"title":"X","summary":"Y"},{"ids":["b","a"],"title":"Z","summary":"W"}]}',
        pool,
      ),
    ).toHaveLength(1);
  });

  it("answers junk with nothing rather than with a guess", () => {
    expect(parseTraitMergeGroups("no json here", pool)).toEqual([]);
    expect(parseTraitMergeGroups('{"groups":"what"}', pool)).toEqual([]);
  });
});

describe("folding a group into one proposal", () => {
  it("keeps every member's evidence verbatim and retires the members", () => {
    // The quotes are the Owner's own words — the one part of a proposal that
    // must never be paraphrased, because they are the reason to believe it.
    const database = testDatabase();
    seed(database, "a");
    seed(database, "b");
    const traits = listMergeableTraits(database, null);
    const merged = applyTraitMergeGroups(
      database,
      [{ ids: ["a", "b"], title: "Merged", summary: "One." }],
      traits,
      null,
      "owner-1",
    );
    expect(merged).toBe(1);

    const pending = database.sqlite
      .prepare(
        `SELECT id, proposed_evidence FROM vaenyx_me_candidates
          WHERE status = 'pending_review'`,
      )
      .all() as { id: string; proposed_evidence: string }[];
    expect(pending).toHaveLength(1);
    expect(pending[0]?.proposed_evidence).toContain("evidence a");
    expect(pending[0]?.proposed_evidence).toContain("evidence b");
  });

  it("🔴 retires members by status, never by DELETE", () => {
    // The scan's already-looked-at-this-conversation check reads source_id off
    // every row REGARDLESS of status. A hard delete would invite the scan to
    // re-propose the very thing that was just merged away.
    const database = testDatabase();
    seed(database, "a");
    seed(database, "b");
    applyTraitMergeGroups(
      database,
      [{ ids: ["a", "b"], title: "M", summary: "S" }],
      listMergeableTraits(database, null),
      null,
      "owner-1",
    );
    const rows = database.sqlite
      .prepare(
        `SELECT status FROM vaenyx_me_candidates WHERE id IN ('a','b')`,
      )
      .all() as { status: string }[];
    expect(rows.map((row) => row.status)).toEqual(["deleted", "deleted"]);
  });
});

describe("fact duplicates, which need no model", () => {
  it("keeps the newest of an identical slot + value pair", () => {
    const database = testDatabase();
    seed(database, "old", {
      slot: "home.address",
      value: "12 X St",
      createdAt: "2026-08-01 00:00:00",
    });
    seed(database, "new", {
      slot: "home.address",
      value: "12 X St",
      createdAt: "2026-08-05 00:00:00",
    });
    expect(mergeDuplicateFacts(database, null)).toBe(1);
    const pending = database.sqlite
      .prepare(
        `SELECT id FROM vaenyx_me_candidates
          WHERE status = 'pending_review' AND proposed_slot IS NOT NULL`,
      )
      .all() as { id: string }[];
    expect(pending.map((row) => row.id)).toEqual(["new"]);
  });

  it("🔴 leaves a same-slot conflict as two items", () => {
    // Two values for one slot is a disagreement for the Owner to settle.
    // Hiding one side of it would be deciding it for them.
    const database = testDatabase();
    seed(database, "a", { slot: "home.address", value: "12 X St" });
    seed(database, "b", { slot: "home.address", value: "9 Y Rd" });
    expect(mergeDuplicateFacts(database, null)).toBe(0);
  });
});
