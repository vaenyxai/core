// Vaenyx Library v2 — Routine loader (data model, read side).
//
// A Routine is a folder on disk (see docs/library-architecture.md §14):
//   routine.json   identity + declarative model: name, description, owner,
//                  version, tags, mode, storage, deps[], flow[], view?
//   manifest.json  permissions (per-action capability scoping)
//   examples/*.json  regression fixtures
//
// A Routine = 1+ Method + declarative orchestration + storage. It runs nothing
// here: this module only reads the folder, resolves its Method dependencies
// against the installed Method library, and computes the content hash that pins
// the version. v1 orchestration is a straight linear chain; no foreign code runs.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type {
  LibraryRoutine,
  LibraryRoutineSummary,
  RoutineDep,
  RoutineMode,
  RoutinePlan,
  RoutineStep,
  RoutineStorage,
} from "@vaenyx/contracts";

import { getDefaultProvider } from "../models/registry.js";

import { createMethod, listMethodSummaries, loadMethod } from "./methods.js";

// The single required file; manifest/examples are optional (mirrors Methods).
const REQUIRED_FILES = ["routine.json"] as const;

export interface LoadedRoutine extends LibraryRoutineSummary {
  storage: RoutineStorage;
  deps: RoutineDep[];
  flow: RoutineStep[];
  view: unknown;
  manifest: unknown;
  exampleCount: number;
  contentHash: string;
  resolved: boolean;
  missingDeps: string[];
}

function readFileIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function parseJsonOrThrow(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "parse error";
    throw new Error(`Routine ${label} is not valid JSON: ${detail}`, {
      cause: error,
    });
  }
}

function isRoutineFolder(routinesDirectory: string, id: string): boolean {
  const dir = join(routinesDirectory, id);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return REQUIRED_FILES.every((file) => existsSync(join(dir, file)));
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function readMode(value: unknown): RoutineMode {
  return value === "accumulate" ? "accumulate" : "one-shot";
}

function readStorage(value: unknown): RoutineStorage {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    journal: record.journal === true,
    gallery: record.gallery === true,
  };
}

function readDeps(value: unknown): RoutineDep[] {
  if (!Array.isArray(value)) return [];
  const deps: RoutineDep[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.methodId === "string" &&
      typeof record.version === "string"
    ) {
      deps.push({ methodId: record.methodId, version: record.version });
    }
  }
  return deps;
}

function readFlow(value: unknown): RoutineStep[] {
  if (!Array.isArray(value)) return [];
  const steps: RoutineStep[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const from =
      record.from === "previous" || record.from === "static"
        ? record.from
        : "journal";
    if (typeof record.id === "string" && typeof record.methodId === "string") {
      const step: RoutineStep = {
        id: record.id,
        methodId: record.methodId,
        from,
      };
      if ("value" in record) step.value = record.value;
      steps.push(step);
    }
  }
  return steps;
}

// Hash the behaviour-defining parts in a stable, key-sorted form: the
// orchestration (deps + flow + mode + storage), the explicit version, and the
// manifest. Cosmetic fields (name/description/owner/tags) and the presentation
// `view` are deliberately excluded, so relabelling or restyling never shifts the
// hash — the same rename-safety Methods have.
function routineContentHashFrom(
  meta: Record<string, unknown>,
  manifestRaw: string | null,
): string {
  const canonical = JSON.stringify({
    deps: readDeps(meta.deps),
    flow: readFlow(meta.flow),
    mode: readMode(meta.mode),
    storage: readStorage(meta.storage),
    version: typeof meta.version === "string" ? meta.version : "0.0.0",
  });
  return createHash("sha256")
    .update(" routine ")
    .update(canonical)
    .update(" manifest ")
    .update(manifestRaw ?? "")
    .digest("hex");
}

function countExamples(dir: string): number {
  const examplesDir = join(dir, "examples");
  if (!existsSync(examplesDir)) return 0;
  return readdirSync(examplesDir).filter((file) => file.endsWith(".json"))
    .length;
}

function readRoutineMeta(
  routinesDirectory: string,
  id: string,
): Record<string, unknown> {
  const raw = readFileSync(join(routinesDirectory, id, "routine.json"), "utf8");
  return parseJsonOrThrow(raw, `${id}/routine.json`) as Record<string, unknown>;
}

