// H-017 · a Routine drafted from what a Conversation actually did. Every
// fixture is synthetic; the model is a stub, so these test the plumbing, not
// a model's judgement.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { AskVaenyxMessage } from "@vaenyx/contracts";
import { afterEach, describe, expect, it } from "vitest";

import {
  conversationRoutineTranscript,
  planRoutineFromConversation,
} from "../src/modules/core/conversation-routine.js";
import { createRoutineFromPlan } from "../src/modules/core/routines.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function tempDirectory(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-h017-"));
  directories.push(directory);
  return directory;
}

function message(
  role: "owner" | "assistant",
  content: string,
  index: number,
  status: "completed" | "failed" = "completed",
): AskVaenyxMessage {
  return {
    id: `m${index}`,
    conversationId: "c1",
    role,
    content,
    status,
    webSearchUsed: false,
    createdAt: `2026-09-26T00:00:0${index}.000Z`,
  } as AskVaenyxMessage;
}

// The receipt scenario: one receipt handled, then the category corrected.
const RECEIPT_CONVERSATION = [
  message("owner", "(Photo) Please record this receipt.", 1),
  message("assistant", "Recorded: Corner Grocer, 12 Sep, $18.40, category Dining.", 2),
  message("owner", "Groceries from Corner Grocer are Household, not Dining.", 3),
  message("assistant", "Updated: Corner Grocer, 12 Sep, $18.40, category Household.", 4),
  message("owner", "以后都这样做", 5),
];

const STUB_ANSWER = JSON.stringify({
  name: "Receipt Record",
  description: "Records a receipt photo as merchant, date, total and category.",
  does: "Reads a receipt photo and records merchant, date, total and category.",
  input: "A receipt photo",
  corrections: ["Groceries go under Household, not Dining"],
  mode: "accumulate",
  steps: [
    {
      title: "Record the receipt",
      method: {
        name: "Receipt to record",
        description: "Turns a receipt into a structured record.",
        recipe:
          "Read the receipt. Record merchant, date, total and category. Groceries go under Household, not Dining.",
        inputSchema: { type: "object", properties: { text: { type: "string" } } },
        outputSchema: {
          type: "object",
          properties: {
            merchant: { type: "string" },
            total: { type: "string" },
            category: { type: "string" },
          },
        },
        tags: ["receipt"],
      },
    },
  ],
});

describe("the conversation slice the planner reads", () => {
  it("refuses a conversation where nothing has been done yet", () => {
    expect(
      conversationRoutineTranscript([message("owner", "以后都这样做", 1)]),
    ).toBeNull();
    expect(conversationRoutineTranscript([])).toBeNull();
  });

  it("keeps completed turns only and redacts credentials", () => {
    const transcript = conversationRoutineTranscript([
      message("owner", "My portal password: hunter-two-secret. Record this.", 1),
      message("assistant", "Something broke", 2, "failed"),
      message("assistant", "Recorded.", 3),
    ]);
    expect(transcript).not.toBeNull();
    expect(transcript).not.toContain("hunter-two-secret");
    expect(transcript).not.toContain("Something broke");
    expect(transcript).toContain("Vaenyx: Recorded.");
  });
});

describe("drafting from what actually happened", () => {
  it("carries the Owner's correction into the draft and asks the model with the real work", async () => {
    let seenPrompt = "";
    const draft = await planRoutineFromConversation(
      RECEIPT_CONVERSATION,
      tempDirectory(),
      undefined,
      async (prompt) => {
        seenPrompt = prompt;
        return STUB_ANSWER;
      },
    );
    // The planner is shown the conversation itself, corrections included.
    expect(seenPrompt).toContain("not Dining");
    expect(seenPrompt).toContain("WHAT ACTUALLY HAPPENED");
    // The correction is in the draft the Owner reviews, and in the recipe.
    expect(draft.summary.corrections).toEqual([
      "Groceries go under Household, not Dining",
    ]);
    expect(draft.plan.steps[0]?.method?.recipe).toContain("Household, not Dining");
    expect(draft.summary.input).toBe("A receipt photo");
    // A freshly drafted Method declares no Capabilities.
    expect(draft.summary.capabilities).toEqual([]);
  });

  it("refuses an empty or code-free-but-empty draft instead of saving nothing useful", async () => {
    await expect(
      planRoutineFromConversation(RECEIPT_CONVERSATION, tempDirectory(), undefined, async () =>
        JSON.stringify({ name: "Empty", steps: [] }),
      ),
    ).rejects.toThrow("ROUTINE_DRAFT_EMPTY");
    await expect(
      planRoutineFromConversation([], tempDirectory(), undefined, async () => STUB_ANSWER),
    ).rejects.toThrow("ROUTINE_DRAFT_NOTHING_DONE");
  });

  it("saves through the ordinary declarative path: recipe and schemas, no code", async () => {
    const library = tempDirectory();
    const routines = tempDirectory();
    const draft = await planRoutineFromConversation(
      RECEIPT_CONVERSATION,
      library,
      undefined,
      async () => STUB_ANSWER,
    );
    const saved = createRoutineFromPlan(routines, library, draft.plan);
    expect(saved.name).toBe("Receipt Record");

    const everyFile = (root: string): string[] =>
      readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name);
    const files = [...everyFile(library), ...everyFile(routines)];
    expect(files.length).toBeGreaterThan(0);
    // Only declarative file kinds; nothing that could run.
    for (const name of files) {
      expect(name).toMatch(/\.(json|md)$/);
    }
    // The saved recipe still carries the correction; no example was copied.
    const methodDirectory = readdirSync(library)[0]!;
    expect(
      readFileSync(join(library, methodDirectory, "recipe.md"), "utf8"),
    ).toContain("Household, not Dining");
    expect(existsSync(join(library, methodDirectory, "examples"))).toBe(false);
  });
});
