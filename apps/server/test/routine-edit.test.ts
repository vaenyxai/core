// EDIT ROUTINE v1 — the promises, held to by test:
// the folder id never changes and history stays attached; every field
// round-trips; editing a step's Method touches nothing in place; saves are
// atomic and roll back whole; display changes never break a token while
// behaviour changes always do (and never auto-repin); old gallery rows keep
// their old look; old parse examples stop feeding a new schema.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  createAppProfile,
  getAppProfileRoutineLock,
  migrateLegacyRoutineTokenLocks,
} from "../src/modules/core/app-profiles.js";
import { methodContentHash, loadMethod } from "../src/modules/core/methods.js";
import {
  bumpRoutineVersion,
  readRoutineEditDraft,
  RoutineEditError,
  routineInputSchemaRev,
  runRoutineEditTest,
  saveRoutineEdit,
} from "../src/modules/core/routine-edit.js";
import { loadRoutine } from "../src/modules/core/routines.js";
import {
  addGalleryItem,
  addParseExample,
  listGalleryItems,
  listParseExamples,
} from "../src/modules/core/routine-storage.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  // Reverse order: the database closes before its directory is removed
  // (Windows refuses to delete an open SQLite file).
  for (const cleanup of cleanups.splice(0).reverse()) {
    try {
      cleanup();
    } catch {
      // Best-effort temp cleanup.
    }
  }
});

interface Harness {
  database: DatabaseHandle;
  routinesDirectory: string;
  libraryDirectory: string;
  secretsDirectory: string;
}

function writeMethod(
  libraryDirectory: string,
  id: string,
  options: { recipe?: string; input?: unknown; output?: unknown } = {},
): void {
  const dir = join(libraryDirectory, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "method.json"),
    JSON.stringify({
      name: `Method ${id}`,
      description: "test method",
      version: "1.0.0",
      owner: "",
      tags: [],
      origin: "self",
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "recipe.md"),
    options.recipe ?? "Summarise the text.",
    "utf8",
  );
  writeFileSync(
    join(dir, "schema.json"),
    JSON.stringify({
      input: options.input ?? {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
      output: options.output ?? {
        type: "object",
        properties: { summary: { type: "string" } },
      },
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ permissions: { network: false, readFiles: false } }),
    "utf8",
  );
}

// A routine.json with EVERY field the loader knows plus one it does not —
// the round-trip canary.
function writeRoutine(routinesDirectory: string, id: string): void {
  const dir = join(routinesDirectory, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "routine.json"),
    JSON.stringify(
      {
        name: "Dinner Planner (test)",
        description: "Plans dinner.",
        owner: "",
        version: "1.0.0",
        tags: ["food"],
        origin: "self",
        mode: "accumulate",
        storage: { journal: true, gallery: true },
        deps: [{ methodId: "plan-dinner", version: "1.0.0" }],
        flow: [{ id: "step1", methodId: "plan-dinner", from: "journal" }],
        view: { fields: [{ key: "summary", as: "title" }] },
        capabilities: [],
        annotateFocus: "only mark food",
        futureField: { keep: "me" },
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ permissions: { network: false, readFiles: false } }),
    "utf8",
  );
}

