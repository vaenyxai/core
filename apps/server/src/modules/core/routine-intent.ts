// Vaenyx Library v2 — AI-driven Routine intent (B).
//
// Before a plain chat reply, decide whether the Owner's latest message should be
// handled by one of their installed Routines:
//   "use"     — the Owner clearly wants what a Routine does (auto-attach + run)
//   "suggest" — a Routine could plausibly help (the reply briefly offers it)
//   "none"    — ordinary chat
// Deliberately conservative: prefer "suggest" over "use", and "none" unless one
// genuinely fits. This only CLASSIFIES — attaching/running is the caller's job —
// so a misjudgement never silently does anything irreversible. Best-effort: any
// failure degrades to "none" and the normal reply proceeds.

import type { ClassifyRoutineResponse } from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

import { getDefaultProvider } from "../models/registry.js";

import { listAskVaenyxMessages } from "./ask-vaenyx.js";
import { listRoutineSummaries } from "./routines.js";

function extractJson(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export async function classifyRoutineIntent(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  content: string,
  routinesDirectory: string,
  signal: AbortSignal,
): Promise<ClassifyRoutineResponse> {
  const none: ClassifyRoutineResponse = {
    decision: "none",
    routineId: null,
    taskRequest: null,
    note: "",
  };

  const routines = listRoutineSummaries(routinesDirectory);
  const catalogue =
    routines.length > 0
      ? routines
          .map(
            (routine) =>
              `- id: ${routine.id} — ${routine.name}: ${routine.description} [tags: ${routine.tags.join(", ")}]`,
          )
          .join("\n")
      : "(none installed)";

  const history = listAskVaenyxMessages(database, conversationId, ownerId)
    .filter(
      (message) => !(message.role === "assistant" && message.status === "failed"),
    )
    .slice(-8)
    .map(
      (message) =>
        `${message.role === "owner" ? "Owner" : "Vaenyx"}: ${message.content}`,
    )
    .join("\n");

  const prompt = [
    "You decide whether the Owner's latest message should trigger one of two",
    "things, or neither:",
    "- a saved Routine (a step-by-step helper: takes input, produces a result), or",
    "- a background Task (Vaenyx goes off and does work that takes time — research,",
    "  a summary, something on a schedule — when no Routine fits).",
    "",
    "Installed Routines:",
    catalogue,
    "",
    history ? `Recent conversation:\n${history}\n` : "",
    `Owner's latest message: "${content.trim()}"`,
    "",
    "Choose ONE decision:",
    '- "use-routine": clearly wants what a Routine does — pick its id.',
    '- "suggest-routine": a Routine could plausibly help — pick its id.',
    '- "suggest-task": wants Vaenyx to go do a piece of work (research / summary /',
    "  something scheduled) and no Routine fits — offer to run it as a task.",
    '- "use-task": the Owner just AGREED to a previous offer to make a background',
    "  task (replied yes/ok to it) — set taskRequest to the thing to do.",
    '- "none": ordinary conversation, or a question to answer directly here.',
    "",
    "Be conservative: prefer suggest over use; prefer none unless it genuinely",
    "fits. A background task is for work that takes time or repeats — never a quick",
    "answer you can just give now.",
    "",
    "Output ONE JSON object and nothing else:",
    '{ "decision": "none" | "use-routine" | "suggest-routine" | "suggest-task" |',
    '    "use-task",',
    '  "routineId": "<routine id or null>",',
    '  "taskRequest": "<for use-task, the thing to do, else null>",',
    '  "note": "<one short sentence, or empty>" }',
  ].join("\n");

  let answer: string;
  try {
    const result = await getDefaultProvider().sendChat(
      [{ content: prompt, role: "owner" }],
      undefined,
      { signal },
    );
    answer = result.answer;
  } catch {
    return none; // best-effort; never block the reply on classification
  }

  const parsed = extractJson(answer);
  if (!parsed) return none;

  const decision = [
    "use-routine",
    "suggest-routine",
    "suggest-task",
    "use-task",
  ].includes(parsed.decision as string)
    ? (parsed.decision as ClassifyRoutineResponse["decision"])
    : "none";
  if (decision === "none") return none;

  const note = typeof parsed.note === "string" ? parsed.note.trim() : "";
  const routineId =
    typeof parsed.routineId === "string" ? parsed.routineId : null;
  const taskRequest =
    typeof parsed.taskRequest === "string" && parsed.taskRequest.trim()
      ? parsed.taskRequest.trim()
      : null;

  if (decision === "use-routine" || decision === "suggest-routine") {
    // The model must pick a real installed Routine; otherwise treat as none.
    if (!routineId || !routines.some((routine) => routine.id === routineId)) {
      return none;
    }
    return { decision, routineId, taskRequest: null, note };
  }

  if (decision === "use-task") {
    if (!taskRequest) return none;
    return { decision, routineId: null, taskRequest, note };
  }

  // suggest-task
  return { decision, routineId: null, taskRequest: null, note };
}
