// Edit Routine v1 (2026-08-16) — upgrade an origin:self Routine IN PLACE.
//
// The promises this module keeps, in the order they matter:
//   • The folder id NEVER changes. Chat threads, Journal, Gallery and parse
//     examples all key on that string with no FK — renaming is a name-field
//     edit, and everything historical stays attached.
//   • Every field round-trips. The save is a read-modify-write of the
//     ORIGINAL parsed routine.json: only managed keys are replaced, so a
//     field this version does not know about survives untouched.
//   • Editing a step's Method never touches the Method in place. A NEW
//     private revision folder is created and only THIS routine is rewired to
//     it — other Routines and Method Tokens keep the original, byte for byte.
//   • Saves are staged and atomic: revisions are new folders (removed again
//     on failure), routine.json is replaced by a same-directory rename, the
//     old bytes are held in memory and restored if validation fails. A
//     failed save leaves the old Routine complete and runnable.
//   • The server owns the version: bumped on every real save, and a no-op
//     is not saved at all.
//   • History keeps its shape: a view change stamps the OLD view onto every
//     gallery row that has no snapshot yet, and a step-1 input-schema change
//     stamps the OLD schema revision onto every unstamped parse example —
//     old data neither loses its styling nor pollutes the new version.
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type {
  LibraryRoutine,
  RoutineEditSaveRequest,
  RoutineStep,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import { getDefaultProvider } from "../models/registry.js";

import { capabilitiesFromManifest, type Capability } from "./capabilities.js";
import {
  diffRecipeLines,
  executeMethod,
  loadMethod,
  loadMethodExamples,
  validateAgainstSchema,
  type LoadedMethod,
} from "./methods.js";
import {
  loadRoutine,
  toLibraryRoutine,
  type LoadedRoutine,
} from "./routines.js";
import {
  stampGalleryViewSnapshots,
  stampParseExampleRevisions,
} from "./routine-storage.js";

export class RoutineEditError extends Error {
  constructor(
    public readonly code:
      | "ROUTINE_NOT_FOUND"
      | "ROUTINE_NOT_SELF"
      | "EDIT_CONFLICT"
      | "EDIT_STEP_UNKNOWN"
      | "EDIT_METHOD_NOT_FOUND"
      | "EDIT_VALIDATION_FAILED"
      | "EDIT_MODE_READONLY",
    detail?: string,
  ) {
    super(detail ? `${code}:${detail}` : code);
    this.name = "RoutineEditError";
  }
}

// ── Small shared pieces ────────────────────────────────────────────────────

// The server owns the version. A plain x.y.z gets its patch bumped; anything
// unusual gets an honest "-r2" style suffix rather than a guess at semantics.
export function bumpRoutineVersion(version: string): string {
  const plain = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (plain) return `${plain[1]}.${plain[2]}.${Number(plain[3]) + 1}`;
  const suffixed = /^(.*-r)(\d+)$/.exec(version);
  if (suffixed) return `${suffixed[1]}${Number(suffixed[2]) + 1}`;
  return `${version}-r2`;
}

// The step-1 input-schema revision parse examples bind to: examples teach the
// AI parse how to fill THESE fields, so they only make sense while the field
// shape is the same.
export function routineInputSchemaRev(
  libraryDirectory: string,
  routine: Pick<LoadedRoutine, "flow">,
): string | null {
  const first = routine.flow[0];
  if (!first) return null;
  const method = loadMethod(libraryDirectory, first.methodId);
  if (!method) return null;
  return createHash("sha256")
    .update(JSON.stringify(method.inputSchema ?? {}))
    .digest("hex");
}

function deepEqualJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

// Key-order-insensitive equality for SCHEMAS. The editor round-trips them
// through JSON.parse/stringify, which can reorder keys — and a reordering is
// not an edit: treating it as one would mint a needless Method revision and
// 409 every Routine Token over nothing.
function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, sortJsonKeys(entry)]),
    );
  }
  return value;
}