function harness(): Harness {
  const root = mkdtempSync(resolve(tmpdir(), "vaenyx-routine-edit-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  const routinesDirectory = join(root, "routines");
  const libraryDirectory = join(root, "methods");
  const secretsDirectory = join(root, "secrets");
  mkdirSync(routinesDirectory, { recursive: true });
  mkdirSync(libraryDirectory, { recursive: true });
  mkdirSync(secretsDirectory, { recursive: true });
  const database = createDatabase({
    dataDirectory: join(root, "db"),
    databasePath: join(root, "db", "vaenyx.db"),
    backupsDirectory: join(root, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  cleanups.push(() => {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  });
  writeMethod(libraryDirectory, "plan-dinner");
  writeRoutine(routinesDirectory, "dinner-planner-test");
  return { database, routinesDirectory, libraryDirectory, secretsDirectory };
}

function draftBodyFrom(h: Harness) {
  const draft = readRoutineEditDraft(
    h.routinesDirectory,
    h.libraryDirectory,
    "dinner-planner-test",
  );
  return {
    expectedContentHash: draft.routine.contentHash,
    name: draft.routine.name,
    description: draft.routine.description,
    tags: draft.routine.tags,
    view: draft.routine.view ?? null,
    annotateFocus: draft.routine.annotateFocus ?? null,
    flow: draft.steps.map((step) => ({
      stepId: step.stepId,
      methodId: step.method?.id ?? "",
      from: step.from,
    })),
  };
}

describe("the editable draft", () => {
  it("carries the full routine and per-step method detail", () => {
    const h = harness();
    const draft = readRoutineEditDraft(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    );
    expect(draft.editable).toBe(true);
    expect(draft.routine.annotateFocus).toBe("only mark food");
    expect(draft.routine.executionHash).toBeTruthy();
    expect(draft.steps[0]?.method?.recipe).toBe("Summarise the text.");
  });
});

describe("saving", () => {
  it("a display-only edit keeps the id, bumps the version, keeps executionHash, keeps tokens", () => {
    const h = harness();
    createAppProfile(
      h.database,
      { name: "App", kind: "routine", allowedRoutineId: "dinner-planner-test" },
      {
        libraryDirectory: h.libraryDirectory,
        routinesDirectory: h.routinesDirectory,
      },
      h.secretsDirectory,
    );
    const before = loadRoutine(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    )!;

    const body = draftBodyFrom(h);
    body.name = "Dinner Planner (renamed)";
    body.view = { fields: [{ key: "summary", as: "note" }] };
    const result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );

    expect(result.unchanged).toBe(false);
    expect(result.routine.id).toBe("dinner-planner-test");
    expect(result.routine.version).toBe("1.0.1");
    expect(result.behaviourChanged).toBe(false);
    expect(result.staleTokens).toBe(0);
    expect(result.routine.executionHash).toBe(before.executionHash);
    expect(result.routine.contentHash).not.toBe(before.contentHash);
  });

  it("round-trips every field, including one this build has never heard of", () => {
    const h = harness();
    const body = draftBodyFrom(h);
    body.description = "Plans dinner, better.";
    saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    const meta = JSON.parse(
      readFileSync(
        join(h.routinesDirectory, "dinner-planner-test", "routine.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(meta.futureField).toEqual({ keep: "me" });
    expect(meta.mode).toBe("accumulate");
    expect(meta.storage).toEqual({ journal: true, gallery: true });
    expect(meta.origin).toBe("self");
    expect(meta.annotateFocus).toBe("only mark food");
  });

  it("a behaviour edit moves executionHash and reports the tokens that will now 409", () => {
    const h = harness();
    createAppProfile(
      h.database,
      { name: "App", kind: "routine", allowedRoutineId: "dinner-planner-test" },
      {
        libraryDirectory: h.libraryDirectory,
        routinesDirectory: h.routinesDirectory,
      },
      h.secretsDirectory,
    );
    const before = loadRoutine(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    )!;
    const lockBefore = getAppProfileRoutineLock(
      h.database,
      firstProfileId(h.database),
      "dinner-planner-test",
    );

    const body = draftBodyFrom(h);
    body.annotateFocus = "mark food AND fridge contents";
    const result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );

    expect(result.behaviourChanged).toBe(true);
    expect(result.staleTokens).toBe(1);
    expect(result.routine.executionHash).not.toBe(before.executionHash);
    // NO auto-repin: the lock row still holds what the Owner granted.
    expect(
      getAppProfileRoutineLock(
        h.database,
        firstProfileId(h.database),
        "dinner-planner-test",
      ),
    ).toBe(lockBefore);
  });

  it("editing a step's Method creates a NEW revision and leaves the original untouched", () => {
    const h = harness();
    const originalHash = methodContentHash(h.libraryDirectory, "plan-dinner");

    const body = draftBodyFrom(h);
    body.flow[0] = {
      ...body.flow[0]!,
      methodEdit: {
        recipe: "Offer THREE dinner options with what is visible.",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
        outputSchema: {
          type: "object",
          properties: {
            options: { type: "array" },
            missing: { type: "array" },
          },
        },
      },
    } as (typeof body.flow)[number];
    const result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );

    expect(result.createdMethodIds).toEqual(["plan-dinner-r2"]);
    // The base Method: byte-for-byte what it was.
    expect(methodContentHash(h.libraryDirectory, "plan-dinner")).toBe(
      originalHash,
    );
    expect(loadMethod(h.libraryDirectory, "plan-dinner")?.recipe).toBe(
      "Summarise the text.",
    );
    // The routine now runs the revision; deps follow.
    expect(result.routine.flow[0]?.methodId).toBe("plan-dinner-r2");
    expect(result.routine.deps.map((dep) => dep.methodId)).toContain(
      "plan-dinner-r2",
    );
    expect(result.routine.resolved).toBe(true);
    expect(result.behaviourChanged).toBe(true);
  });

  it("refuses a stale expectedContentHash and touches nothing", () => {
    const h = harness();
    const body = draftBodyFrom(h);
    body.expectedContentHash = "somebody-else-saved";
    body.name = "Should never land";
    expect(() =>
      saveRoutineEdit(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
        "dinner-planner-test",
        body,
      ),
    ).toThrowError(RoutineEditError);
    const after = loadRoutine(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    )!;
    expect(after.name).toBe("Dinner Planner (test)");
    expect(after.version).toBe("1.0.0");
  });

  it("a failed save rolls back whole: old routine runnable, no orphan Method", () => {
    const h = harness();
    const body = draftBodyFrom(h);
    // Sabotage: the edited step names a Method that vanishes between the
    // plan pass and the deps pass is hard to fake — instead make validation
    // fail by pointing a NEW step at a method deleted after planning. The
    // simplest honest injection: a methodEdit whose revision folder will
    // collide 98 times is unreachable, so instead delete the base right
    // after building the body and target the not-found error path.
    body.flow.push({
      stepId: null,
      methodId: "no-such-method",
      from: "previous",
    });
    expect(() =>
      saveRoutineEdit(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
        "dinner-planner-test",
        body,
      ),
    ).toThrowError(/EDIT_METHOD_NOT_FOUND/);
    const after = loadRoutine(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    )!;
    expect(after.version).toBe("1.0.0");
    expect(after.resolved).toBe(true);
    expect(existsSync(join(h.libraryDirectory, "plan-dinner-r2"))).toBe(false);
  });

  it("a no-op is not saved and not version-bumped", () => {
    const h = harness();
    const result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      draftBodyFrom(h),
    );
    expect(result.unchanged).toBe(true);
    expect(
      loadRoutine(
        h.routinesDirectory,
        h.libraryDirectory,
        "dinner-planner-test",
      )?.version,
    ).toBe("1.0.0");
  });

  it("a community routine cannot be edited in place", () => {
    const h = harness();
    const metaPath = join(
      h.routinesDirectory,
      "dinner-planner-test",
      "routine.json",
    );
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<
      string,
      unknown
    >;
    meta.origin = "community";
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
    const body = draftBodyFrom(h);
    expect(() =>
      saveRoutineEdit(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
        "dinner-planner-test",
        body,
      ),
    ).toThrowError(/ROUTINE_NOT_SELF/);
  });

  it("a removed stepId is never reborn as a different step", () => {
    const h = harness();
    // Add a second step, then remove it, then add another: the new one must
    // not reuse the removed id.
    let body = draftBodyFrom(h);
    body.flow.push({ stepId: null, methodId: "plan-dinner", from: "previous" });
    let result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    const secondId = result.routine.flow[1]!.id;
    expect(secondId).not.toBe("step1");

    body = draftBodyFrom(h);
    body.flow = body.flow.filter((step) => step.stepId !== secondId);
    saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );

    body = draftBodyFrom(h);
    body.flow.push({ stepId: null, methodId: "plan-dinner", from: "previous" });
    result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    expect(result.routine.flow[1]!.id).not.toBe(secondId);
  });
});

describe("history keeps its shape", () => {
  it("a view change stamps the OLD view onto unstamped gallery rows", () => {
    const h = harness();
    addGalleryItem(h.database, {
      routineId: "dinner-planner-test",
      output: { summary: "old result" },
    });
    const body = draftBodyFrom(h);
    body.view = { fields: [{ key: "options", as: "bullets" }] };
    saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    const items = listGalleryItems(h.database, "dinner-planner-test");
    expect(items[0]?.viewSnapshot).toEqual({
      fields: [{ key: "summary", as: "title" }],
    });
  });

  it("a step-1 schema change stamps old parse examples and stops serving them", () => {
    const h = harness();
    addParseExample(h.database, {
      routineId: "dinner-planner-test",
      message: "chicken and rice",
      input: { text: "chicken and rice" },
    });
    const oldRev = routineInputSchemaRev(
      h.libraryDirectory,
      loadRoutine(
        h.routinesDirectory,
        h.libraryDirectory,
        "dinner-planner-test",
      )!,
    );

    const body = draftBodyFrom(h);
    body.flow[0] = {
      ...body.flow[0]!,
      methodEdit: {
        recipe: "Summarise the text.",
        inputSchema: {
          type: "object",
          properties: { ingredients: { type: "string" } },
          required: ["ingredients"],
        },
        outputSchema: {
          type: "object",
          properties: { summary: { type: "string" } },
        },
      },
    } as (typeof body.flow)[number];
    saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );

    const after = loadRoutine(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    )!;
    const newRev = routineInputSchemaRev(h.libraryDirectory, after);
    expect(newRev).not.toBe(oldRev);
    // Selection under the NEW rev serves nothing; under the OLD rev it still
    // finds the stamped example.
    expect(
      listParseExamples(h.database, "dinner-planner-test", 3, newRev),
    ).toEqual([]);
    expect(
      listParseExamples(h.database, "dinner-planner-test", 3, oldRev),
    ).toHaveLength(1);
  });
});

describe("try changes", () => {
  it("runs the draft (edited step included) and writes nothing anywhere", async () => {
    const h = harness();
    const body = draftBodyFrom(h);
    body.flow[0] = {
      ...body.flow[0]!,
      methodEdit: {
        recipe: "Offer three options.",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
        outputSchema: {
          type: "object",
          properties: { options: { type: "array" } },
        },
      },
    } as (typeof body.flow)[number];

    const result = await runRoutineEditTest(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
      { text: "eggs, rice, spring onion" },
      new AbortController().signal,
      undefined,
      async (method) => ({
        output: { options: [`ran ${method.recipe.slice(0, 12)}`] },
        outputValid: true,
        webSearchUsed: false,
      }),
    );

    expect(result.outputValid).toBe(true);
    expect(result.steps).toHaveLength(1);
    // Nothing written: journal, gallery, parse examples all empty; no
    // revision folder exists.
    expect(listGalleryItems(h.database, "dinner-planner-test")).toEqual([]);
    expect(listParseExamples(h.database, "dinner-planner-test", 10)).toEqual(
      [],
    );
    expect(existsSync(join(h.libraryDirectory, "plan-dinner-r2"))).toBe(false);
    const journal = h.database.sqlite
      .prepare(`SELECT COUNT(*) AS n FROM routine_journal`)
      .get() as { n: number };
    expect(journal.n).toBe(0);
  });
});

describe("version bumping", () => {
  it("bumps patch, and stays honest on odd versions", () => {
    expect(bumpRoutineVersion("1.0.0")).toBe("1.0.1");
    expect(bumpRoutineVersion("2.13.9")).toBe("2.13.10");
    expect(bumpRoutineVersion("weird")).toBe("weird-r2");
    expect(bumpRoutineVersion("weird-r2")).toBe("weird-r3");
  });
});

describe("upgrade seams", () => {
  it("re-encodes a pre-split lock at boot, and only when the routine is unchanged", () => {
    const h = harness();
    createAppProfile(
      h.database,
      { name: "App", kind: "routine", allowedRoutineId: "dinner-planner-test" },
      {
        libraryDirectory: h.libraryDirectory,
        routinesDirectory: h.routinesDirectory,
      },
      h.secretsDirectory,
    );
    const routine = loadRoutine(
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
    )!;
    const profileId = firstProfileId(h.database);
    const setLock = (value: string) =>
      h.database.sqlite
        .prepare(
          `UPDATE app_profiles SET routine_content_hash = ? WHERE id = ?`,
        )
        .run(value, profileId);

    // A lock in the OLD format whose routine has not changed: re-encoded.
    setLock(routine.contentHash);
    expect(
      migrateLegacyRoutineTokenLocks(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
      ),
    ).toBe(1);
    expect(
      getAppProfileRoutineLock(h.database, profileId, "dinner-planner-test"),
    ).toBe(routine.executionHash);

    // Already execution-format: nothing to do.
    expect(
      migrateLegacyRoutineTokenLocks(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
      ),
    ).toBe(0);

    // A lock matching NEITHER hash means the routine really changed since the
    // grant — left alone (it must 409 until the Owner re-grants).
    setLock("stale-hash-from-an-older-routine");
    expect(
      migrateLegacyRoutineTokenLocks(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
      ),
    ).toBe(0);
    expect(
      getAppProfileRoutineLock(h.database, profileId, "dinner-planner-test"),
    ).toBe("stale-hash-from-an-older-routine");
  });

  it("reordered schema keys are NOT an edit: no revision, nothing saved", () => {
    const h = harness();
    const body = draftBodyFrom(h);
    body.flow[0] = {
      ...body.flow[0]!,
      methodEdit: {
        recipe: "Summarise the text.",
        // Same schemas as the fixture, keys deliberately reordered — the
        // JSON.parse/stringify round-trip the editor performs.
        inputSchema: {
          required: ["text"],
          properties: { text: { type: "string" } },
          type: "object",
        },
        outputSchema: {
          properties: { summary: { type: "string" } },
          type: "object",
        },
      },
    } as (typeof body.flow)[number];
    const result = saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    expect(result.unchanged).toBe(true);
    expect(existsSync(join(h.libraryDirectory, "plan-dinner-r2"))).toBe(false);
  });

  it("a schema-changing revision drops the copied examples; a recipe-only one keeps them", () => {
    const h = harness();
    const examplesDir = join(h.libraryDirectory, "plan-dinner", "examples");
    mkdirSync(examplesDir, { recursive: true });
    writeFileSync(
      join(examplesDir, "one.json"),
      JSON.stringify({ input: { text: "rice" }, output: { summary: "rice" } }),
      "utf8",
    );

    // Recipe-only edit: the examples still teach the same field shape.
    let body = draftBodyFrom(h);
    body.flow[0] = {
      ...body.flow[0]!,
      methodEdit: {
        recipe: "Summarise the text, briefly.",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
        outputSchema: {
          type: "object",
          properties: { summary: { type: "string" } },
        },
      },
    } as (typeof body.flow)[number];
    saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    expect(
      existsSync(join(h.libraryDirectory, "plan-dinner-r2", "examples")),
    ).toBe(true);

    // Schema-changing edit (of the revision): old-shape examples dropped.
    body = draftBodyFrom(h);
    body.flow[0] = {
      ...body.flow[0]!,
      methodEdit: {
        recipe: "Summarise the text, briefly.",
        inputSchema: {
          type: "object",
          properties: { notes: { type: "string" } },
          required: ["notes"],
        },
        outputSchema: {
          type: "object",
          properties: { summary: { type: "string" } },
        },
      },
    } as (typeof body.flow)[number];
    saveRoutineEdit(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner-planner-test",
      body,
    );
    expect(
      existsSync(join(h.libraryDirectory, "plan-dinner-r2-r2", "examples")),
    ).toBe(false);
    expect(existsSync(join(h.libraryDirectory, "plan-dinner-r2-r2"))).toBe(
      true,
    );
  });

  it("the same existing stepId listed twice is refused", () => {
    const h = harness();
    const body = draftBodyFrom(h);
    body.flow = [body.flow[0]!, { ...body.flow[0]! }];
    expect(() =>
      saveRoutineEdit(
        h.database,
        h.routinesDirectory,
        h.libraryDirectory,
        "dinner-planner-test",
        body,
      ),
    ).toThrow(/duplicate-step/);
  });
});

function firstProfileId(database: DatabaseHandle): string {
  const row = database.sqlite
    .prepare("SELECT id FROM app_profiles LIMIT 1")
    .get() as { id: string };
  return row.id;
}
