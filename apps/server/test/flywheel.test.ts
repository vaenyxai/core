import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/db/database.js";
import type { AppConfig } from "../src/config.js";
import {
  WINDOW_HOURS,
  getContributorId,
  listDue,
  listQueue,
  looksSensitive,
  queueExample,
  releaseSensitive,
  stripPersonalDetails,
  withdrawQueued,
} from "../src/modules/core/flywheel.js";

const temporary: string[] = [];

function makeDatabase() {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-flywheel-"));
  temporary.push(directory);
  return createDatabase({
    dataDirectory: directory,
    databasePath: resolve(directory, "vaenyx.db"),
    // Resolved from this file, not the working directory: vitest may run from
    // the repo root or the package, and the migrations are neither guess.
    migrationsDirectory: resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "migrations",
    ),
  } as unknown as AppConfig);
}

afterEach(() => {
  while (temporary.length > 0) {
    const directory = temporary.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe("stripping personal details", () => {
  it("removes the things it recognises and says what it removed", () => {
    const { value, redactions } = stripPersonalDetails({
      note: "email me at sam@example.com or call +61 400 123 456",
    });
    const text = JSON.stringify(value);
    expect(text).not.toContain("sam@example.com");
    expect(text).not.toContain("400 123 456");
    expect(redactions.map((r) => r.kind).sort()).toEqual(["email", "phone"]);
  });

  it("walks nested structures", () => {
    const { value } = stripPersonalDetails({
      items: [{ contact: "a@b.co" }],
    }) as { value: { items: { contact: string }[] } };
    expect(value.items[0]?.contact).toBe("[email]");
  });

  it("leaves ordinary content alone", () => {
    const { value, redactions } = stripPersonalDetails({
      ingredients: "chicken, broccoli, rice",
    });
    expect(redactions).toEqual([]);
    expect(JSON.stringify(value)).toContain("broccoli");
  });
});

describe("the sensitive hold-back", () => {
  it("flags health, family and money in either language", () => {
    expect(looksSensitive({ text: "my doctor changed the medication" })).toBe(true);
    expect(looksSensitive({ text: "我女儿的学校" })).toBe(true);
    expect(looksSensitive({ text: "the mortgage repayment" })).toBe(true);
  });

  it("does not flag an ordinary recipe", () => {
    expect(looksSensitive({ text: "chicken and broccoli stir fry" })).toBe(false);
  });
});

describe("the withdrawal window", () => {
  it("holds an item for the full window before it is due", () => {
    const database = makeDatabase();
    const now = Date.parse("2026-07-27T00:00:00Z");
    queueExample(
      database,
      { methodId: "dinner-planner", input: { a: 1 }, output: { b: 2 } },
      now,
    );

    expect(listQueue(database)).toHaveLength(1);
    // One hour before the window closes: not due.
    expect(
      listDue(database, now + (WINDOW_HOURS - 1) * 60 * 60 * 1000),
    ).toHaveLength(0);
    // One minute after: due.
    expect(
      listDue(database, now + WINDOW_HOURS * 60 * 60 * 1000 + 60_000),
    ).toHaveLength(1);
    database.close();
  });

  it("a withdrawn item never becomes due", () => {
    const database = makeDatabase();
    const now = Date.parse("2026-07-27T00:00:00Z");
    const queued = queueExample(
      database,
      { methodId: "m", input: { a: 1 }, output: { b: 2 } },
      now,
    );

    expect(withdrawQueued(database, queued.id)).toBe(true);
    expect(listQueue(database)).toHaveLength(0);
    expect(
      listDue(database, now + (WINDOW_HOURS + 24) * 60 * 60 * 1000),
    ).toHaveLength(0);
    // Withdrawing twice is not an error, it is just already done.
    expect(withdrawQueued(database, queued.id)).toBe(false);
    database.close();
  });

  it("never sweeps a sensitive item, however long it waits", () => {
    const database = makeDatabase();
    const now = Date.parse("2026-07-27T00:00:00Z");
    const queued = queueExample(
      database,
      {
        methodId: "m",
        input: { text: "my daughter's teacher said" },
        output: { text: "ok" },
      },
      now,
    );

    expect(queued.sensitive).toBe(true);
    expect(
      listDue(database, now + (WINDOW_HOURS + 24 * 365) * 60 * 60 * 1000),
    ).toHaveLength(0);
    database.close();
  });

  // THE ALWAYS-ASK (G4). Holding was only ever half the rule: the other half is
  // that the Owner gets asked about the held item, one at a time. Before
  // released_at existed the question had nowhere to go, so held items simply
  // accumulated and the judgement the category exists to protect was never
  // actually sought.
  it("sends a held item once the Owner has allowed that one", () => {
    const database = makeDatabase();
    const now = Date.parse("2026-07-27T00:00:00Z");
    const queued = queueExample(
      database,
      {
        methodId: "m",
        input: { text: "my daughter's teacher said" },
        output: { text: "ok" },
      },
      now,
    );
    const after = now + (WINDOW_HOURS + 1) * 60 * 60 * 1000;

    expect(listDue(database, after)).toHaveLength(0);
    expect(releaseSensitive(database, queued.id, "2026-07-27T01:00:00Z")).toBe(
      true,
    );
    expect(listDue(database, after).map((item) => item.id)).toEqual([queued.id]);
    database.close();
  });

  it("🔴 allowing one does not shorten its window", () => {
    // The answer given is "this may go", not "go now". The Owner keeps the
    // whole 48 hours to change their mind, exactly as with any other item.
    const database = makeDatabase();
    const now = Date.parse("2026-07-27T00:00:00Z");
    const queued = queueExample(
      database,
      { methodId: "m", input: { text: "bank loan" }, output: { ok: true } },
      now,
    );
    releaseSensitive(database, queued.id, "2026-07-27T00:05:00Z");

    expect(listDue(database, now + 60 * 60 * 1000)).toHaveLength(0);
    expect(withdrawQueued(database, queued.id)).toBe(true);
    expect(listDue(database, now + (WINDOW_HOURS + 1) * 60 * 60 * 1000)).toHaveLength(
      0,
    );
    database.close();
  });

  it("🔴 allowing is per item and cannot be answered in advance", () => {
    // Two held items; saying yes to one says nothing about the other. There is
    // no call that releases a category, and there must never be one.
    const database = makeDatabase();
    const now = Date.parse("2026-07-27T00:00:00Z");
    const first = queueExample(
      database,
      { methodId: "m", input: { text: "my son" }, output: { ok: true } },
      now,
    );
    const second = queueExample(
      database,
      { methodId: "m", input: { text: "my son again" }, output: { ok: true } },
      now,
    );
    releaseSensitive(database, first.id, "2026-07-27T00:05:00Z");

    expect(
      listDue(database, now + (WINDOW_HOURS + 1) * 60 * 60 * 1000).map(
        (item) => item.id,
      ),
    ).toEqual([first.id]);
    expect(
      listQueue(database).find((item) => item.id === second.id)?.releasedAt,
    ).toBeNull();
    database.close();
  });

  it("does not release something that was never held", () => {
    const database = makeDatabase();
    const queued = queueExample(database, {
      methodId: "m",
      input: { area: 10 },
      output: { total: 20 },
    });
    expect(queued.sensitive).toBe(false);
    expect(releaseSensitive(database, queued.id)).toBe(false);
    database.close();
  });

  it("queues the stripped copy, not the raw one", () => {
    const database = makeDatabase();
    const queued = queueExample(database, {
      methodId: "m",
      input: { note: "reach me on sam@example.com" },
      output: { ok: true },
    });
    expect(JSON.stringify(queued.input)).not.toContain("sam@example.com");
    expect(queued.redactions).toHaveLength(1);
    database.close();
  });
});

describe("the contributor ID", () => {
  it("is the same every time, because credit accumulates on it", () => {
    const database = makeDatabase();
    const first = getContributorId(database);
    expect(first).toMatch(/^vx-[0-9a-f]{20}$/);
    expect(getContributorId(database)).toBe(first);
    database.close();
  });
});