function equivalentSchemas(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(sortJsonKeys(a ?? null)) ===
    JSON.stringify(sortJsonKeys(b ?? null))
  );
}

function readRawMeta(
  routinesDirectory: string,
  id: string,
): { meta: Record<string, unknown>; raw: string } {
  const raw = readFileSync(join(routinesDirectory, id, "routine.json"), "utf8");
  return { meta: JSON.parse(raw) as Record<string, unknown>, raw };
}

// ── The editable draft the UI opens ────────────────────────────────────────

export interface RoutineEditStepDetail {
  stepId: string;
  from: RoutineStep["from"];
  value?: unknown;
  method: {
    id: string;
    name: string;
    origin: "self" | "community";
    version: string;
    recipe: string;
    inputSchema: unknown;
    outputSchema: unknown;
    manifest: unknown;
    contentHash: string;
  } | null;
}

export interface RoutineEditDraft {
  routine: LibraryRoutine;
  steps: RoutineEditStepDetail[];
  editable: boolean;
}

export function readRoutineEditDraft(
  routinesDirectory: string,
  libraryDirectory: string,
  id: string,
): RoutineEditDraft {
  const routine = loadRoutine(routinesDirectory, libraryDirectory, id);
  if (!routine) throw new RoutineEditError("ROUTINE_NOT_FOUND");
  const steps: RoutineEditStepDetail[] = routine.flow.map((step) => {
    const method = loadMethod(libraryDirectory, step.methodId);
    return {
      stepId: step.id,
      from: step.from,
      ...("value" in step ? { value: step.value } : {}),
      method: method
        ? {
            id: method.id,
            name: method.name,
            origin: method.origin === "community" ? "community" : "self",
            version: method.version,
            recipe: method.recipe,
            inputSchema: method.inputSchema,
            outputSchema: method.outputSchema,
            manifest: method.manifest,
            contentHash: method.contentHash,
          }
        : null,
    };
  });
  return {
    routine: toLibraryRoutine(routine),
    steps,
    // Community Routines are not editable in place (v1): the whole edit
    // surface stays read-only for them.
    editable: routine.origin !== "community",
  };
}

// ── New private Method revisions ───────────────────────────────────────────

interface MethodEditPlan {
  baseId: string;
  recipe: string;
  inputSchema: unknown;
  outputSchema: unknown;
}

function methodEditChangesBase(
  base: LoadedMethod,
  edit: MethodEditPlan,
): boolean {
  return (
    base.recipe !== edit.recipe ||
    !equivalentSchemas(base.inputSchema, edit.inputSchema) ||
    !equivalentSchemas(base.outputSchema, edit.outputSchema)
  );
}

