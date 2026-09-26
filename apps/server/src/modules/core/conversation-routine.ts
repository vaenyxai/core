// H-017 · SAVE THIS CONVERSATION AS A ROUTINE (Oskar, 2026-09-19).
//
// Once Vaenyx has done a job in a Conversation — corrections included — the
// Owner can say "以后都这样做" / "do it like this from now on". This file
// turns WHAT ACTUALLY HAPPENED into a Routine draft: the inputs that were
// used, the final accepted output, and every Owner correction, taken from a
// bounded, redacted slice of the Conversation. The existing create-from-a-
// description path plans from one generated sentence; this one plans from
// the work itself, so a corrected category is part of the recipe.
//
// Nothing is saved here. The draft goes back to the Owner in plain words
// (what it will do, on what input, with which Capabilities, which of their
// corrections it keeps) and only their Save writes it, through the ordinary
// declarative Routine path. No example leaves the machine: the Conversation
// is read to write the recipe, never copied into a shareable example.
import type {
  AskVaenyxMessage,
  ConversationRoutineDraft,
  RoutinePlan,
} from "@vaenyx/contracts";

import { getDefaultProvider } from "../models/registry.js";
import { capabilitiesFromManifest } from "./capabilities.js";
import { redactConversationSearchText } from "./conversation-search.js";
import { listMethodSummaries, loadMethod } from "./methods.js";
import { parseRoutinePlanAnswer } from "./routines.js";

// A bounded slice: the recent work, never the whole history.
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 1500;

/**
 * The slice of the Conversation the planner may read: completed turns only,
 * credentials redacted, each message capped. Null when there is no finished
 * job to learn from yet (no Owner input answered by Vaenyx).
 */
export function conversationRoutineTranscript(
  messages: AskVaenyxMessage[],
): string | null {
  const usable = messages.filter(
    (message) =>
      message.status === "completed" && message.content.trim().length > 0,
  );
  const recent = usable.slice(-MAX_MESSAGES);
  const hasInput = recent.some((message) => message.role === "owner");
  const hasOutput = recent.some((message) => message.role === "assistant");
  if (!hasInput || !hasOutput) return null;
  return recent
    .map((message) => {
      const speaker = message.role === "owner" ? "Owner" : "Vaenyx";
      const text = redactConversationSearchText(message.content).slice(
        0,
        MAX_MESSAGE_CHARS,
      );
      return `${speaker}: ${text}`;
    })
    .join("\n\n");
}

export function conversationRoutinePrompt(
  transcript: string,
  availableMethods: string,
): string {
  return [
    "The Owner has just had Vaenyx do a job in the conversation below, and now",
    'says "do it like this from now on". Draft a Vaenyx Routine that repeats',
    "that job for the next similar input, built from WHAT ACTUALLY HAPPENED —",
    "not from a guess at what they might want.",
    "",
    "A Routine is ordered steps; each step is ONE Method (declarative recipe +",
    "JSON Schemas, never code). The steps run as a straight chain: step 1 gets",
    "the Owner's input, each later step gets the previous step's output.",
    "Reuse an existing Method when one fits; otherwise draft a new one.",
    "Available Methods you may reuse (by exact id):",
    availableMethods || "(none yet)",
    "",
    "Rules:",
    "- The recipe must reproduce the FINAL ACCEPTED result for inputs like the",
    "  one used here.",
    "- Every correction the Owner made (a changed category, a different",
    "  format, something to always include or leave out) becomes an explicit",
    "  rule in the relevant recipe, in plain words.",
    "- Do not copy the Owner's personal data (names, addresses, numbers) into",
    "  the recipe; describe the rule instead.",
    "",
    "Output ONE JSON object and nothing else:",
    "{",
    '  "name": short routine title in the Owner\'s language,',
    '  "description": one plain-language line,',
    '  "does": one plain line: what it will do each time, in the Owner\'s language,',
    '  "input": one plain line: what to give it (e.g. a receipt photo), in the Owner\'s language,',
    '  "corrections": [each Owner correction it keeps, one short line each, in the Owner\'s language; [] if none],',
    '  "mode": "accumulate" or "one-shot",',
    '  "steps": [',
    '    { "title": short step label, "reuse": "<existing method id>" }',
    "    OR",
    '    { "title": short step label, "method": { "name", "description", "recipe"',
    '      (plain declarative instructions, no code), "inputSchema" (JSON Schema),',
    '      "outputSchema" (JSON Schema), "tags": [..] } }',
    "  ]",
    "}",
    "Use as few steps as the job needs. Output ONLY the JSON object, no fences.",
    "",
    "The conversation:",
    transcript,
  ].join("\n");
}

function plainLine(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Plan a Routine from the Conversation's real work. `ask` is the model call
 * (injectable for tests); the result is a draft for the Owner to review —
 * nothing is written.
 */
export async function planRoutineFromConversation(
  messages: AskVaenyxMessage[],
  libraryDirectory: string,
  signal?: AbortSignal,
  ask?: (prompt: string) => Promise<string>,
): Promise<ConversationRoutineDraft> {
  const transcript = conversationRoutineTranscript(messages);
  if (!transcript) throw new Error("ROUTINE_DRAFT_NOTHING_DONE");
  const available = listMethodSummaries(libraryDirectory)
    .map(
      (method) =>
        `- id: ${method.id} — ${method.name}: ${method.description} [tags: ${method.tags.join(", ")}]`,
    )
    .join("\n");
  const prompt = conversationRoutinePrompt(transcript, available);
  const answer = ask
    ? await ask(prompt)
    : (
        await getDefaultProvider().sendChat(
          [{ content: prompt, role: "owner" }],
          undefined,
          { allowWeb: false, ...(signal ? { signal } : {}) },
        )
      ).answer;

  const { plan, raw } = parseRoutinePlanAnswer(answer);
  if (plan.steps.length === 0) throw new Error("ROUTINE_DRAFT_EMPTY");
  // A reused Method must exist, and its declared Capabilities are what the
  // Owner is told the Routine will reach for. A drafted Method declares none.
  const capabilities = new Set<string>();
  for (const step of plan.steps) {
    if (!step.reuse) continue;
    const method = loadMethod(libraryDirectory, step.reuse);
    if (!method) throw new Error(`PLAN_METHOD_NOT_FOUND:${step.reuse}`);
    for (const capability of capabilitiesFromManifest(method.manifest)
      .capabilities) {
      capabilities.add(capability);
    }
  }
  for (const step of plan.steps) {
    if (step.method && !step.method.recipe.trim()) {
      throw new Error("ROUTINE_DRAFT_INVALID");
    }
  }
  const corrections = Array.isArray(raw.corrections)
    ? raw.corrections
        .map((item) => plainLine(item, 200))
        .filter(Boolean)
        .slice(0, 10)
    : [];
  return {
    plan: plan as RoutinePlan,
    summary: {
      does: plainLine(raw.does) || plan.description,
      input: plainLine(raw.input),
      corrections,
      capabilities: [...capabilities],
    },
  };
}
