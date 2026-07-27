import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/config.js";
import { createDatabase } from "../src/db/database.js";
import {
  readSharingChoice,
  sendDueExamples,
} from "../src/modules/core/flywheel-send.js";
import {
  WINDOW_HOURS,
  listQueue,
  queueExample,
} from "../src/modules/core/flywheel.js";

const temporary: string[] = [];
const opened: { close: () => void }[] = [];

function createTestDatabase() {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-flysend-"));
  temporary.push(directory);
  const database = createDatabase({
    dataDirectory: directory,
    databasePath: resolve(directory, "vaenyx.db"),
    migrationsDirectory: resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "migrations",
    ),
  } as unknown as AppConfig);
  opened.push(database);
  return database;
}

// Windows will not delete an open SQLite file, so the handle closes first.
afterEach(() => {
  while (opened.length > 0) opened.pop()?.close();
  while (temporary.length > 0) {
    rmSync(temporary.pop() as string, { recursive: true, force: true });
  }
});
const HOUR = 60 * 60 * 1000;

function acks(
  overrides: {
    mode?: string;
    activated?: boolean;
  } = {},
) {
  const rows = [
    {
      keyName: "legal.consent.flywheel",
      copyVersion: "2.9",
      choice: overrides.mode ?? "automatic",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ];
  if (overrides.activated !== false) {
    rows.push({
      keyName: "legal.consent.flywheel.activate",
      copyVersion: "2.9",
      choice: "accept",
      createdAt: "2026-07-20T00:00:00.000Z",
    });
  }
  return rows;
}

describe("readSharingChoice", () => {
  it("is off until the activation consent exists, whatever the old setting says", () => {
    const choice = readSharingChoice(acks({ activated: false }));
    expect(choice.mode).toBe("off");
    expect(choice.activated).toBe(false);
  });

  it("names the activation record as the grant, not the older setting", () => {
    const choice = readSharingChoice(acks());
    expect(choice.mode).toBe("automatic");
    expect(choice.grantEventId).toContain("legal.consent.flywheel.activate");
  });

  it("does not sweep for review-each: those wait to be sent one at a time", () => {
    expect(readSharingChoice(acks({ mode: "review-each" })).mode).toBe(
      "review-each",
    );
  });

  it("treats a K3 given under an older copy version as not given", () => {
    // The 2.9 K3 added "how they go" (they go out on their own after the
    // wait); a yes recorded under 2.8 was a yes to different words.
    const rows = acks();
    const activation = rows.find(
      (row) => row.keyName === "legal.consent.flywheel.activate",
    );
    if (activation) activation.copyVersion = "2.8";
    const choice = readSharingChoice(rows);
    expect(choice.mode).toBe("off");
    expect(choice.activated).toBe(false);
  });
});

describe("sendDueExamples", () => {
  function due(database: ReturnType<typeof createTestDatabase>) {
    // Queued long enough ago that its window has passed.
    queueExample(
      database,
      { methodId: "estimating-paint", input: { a: 1 }, output: { b: 2 } },
      Date.now() - (WINDOW_HOURS + 1) * HOUR,
    );
  }

  const deps = (
    fetchImpl: typeof fetch,
    overrides: Partial<Parameters<typeof sendDueExamples>[1]> = {},
  ) => ({
    serviceUrl: "https://publish.example",
    acks: acks(),
    tosVersion: "1.0",
    communityItemId: (id: string) => id,
    fetchImpl,
    ...overrides,
  });

  it("sends a due example and stops holding it", async () => {
    const database = createTestDatabase();
    due(database);
    let body: Record<string, unknown> = {};
    const outcome = await sendDueExamples(
      database,
      deps((async (_url: string, init: RequestInit) => {
        body = JSON.parse(String(init.body)) as Record<string, unknown>;
        return new Response("{}", { status: 200 });
      }) as unknown as typeof fetch),
    );
    expect(outcome.sent).toBe(1);
    expect(listQueue(database)).toHaveLength(0);
    expect(body.itemId).toBe("estimating-paint");
    expect((body.evidence as { uploadPath: string }).uploadPath).toBe(
      "automatic",
    );
  });

  it("sends nothing while sharing is not activated", async () => {
    const database = createTestDatabase();
    due(database);
    let called = false;
    const outcome = await sendDueExamples(
      database,
      deps(
        (async () => {
          called = true;
          return new Response("{}", { status: 200 });
        }) as unknown as typeof fetch,
        { acks: acks({ activated: false }) },
      ),
    );
    expect(called).toBe(false);
    expect(outcome.sent).toBe(0);
    expect(listQueue(database)).toHaveLength(1);
  });

  it("sends nothing for a Method the household wrote itself", async () => {
    const database = createTestDatabase();
    due(database);
    let called = false;
    await sendDueExamples(
      database,
      deps(
        (async () => {
          called = true;
          return new Response("{}", { status: 200 });
        }) as unknown as typeof fetch,
        { communityItemId: () => null },
      ),
    );
    expect(called).toBe(false);
    expect(listQueue(database)).toHaveLength(1);
  });

  it("keeps an item queued when the service is unreachable", async () => {
    const database = createTestDatabase();
    due(database);
    const outcome = await sendDueExamples(
      database,
      deps((async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch),
    );
    expect(outcome.failed).toBe(1);
    expect(listQueue(database)).toHaveLength(1);
  });

  it("stops retrying when the publisher does not want these", async () => {
    const database = createTestDatabase();
    due(database);
    const outcome = await sendDueExamples(
      database,
      deps((async () =>
        new Response(JSON.stringify({ error: "NOT_RECEIVING" }), {
          status: 403,
        })) as unknown as typeof fetch),
    );
    expect(outcome.refused).toBe(1);
    expect(listQueue(database)).toHaveLength(0);
  });

  it("leaves a rate-limited item to try again later", async () => {
    const database = createTestDatabase();
    due(database);
    const outcome = await sendDueExamples(
      database,
      deps((async () =>
        new Response("{}", { status: 429 })) as unknown as typeof fetch),
    );
    expect(outcome.failed).toBe(1);
    expect(listQueue(database)).toHaveLength(1);
  });

  it("does not send an item still inside its window", async () => {
    const database = createTestDatabase();
    queueExample(database, {
      methodId: "estimating-paint",
      input: {},
      output: {},
    });
    let called = false;
    await sendDueExamples(
      database,
      deps((async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as unknown as typeof fetch),
    );
    expect(called).toBe(false);
  });

  it("never sweeps something that looks sensitive, however old it is", async () => {
    const database = createTestDatabase();
    queueExample(
      database,
      {
        methodId: "estimating-paint",
        input: { note: "my daughter's medication" },
        output: {},
      },
      Date.now() - 100 * 24 * HOUR,
    );
    let called = false;
    await sendDueExamples(
      database,
      deps((async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as unknown as typeof fetch),
    );
    expect(called).toBe(false);
    expect(listQueue(database)[0].sensitive).toBe(true);
  });
});