// A revision is a NEW folder beside the base — the base is never touched, so
// every other Routine and every Method Token pinned to it keeps exactly what
// it had. Examples ride along when only the recipe changed (the flywheel's
// few-shot still fits); a schema change drops them, because examples teach
// the OLD field shape and would mis-teach the new one.
function createMethodRevision(
  libraryDirectory: string,
  base: LoadedMethod,
  edit: MethodEditPlan,
): LoadedMethod {
  let revisionId = "";
  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${base.id}-r${n}`;
    if (!existsSync(join(libraryDirectory, candidate))) {
      revisionId = candidate;
      break;
    }
  }
  if (!revisionId) {
    throw new RoutineEditError("EDIT_VALIDATION_FAILED", "revision-id");
  }
  const targetDir = join(libraryDirectory, revisionId);
  cpSync(join(libraryDirectory, base.id), targetDir, { recursive: true });
  if (
    !equivalentSchemas(base.inputSchema, edit.inputSchema) ||
    !equivalentSchemas(base.outputSchema, edit.outputSchema)
  ) {
    rmSync(join(targetDir, "examples"), { recursive: true, force: true });
  }
  writeFileSync(join(targetDir, "recipe.md"), edit.recipe, "utf8");
  writeFileSync(
    join(targetDir, "schema.json"),
    `${JSON.stringify({ input: edit.inputSchema, output: edit.outputSchema }, null, 2)}\n`,
    "utf8",
  );
  const metaPath = join(targetDir, "method.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<
    string,
    unknown
  >;
  meta.version = bumpRoutineVersion(
    typeof meta.version === "string" ? meta.version : "1.0.0",
  );
  meta.origin = "self";
  meta.owner = "";
  if (base.origin === "community" && !meta.derivedFrom) {
    // Fork credit, same shape forkMethod stamps: the ancestry is permanent.
    meta.derivedFrom = {
      author: base.owner,
      id: base.id,
      version: base.version,
    };
  }
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  const created = loadMethod(libraryDirectory, revisionId);
  if (!created) {
    rmSync(targetDir, { recursive: true, force: true });
    throw new RoutineEditError("EDIT_VALIDATION_FAILED", "revision-load");
  }
  return created;
}

// ── The atomic save ────────────────────────────────────────────────────────

export interface RoutineEditSaveResult {
  unchanged: boolean;
  routine: LibraryRoutine;
  createdMethodIds: string[];
  behaviourChanged: boolean;
  staleTokens: number;
  publishedStale: boolean;
}

function countRoutineTokens(
  database: DatabaseHandle,
  routineId: string,
): number {
  const row = database.sqlite
    .prepare(
      `SELECT COUNT(*) AS n FROM app_profiles
       WHERE kind = 'routine' AND routine_id = ? AND enabled = 1`,
    )
    .get(routineId) as { n: number };
  return row.n;
}

function isPublishedStale(
  database: DatabaseHandle,
  routineId: string,
  currentContentHash: string,
): boolean {
  const row = database.sqlite
    .prepare(
      `SELECT content_hash FROM published_items
       WHERE kind = 'routine' AND item_id = ?`,
    )
    .get(routineId) as { content_hash: string } | undefined;
  return Boolean(row && row.content_hash !== currentContentHash);
}

export function saveRoutineEdit(
  database: DatabaseHandle,
  routinesDirectory: string,
  libraryDirectory: string,
  id: string,
  body: RoutineEditSaveRequest,
): RoutineEditSaveResult {
  const current = loadRoutine(routinesDirectory, libraryDirectory, id);
  if (!current) throw new RoutineEditError("ROUTINE_NOT_FOUND");
  if (current.origin === "community") {
    throw new RoutineEditError("ROUTINE_NOT_SELF");
  }
  if (body.expectedContentHash !== current.contentHash) {
    // Someone (another tab, another device) saved since this editor opened.
    // Refusing is the whole point: never overwrite the newer version.
    throw new RoutineEditError("EDIT_CONFLICT");
  }

  const { meta: originalMeta, raw: originalRaw } = readRawMeta(
    routinesDirectory,
    id,
  );

  // Step identity discipline: existing stepIds must exist today; new steps
  // get ids from a persisted counter that only counts UP, so a removed id is
  // never reborn meaning something else.
  const currentStepIds = new Set(current.flow.map((step) => step.id));
  let stepSeq =
    typeof originalMeta.stepSeq === "number" &&
    Number.isInteger(originalMeta.stepSeq)
      ? originalMeta.stepSeq
      : current.flow.reduce((max, step) => {
          const match = /^step(\d+)$/.exec(step.id);
          return match ? Math.max(max, Number(match[1])) : max;
        }, current.flow.length);

  // First pass, nothing written: which steps really change their Method?
  const claimedStepIds = new Set<string>();
  const plans = body.flow.map((step) => {
    if (step.stepId !== null && !currentStepIds.has(step.stepId)) {
      throw new RoutineEditError("EDIT_STEP_UNKNOWN", step.stepId ?? "");
    }
    if (step.stepId !== null) {
      // The same existing step listed twice is a malformed request, not two
      // steps — silently keeping both would corrupt the id discipline.
      if (claimedStepIds.has(step.stepId)) {
        throw new RoutineEditError(
          "EDIT_VALIDATION_FAILED",
          `duplicate-step:${step.stepId}`,
        );
      }
      claimedStepIds.add(step.stepId);
    }
    const base = loadMethod(libraryDirectory, step.methodId);
    if (!base) {
      throw new RoutineEditError("EDIT_METHOD_NOT_FOUND", step.methodId);
    }
    const edit = step.methodEdit
      ? {
          baseId: step.methodId,
          recipe: step.methodEdit.recipe,
          inputSchema: step.methodEdit.inputSchema,
          outputSchema: step.methodEdit.outputSchema,
        }
      : null;
    return {
      step,
      base,
      edit: edit && methodEditChangesBase(base, edit) ? edit : null,
    };
  });

  // Build the candidate flow/deps against the CURRENT method set (revisions
  // come later, once we know this is not a no-op).
  const usedIds = new Set(currentStepIds);
  const candidateFlow: RoutineStep[] = plans.map((plan) => {
    let stepId = plan.step.stepId;
    if (stepId === null) {
      do {
        stepSeq += 1;
        stepId = `step${stepSeq}`;
      } while (usedIds.has(stepId));
    }
    usedIds.add(stepId);
    const step: RoutineStep = {
      id: stepId,
      methodId: plan.step.methodId,
      from: plan.step.from,
    };
    if (plan.step.from === "static" && "value" in plan.step) {
      step.value = plan.step.value;
    }
    return step;
  });

  // No-op means NOTHING moved: no method edits, and every managed field deep
  // equal to what is on disk. A no-op is not saved and not version-bumped.
  const anyMethodEdit = plans.some((plan) => plan.edit !== null);
  const managedUnchanged =
    !anyMethodEdit &&
    body.name === current.name &&
    body.description === current.description &&
    deepEqualJson(body.tags, current.tags) &&
    deepEqualJson(body.view ?? null, current.view ?? null) &&
    (body.annotateFocus ?? null) === current.annotateFocus &&
    (body.resultImage ?? null) === current.resultImage &&
    deepEqualJson(
      candidateFlow,
      current.flow.map((step) => ({
        id: step.id,
        methodId: step.methodId,
        from: step.from,
        ...("value" in step ? { value: step.value } : {}),
      })),
    );
  if (managedUnchanged) {
    return {
      unchanged: true,
      routine: toLibraryRoutine(current),
      createdMethodIds: [],
      behaviourChanged: false,
      staleTokens: 0,
      publishedStale: isPublishedStale(database, id, current.contentHash),
    };
  }

  // Real save. Create the method revisions first (new folders, unreferenced
  // until routine.json lands — removable without a trace on failure).
  const createdMethodIds: string[] = [];
  const oldViewJson = current.view ?? null;
  const oldInputSchemaRev = routineInputSchemaRev(libraryDirectory, current);
  try {
    const finalFlow = candidateFlow.map((step, index) => {
      const plan = plans[index];
      if (!plan?.edit) return step;
      const revision = createMethodRevision(
        libraryDirectory,
        plan.base,
        plan.edit,
      );
      createdMethodIds.push(revision.id);
      return { ...step, methodId: revision.id };
    });

    // deps rebuilt from the final flow; capabilities re-derived from the REAL
    // manifests of the methods actually used (never a manual switch).
    const seen = new Set<string>();
    const deps: { methodId: string; version: string }[] = [];
    const capabilitySet: Capability[] = [];
    for (const step of finalFlow) {
      if (seen.has(step.methodId)) continue;
      seen.add(step.methodId);
      const method = loadMethod(libraryDirectory, step.methodId);
      if (!method) {
        throw new RoutineEditError("EDIT_METHOD_NOT_FOUND", step.methodId);
      }
      deps.push({ methodId: method.id, version: method.version });
      for (const capability of capabilitiesFromManifest(method.manifest)
        .capabilities) {
        if (!capabilitySet.includes(capability)) capabilitySet.push(capability);
      }
    }

    // Read-modify-write of the ORIGINAL object: unknown fields survive.
    const nextMeta: Record<string, unknown> = { ...originalMeta };
    nextMeta.name = body.name;
    nextMeta.description = body.description;
    nextMeta.tags = body.tags;
    if (body.view === null || body.view === undefined) delete nextMeta.view;
    else nextMeta.view = body.view;
    if (body.annotateFocus === null) delete nextMeta.annotateFocus;
    else nextMeta.annotateFocus = body.annotateFocus;
    if (body.resultImage === null) delete nextMeta.resultImage;
    else nextMeta.resultImage = body.resultImage;
    nextMeta.deps = deps;
    nextMeta.flow = finalFlow;
    nextMeta.capabilities = capabilitySet;
    nextMeta.stepSeq = stepSeq;
    nextMeta.version = bumpRoutineVersion(current.version);
    nextMeta.origin = "self";

    // History keeps its shape. Stamped BEFORE the rename: a crash between
    // the two must not leave a saved view change with unstamped old rows.
    // Stamping and then failing is harmless — the stamp records the view and
    // schema revision those rows were REALLY made under, true either way.
    // (The revision folders the new flow points at are already on disk, so
    // the new schema revision is computable here.)
    if (!deepEqualJson(oldViewJson, body.view ?? null)) {
      stampGalleryViewSnapshots(database, id, oldViewJson);
    }
    const newInputSchemaRev = routineInputSchemaRev(libraryDirectory, {
      flow: finalFlow,
    });
    if (oldInputSchemaRev && oldInputSchemaRev !== newInputSchemaRev) {
      stampParseExampleRevisions(database, id, oldInputSchemaRev);
    }

    // Staged write + same-directory rename: the replace is a single atomic
    // step, and the original bytes are in hand for rollback.
    const dir = join(routinesDirectory, id);
    const stagingPath = join(dir, "routine.json.staging");
    writeFileSync(
      stagingPath,
      `${JSON.stringify(nextMeta, null, 2)}\n`,
      "utf8",
    );
    renameSync(stagingPath, join(dir, "routine.json"));

    const reloaded = loadRoutine(routinesDirectory, libraryDirectory, id);
    if (!reloaded || !reloaded.resolved) {
      throw new RoutineEditError(
        "EDIT_VALIDATION_FAILED",
        reloaded ? reloaded.missingDeps.join(",") : "reload",
      );
    }

    const behaviourChanged = current.executionHash !== reloaded.executionHash;
    return {
      unchanged: false,
      routine: toLibraryRoutine(reloaded),
      createdMethodIds,
      behaviourChanged,
      // The tokens that will 409 until the Owner re-grants. Never re-pinned
      // here: silent auto-repin is exactly what the spec forbids.
      staleTokens: behaviourChanged ? countRoutineTokens(database, id) : 0,
      publishedStale: isPublishedStale(database, id, reloaded.contentHash),
    };
  } catch (error) {
    // Roll back everything this save created; the old Routine stays whole.
    try {
      rmSync(join(routinesDirectory, id, "routine.json.staging"), {
        force: true,
      });
    } catch {
      // A stale staging file is inert (every save overwrites it first).
    }
    try {
      writeFileSync(
        join(routinesDirectory, id, "routine.json"),
        originalRaw,
        "utf8",
      );
    } catch {
      // The original write never happened or the disk is gone — either way
      // there is nothing better to do than surface the original error.
    }
    for (const created of createdMethodIds) {
      try {
        rmSync(join(libraryDirectory, created), {
          recursive: true,
          force: true,
        });
      } catch {
        // Best-effort cleanup; an orphan folder is inert (nothing references it).
      }
    }
    throw error;
  }
}

// ── Try Changes: run the draft, write nothing ──────────────────────────────

export interface RoutineEditTestResult {
  steps: {
    stepId: string;
    methodId: string;
    output: unknown;
    outputValid: boolean;
  }[];
  output: unknown;
  outputValid: boolean;
  webSearchUsed: boolean;
}

// The same linear loop as runRoutine, against IN-MEMORY methods: edited steps
// run as transient revisions that exist nowhere on disk. No journal, no
// gallery, no parse examples, no audit of content — a rehearsal, not a run.
export async function runRoutineEditTest(
  routinesDirectory: string,
  libraryDirectory: string,
  id: string,
  draft: RoutineEditSaveRequest,
  input: unknown,
  signal: AbortSignal,
  narrow: (declared: Capability[]) => Capability[] = (declared) => declared,
  // Injectable like runRoutine's, so the orchestration is testable without
  // the real model backend.
  runStep?: (
    method: LoadedMethod,
    stepInput: unknown,
    stepSignal: AbortSignal,
    allowed: Capability[],
  ) => Promise<{
    output: unknown;
    outputValid: boolean;
    webSearchUsed: boolean;
  }>,
): Promise<RoutineEditTestResult> {
  const current = loadRoutine(routinesDirectory, libraryDirectory, id);
  if (!current) throw new RoutineEditError("ROUTINE_NOT_FOUND");

  const steps: RoutineEditTestResult["steps"] = [];
  let previous: unknown = undefined;
  let webSearchUsed = false;
  let index = 0;
  for (const step of draft.flow) {
    index += 1;
    const base = loadMethod(libraryDirectory, step.methodId);
    if (!base) {
      throw new RoutineEditError("EDIT_METHOD_NOT_FOUND", step.methodId);
    }
    const method: LoadedMethod = step.methodEdit
      ? {
          ...base,
          recipe: step.methodEdit.recipe,
          inputSchema: step.methodEdit.inputSchema,
          outputSchema: step.methodEdit.outputSchema,
          contentHash: "draft",
        }
      : base;
    const stepInput =
      step.from === "previous"
        ? previous
        : step.from === "static"
          ? step.value
          : input;
    const check = validateAgainstSchema(method.inputSchema, stepInput);
    if (!check.valid) {
      throw new Error(
        `STEP_INPUT_INVALID:${step.stepId ?? `new${index}`}:${check.errors.join("; ")}`,
      );
    }
    const allowed = narrow(
      capabilitiesFromManifest(method.manifest).capabilities,
    );
    const result = runStep
      ? await runStep(method, stepInput, signal, allowed)
      : await executeMethod(
          method,
          loadMethodExamples(libraryDirectory, base.id),
          stepInput,
          signal,
          allowed,
        );
    webSearchUsed = webSearchUsed || result.webSearchUsed;
    previous = result.output;
    steps.push({
      stepId: step.stepId ?? `new${index}`,
      methodId: step.methodId,
      output: result.output,
      outputValid: result.outputValid,
    });
  }
  const last = steps[steps.length - 1];
  return {
    steps,
    output: last ? last.output : null,
    outputValid: last ? last.outputValid : false,
    webSearchUsed,
  };
}

// ── The AI proposal (nothing written) ──────────────────────────────────────

export interface RoutineEditProposal {
  proposed: RoutineEditSaveRequest;
  summary: string;
  recipeDiffs: {
    stepId: string;
    methodName: string;
    diff: ReturnType<typeof diffRecipeLines>;
  }[];
  unchanged: boolean;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("EDIT_PROPOSAL_PARSE_FAILED");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}

// Ask the model for a MINIMAL edit of the existing Routine. The reply is the
// exact save-request shape, so the Owner reviews and try-runs the very thing
// that would be saved — no translation layer to drift.
export async function proposeRoutineEdit(
  routinesDirectory: string,
  libraryDirectory: string,
  id: string,
  request: string,
  signal: AbortSignal,
): Promise<RoutineEditProposal> {
  const draft = readRoutineEditDraft(routinesDirectory, libraryDirectory, id);
  const currentDocument = {
    name: draft.routine.name,
    description: draft.routine.description,
    tags: draft.routine.tags,
    view: draft.routine.view ?? null,
    annotateFocus: draft.routine.annotateFocus ?? null,
    resultImage: draft.routine.resultImage ?? null,
    flow: draft.steps.map((step) => ({
      stepId: step.stepId,
      methodId: step.method?.id ?? "",
      from: step.from,
      ...(step.value !== undefined ? { value: step.value } : {}),
      method: step.method
        ? {
            recipe: step.method.recipe,
            inputSchema: step.method.inputSchema,
            outputSchema: step.method.outputSchema,
          }
        : null,
    })),
  };

  const prompt = [
    "You are improving an EXISTING Vaenyx Routine. Change ONLY what the request",
    "asks for; keep everything else exactly as it is, including stepIds.",
    "Rules:",
    "- Keep every unchanged step's stepId. A brand-new step has stepId null.",
    "- To change what a step DOES, put the revised recipe/inputSchema/outputSchema",
    '  in that step\'s "methodEdit" (keep methodId as it is).',
    '- "view" declares how the final result is shown:',
    '  { "fields": [{ "key": <output field>, "as": "title"|"text"|"bullets"|"table"|"amount"|"note", "label"?: string }] }.',
    "- Recipes are plain declarative instructions, never code.",
    "- The final step's outputSchema and the view must agree on field names.",
    "- The app ALWAYS shows the run's marked photo at the top of the result",
    "  card by itself — never add output fields or view entries that try to",
    "  hold a photo; every field is text-only. If the request is about photo",
    "  placement, it is already satisfied and needs no change.",
    "",
    "Current Routine document:",
    JSON.stringify(currentDocument, null, 2),
    "",
    "Owner's request:",
    request.trim(),
    "",
    "Output ONE JSON object, nothing else:",
    "{",
    '  "summary": one plain-language line describing what you changed,',
    '  "name", "description", "tags",',
    '  "view": the (possibly unchanged) view object or null,',
    '  "annotateFocus": string or null,',
    '  "resultImage": string or null — plain words for a PICTURE of the',
    '    result the app generates and shows above it ("the finished dish,',
    '    plated"); null means no picture,',
    '  "flow": [ { "stepId": string|null, "methodId": string, "from": "journal"|"previous"|"static",',
    '              "value"?: any, "methodEdit"?: { "recipe", "inputSchema", "outputSchema" } } ]',
    "}",
  ].join("\n");

  const answer = await getDefaultProvider().sendChat(
    [{ content: prompt, role: "owner" }],
    undefined,
    { signal },
  );
  const parsed = extractJsonObject(answer.answer);

  const flow = Array.isArray(parsed.flow) ? parsed.flow : [];
  const proposed: RoutineEditSaveRequest = {
    expectedContentHash: draft.routine.contentHash,
    name:
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim().slice(0, 120)
        : draft.routine.name,
    description:
      typeof parsed.description === "string"
        ? parsed.description.slice(0, 2000)
        : draft.routine.description,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.slice(0, 40))
          .slice(0, 20)
      : draft.routine.tags,
    // A key the model left OUT keeps the current value — only an explicit
    // null clears it. Otherwise a proposal about the recipe would silently
    // strip the view or the photo-marks focus as a side effect.
    view:
      "view" in parsed ? (parsed.view ?? null) : (draft.routine.view ?? null),
    annotateFocus:
      "annotateFocus" in parsed
        ? typeof parsed.annotateFocus === "string" &&
          parsed.annotateFocus.trim()
          ? parsed.annotateFocus.trim().slice(0, 120)
          : null
        : (draft.routine.annotateFocus ?? null),
    resultImage:
      "resultImage" in parsed
        ? typeof parsed.resultImage === "string" && parsed.resultImage.trim()
          ? parsed.resultImage.trim().slice(0, 200)
          : null
        : (draft.routine.resultImage ?? null),
    flow: flow
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        if (typeof record.methodId !== "string" || !record.methodId)
          return null;
        const from: "journal" | "previous" | "static" =
          record.from === "previous" || record.from === "static"
            ? record.from
            : "journal";
        const stepId =
          typeof record.stepId === "string" && record.stepId
            ? record.stepId
            : null;
        const methodEdit =
          record.methodEdit && typeof record.methodEdit === "object"
            ? (record.methodEdit as Record<string, unknown>)
            : null;
        return {
          stepId,
          methodId: record.methodId,
          from,
          ...(from === "static" && "value" in record
            ? { value: record.value }
            : {}),
          ...(methodEdit && typeof methodEdit.recipe === "string"
            ? {
                methodEdit: {
                  recipe: methodEdit.recipe,
                  inputSchema: methodEdit.inputSchema ?? {},
                  outputSchema: methodEdit.outputSchema ?? {},
                },
              }
            : {}),
        };
      })
      .filter((step): step is NonNullable<typeof step> => step !== null),
  };
  if (proposed.flow.length === 0) {
    // A proposal that lost the flow is a bad proposal: keep the current one.
    proposed.flow = draft.steps.map((step) => ({
      stepId: step.stepId,
      methodId: step.method?.id ?? "",
      from: step.from,
      ...(step.value !== undefined ? { value: step.value } : {}),
    }));
  }

  // Per-step recipe diffs for the review screen, via the same LCS differ the
  // Method edit flow uses.
  const byStepId = new Map(draft.steps.map((step) => [step.stepId, step]));
  const recipeDiffs = proposed.flow.flatMap((step) => {
    if (!step.methodEdit || step.stepId === null) return [];
    const before = byStepId.get(step.stepId)?.method;
    if (!before || before.recipe === step.methodEdit.recipe) return [];
    return [
      {
        stepId: step.stepId,
        methodName: before.name,
        diff: diffRecipeLines(before.recipe, step.methodEdit.recipe),
      },
    ];
  });

  // "Unchanged" must catch EVERY kind of change, or a real proposal shows a
  // dead Apply button: schema-only Method edits and static-value changes
  // count just as much as a recipe diff.
  const anyMethodEditChange = proposed.flow.some((step) => {
    if (!step.methodEdit) return false;
    const before =
      step.stepId !== null ? byStepId.get(step.stepId)?.method : null;
    if (!before) return true;
    return (
      before.recipe !== step.methodEdit.recipe ||
      !equivalentSchemas(before.inputSchema, step.methodEdit.inputSchema) ||
      !equivalentSchemas(before.outputSchema, step.methodEdit.outputSchema)
    );
  });
  const unchanged =
    proposed.name === draft.routine.name &&
    proposed.description === draft.routine.description &&
    deepEqualJson(proposed.tags, draft.routine.tags) &&
    deepEqualJson(proposed.view ?? null, draft.routine.view ?? null) &&
    (proposed.annotateFocus ?? null) ===
      (draft.routine.annotateFocus ?? null) &&
    (proposed.resultImage ?? null) === (draft.routine.resultImage ?? null) &&
    !anyMethodEditChange &&
    deepEqualJson(
      proposed.flow.map((step) => ({
        stepId: step.stepId,
        methodId: step.methodId,
        from: step.from,
        ...(step.value !== undefined ? { value: step.value } : {}),
      })),
      draft.steps.map((step) => ({
        stepId: step.stepId,
        methodId: step.method?.id ?? "",
        from: step.from,
        ...(step.value !== undefined ? { value: step.value } : {}),
      })),
    );

  return {
    proposed,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "Proposed changes",
    recipeDiffs,
    unchanged,
  };
}
