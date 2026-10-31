import { seedHouseholdRoutines } from "./library-seed-household.js";
import { seedDinnerPlanner } from "./library-seed-dinner.js";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import type { AppConfig } from "../../config.js";

const FIRST_PARTY_RESULT_PACKAGES = [
  "vaenyx-receipt-record",
  "vaenyx-warranty-manual-record",
  "vaenyx-material-takeoff",
] as const;

// H-014 addendum (Oskar, 2026-09-27): from 1.0.1 the three first-party
// packages no longer ask the model for a footnote; each Routine's view names
// fixed legal copy by key. An install still holding the UNCHANGED 1.0.0 files
// (recognised by fingerprint) is upgraded once, keeping every example the
// Owner added. A package the Owner edited is never overwritten.
const FIRST_PARTY_FOOTNOTE_MARKER = ".first-party-result-views-v2";
const FOOTNOTE_METHOD_FILES = [
  "method.json",
  "schema.json",
  "recipe.md",
  "manifest.json",
  "examples/0001.json",
];
const FOOTNOTE_ROUTINE_FILES = [
  "routine.json",
  "manifest.json",
  "examples/0001.json",
];
// The model-written field each 1.0.0 output carried, and the 1.0.0
// fingerprints (normalised line endings; see packageFingerprint).
const FIRST_PARTY_FOOTNOTE_UPGRADES: Record<
  (typeof FIRST_PARTY_RESULT_PACKAGES)[number],
  { field: string; method: string; routine: string }
> = {
  "vaenyx-receipt-record": {
    field: "disclaimer",
    method: "34b01e97cf859407506511b2205613c518fea3c0afe2f44054fe5854e5bde8ac",
    routine: "02eab64e9114f185899819a1c23c0d1d24ee5827fa302f9a3f2736b13c9f8f8f",
  },
  "vaenyx-warranty-manual-record": {
    field: "disclaimer",
    method: "df70548e95cc0f081471db017c308a6d94f49c94dc347077ef2907ae1c19acd9",
    routine: "864f801c6d6efa7bd1c953a570db8799764b4b3e73d46e9a15cb9baf49e91697",
  },
  "vaenyx-material-takeoff": {
    field: "humanCheckRequired",
    method: "4d8d3041704faa5933b349d6f28a522db8486971078406ea84b19a1a93192782",
    routine: "01393533ef164528300b12288a5911716500544b969edc8e4c8aebce3611edfc",
  },
};

/** A package's shipped files as one hash; null when any is missing. Line
 *  endings and a BOM are normalised so a checkout's CRLF does not matter. */
export function packageFingerprint(
  directory: string,
  files: readonly string[],
): string | null {
  const hash = createHash("sha256");
  for (const file of files) {
    const path = join(directory, file);
    if (!existsSync(path)) return null;
    const text = readFileSync(path, "utf8")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n");
    hash.update(`${file}\n${text}\n\0`);
  }
  return hash.digest("hex");
}

// The Owner's own examples were written in the 1.0.0 output shape. The 1.0.1
// schema rejects the model-written field, so an example still teaching it
// would make the next run fail validation: drop that one field, nothing else.
function dropObsoleteExampleField(examplesDirectory: string, field: string) {
  if (!existsSync(examplesDirectory)) return;
  for (const name of readdirSync(examplesDirectory)) {
    if (!name.endsWith(".json")) continue;
    const path = join(examplesDirectory, name);
    try {
      const example = JSON.parse(readFileSync(path, "utf8")) as {
        output?: Record<string, unknown>;
      };
      if (!example.output || !(field in example.output)) continue;
      delete example.output[field];
      writeFileSync(path, `${JSON.stringify(example, null, 2)}\n`, "utf8");
    } catch {
      // An unreadable example is left exactly as it was.
    }
  }
}

function upgradeFirstPartyFootnotes(
  config: AppConfig,
  sampleMethods: string,
  sampleRoutines: string,
): boolean {
  const marker = resolve(
    dirname(config.libraryDirectory),
    FIRST_PARTY_FOOTNOTE_MARKER,
  );
  if (existsSync(marker)) return false;
  let upgraded = false;
  for (const id of FIRST_PARTY_RESULT_PACKAGES) {
    const plan = FIRST_PARTY_FOOTNOTE_UPGRADES[id];
    const method = resolve(config.libraryDirectory, id);
    const routine = resolve(config.routinesDirectory, id);
    if (
      packageFingerprint(method, FOOTNOTE_METHOD_FILES) !== plan.method ||
      packageFingerprint(routine, FOOTNOTE_ROUTINE_FILES) !== plan.routine
    ) {
      continue;
    }
    for (const file of FOOTNOTE_METHOD_FILES) {
      copyFileSync(join(sampleMethods, id, file), join(method, file));
    }
    for (const file of FOOTNOTE_ROUTINE_FILES) {
      copyFileSync(join(sampleRoutines, id, file), join(routine, file));
    }
    dropObsoleteExampleField(join(method, "examples"), plan.field);
    dropObsoleteExampleField(join(routine, "examples"), plan.field);
    upgraded = true;
  }
  writeFileSync(marker, new Date().toISOString());
  return upgraded;
}

// True when `child` is the same as, or nested under, `parent`.
function isInsideOrEqual(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

// Seed the supported starter package once. Dinner's marker prevents a removed
// package from reappearing; existing packages and edited content are retained.
export function seedLibraryIfEmpty(config: AppConfig): boolean {
  // No repo root (e.g. a minimal test config) → there is no seed source.
  if (!config.repositoryRoot) {
    return false;
  }

  const sampleRoot = resolve(config.repositoryRoot, "sample-library");
  const sampleMethods = resolve(sampleRoot, "methods");
  const sampleRoutines = resolve(sampleRoot, "routines");

  // Nothing shipped to seed from, or the runtime library IS the seed itself
  // (the no-env fallback resolves libraryDirectory to sample-library/methods) —
  // never seed the seed onto itself.
  if (!existsSync(sampleMethods)) {
    return false;
  }
  if (isInsideOrEqual(sampleRoot, config.libraryDirectory)) {
    return false;
  }

  const libraryRoot = dirname(config.libraryDirectory);
  const marker = resolve(libraryRoot, ".seeded");
  // Dinner, Family Notices and Warranty are default installations. Historical packages remain in the
  // distribution for compatibility tests and upgrades, not as starter items.
  mkdirSync(libraryRoot, { recursive: true });
  if (!existsSync(marker)) writeFileSync(marker, new Date().toISOString());
  let copied = false;
  if (
    FIRST_PARTY_RESULT_PACKAGES.every(
      (id) =>
        existsSync(resolve(sampleMethods, id)) &&
        existsSync(resolve(sampleRoutines, id)),
    ) &&
    upgradeFirstPartyFootnotes(config, sampleMethods, sampleRoutines)
  ) {
    copied = true;
  }
  if (seedDinnerPlanner(config, sampleMethods, sampleRoutines)) copied = true;
  if (seedHouseholdRoutines(config, sampleMethods, sampleRoutines)) copied = true;
  return copied;
}
