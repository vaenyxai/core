// H-018 · DRAFT-FIRST CREATION FROM A DESCRIPTION (Oskar, 2026-09-27).
//
// "帮我建一个每周整理学校通知的 Routine" used to be built and saved in the
// background. It now drafts first: the same review H-017 shows for "以后都这样
// 做" — what it will do, what to give it, which Capabilities it uses — and
// only the Owner's Save writes it. An explicitly named Method follows the same
// rule; its draft is a one-step plan whose step carries the Method, so both
// kinds share one review and one check.
//
// Nothing is written here.
import type { DescriptionDraft, RoutinePlan } from "@vaenyx/contracts";

import { runAskVaenyxChat } from "../harness/codex.js";
import { getDefaultProvider } from "../models/registry.js";
import { checkRoutineDraft } from "./conversation-routine.js";
import { methodDraftPrompt, parseMethodDraftAnswer } from "./methods.js";
import { parseRoutinePlanAnswer, routinePlanPrompt } from "./routines.js";

// The plain lines the review shows, asked of the same planner call.
const SUMMARY_FIELDS = [
  '  "does": one plain line: what it will do each time, in the Owner\'s language,',
  '  "input": one plain line: what to give it (e.g. a school newsletter), in the Owner\'s language,',
];

function plainLine(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Draft a Method or Routine from the Owner's description for review. `ask`
 * is the model call (injectable for tests).
 */
export async function draftFromDescription(
  kind: "method" | "routine",
  description: string,
  libraryDirectory: string,
  signal?: AbortSignal,
  ask?: (prompt: string) => Promise<string>,
): Promise<DescriptionDraft> {
  if (!description.trim()) throw new Error("DESCRIPTION_DRAFT_EMPTY");
  const prompt =
    kind === "method"
      ? methodDraftPrompt(description, SUMMARY_FIELDS)
      : routinePlanPrompt(description, libraryDirectory, SUMMARY_FIELDS);
  const options = { allowWeb: false, ...(signal ? { signal } : {}) };
  const answer = ask
    ? await ask(prompt)
    : kind === "method"
      ? (
          await runAskVaenyxChat(
            [{ content: prompt, role: "owner" }],
            undefined,
            options,
          )
        ).answer
      : (
          await getDefaultProvider().sendChat(
            [{ content: prompt, role: "owner" }],
            undefined,
            options,
          )
        ).answer;

  let plan: RoutinePlan;
  let raw: Record<string, unknown>;
  if (kind === "method") {
    const parsed = parseMethodDraftAnswer(answer);
    raw = parsed.raw;
    plan = {
      name: parsed.draft.name,
      description: parsed.draft.description,
      mode: "one-shot",
      steps: [{ title: parsed.draft.name, method: parsed.draft }],
    };
  } else {
    ({ plan, raw } = parseRoutinePlanAnswer(answer));
  }
  const capabilities = checkRoutineDraft(plan, libraryDirectory);
  return {
    kind,
    plan,
    summary: {
      does: plainLine(raw.does) || plan.description,
      input: plainLine(raw.input),
      // A description has no corrections to keep; that line is H-017's.
      corrections: [],
      capabilities,
    },
  };
}
