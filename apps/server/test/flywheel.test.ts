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
