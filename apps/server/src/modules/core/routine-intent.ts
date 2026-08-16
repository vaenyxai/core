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

/**
 * WHERE A "GO CHANGE X" CAN POINT. A closed list, and the closedness is the
 * safety: the model picks FROM it or the verdict degrades to none, so a
 * hallucinated destination cannot exist. Each id maps to a real screen the
 * client knows how to open; nothing here performs the change itself.
 */
export const GO_TARGETS = [
  {
    id: "settings",
    hint: "general settings: agent name, language, password, backups, models, phone access, sharing",
  },
  {
    id: "projects",
    hint: "the projects screen: project instructions and memories",
  },
  { id: "scheduled", hint: "scheduled tasks: timers, recurring runs" },
  { id: "library", hint: "the Library: installed Routines" },
  {
    id: "library-methods",
    hint: "the Library's Methods tab: recipes, tags, corrections",
  },
  {
    id: "library-tokens",
    hint: "the Library's Tokens tab: keys for outside apps",
  },
  {
    id: "library-community",
    hint: "the Library's Community tab: publish account",
  },
  {
    id: "vaenyx-me",
    hint: "Vaenyx Me: what Vaenyx has learned about the Owner",
  },
  { id: "guard", hint: "Guard: the audit log of allowed and refused actions" },
] as const;

export async function classifyRoutineIntent(
  database: DatabaseHandle,
  conversationId: string,
  ownerId: string,
  content: string,
  routinesDirectory: string,
  signal: AbortSignal,
  libraryDirectory?: string,
  imageEngineConnected = false,
  photoAvailable = false,
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
    goTarget: null,
    taskTitle: null,
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
      (message) =>
        !(message.role === "assistant" && message.status === "failed"),
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
    '  (a) asked for it on a repeating schedule ("every morning at 7", 每天/每周),',
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
    '- "edit-routine": wants an ALREADY INSTALLED Routine to WORK differently —',
    '  its steps, its result, its look ("让晚餐规划给三个选择", "把结果做成',
    '  表格", "以后也列出缺的食材"). Set routineId to the Routine being talked',
    "  about and editRequest to what should change, in the Owner's language.",
    "  Only for a Routine in the list above — never invent an id, and never",
    "  use this to build something new. Prefer edit-routine over edit-method",
    "  when the Owner talks about the Routine as a whole.",
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
          "  ask in any wording, or a follow-up that only makes sense as one here",
          '  ("try again", "就是一只卡通的猫咪你试一下" after image talk). NOT a',
          "  question about an existing photo. Set imagePrompt to ONE short",
          "  ENGLISH image prompt, subject first, then style.",
        ]
      : []),
    ...(photoAvailable
      ? [
          '- "annotate": the Owner wants the things in a photo ALREADY in this',
          "  conversation pointed out ON the picture — marked, labelled, circled,",
          '  named in place ("标出来", "在照片上标一下", "mark them on the photo",',
          '  "show me which is which"). Understand the intent, not keywords. NOT',
          "  a request to generate a picture, and NOT a plain question about the",
          "  photo that a written answer serves.",
        ]
      : []),
    '- "go-to": the Owner asks to OPEN a screen or to CHANGE something that',
    "  lives on one (rename the agent, 打开手机访问, change the password, look",
    "  at the audit log). Pick goTarget from this fixed list — the ids are the",
    "  only legal values:",
    ...GO_TARGETS.map((target) => `    ${target.id}: ${target.hint}`),
    "  This only OFFERS a jump button; it never changes the setting. Never for",
    "  a question ABOUT a setting that a written answer serves.",
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
    'same step. Read the time they said: "早上7点" and "7am" are time "07:00";',
    'a bare "每天早上" with no hour is time "07:00" as a sensible default. Use',
    "cadence hourly/daily/weekly/monthly; for weekly set dayOfWeek (0=Sunday), for",
    "monthly set dayOfMonth. If nothing repeating was asked for, taskSchedule null.",
    "",
    "Output ONE JSON object and nothing else:",
    '{ "decision": "none" | "use-routine" | "suggest-routine" | "suggest-task" |',
    '    "use-task" | "create-method" | "create-routine" | "clarify-create" |',
    '    "edit-method" | "edit-routine",',
    '  "routineId": "<routine id or null>",',
    '  "methodId": "<for edit-method, the installed method id, else null>",',
    '  "editRequest": "<for edit-method or edit-routine, what to change, in',
    "    the Owner's language, else null>\",",
    '  "taskRequest": "<for use-task, the thing to do, else null>",',
    '  "taskTitle": "<for use-task, a title of 2-6 words in the Owner\'s',
    '    language (e.g. 墨尔本建筑新闻早报), else null>",',
    '  "taskSchedule": { "cadence": "hourly"|"daily"|"weekly"|"monthly",',
    '      "time": "HH:MM" or null, "dayOfWeek": 0-6 or null,',
    '      "dayOfMonth": 1-31 or null } or null,',
    '  "createDescription": "<for create-*, one clean paragraph describing what',
    "    to build, in the Owner's language, else null>\",",
    '  "clarifyQuestion": "<for clarify-create, the one question to ask, in the',
    "    Owner's language, else null>\",",
    '  "imagePrompt": "<for draw, one short English image prompt, else null>",',
    '  "goTarget": "<for go-to, one id from the list above, else null>",',
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
    "edit-routine",
    "go-to",
    // draw/annotate only count while their engines can actually run; a stray
    // verdict from a model that ignored the missing option degrades to chat.
    ...(imageEngineConnected ? ["draw"] : []),
    ...(photoAvailable ? ["annotate"] : []),
  ].includes(parsed.decision as string)
    ? (parsed.decision as ClassifyRoutineResponse["decision"])
    : "none";
  if (decision === "none") return none;

  const note = typeof parsed.note === "string" ? parsed.note.trim() : "";

  if (decision === "go-to") {
    const target =
      typeof parsed.goTarget === "string" ? parsed.goTarget.trim() : "";
    // The closed list IS the safety: an id the client has no screen for, or
    // one the model invented, degrades to ordinary chat rather than to a
    // button that goes nowhere.
    if (!GO_TARGETS.some((entry) => entry.id === target)) return none;
    return { ...none, decision: "go-to", goTarget: target, note };
  }
  const routineId =
    typeof parsed.routineId === "string" ? parsed.routineId : null;
  const methodId = typeof parsed.methodId === "string" ? parsed.methodId : null;
  const editRequest =
    typeof parsed.editRequest === "string" && parsed.editRequest.trim()
      ? parsed.editRequest.trim().slice(0, 2000)
      : null;
  const taskTitle =
    typeof parsed.taskTitle === "string" && parsed.taskTitle.trim()
      ? parsed.taskTitle.trim().slice(0, 80)
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

  if (decision === "annotate") {
    return { ...none, decision: "annotate", note };
  }

  // Schedule: validated strictly. A malformed time would otherwise become a
  // task that fires at the wrong hour (or never), so anything that does not
  // parse cleanly degrades to "no schedule" — the task is still created, just
  // unscheduled, which the Owner can see and fix.
  const rawSchedule = parsed.taskSchedule as
    | {
        cadence?: unknown;
        time?: unknown;
        dayOfWeek?: unknown;
        dayOfMonth?: unknown;
      }
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
      goTarget: null,
      taskTitle,
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
      goTarget: null,
      taskTitle,
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
      goTarget: null,
      taskTitle,
      note,
    };
  }

  if (decision === "edit-routine") {
    // The Routine must be installed AND the Owner's own — community Routines
    // are not editable in place, so a verdict against one degrades to plain
    // chat (the reply can still explain copying). A missing editRequest means
    // there is nothing safe to draft from.
    if (
      !routineId ||
      !editRequest ||
      !routines.some(
        (routine) => routine.id === routineId && routine.origin !== "community",
      )
    ) {
      return none;
    }
    return {
      decision,
      routineId,
      methodId: null,
      editRequest,
      taskRequest: null,
      taskSchedule: null,
      createDescription: null,
      clarifyQuestion: null,
      imagePrompt: null,
      goTarget: null,
      taskTitle,
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
      goTarget: null,
      taskTitle,
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
      goTarget: null,
      taskTitle,
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
    goTarget: null,
    taskTitle,
    note,
  };
}

