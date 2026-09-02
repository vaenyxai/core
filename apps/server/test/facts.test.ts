// The bitemporal facts table. Every test here holds a rule that a plausible
// "simplification" would remove, so each one says which.
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

import type { DatabaseHandle } from "../src/db/database.js";
import { isKnownFactSlot } from "../src/modules/core/fact-slots.js";
import {
  formatFactsContext,
  listCurrentFacts,
  listFactHistory,
  recordFact,
  retireFact,
  searchFacts,
  UnknownFactSlotError,
} from "../src/modules/core/facts.js";
import {
  hasFullIcu,
  indexableText,
  matchQuery,
  segmentWords,
} from "../src/modules/core/text-index.js";

let database: DatabaseHandle;

// The two tables out of 0058, plus the one foreign key target the facts rows
// point at. Built by hand rather than by running every migration, so a failure
// here is about facts and not about migration 0007.
function freshDatabase(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE ask_vaenyx_conversations (id TEXT PRIMARY KEY NOT NULL);
    CREATE TABLE ask_vaenyx_messages (id TEXT PRIMARY KEY NOT NULL);
    CREATE TABLE facts (
      id TEXT PRIMARY KEY NOT NULL,
      mode_id TEXT,
      slot TEXT NOT NULL,
      value TEXT NOT NULL,
      event_time TEXT,
      recorded_at TEXT NOT NULL,
      valid_until TEXT,
      supersedes_id TEXT REFERENCES facts(id) ON DELETE SET NULL,
      source_message_id TEXT REFERENCES ask_vaenyx_messages(id) ON DELETE SET NULL,
      source_conversation_id TEXT REFERENCES ask_vaenyx_conversations(id) ON DELETE SET NULL,
      source_kind TEXT NOT NULL DEFAULT 'owner',
      source_detail TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      model_id TEXT,
      dim INTEGER,
      content_hash TEXT
    );
    CREATE VIRTUAL TABLE fact_search USING fts5(
      fact_id UNINDEXED, mode_id UNINDEXED, body, tokenize = 'unicode61'
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
  return { close: () => sqlite.close(), ping: () => true, sqlite };
}

beforeEach(() => {
  database = freshDatabase();
});

describe("what is true now", () => {
  it("replaces a value and keeps the one it replaced", () => {
    recordFact(database, {
      slot: "home_address",
      value: "12 Old Street",
      recordedAt: "2026-01-01T00:00:00.000Z",
      eventTime: "2019",
    });
    recordFact(database, {
      slot: "home_address",
      value: "44 New Road",
      recordedAt: "2026-08-01T00:00:00.000Z",
      eventTime: "2025-03",
    });

    const current = listCurrentFacts(database);
    expect(current).toHaveLength(1);
    expect(current[0]?.value).toBe("44 New Road");

    // The old address is not gone — it is dated. "Where did I live in March"
    // is only answerable because nothing here is ever deleted.
    const history = listFactHistory(database, "home_address");
    expect(history).toHaveLength(2);
    const old = history.find((fact) => fact.value === "12 Old Street");
    expect(old?.validUntil).toBe("2026-08-01T00:00:00.000Z");
    expect(history[0]?.supersedesId).toBe(old?.id);
  });

  it("does not let a late arrival overwrite something newer", () => {
    // 🔴 The rule the whole table exists for. A fact restored from an old
    // backup, or a task run that finished late, arrives AFTER the newer truth.
    // Deciding by arrival order would silently move the Owner back to their
    // old address; deciding by recorded_at cannot.
    recordFact(database, {
      slot: "home_address",
      value: "44 New Road",
      recordedAt: "2026-08-01T00:00:00.000Z",
    });
    recordFact(database, {
      slot: "home_address",
      value: "12 Old Street",
      recordedAt: "2026-01-01T00:00:00.000Z",
    });

    const current = listCurrentFacts(database);
    expect(current).toHaveLength(1);
    expect(current[0]?.value).toBe("44 New Road");
    // Stored anyway, already retired: the history stays complete.
    expect(listFactHistory(database, "home_address")).toHaveLength(2);
  });

  it("writes nothing when the value has not changed", () => {
    // An extractor that runs every night must not turn one unchanged address
    // into a hundred rows of identical history.
    recordFact(database, { slot: "school", value: "Ashgrove Primary" });
    recordFact(database, { slot: "school", value: "Ashgrove Primary" });
    expect(listFactHistory(database, "school")).toHaveLength(1);
  });

  it("refuses a slot that is not in the vocabulary", () => {
    // The extractor proposes slots. A vocabulary that grows on the model's
    // say-so is a free-form vocabulary with extra steps.
    expect(() =>
      recordFact(database, { slot: "favourite_dinosaur", value: "stegosaur" }),
    ).toThrow(UnknownFactSlotError);
    expect(isKnownFactSlot("preference:coffee")).toBe(true);
    expect(isKnownFactSlot("relationship:daughter")).toBe(true);
    expect(isKnownFactSlot("nonsense:thing")).toBe(false);
    expect(isKnownFactSlot("preference:")).toBe(false);
  });

  it("retires a fact without deleting it", () => {
    const fact = recordFact(database, {
      slot: "pet",
      value: "a cat called Mo",
    });
    expect(retireFact(database, fact.id, "2026-08-08T00:00:00.000Z")).toBe(
      true,
    );
    expect(listCurrentFacts(database)).toHaveLength(0);
    expect(listFactHistory(database, "pet")).toHaveLength(1);
    expect(searchFacts(database, "cat")).toHaveLength(0);
  });
});

describe("one household, separate memories", () => {
  it("keeps a mode's facts out of another mode's reads", () => {
    // 🔴 Enforced by the WHERE clause, not by asking the model to be careful.
    // A parent's medication must not surface in a child's chat, and a rule
    // that lives in a prompt is a rule that leaks.
    recordFact(database, {
      slot: "medication",
      value: "something private",
      modeId: null,
    });
    recordFact(database, {
      slot: "school",
      value: "Ashgrove Primary",
      modeId: "mode-kid",
    });

    const userMode = listCurrentFacts(database, null);
    expect(userMode.map((fact) => fact.slot)).toEqual(["medication"]);

    const kidMode = listCurrentFacts(database, "mode-kid");
    expect(kidMode.map((fact) => fact.slot)).toEqual(["school"]);

    // And the search path is filtered too — an isolation hole in one read is
    // an isolation hole.
    expect(searchFacts(database, "private", "mode-kid")).toHaveLength(0);
    expect(searchFacts(database, "private", null)).toHaveLength(1);
  });

  it("supersedes within a mode only", () => {
    recordFact(database, {
      slot: "home_address",
      value: "User Mode address",
      modeId: null,
      recordedAt: "2026-01-01T00:00:00.000Z",
    });
    recordFact(database, {
      slot: "home_address",
      value: "Kid Mode address",
      modeId: "mode-kid",
      recordedAt: "2026-02-01T00:00:00.000Z",
    });
    // Neither retired the other: they are different people's facts that happen
    // to share a slot name.
    expect(listCurrentFacts(database, null)).toHaveLength(1);
    expect(listCurrentFacts(database, "mode-kid")).toHaveLength(1);
  });
});

describe("finding things in Chinese", () => {
  it("segments Chinese into words before indexing", () => {
    expect(segmentWords("我们上周去超市买了牛奶")).toContain("超市");
    expect(indexableText("我们去超市")).toBe("我们 去 超市");
  });

  it("finds a two-character Chinese word", () => {
    // The case both stock tokenizers fail: unicode61 on raw Chinese indexes
    // the whole run as one token, and trigram cannot match two characters —
    // and two characters is the commonest word length in Chinese.
    recordFact(database, {
      slot: "preference:shopping",
      value: "我们平时在楼下的超市买牛奶和面包",
    });
    expect(searchFacts(database, "超市")).toHaveLength(1);
    expect(searchFacts(database, "牛奶")).toHaveLength(1);
    expect(searchFacts(database, "医院")).toHaveLength(0);
  });

  it("finds English the same way, in the same index", () => {
    recordFact(database, { slot: "employer", value: "Ashgrove Joinery" });
    expect(searchFacts(database, "joinery")).toHaveLength(1);
    expect(searchFacts(database, "Ashgrove")).toHaveLength(1);
  });

  it("uses the same tokeniser for the query as for the row", () => {
    // 🔴 If these ever diverge, recall halves and nothing reports an error.
    const stored = indexableText("上周去了医院");
    const asked = matchQuery("医院");
    expect(stored.split(" ")).toContain("医院");
    expect(asked).toBe('"医院"');
  });

  it("treats FTS5 syntax in a person's own words as text", () => {
    // A memory containing NOT or a quote must be searchable, not a syntax
    // error thrown at somebody typing in a search box.
    recordFact(database, { slot: "pet", value: 'a dog named "NOT" (really)' });
    expect(searchFacts(database, 'NOT "')).toHaveLength(1);
  });

  it("has the ICU data the Chinese path depends on", () => {
    expect(hasFullIcu()).toBe(true);
  });
});

describe("what the model is shown", () => {
  it("marks a fact that came from outside as somebody else's claim", () => {
    recordFact(database, {
      slot: "preference:news",
      value: "prefers short summaries",
      sourceKind: "external",
      sourceDetail: "https://example.invalid/page",
    });
    const text = formatFactsContext(listCurrentFacts(database)) ?? "";
    expect(text).toContain("not the Owner");
    expect(text).toContain("https://example.invalid/page");
  });

  it("says nothing at all when there are no facts", () => {
    expect(formatFactsContext([])).toBeNull();
  });
});