function toSummary(
  id: string,
  meta: Record<string, unknown>,
): LibraryRoutineSummary {
  return {
    // Folder name is the canonical id.
    id,
    name: typeof meta.name === "string" ? meta.name : id,
    description: typeof meta.description === "string" ? meta.description : "",
    version: typeof meta.version === "string" ? meta.version : "0.0.0",
    owner: typeof meta.owner === "string" ? meta.owner : "",
    tags: readStringArray(meta.tags),
    mode: readMode(meta.mode),
    stepCount: readFlow(meta.flow).length,
    // The declarative View rides along (routine.json is already read here) so
    // the chat/Gallery can render results from a summary alone.
    view: meta.view ?? null,
    // Provenance: absent on legacy / self-made items -> "self". Not hashed.
    origin: meta.origin === "community" ? "community" : "self",
  };
}

// Progressive disclosure: only routine.json per folder. A malformed routine is
// skipped (logged) rather than breaking the whole catalogue.
export function listRoutineSummaries(
  routinesDirectory: string,
): LibraryRoutineSummary[] {
  if (!existsSync(routinesDirectory)) return [];

  const summaries: LibraryRoutineSummary[] = [];
  for (const entry of readdirSync(routinesDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!isRoutineFolder(routinesDirectory, entry.name)) continue;
    try {
      summaries.push(toSummary(entry.name, readRoutineMeta(routinesDirectory, entry.name)));
    } catch (error) {
      console.warn(`Skipping invalid routine "${entry.name}":`, error);
    }
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

// Resolve each declared dependency against the installed Method library: a dep is
// satisfied only if the Method exists AND its version matches the pinned one.
// Returns the unsatisfied methodIds (for the `missingDeps` surface).
function resolveDeps(
  libraryDirectory: string,
  deps: RoutineDep[],
): string[] {
  const missing: string[] = [];
  for (const dep of deps) {
    const method = loadMethod(libraryDirectory, dep.methodId);
    if (!method || method.version !== dep.version) {
      missing.push(dep.methodId);
    }
  }
  return missing;
}

// Full load: declarative model + manifest + example count + content hash +
// dependency resolution. Returns null if the folder is not a valid routine.
export function loadRoutine(
  routinesDirectory: string,
  libraryDirectory: string,
  id: string,
): LoadedRoutine | null {
  if (!isRoutineFolder(routinesDirectory, id)) return null;

  const dir = join(routinesDirectory, id);
  try {
    const meta = readRoutineMeta(routinesDirectory, id);
    const summary = toSummary(id, meta);
    const manifestRaw = readFileIfExists(join(dir, "manifest.json"));
    const deps = readDeps(meta.deps);
    const flow = readFlow(meta.flow);

    // A flow step that names a Method not in `deps` is a malformed routine: the
    // dependency must be declared (and version-pinned) to be resolvable.
    const declared = new Set(deps.map((dep) => dep.methodId));
    const undeclared = flow
      .filter((step) => !declared.has(step.methodId))
      .map((step) => step.methodId);

    const missingDeps = [
      ...new Set([...resolveDeps(libraryDirectory, deps), ...undeclared]),
    ];

    return {
      ...summary,
      storage: readStorage(meta.storage),
      deps,
      flow,
      view: meta.view ?? null,
      manifest: manifestRaw
        ? parseJsonOrThrow(manifestRaw, `${id}/manifest.json`)
        : {},
      exampleCount: countExamples(dir),
      contentHash: routineContentHashFrom(meta, manifestRaw),
      resolved: missingDeps.length === 0,
      missingDeps,
    };
  } catch (error) {
    console.warn(`Could not load routine "${id}":`, error);
    return null;
  }
}

export function toLibraryRoutine(routine: LoadedRoutine): LibraryRoutine {
  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    version: routine.version,
    owner: routine.owner,
    tags: routine.tags,
    origin: routine.origin,
    mode: routine.mode,
    storage: routine.storage,
    deps: routine.deps,
    flow: routine.flow,
    view: routine.view,
    manifest: routine.manifest,
    exampleCount: routine.exampleCount,
    contentHash: routine.contentHash,
    resolved: routine.resolved,
    missingDeps: routine.missingDeps,
  };
}

// ── Routine creation (③ slice 2): plan from plain language, then assemble ─────

function extractPlanJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("PLAN_PARSE_FAILED");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "routine";
}

