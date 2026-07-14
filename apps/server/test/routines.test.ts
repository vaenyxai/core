import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/config.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  buildChatRoutineInput,
  describeRoutineInputFields,
  parseChatRoutineInput,
  runRoutine,
} from "../src/modules/core/routine-run.js";
import {
  addGalleryItem,
  addJournalEntry,
  listGalleryItems,
  listJournalEntries,
} from "../src/modules/core/routine-storage.js";
import { createMethod, loadMethod } from "../src/modules/core/methods.js";
import {
  createRoutineFromPlan,
  listRoutineSummaries,
  loadRoutine,
  toLibraryRoutine,
} from "../src/modules/core/routines.js";

const routinesDirectory = fileURLToPath(
  new URL("../../../sample-library/routines", import.meta.url),
);
const libraryDirectory = fileURLToPath(
  new URL("../../../sample-library/methods", import.meta.url),
);

const tempDirectories: string[] = [];

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-routine-test-"));
  tempDirectories.push(dataDirectory);
  // createDatabase only reads these three fields.
  const config = {
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    migrationsDirectory: resolve("migrations"),
  } as unknown as AppConfig;
  return createDatabase(config);
}

afterAll(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("library routine loader", () => {
  it("lists the sample routine via progressive disclosure", () => {
    const summaries = listRoutineSummaries(routinesDirectory);
    const sample = summaries.find((r) => r.id === "sample-summary-log");

    expect(sample).toBeDefined();
    expect(sample?.name).toContain("Summary Log");
    expect(sample?.mode).toBe("accumulate");
    expect(sample?.stepCount).toBe(1);
  });

  it("loads the full routine, resolves its deps, and pins a content hash", () => {
    const routine = loadRoutine(
      routinesDirectory,
      libraryDirectory,
      "sample-summary-log",
    );

    expect(routine).not.toBeNull();
    if (!routine) return;

    expect(routine.deps).toEqual([
      { methodId: "sample-summary", version: "1.0.0" },
    ]);
    expect(routine.flow[0]?.methodId).toBe("sample-summary");
    expect(routine.storage).toEqual({ journal: true, gallery: true });
    // The sample-summary method exists at v1.0.0, so the dep resolves.
    expect(routine.resolved).toBe(true);
    expect(routine.missingDeps).toEqual([]);
    expect(routine.contentHash).toMatch(/^[a-f0-9]{64}$/);
    // Stable: loading again hashes the same.
    const again = loadRoutine(routinesDirectory, libraryDirectory, "sample-summary-log");
    expect(again?.contentHash).toBe(routine.contentHash);
  });

  it("reports an unresolved dep when the Method library is empty", () => {
    // Point method resolution at a non-existent library so the dep can't resolve.
    const routine = loadRoutine(
      routinesDirectory,
      resolve(routinesDirectory, "no-such-method-library"),
      "sample-summary-log",
    );

    expect(routine).not.toBeNull();
    expect(routine?.resolved).toBe(false);
    expect(routine?.missingDeps).toContain("sample-summary");
  });

  it("returns null for an unknown routine", () => {
    expect(
      loadRoutine(routinesDirectory, libraryDirectory, "does-not-exist"),
    ).toBeNull();
  });

  it("produces a serializable LibraryRoutine", () => {
    const routine = loadRoutine(routinesDirectory, libraryDirectory, "sample-summary-log");
    expect(routine).not.toBeNull();
    if (!routine) return;

    const dto = toLibraryRoutine(routine);
    expect(dto.id).toBe("sample-summary-log");
    expect(dto.view).toBeNull();
    expect(dto.tags).toContain("sample");
  });
});

describe("routine local storage (Journal + Gallery)", () => {
  it("appends and reads back Journal entries and Gallery items", () => {
    const database = createTestDatabase();
    try {
      const entry = addJournalEntry(database, {
        routineId: "sample-summary-log",
        content: { text: "Replace hot water system, $1,200." },
      });
      expect(entry.id).toMatch(/[0-9a-f-]{36}/);
      expect((entry.content as { text: string }).text).toContain("1,200");

      const item = addGalleryItem(database, {
        routineId: "sample-summary-log",
        stepId: "summarise",
        output: { summary: "Quote for hot water replacement.", keyPoints: ["$1,200"] },
        outputValid: true,
      });
      expect(item.outputValid).toBe(true);
      expect((item.output as { summary: string }).summary).toContain("hot water");

      expect(listJournalEntries(database, "sample-summary-log")).toHaveLength(1);
      expect(listGalleryItems(database, "sample-summary-log")).toHaveLength(1);
      // A different routine id sees nothing — stores are per-Routine.
      expect(listJournalEntries(database, "other")).toHaveLength(0);
    } finally {
      database.close();
    }
  });

  it("scopes reads by chatId when one is given", () => {
    const database = createTestDatabase();
    try {
      addJournalEntry(database, {
        routineId: "r1",
        chatId: "chat-a",
        content: { n: 1 },
      });
      addJournalEntry(database, {
        routineId: "r1",
        chatId: "chat-b",
        content: { n: 2 },
      });

      expect(listJournalEntries(database, "r1", "chat-a")).toHaveLength(1);
      expect(listJournalEntries(database, "r1", "chat-b")).toHaveLength(1);
      // Omitting chatId returns all entries for the routine.
      expect(listJournalEntries(database, "r1")).toHaveLength(2);
    } finally {
      database.close();
    }
  });
});

// Write a one-off Routine folder under a fresh temp dir and return its dir + id.
function writeTempRoutine(routineJson: object): { dir: string; id: string } {
  const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-routine-dir-"));
  tempDirectories.push(dir);
  const id = "fixture";
  mkdirSync(join(dir, id), { recursive: true });
  writeFileSync(
    join(dir, id, "routine.json"),
    JSON.stringify(routineJson, null, 2),
    "utf8",
  );
  return { dir, id };
}

describe("routine run engine", () => {
  it("runs a linear flow, chaining previous output and storing Journal + Gallery", async () => {
    const database = createTestDatabase();
    // Two steps, both the real sample-summary Method (so deps resolve): step a
    // from the Journal entry, step b from a's output.
    const { dir, id } = writeTempRoutine({
      name: "Chain",
      owner: "test",
      version: "1.0.0",
      tags: [],
      mode: "one-shot",
      storage: { journal: true, gallery: true },
      deps: [{ methodId: "sample-summary", version: "1.0.0" }],
      flow: [
        { id: "a", methodId: "sample-summary", from: "journal" },
        { id: "b", methodId: "sample-summary", from: "previous" },
      ],
    });

    try {
      // Fake step runner: echoes a {text} shape so each step's output is a valid
      // input for the next sample-summary step. No model is called.
      const runStep = (
        _method: unknown,
        input: unknown,
      ): Promise<{
        output: unknown;
        outputValid: boolean;
        raw: string;
        webSearchUsed: boolean;
      }> =>
        Promise.resolve({
          output: { text: `s:${(input as { text: string }).text}` },
          outputValid: true,
          raw: "",
          webSearchUsed: false,
        });

      const result = await runRoutine(
        database,
        dir,
        libraryDirectory,
        id,
        { text: "hello" },
        new AbortController().signal,
        { runStep },
      );

      expect(result.steps).toHaveLength(2);
      // Double prefix proves step b received step a's output ("previous").
      expect(result.output).toEqual({ text: "s:s:hello" });
      expect(result.outputValid).toBe(true);

      const journal = listJournalEntries(database, id);
      expect(journal).toHaveLength(1);
      expect(journal[0]?.content).toEqual({ text: "hello" });

      const gallery = listGalleryItems(database, id);
      expect(gallery).toHaveLength(1);
      expect(gallery[0]?.output).toEqual({ text: "s:s:hello" });
    } finally {
      database.close();
    }
  });

  it("assembles a routine from a plan (reuse + new method), wired linearly", () => {
    const libDir = mkdtempSync(resolve(tmpdir(), "vaenyx-plan-lib-"));
    const rouDir = mkdtempSync(resolve(tmpdir(), "vaenyx-plan-rou-"));
    tempDirectories.push(libDir, rouDir);

    const base = createMethod(libDir, {
      name: "Base Step",
      description: "",
      recipe: "do x",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      tags: [],
    });

    const routine = createRoutineFromPlan(rouDir, libDir, {
      name: "My Routine",
      description: "A planned routine.",
      mode: "accumulate",
      steps: [
        { title: "reuse it", reuse: base.id },
        {
          title: "a new one",
          method: {
            name: "Second Step",
            description: "",
            recipe: "do y",
            inputSchema: { type: "object" },
            outputSchema: { type: "object" },
            tags: [],
          },
        },
      ],
    });

    expect(routine.id).toBe("my-routine");
    expect(routine.flow).toHaveLength(2);
    expect(routine.flow[0]?.from).toBe("journal");
    expect(routine.flow[1]?.from).toBe("previous");
    // Both deps exist in the same library, so it resolves.
    expect(routine.resolved).toBe(true);
    // The new step's method was created on disk.
    expect(loadMethod(libDir, "second-step")).not.toBeNull();
  });

  it("refuses to run a Routine with an unresolved dependency", async () => {
    const database = createTestDatabase();
    const { dir, id } = writeTempRoutine({
      name: "Broken",
      owner: "test",
      version: "1.0.0",
      tags: [],
      mode: "one-shot",
      storage: { journal: true, gallery: true },
      deps: [{ methodId: "no-such-method", version: "1.0.0" }],
      flow: [{ id: "a", methodId: "no-such-method", from: "journal" }],
    });

    try {
      await expect(
        runRoutine(
          database,
          dir,
          libraryDirectory,
          id,
          { text: "hi" },
          new AbortController().signal,
        ),
      ).rejects.toThrow(/ROUTINE_UNRESOLVED/);
      // Nothing was written.
      expect(listJournalEntries(database, id)).toHaveLength(0);
    } finally {
      database.close();
    }
  });
});

// Declarative View (Library v2 ④): the routine.json `view` slot rides along on
// summaries (progressive disclosure reads routine.json anyway) so the chat and
// Gallery can render results without a full load.
describe("declarative routine view", () => {
  it("carries a declared view on the summary and defaults to null without one", () => {
    const view = {
      fields: [
        { key: "title", as: "title" },
        { key: "amount", as: "text", label: "Amount ($)" },
      ],
    };
    const { dir } = writeTempRoutine({
      name: "Viewed",
      owner: "test",
      version: "1.0.0",
      tags: [],
      mode: "one-shot",
      storage: { journal: true, gallery: true },
      deps: [{ methodId: "sample-summary", version: "1.0.0" }],
      flow: [{ id: "a", methodId: "sample-summary", from: "journal" }],
      view,
    });

    const summaries = listRoutineSummaries(dir);
    expect(summaries[0]?.view).toEqual(view);

    // The shipped sample declares no view -> null (auto view "A").
    const sample = listRoutineSummaries(routinesDirectory).find(
      (routine) => routine.id === "sample-summary-log",
    );
    expect(sample?.view ?? null).toBeNull();
  });
});

// Friendly input (Library v2 ③): a multi-field first step is AI-parsed from the
// chat message and confirmed by the Owner before the run.
describe("friendly routine input (AI parse + confirm)", () => {
  // A routine whose first Method needs several fields — the case
  // buildChatRoutineInput cannot fill.
  function writeExpenseFixture(): { rouDir: string; libDir: string; id: string } {
    const libDir = mkdtempSync(resolve(tmpdir(), "vaenyx-parse-lib-"));
    tempDirectories.push(libDir);
    const method = createMethod(libDir, {
      name: "Expense Format",
      description: "Formats one expense into a tidy record.",
      recipe: "Format the expense.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["amount", "category"],
        properties: {
          amount: { type: "number", description: "How much was spent." },
          category: { type: "string", description: "What kind of spend." },
          date: { type: "string", description: "ISO date of the spend." },
        },
      },
      outputSchema: { type: "object" },
      tags: [],
    });
    const { dir, id } = writeTempRoutine({
      name: "Expense Log",
      owner: "test",
      version: "1.0.0",
      tags: [],
      mode: "accumulate",
      storage: { journal: true, gallery: true },
      deps: [{ methodId: method.id, version: method.version }],
      flow: [{ id: "format", methodId: method.id, from: "journal" }],
    });
    return { rouDir: dir, libDir, id };
  }

  it("describes multi-field first steps; single-field stays on the simple path", () => {
    const { rouDir, libDir, id } = writeExpenseFixture();

    // The simple wrapper refuses it...
    expect(buildChatRoutineInput(rouDir, libDir, id, "note").ok).toBe(false);
    // ...and the descriptor picks it up (the exact complement).
    const described = describeRoutineInputFields(rouDir, libDir, id);
    expect(described?.fields.map((field) => field.key)).toEqual([
      "amount",
      "category",
      "date",
    ]);
    expect(
      described?.fields.find((field) => field.key === "amount")?.required,
    ).toBe(true);
    expect(
      described?.fields.find((field) => field.key === "date")?.required,
    ).toBe(false);

    // The shipped single-text sample is NOT a parse case.
    expect(
      describeRoutineInputFields(
        routinesDirectory,
        libraryDirectory,
        "sample-summary-log",
      ),
    ).toBeNull();
  });

  it("parses a message into the fields via the injected model, drops junk, lists gaps", async () => {
    const { rouDir, libDir, id } = writeExpenseFixture();
    const prompts: string[] = [];

    const parsed = await parseChatRoutineInput(
      rouDir,
      libDir,
      id,
      "spent $45 on groceries yesterday",
      new AbortController().signal,
      (prompt) => {
        prompts.push(prompt);
        return Promise.resolve(
          '```json\n{"amount": 45, "category": "groceries", "junk": true, "date": ""}\n```',
        );
      },
    );

    // Junk keys and empty strings are dropped; the declared fields survive.
    expect(parsed?.parsed).toEqual({ amount: 45, category: "groceries" });
    expect(parsed?.missingRequired).toEqual([]);
    // The prompt tells the model the fields and the Owner's message.
    expect(prompts[0]).toContain("amount");
    expect(prompts[0]).toContain("spent $45 on groceries yesterday");

    const gappy = await parseChatRoutineInput(
      rouDir,
      libDir,
      id,
      "spent money",
      new AbortController().signal,
      () => Promise.resolve('{"category": "misc"}'),
    );
    expect(gappy?.parsed).toEqual({ category: "misc" });
    expect(gappy?.missingRequired).toEqual(["amount"]);
  });
});