// ── Inside a Routine's own chat: feed or edit? ─────────────────────────────
//
// Every message in a routine chat is normally CONTENT for a run. This single
// judgment tells that apart from "change how the routine itself works", and
// "unsure" is a first-class verdict: the client shows a LARGE chooser instead
// of guessing (owner rule 2026-08-16: never decide silently). Parsing is
// factored out pure so it is testable without a model.

export type RoutineChatDecision = "feed" | "edit" | "unsure";

export function parseRoutineChatDecision(raw: string): RoutineChatDecision {
  const parsed = extractJson(raw);
  const decision = parsed?.decision;
  if (decision === "feed" || decision === "edit" || decision === "unsure") {
    return decision;
  }
  // An unreadable answer IS "can't decide" — surface the chooser.
  return "unsure";
}

export async function classifyRoutineChatMessage(
  routine: {
    name: string;
    description: string;
    // What this Routine actually EATS. Without it the judge has no way to
    // tell "配一张做好的菜的照片" (a change to the result) from an
    // ingredient list — the field names make the difference obvious.
    inputFields?: string[];
  },
  content: string,
  signal: AbortSignal,
): Promise<RoutineChatDecision> {
  const fieldLine =
    routine.inputFields && routine.inputFields.length > 0
      ? `It takes: ${routine.inputFields.join(", ")}. CONTENT is something that fits those fields.`
      : "";
  const prompt = [
    `The Owner is inside the chat of their saved Routine "${routine.name}"`,
    `(${routine.description}). Every normal message here is CONTENT the`,
    "routine runs on. Decide what the latest message is:",
    ...(fieldLine ? [fieldLine] : []),
    '- "feed": content, data or a request FOR THIS RUN (ingredients, a note,',
    "  a question the routine should process). This is the default.",
    '- "edit": the Owner wants to CHANGE how the routine itself works from now',
    '  on — its steps, output shape, look, or standing rules ("以后给三个选择",',
    '  "把结果做成表格", "add the shopping list to the result").',
    "  ANY instruction about what the RESULT should contain, look like or",
    "  include — adding or removing a section, a picture, a column, a",
    '  wording rule — is an edit, however it is phrased ("给结果配一张做好的',
    '  这道菜的照片", "结果里不要那两段说明", "多写一句提示"). It is an edit',
    "  even without a word like change/改: what matters is that it describes",
    "  the OUTPUT rather than supplying input.",
    '- "unsure": genuinely ambiguous between the two ("不要猪肉" could be',
    "  tonight's preference or a permanent rule).",
    "",
    `Owner's message: "${content.trim().slice(0, 2000)}"`,
    "",
    'Output ONE JSON object and nothing else: { "decision": "feed" | "edit" | "unsure" }',
  ].join("\n");
  try {
    const result = await getDefaultProvider().sendChat(
      [{ content: prompt, role: "owner" }],
      undefined,
      { signal },
    );
    return parseRoutineChatDecision(result.answer);
  } catch {
    // No verdict is still a verdict: let the Owner choose, never guess.
    return "unsure";
  }
}
