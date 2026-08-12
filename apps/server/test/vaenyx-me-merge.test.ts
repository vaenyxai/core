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
  applyCondensed,
  applyTraitMergeGroups,
  dominantLanguage,
  listMergeableTraits,
  listOverlongEvidence,
  listPendingBriefs,
  listPendingFactBriefs,
  listPendingTraitBriefs,
  listSameSlotFactPairs,
  mergeDuplicateFacts,
  parseCondensed,
  parseCoveredIds,
  parseSameFactPairs,
  parseTraitFactPairs,
  parseTraitMergeGroups,
  readCandidateSources,
  retireCovered,
  retireOlderFactTwins,
  retireTraitsOverFacts,
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
      {
        ids: ["a", "b"],
        title: "Merged",
        summary: "One sentence.",
        evidence: [],
      },
    ]);
  });

  it("sanitises evidence points: bullets stripped, duplicates dropped, four at most", () => {
    const groups = parseTraitMergeGroups(
      '{"groups":[{"ids":["a","b"],"title":"M","summary":"S","evidence":["- one","one","• two",3,"three","four","five"]}]}',
      pool,
    );
    expect(groups[0]?.evidence).toEqual(["one", "two", "three", "four"]);
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
  it("stores the model's deduped points, one '- ' line each", () => {
    const database = testDatabase();
    seed(database, "a");
    seed(database, "b");
    const merged = applyTraitMergeGroups(
      database,
      [
        {
          ids: ["a", "b"],
          title: "Merged",
          summary: "One.",
          evidence: ["short point", "other point"],
        },
      ],
      listMergeableTraits(database, null),
      null,
      "owner-1",
    );
    expect(merged).toBe(1);
    const pending = database.sqlite
      .prepare(
        `SELECT proposed_evidence FROM vaenyx_me_candidates
          WHERE status = 'pending_review'`,
      )
      .get() as { proposed_evidence: string };
    expect(pending.proposed_evidence).toBe("- short point\n- other point");
  });

  it("falls back to the members' own lines, deduped, when the model gave none", () => {
    // A merge must never fail for want of polish — and never repeat itself:
    // repetition is the very thing the merge exists to remove.
    const database = testDatabase();
    seed(database, "a");
    seed(database, "b");
    const traits = listMergeableTraits(database, null);
    applyTraitMergeGroups(
      database,
      [{ ids: ["a", "b"], title: "Merged", summary: "One.", evidence: [] }],
      traits,
      null,
      "owner-1",
    );
    const pending = database.sqlite
      .prepare(
        `SELECT proposed_evidence FROM vaenyx_me_candidates
          WHERE status = 'pending_review'`,
      )
      .get() as { proposed_evidence: string };
    expect(pending.proposed_evidence).toBe("- evidence a\n- evidence b");
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
      [{ ids: ["a", "b"], title: "M", summary: "S", evidence: [] }],
      listMergeableTraits(database, null),
      null,
      "owner-1",
    );
    const rows = database.sqlite
      .prepare(`SELECT status FROM vaenyx_me_candidates WHERE id IN ('a','b')`)
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

describe("same-slot fact twins, judged one narrow question at a time", () => {
  it("pairs newest-with-next within one slot, and never across slots", () => {
    const database = testDatabase();
    seed(database, "n1", {
      slot: "preference:news",
      value: "daily AI news",
      createdAt: "2026-08-08 00:00:00",
    });
    seed(database, "n2", {
      slot: "preference:news",
      value: "AI news every morning",
      createdAt: "2026-08-01 00:00:00",
    });
    seed(database, "addr", {
      slot: "home.address",
      value: "12 X St",
      createdAt: "2026-08-05 00:00:00",
    });
    const pairs = listSameSlotFactPairs(database, null);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.newerId).toBe("n1");
    expect(pairs[0]?.olderId).toBe("n2");
  });

  it("reads verdicts by pair number, refusing junk", () => {
    const pairs = [
      {
        slot: "s",
        newerId: "a",
        olderId: "b",
        newerValue: "x",
        olderValue: "y",
      },
    ];
    expect(parseSameFactPairs('{"same":[1]}', pairs)).toHaveLength(1);
    expect(parseSameFactPairs('{"same":[2]}', pairs)).toHaveLength(0);
    expect(parseSameFactPairs('{"same":"yes"}', pairs)).toHaveLength(0);
    expect(parseSameFactPairs("no json", pairs)).toHaveLength(0);
  });

  it("🔴 retires the OLDER of a same-meaning pair, never the newer", () => {
    const database = testDatabase();
    seed(database, "n1", { slot: "preference:news", value: "daily AI news" });
    seed(database, "n2", {
      slot: "preference:news",
      value: "AI news every morning",
      createdAt: "2026-07-01 00:00:00",
    });
    const pairs = listSameSlotFactPairs(database, null);
    expect(retireOlderFactTwins(database, pairs)).toBe(1);
    const statuses = database.sqlite
      .prepare(`SELECT id, status FROM vaenyx_me_candidates ORDER BY id`)
      .all() as { id: string; status: string }[];
    expect(statuses).toEqual([
      { id: "n1", status: "pending_review" },
      { id: "n2", status: "deleted" },
    ]);
  });
});

describe("restatements of approved knowledge ask nothing new", () => {
  it("validates covered ids against the pending list, deduped", () => {
    const pending = [
      { id: "p1", text: "one" },
      { id: "p2", text: "two" },
    ];
    expect(parseCoveredIds('{"covered":["p2","p2","ghost"]}', pending)).toEqual(
      ["p2"],
    );
    expect(parseCoveredIds('{"covered":"p1"}', pending)).toEqual([]);
    expect(parseCoveredIds("junk", pending)).toEqual([]);
  });

  it("retires only rows that are still waiting", () => {
    const database = testDatabase();
    seed(database, "p1");
    seed(database, "p2");
    database.sqlite
      .prepare(
        `UPDATE vaenyx_me_candidates SET status='approved' WHERE id='p2'`,
      )
      .run();
    expect(retireCovered(database, ["p1", "p2"])).toBe(1);
    const note = database.sqlite
      .prepare(`SELECT review_note FROM vaenyx_me_candidates WHERE id='p1'`)
      .get() as { review_note: string };
    expect(note.review_note).toBe("Already in the approved profile.");
  });

  it("briefs a fact as slot = value and a trait as title: summary", () => {
    const database = testDatabase();
    seed(database, "f", { slot: "home.address", value: "12 X St" });
    seed(database, "t");
    const texts = listPendingBriefs(database, null)
      .map((entry) => entry.text)
      .sort();
    expect(texts).toEqual(["home.address = 12 X St", "t: summary"]);
  });

  it("🔴 a trait covered by a pending fact retires; the fact never does", () => {
    // The fact is the stronger, structured form — the pairs are validated
    // both ways (trait must be a trait, fact must be a fact), so the model
    // can never retire a fact, and the fact inherits the trait's citation.
    const database = testDatabase();
    seed(database, "fact1", {
      slot: "alerts.rates",
      value: "notify on change",
    });
    seed(database, "trait1");
    const traits = listPendingTraitBriefs(database, null);
    const facts = listPendingFactBriefs(database, null);
    expect(
      parseTraitFactPairs(
        '{"covered":[{"trait":"fact1","fact":"trait1"}]}',
        traits,
        facts,
      ),
    ).toEqual([]);
    const pairs = parseTraitFactPairs(
      '{"covered":[{"trait":"trait1","fact":"fact1"}]}',
      traits,
      facts,
    );
    expect(retireTraitsOverFacts(database, pairs)).toBe(1);
    const rows = database.sqlite
      .prepare(
        `SELECT id, status, review_note FROM vaenyx_me_candidates ORDER BY id`,
      )
      .all() as { id: string; status: string; review_note: string | null }[];
    expect(rows).toEqual([
      {
        id: "fact1",
        status: "pending_review",
        review_note: null,
      },
      {
        id: "trait1",
        status: "deleted",
        review_note: "Same as a pending fact.",
      },
    ]);
    // The surviving fact now cites the trait's grounds too.
    const quotes = readCandidateSources(database, "fact1").map(
      (source) => source.quote,
    );
    expect(quotes).toContain("evidence trait1");
  });
});

describe("citations travel with merges", () => {
  it("a merged trait card carries every member's sources, deduped", () => {
    const database = testDatabase();
    seed(database, "a");
    seed(database, "b");
    applyTraitMergeGroups(
      database,
      [{ ids: ["a", "b"], title: "M", summary: "S", evidence: ["point"] }],
      listMergeableTraits(database, null),
      null,
      "owner-1",
    );
    const quotes = readCandidateSources(database, "merged-a").map(
      (source) => source.quote,
    );
    expect(quotes.sort()).toEqual(["evidence a", "evidence b"]);
  });

  it("the newest fact twin inherits the older twin's citation", () => {
    const database = testDatabase();
    seed(database, "n1", { slot: "preference:news", value: "daily AI news" });
    seed(database, "n2", {
      slot: "preference:news",
      value: "AI news every morning",
      createdAt: "2026-07-01 00:00:00",
    });
    retireOlderFactTwins(database, listSameSlotFactPairs(database, null));
    const quotes = readCandidateSources(database, "n1").map(
      (source) => source.quote,
    );
    expect(quotes.sort()).toEqual(["evidence n1", "evidence n2"]);
  });

  it("rows from before the column synthesize sources from their evidence", () => {
    const database = testDatabase();
    seed(database, "old");
    expect(readCandidateSources(database, "old")).toEqual([
      { quote: "evidence old", conversationId: null },
    ]);
  });
});

describe("evidence hygiene: walls become points", () => {
  it("picks walls only: long evidence, many lines, or a long claim", () => {
    const database = testDatabase();
    seed(database, "wall");
    database.sqlite
      .prepare(
        `UPDATE vaenyx_me_candidates SET proposed_evidence = ? WHERE id = ?`,
      )
      .run(`They said the same thing five ways. `.repeat(12), "wall");
    seed(database, "longclaim");
    database.sqlite
      .prepare(
        `UPDATE vaenyx_me_candidates SET proposed_summary = ? WHERE id = ?`,
      )
      .run(`A claim that never lands on a full stop `.repeat(8), "longclaim");
    seed(database, "fine");
    const walls = listOverlongEvidence(database, null);
    expect(walls.map((row) => row.id).sort()).toEqual(["longclaim", "wall"]);
  });

  it("writes back whichever halves came out clean, refusing an empty answer", () => {
    const database = testDatabase();
    seed(database, "a");
    expect(applyCondensed(database, "a", { summary: null, points: [] })).toBe(
      false,
    );
    expect(
      applyCondensed(database, "a", {
        summary: "Short claim.",
        points: ["one", "two"],
      }),
    ).toBe(true);
    const row = database.sqlite
      .prepare(
        `SELECT proposed_evidence, proposed_summary
           FROM vaenyx_me_candidates WHERE id = 'a'`,
      )
      .get() as { proposed_evidence: string; proposed_summary: string };
    expect(row.proposed_evidence).toBe("- one\n- two");
    expect(row.proposed_summary).toBe("Short claim.");
  });

  it("reads the model's answer with the same refusal posture as groups", () => {
    expect(
      parseCondensed('{"summary":" S. ","points":["- a","a","b"]}'),
    ).toEqual({ summary: "S.", points: ["a", "b"] });
    expect(parseCondensed("no json")).toEqual({ summary: null, points: [] });
    expect(parseCondensed('{"points":"wall"}')).toEqual({
      summary: null,
      points: [],
    });
  });

  it("🔴 hears Chinese through an English wrapper", () => {
    // Legacy evidence describes Chinese chats in English with the Owner's own
    // words quoted inside — those quoted characters decide the language, so
    // the condensed points come back in the language of the conversation.
    expect(
      dominantLanguage(
        "The Owner asked in Chinese: 该请求本身使用中文,并明确要求用中文简单介绍。",
      ),
    ).toBe("zh");
    expect(dominantLanguage("Short answers, always in English.")).toBe("en");
  });
});
