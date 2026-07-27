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
import { listMethodSummaries } from "./methods.js";
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
  libraryDirectory?: string,
  imageEngineConnected = false,
): Promise<ClassifyRoutineResponse> {
  const none: ClassifyRoutineResponse = {
    decision: "none",
    routineId: null,
    methodId: null,
    editRequest: null,
    taskRequest: null,
    taskSchedule: null,
    createDescription: null,
    clarifyQuestion: null,
    imagePrompt: null,
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

  // Installed Methods are listed too, so "make the quote one include GST" can
  // be matched to a Method the Owner actually has.
  const methods = libraryDirectory ? listMethodSummaries(libraryDirectory) : [];
  const methodCatalogue =
    methods.length > 0
      ? methods
          .map(
            (method) =>
              `- id: ${method.id} — ${method.name}: ${method.description}`,
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
    "Installed Methods:",
    methodCatalogue,
    "",
    history ? `Recent conversation:\n${history}\n` : "",
    `Owner's latest message: "${content.trim()}"`,
    "",
    "Choose ONE decision:",
    '- "use-routine": clearly wants what a Routine does — pick its id.',
    '- "suggest-routine": a Routine could plausibly help — pick its id.',
    '- "suggest-task": wants Vaenyx to go do a piece of work (research / summary /',
    "  something scheduled) and no Routine fits — offer to run it as a task.",
    '- "use-task": the Owner wants Vaenyx to go do a piece of work AND either',
    "  (a) asked for it on a repeating schedule (\"every morning at 7\", 每天/每周),",
    "  or (b) just AGREED to a previous offer to make a background task. Set",
    "  taskRequest to the thing to do. A clear recurring request needs no prior",
    "  offer — take it directly.",
    '- "create-method": wants to BUILD a new single capability (one reusable',
    "  skill/step — e.g. 建一个/create/make a method, a converter, an extractor)",
    "  that no installed Routine covers — set createDescription.",
    '- "create-routine": wants to BUILD a new multi-step helper (a repeatable',
    "  workflow with several steps) that nothing installed covers — set",
    "  createDescription.",
    '- "edit-method": wants an ALREADY INSTALLED Method to behave differently',
    '  ("make the quote one include GST", "让它别写那么长", "改成…"). Set methodId',
    "  to the Method being talked about and editRequest to what should change, in",
    "  the Owner's language. Only for a Method that is in the list above — never",
    "  invent an id, and never use this to build something new.",
    '- "clarify-create": the Owner clearly wants something BUILT (create-method /',
    "  create-routine territory) but the description is too vague to build from —",
    "  the essentials are missing (what goes in, what should come out, or what the",
    "  steps roughly are). Set clarifyQuestion to ONE short question, in the",
    "  Owner's language, that would make it buildable. Ask at most once: if the",
    "  recent conversation already shows Vaenyx asking a clarifying question about",
    "  this build, never pick this again — pick create-* with your best combined",
    "  understanding instead. Use it the same way for an edit: if the Owner",
    "  clearly wants an installed Method changed but it is not clear WHICH one,",
    "  ask which Method they mean.",
    ...(imageEngineConnected
      ? [
          '- "draw": the Owner wants a picture GENERATED (drawn/created) — a fresh',
          '  ask in any wording, or a follow-up that only makes sense as one here',
          '  ("try again", "就是一只卡通的猫咪你试一下" after image talk). NOT a',
          "  question about an existing photo. Set imagePrompt to ONE short",
          "  ENGLISH image prompt, subject first, then style.",
        ]
      : []),
    '- "none": ordinary conversation, or a question to answer directly here.',
    "",
    "If the recent conversation shows Vaenyx asked a clarifying question about",
    "something to build and the latest message answers it, choose create-method or",
    "create-routine now, with createDescription combining the original ask and the",
    "answers.",
    "",
    "Be conservative: prefer suggest over use; prefer none unless it genuinely",
    "fits. A background task is for work that takes time or repeats — never a quick",
    "answer you can just give now. create-* is only for an explicit ask to build /",
    "create / 建 / 做一个 something reusable — never for a one-off question.",
    "Prefer create-* over clarify-create when a reasonable build is possible —",
    "clarify only when building would mean guessing at the core of what they want.",
    "",
    "If the Owner asked for something REPEATING (every morning / 每天 / weekly /",
    "每周 / at 7am / 定时), also fill taskSchedule so the task is scheduled in the",
    "same step. Read the time they said: \"早上7点\" and \"7am\" are time \"07:00\";",
    "a bare \"每天早上\" with no hour is time \"07:00\" as a sensible default. Use",
    "cadence hourly/daily/weekly/monthly; for weekly set dayOfWeek (0=Sunday), for",
    "monthly set dayOfMonth. If nothing repeating was asked for, taskSchedule null.",
    "",
    "Output ONE JSON object and nothing else:",
    '{ "decision": "none" | "use-routine" | "suggest-routine" | "suggest-task" |',
    '    "use-task" | "create-method" | "create-routine" | "clarify-create" |',
    '    "edit-method",',
    '  "routineId": "<routine id or null>",',
    '  "methodId": "<for edit-method, the installed method id, else null>",',
    '  "editRequest": "<for edit-method, what to change, in the Owner\'s',
    '    language, else null>",',
    '  "taskRequest": "<for use-task, the thing to do, else null>",',
    '  "taskSchedule": { "cadence": "hourly"|"daily"|"weekly"|"monthly",',
    '      "time": "HH:MM" or null, "dayOfWeek": 0-6 or null,',
    '      "dayOfMonth": 1-31 or null } or null,',
    '  "createDescription": "<for create-*, one clean paragraph describing what',
    '    to build, in the Owner\'s language, else null>",',
    '  "clarifyQuestion": "<for clarify-create, the one question to ask, in the',
    '    Owner\'s language, else null>",',
    '  "imagePrompt": "<for draw, one short English image prompt, else null>",',
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
    "create-method",
    "create-routine",
    "clarify-create",
    "edit-method",
    // draw only counts while an engine is connected; a stray verdict from a
    // model that ignored the missing option degrades to plain chat.
    ...(imageEngineConnected ? ["draw"] : []),
  ].includes(parsed.decision as string)
    ? (parsed.decision as ClassifyRoutineResponse["decision"])
    : "none";
  if (decision === "none") return none;

  const note = typeof parsed.note === "string" ? parsed.note.trim() : "";
  const routineId =
    typeof parsed.routineId === "string" ? parsed.routineId : null;
  const methodId = typeof parsed.methodId === "string" ? parsed.methodId : null;
  const editRequest =
    typeof parsed.editRequest === "string" && parsed.editRequest.trim()
      ? parsed.editRequest.trim().slice(0, 2000)
      : null;
  const taskRequest =
    typeof parsed.taskRequest === "string" && parsed.taskRequest.trim()
      ? parsed.taskRequest.trim()
      : null;
  const createDescription =
    typeof parsed.createDescription === "string" &&
    parsed.createDescription.trim()
      ? parsed.createDescription.trim().slice(0, 2000)
      : null;
  const clarifyQuestion =
    typeof parsed.clarifyQuestion === "string" && parsed.clarifyQuestion.trim()
      ? parsed.clarifyQuestion.trim().slice(0, 500)
      : null;
  const imagePrompt =
    typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()
      ? parsed.imagePrompt.trim().slice(0, 600)
      : null;

  if (decision === "draw") {
    // No usable prompt = no draw: generating from a guess is worse than a
    // plain reply that answers normally.
    if (!imagePrompt) return none;
    return { ...none, decision: "draw", imagePrompt, note };
  }

  // Schedule: validated strictly. A malformed time would otherwise become a
  // task that fires at the wrong hour (or never), so anything that does not
  // parse cleanly degrades to "no schedule" — the task is still created, just
  // unscheduled, which the Owner can see and fix.
  const rawSchedule = parsed.taskSchedule as
    | { cadence?: unknown; time?: unknown; dayOfWeek?: unknown; dayOfMonth?: unknown }
    | null
    | undefined;
  let taskSchedule: ClassifyRoutineResponse["taskSchedule"] = null;
  if (
    rawSchedule &&
    ["hourly", "daily", "weekly", "monthly"].includes(
      rawSchedule.cadence as string,
    )
  ) {
    const time =
      typeof rawSchedule.time === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(rawSchedule.time.trim())
        ? rawSchedule.time.trim()
        : null;
    const dayOfWeek =
      Number.isInteger(rawSchedule.dayOfWeek) &&
      (rawSchedule.dayOfWeek as number) >= 0 &&
      (rawSchedule.dayOfWeek as number) <= 6
        ? (rawSchedule.dayOfWeek as number)
        : null;
    const dayOfMonth =
      Number.isInteger(rawSchedule.dayOfMonth) &&
      (rawSchedule.dayOfMonth as number) >= 1 &&
      (rawSchedule.dayOfMonth as number) <= 31
        ? (rawSchedule.dayOfMonth as number)
        : null;
    taskSchedule = {
      cadence: rawSchedule.cadence as "hourly" | "daily" | "weekly" | "monthly",
      time,
      dayOfWeek,
      dayOfMonth,
    };
  }

  if (decision === "use-routine" || decision === "suggest-routine") {
    // The model must pick a real installed Routine; otherwise treat as none.
    if (!routineId || !routines.some((routine) => routine.id === routineId)) {
      return none;
    }
    return {
      decision,
      routineId,
      methodId: null,
      editRequest: null,
      taskRequest: null,
      taskSchedule: null,
      createDescription: null,
      clarifyQuestion: null,
      imagePrompt: null,
      note,
    };
  }

  if (decision === "use-task") {
    if (!taskRequest) return none;
    return {
      decision,
      routineId: null,
      methodId: null,
      editRequest: null,
      taskRequest,
      taskSchedule,
      createDescription: null,
      clarifyQuestion: null,
      imagePrompt: null,
      note,
    };
  }

  if (decision === "create-method" || decision === "create-routine") {
    // Fall back to the Owner's own words if the model skipped the distilled
    // description — the offer is still worth showing.
    return {
      decision,
      routineId: null,
      methodId: null,
      editRequest: null,
      taskRequest: null,
      taskSchedule: null,
      createDescription: createDescription ?? content.trim().slice(0, 2000),
      clarifyQuestion: null,
      imagePrompt: null,
      note,
    };
  }

  if (decision === "edit-method") {
    // The Method must be one the Owner actually has, and there must be a stated
    // change. Anything else degrades to plain chat rather than guessing at
    // which of their Methods to rewrite.
    if (
      !methodId ||
      !editRequest ||
      !methods.some((method) => method.id === methodId)
    ) {
      return none;
    }
    return {
      decision,
      routineId: null,
      methodId,
      editRequest,
      taskRequest: null,
      taskSchedule: null,
      createDescription: null,
      clarifyQuestion: null,
      imagePrompt: null,
      note,
    };
  }

  if (decision === "clarify-create") {
    // A clarify verdict is only actionable with the actual question; without it
    // there is nothing safe to do, so degrade to plain chat.
    if (!clarifyQuestion) return none;
    return {
      decision,
      routineId: null,
      methodId: null,
      editRequest: null,
      taskRequest: null,
      taskSchedule: null,
      createDescription: null,
      clarifyQuestion,
      imagePrompt: null,
      note,
    };
  }

  // suggest-task
  return {
    decision,
    routineId: null,
    methodId: null,
    editRequest: null,
    taskRequest: null,
    taskSchedule,
    createDescription: null,
    clarifyQuestion: null,
    imagePrompt: null,
    note,
  };
}