// Ask the model to plan a Routine from the Owner's description: ordered steps,
// each reusing an installed Method (by id) or a freshly drafted one. v1 is a
// straight linear chain. Returns the plan (NOT saved); the Owner reviews it.
export async function planRoutineSpec(
  description: string,
  libraryDirectory: string,
  signal: AbortSignal,
): Promise<RoutinePlan> {
  const available = listMethodSummaries(libraryDirectory)
    .map((m) => `- id: ${m.id} — ${m.name}: ${m.description} [tags: ${m.tags.join(", ")}]`)
    .join("\n");

  const prompt = [
    "You are planning a Vaenyx Routine — a user-facing product made of ordered",
    "steps. Each step is ONE Method (a single declarative capability). The steps",
    "run as a straight linear chain: step 1 gets the user's input, each later step",
    "gets the previous step's output.",
    "",
    "Reuse an existing Method when one fits; otherwise draft a new one.",
    "Available Methods you may reuse (by exact id):",
    available || "(none yet)",
    "",
    "Output ONE JSON object and nothing else:",
    "{",
    '  "name": short routine title,',
    '  "description": one plain-language line,',
    '  "mode": "accumulate" (keep feeding it over time) or "one-shot",',
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
    "Owner's description:",
    description.trim(),
  ].join("\n");

  const result = await getDefaultProvider().sendChat([{ content: prompt, role: "owner" }], undefined, {
    signal,
  });

  const parsed = extractPlanJson(result.answer) as Record<string, unknown>;
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps = rawSteps
    .map((entry): RoutinePlan["steps"][number] | null => {
      if (!entry || typeof entry !== "object") return null;
      const step = entry as Record<string, unknown>;
      const title = typeof step.title === "string" ? step.title : "Step";
      if (typeof step.reuse === "string" && step.reuse.trim()) {
        return { title, reuse: step.reuse.trim() };
      }
      if (step.method && typeof step.method === "object") {
        const m = step.method as Record<string, unknown>;
        return {
          title,
          method: {
            name: typeof m.name === "string" ? m.name : title,
            description: typeof m.description === "string" ? m.description : "",
            recipe: typeof m.recipe === "string" ? m.recipe : "",
            inputSchema:
              m.inputSchema && typeof m.inputSchema === "object" ? m.inputSchema : {},
            outputSchema:
              m.outputSchema && typeof m.outputSchema === "object"
                ? m.outputSchema
                : {},
            tags: Array.isArray(m.tags)
              ? m.tags.filter((t): t is string => typeof t === "string")
              : [],
          },
        };
      }
      return null;
    })
    .filter((step): step is RoutinePlan["steps"][number] => step !== null);

  return {
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "New Routine",
    description: typeof parsed.description === "string" ? parsed.description.trim() : "",
    mode: parsed.mode === "one-shot" ? "one-shot" : "accumulate",
    steps,
  };
}

// Assemble a (reviewed) plan into a saved Routine: create any new Methods, then
// write the routine folder wiring them as a linear chain. Returns the loaded one.
export function createRoutineFromPlan(
  routinesDirectory: string,
  libraryDirectory: string,
  plan: RoutinePlan,
): LoadedRoutine {
  if (plan.steps.length === 0) {
    throw new Error("PLAN_EMPTY");
  }

  const deps: RoutineDep[] = [];
  const flow: RoutineStep[] = [];
  const seenDeps = new Set<string>();

  plan.steps.forEach((step, index) => {
    let methodId: string;
    let version: string;
    if (step.reuse) {
      const method = loadMethod(libraryDirectory, step.reuse);
      if (!method) {
        throw new Error(`PLAN_METHOD_NOT_FOUND:${step.reuse}`);
      }
      methodId = method.id;
      version = method.version;
    } else if (step.method) {
      const created = createMethod(libraryDirectory, step.method);
      methodId = created.id;
      version = created.version;
    } else {
      throw new Error("PLAN_STEP_INVALID");
    }

    if (!seenDeps.has(methodId)) {
      seenDeps.add(methodId);
      deps.push({ methodId, version });
    }
    flow.push({
      id: `step${index + 1}`,
      methodId,
      from: index === 0 ? "journal" : "previous",
    });
  });

  const base = slugify(plan.name);
  let id = base;
  let n = 2;
  while (existsSync(join(routinesDirectory, id))) {
    id = `${base}-${n}`;
    n += 1;
  }

  const dir = join(routinesDirectory, id);
  mkdirSync(dir, { recursive: true });

  const meta = {
    name: plan.name,
    description: plan.description,
    owner: "",
    version: "1.0.0",
    tags: [] as string[],
    origin: "self",
    mode: plan.mode,
    storage: { journal: true, gallery: true },
    deps,
    flow,
  };
  writeFileSync(join(dir, "routine.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  writeFileSync(
    join(dir, "manifest.json"),
    `${JSON.stringify({ permissions: { network: false, readFiles: false } }, null, 2)}\n`,
    "utf8",
  );

  const routine = loadRoutine(routinesDirectory, libraryDirectory, id);
  if (!routine) {
    throw new Error("ROUTINE_CREATE_FAILED");
  }
  return routine;
}
