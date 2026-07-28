// Vaenyx Library v2 — Routine run engine (step ②, executable core).
//
// Runs a Routine's declarative linear flow: take one raw input (the Journal
// entry), run each Method step in order — feeding the Journal entry, the previous
// step's output, or a static value into each — and archive the final structured
// result to the Gallery. No foreign code runs; each step is a declarative Method
// executed by the model backend (executeMethod), exactly like an Owner test-run.
//
// Chat binding (accumulate = one persistent Chat) is layered on top in ②b via the
// `chatId` option; here a run can be Owner-initiated with chatId = null.

import type {
  RoutineGalleryItem,
  RoutineInputField,
  RoutineJournalEntry,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

import { getDefaultProvider } from "../models/registry.js";

import {
  executeMethod,
  loadMethod,
  loadMethodExamples,
  validateAgainstSchema,
  type LoadedMethod,
  type MethodRunResult,
} from "./methods.js";
import { loadRoutine } from "./routines.js";
import { addGalleryItem, addJournalEntry } from "./routine-storage.js";

export interface RoutineStepResult {
  stepId: string;
  methodId: string;
  output: unknown;
  outputValid: boolean;
}

export interface RoutineRunResult {
  routineId: string;
  journalEntry: RoutineJournalEntry | null;
  galleryItem: RoutineGalleryItem | null;
  steps: RoutineStepResult[];
  output: unknown;
  outputValid: boolean;
  webSearchUsed: boolean;
}

// How one step is executed. Injectable so the orchestration (chaining, input
// mapping, storage) can be tested without the real model backend.
export type RoutineStepRunner = (
  method: LoadedMethod,
  input: unknown,
  signal: AbortSignal,
) => Promise<MethodRunResult>;

// Default: run the step's Method through the model backend with its few-shot
// examples — the same path as the Method test-run.
function defaultStepRunner(libraryDirectory: string): RoutineStepRunner {
  return (method, input, signal) =>
    executeMethod(
      method,
      loadMethodExamples(libraryDirectory, method.id),
      input,
      signal,
    );
}

export async function runRoutine(
  database: DatabaseHandle,
  routinesDirectory: string,
  libraryDirectory: string,
  id: string,
  journalInput: unknown,
  signal: AbortSignal,
  options: {
    chatId?: string | null;
    runStep?: RoutineStepRunner;
    // External (token) runs are stateless: run the flow, return the result, and
    // write nothing to the owner's local Journal/Gallery (the app keeps its data).
    stateless?: boolean;
    // The photo this run was fed with — kept on the journal entry so the chat
    // shows a picture, never a text dump ("visual first", Oskar 2026-07-28).
    imageId?: string | null;
  } = {},
): Promise<RoutineRunResult> {
  const routine = loadRoutine(routinesDirectory, libraryDirectory, id);
  if (!routine) {
    throw new Error("ROUTINE_NOT_FOUND");
  }
  if (!routine.resolved) {
    // A declared Method is missing or version-mismatched — refuse rather than
    // run a half-wired Routine.
    throw new Error(`ROUTINE_UNRESOLVED:${routine.missingDeps.join(",")}`);
  }

  const stateless = options.stateless === true;
  const chatId = options.chatId ?? null;
  const runStep = options.runStep ?? defaultStepRunner(libraryDirectory);

  const journalEntry =
    routine.storage.journal && !stateless
      ? addJournalEntry(database, {
          routineId: id,
          chatId,
          content: journalInput,
          imageId: options.imageId ?? null,
        })
      : null;

  const steps: RoutineStepResult[] = [];
  let previous: unknown = undefined;
  let webSearchUsed = false;

  for (const step of routine.flow) {
    const input =
      step.from === "previous"
        ? previous
        : step.from === "static"
          ? step.value
          : journalInput;

    const method = loadMethod(libraryDirectory, step.methodId);
    if (!method) {
      // Should not happen (resolved === true), but fail loudly if it does.
      throw new Error(`ROUTINE_UNRESOLVED:${step.methodId}`);
    }

    const inputCheck = validateAgainstSchema(method.inputSchema, input);
    if (!inputCheck.valid) {
      throw new Error(
        `STEP_INPUT_INVALID:${step.id}:${inputCheck.errors.join("; ")}`,
      );
    }

    const result = await runStep(method, input, signal);
    webSearchUsed = webSearchUsed || result.webSearchUsed;
    previous = result.output;
    steps.push({
      stepId: step.id,
      methodId: step.methodId,
      output: result.output,
      outputValid: result.outputValid,
    });
  }

  const last = steps[steps.length - 1];
  const output = last ? last.output : null;
  const outputValid = last ? last.outputValid : false;

  // The Gallery keeps the final structured result (one item per run).
  const galleryItem =
    routine.storage.gallery && last && !stateless
      ? addGalleryItem(database, {
          routineId: id,
          chatId,
          stepId: last.stepId,
          output,
          outputValid,
        })
      : null;

  return {
    routineId: id,
    journalEntry,
    galleryItem,
    steps,
    output,
    outputValid,
    webSearchUsed,
  };
}

// Wrap a plain chat message into the first step's input shape (v1: a single text
// field). Returns ok:false when the first step needs structured / multi-field
// input — the chat box can't fill that yet (that is the ② AI-parse step), so the
// caller tells the Owner. A loose / absent object schema passes the text through.
export function buildChatRoutineInput(
  routinesDirectory: string,
  libraryDirectory: string,
  routineId: string,
  text: string,
): { ok: true; input: unknown } | { ok: false } {
  const routine = loadRoutine(routinesDirectory, libraryDirectory, routineId);
  const firstStep = routine?.flow[0];
  if (!routine || !firstStep) return { ok: false };
  const method = loadMethod(libraryDirectory, firstStep.methodId);
  if (!method) return { ok: false };

  const schema = method.inputSchema as Record<string, unknown> | null;
  if (!schema || typeof schema !== "object" || schema.type !== "object") {
    // No object schema declared — pass the message through as-is.
    return { ok: true, input: text };
  }

  const props = (schema.properties ?? {}) as Record<string, unknown>;
  const keys = Object.keys(props);
  // A first step declaring an object with no fields needs no input — run it with
  // an empty object rather than punting to the parse path (which also declines a
  // zero-field schema, so the routine would otherwise be unrunnable from chat).
  if (keys.length === 0) {
    return { ok: true, input: {} };
  }
  const stringKeys = keys.filter((key) => {
    const prop = props[key] as Record<string, unknown> | undefined;
    return prop != null && prop.type === "string";
  });

  // Exactly one string field, or exactly one field of any kind → fill it.
  const [onlyStringKey] = stringKeys;
  if (stringKeys.length === 1 && onlyStringKey) {
    return { ok: true, input: { [onlyStringKey]: text } };
  }
  const [onlyKey] = keys;
  if (keys.length === 1 && onlyKey) {
    return { ok: true, input: { [onlyKey]: text } };
  }

  // Multi-field input: the AI-parse + confirm path (parseChatRoutineInput).
  return { ok: false };
}

// --- Friendly input (Library v2 ③): AI-parse a plain message into a multi-field
// first-step input, for the Owner to confirm before the run. -------------------

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

// Describe the first step's input fields — only for the multi-field case that
// buildChatRoutineInput cannot fill (its exact complement, so the two never
// disagree about who handles a routine).
export function describeRoutineInputFields(
  routinesDirectory: string,
  libraryDirectory: string,
  routineId: string,
): { method: LoadedMethod; fields: RoutineInputField[] } | null {
  const routine = loadRoutine(routinesDirectory, libraryDirectory, routineId);
  const firstStep = routine?.flow[0];
  if (!routine || !firstStep) return null;
  const method = loadMethod(libraryDirectory, firstStep.methodId);
  if (!method) return null;

  const schema = method.inputSchema as Record<string, unknown> | null;
  if (!schema || typeof schema !== "object" || schema.type !== "object") {
    return null;
  }
  const props = (schema.properties ?? {}) as Record<string, unknown>;
  const keys = Object.keys(props);
  const stringKeys = keys.filter((key) => {
    const prop = props[key] as Record<string, unknown> | undefined;
    return prop != null && prop.type === "string";
  });
  // Single-field shapes are buildChatRoutineInput's job.
  if (keys.length <= 1 || stringKeys.length === 1) return null;

  const required = Array.isArray(schema.required)
    ? (schema.required as unknown[]).filter(
        (key): key is string => typeof key === "string",
      )
    : [];

  const fields = keys.map((key) => {
    const prop = (props[key] ?? {}) as Record<string, unknown>;
    return {
      key,
      type: typeof prop.type === "string" ? prop.type : "string",
      description:
        typeof prop.description === "string" ? prop.description : "",
      required: required.includes(key),
    };
  });
  return { method, fields };
}

export interface ParsedRoutineInput {
  fields: RoutineInputField[];
  parsed: Record<string, unknown>;
  missingRequired: string[];
}

// The model call is injectable so tests can run without the real backend.
export type RoutineInputAsk = (
  prompt: string,
  signal: AbortSignal,
) => Promise<string>;

const defaultAsk: RoutineInputAsk = async (prompt, signal) => {
  const result = await getDefaultProvider().sendChat([{ content: prompt, role: "owner" }], undefined, {
    signal,
  });
  return result.answer;
};

// Parse a plain chat message into the routine's multi-field first-step input.
// Best-effort: fields the message doesn't mention stay absent and are reported
// in missingRequired — the confirm card lets the Owner fill or fix everything
// before anything runs. Returns null when the routine isn't a multi-field case.
export async function parseChatRoutineInput(
  routinesDirectory: string,
  libraryDirectory: string,
  routineId: string,
  text: string,
  signal: AbortSignal,
  ask: RoutineInputAsk = defaultAsk,
  examples: { message: string; input: unknown }[] = [],
): Promise<ParsedRoutineInput | null> {
  const described = describeRoutineInputFields(
    routinesDirectory,
    libraryDirectory,
    routineId,
  );
  if (!described) return null;
  const { method, fields } = described;

  const today = new Date().toISOString().slice(0, 10);
  const fieldLines = fields
    .map(
      (field) =>
        `- ${field.key} (${field.type}${field.required ? ", required" : ""})${
          field.description ? `: ${field.description}` : ""
        }`,
    )
    .join("\n");

  const exampleLines =
    examples.length > 0
      ? [
          "",
          "Past corrections for this helper (message -> the correct JSON).",
          "Follow the Owner's style, but still extract only what the NEW message",
          "actually contains:",
          ...examples.map(
            (example) =>
              `Message: "${example.message.trim()}" -> ${JSON.stringify(
                example.input,
              )}`,
          ),
        ]
      : [];

  const prompt = [
    "You turn the Owner's plain message into structured input for a helper.",
    `Helper: ${method.name} — ${method.description}`,
    "",
    "Fields to fill:",
    fieldLines,
    "",
    `Today's date is ${today}. For date fields use ISO YYYY-MM-DD and resolve`,
    'words like "today" or "yesterday" against that date.',
    ...exampleLines,
    "",
    `Owner's message: "${text.trim()}"`,
    "",
    "Rules:",
    "- Extract values only from the message. Never invent a value it does not",
    "  contain; simply omit fields the message does not provide.",
    "- Emit numbers as JSON numbers, booleans as true/false, lists as JSON",
    "  arrays.",
    "",
    "Output ONE JSON object with only these fields and nothing else.",
  ].join("\n");

  const answer = await ask(prompt, signal);
  const raw = extractJson(answer) ?? {};

  // Keep only declared fields with real values — the confirm card shows the rest
  // as blanks for the Owner to fill.
  const parsed: Record<string, unknown> = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    parsed[field.key] = value;
  }

  const missingRequired = fields
    .filter((field) => field.required && parsed[field.key] === undefined)
    .map((field) => field.key);

  return { fields, parsed, missingRequired };
}
