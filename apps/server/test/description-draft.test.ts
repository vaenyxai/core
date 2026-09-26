// H-018 · a Method or Routine drafted from a one-sentence description. The
// model is a stub, so these test the plumbing: the draft is complete, nothing
// is written until Save, and what Save writes is what was previewed.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { draftFromDescription } from "../src/modules/core/description-draft.js";
import { createMethod } from "../src/modules/core/methods.js";
import { createRoutineFromPlan } from "../src/modules/core/routines.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function tempDirectory(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-h018-"));
  directories.push(directory);
  return directory;
}

function everyFile(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

const NOTICE_METHOD = {
  name: "School notice digest",
  description: "Turns a school notice into dates and actions.",
  recipe:
    "Read the school notice. List each date, what happens, and what the family must do.",
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
  outputSchema: {
    type: "object",
    properties: { items: { type: "array", items: { type: "string" } } },
  },
  tags: ["school"],
};

const ROUTINE_ANSWER = JSON.stringify({
  name: "Weekly School Notices",
  description: "Sorts the week's school notices into dates and actions.",
  does: "Each week, sorts the school notices into dates and things to do.",
  input: "The school notices from this week",
  mode: "accumulate",
  steps: [{ title: "Sort the notices", method: NOTICE_METHOD }],
});

const METHOD_ANSWER = JSON.stringify({
  ...NOTICE_METHOD,
  does: "Turns one school notice into dates and actions.",
  input: "One school notice",
});

describe("drafting from a description", () => {
  it("drafts a Routine with plain review lines and writes nothing", async () => {
    const library = tempDirectory();
    let seenPrompt = "";
    const draft = await draftFromDescription(
      "routine",
      "帮我建一个每周整理学校通知的 Routine",
      library,
      undefined,
      async (prompt) => {
        seenPrompt = prompt;
        return ROUTINE_ANSWER;
      },
    );
    expect(seenPrompt).toContain("每周整理学校通知");
    expect(seenPrompt).toContain('"does"');
    expect(draft.kind).toBe("routine");
    expect(draft.summary).toEqual({
      does: "Each week, sorts the school notices into dates and things to do.",
      input: "The school notices from this week",
      corrections: [],
      capabilities: [],
    });
    // Drafting — and so Cancel — leaves the Library exactly as it was.
    expect(everyFile(library)).toEqual([]);
  });

  it("saves exactly the previewed Routine through the declarative path", async () => {
    const library = tempDirectory();
    const routines = tempDirectory();
    const draft = await draftFromDescription(
      "routine",
      "weekly school notices",
      library,
      undefined,
      async () => ROUTINE_ANSWER,
    );
    const saved = createRoutineFromPlan(routines, library, draft.plan);
    expect(saved.name).toBe(draft.plan.name);
    for (const name of [...everyFile(library), ...everyFile(routines)]) {
      expect(name).toMatch(/\.(json|md)$/);
    }
    const methodDirectory = readdirSync(library)[0]!;
    expect(
      readFileSync(join(library, methodDirectory, "recipe.md"), "utf8"),
    ).toContain(NOTICE_METHOD.recipe);
  });

  it("drafts an explicitly named Method as a one-step plan and saves that Method", async () => {
    const library = tempDirectory();
    const draft = await draftFromDescription(
      "method",
      "a Method that turns a school notice into dates and actions",
      library,
      undefined,
      async () => METHOD_ANSWER,
    );
    expect(draft.kind).toBe("method");
    expect(draft.plan.steps).toHaveLength(1);
    expect(draft.summary.input).toBe("One school notice");
    expect(everyFile(library)).toEqual([]);

    const method = draft.plan.steps[0]!.method!;
    const saved = createMethod(library, method);
    expect(saved.name).toBe(NOTICE_METHOD.name);
    expect(saved.recipe.trim()).toBe(NOTICE_METHOD.recipe);
  });

  it("refuses a draft that could not be saved instead of offering it", async () => {
    const library = tempDirectory();
    await expect(
      draftFromDescription("routine", "notices", library, undefined, async () =>
        JSON.stringify({ name: "Empty", steps: [] }),
      ),
    ).rejects.toThrow("ROUTINE_DRAFT_EMPTY");
    await expect(
      draftFromDescription("method", "notices", library, undefined, async () =>
        JSON.stringify({ ...NOTICE_METHOD, recipe: "" }),
      ),
    ).rejects.toThrow("ROUTINE_DRAFT_INVALID");
    await expect(
      draftFromDescription("routine", "notices", library, undefined, async () =>
        JSON.stringify({
          name: "Reuse",
          steps: [{ title: "Missing", reuse: "no-such-method" }],
        }),
      ),
    ).rejects.toThrow("PLAN_METHOD_NOT_FOUND");
  });
});
