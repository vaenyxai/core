import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import type { AppConfig } from "../../config.js";

const FIRST_PARTY_RESULT_VIEWS_MARKER = ".first-party-result-views-v1";
const FIRST_PARTY_RESULT_PACKAGES = [
  "vaenyx-receipt-record",
  "vaenyx-warranty-manual-record",
  "vaenyx-material-takeoff",
] as const;

// Each Method / Routine is a folder, so a non-empty library has >= 1 subfolder.
function countItemFolders(directory: string): number {
  if (!existsSync(directory)) {
    return 0;
  }
  return readdirSync(directory, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  ).length;
}

// True when `child` is the same as, or nested under, `parent`.
function isInsideOrEqual(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

// On a fresh install the runtime library (userdata/library) is empty and nothing
// has copied the shipped demo seed in, so a brand-new user would open an empty
// "Library". On boot, if the library has never been seeded and is currently
// empty, copy the repo's `sample-library/` seed into the runtime library.
//
// A `.seeded` marker makes this strictly first-run: a user who later deletes
// every item is NOT re-seeded on the next boot. Returns true only when it
// actually copied the seed.
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
  const alreadySeeded = existsSync(marker);
  const alreadyPopulated = alreadySeeded
    ? true
    : countItemFolders(config.libraryDirectory) > 0 ||
      countItemFolders(config.routinesDirectory) > 0;
  let copied = false;

  if (!alreadySeeded && !alreadyPopulated) {
    mkdirSync(config.libraryDirectory, { recursive: true });
    cpSync(sampleMethods, config.libraryDirectory, { recursive: true });
    copied = true;
    if (existsSync(sampleRoutines)) {
      mkdirSync(config.routinesDirectory, { recursive: true });
      cpSync(sampleRoutines, config.routinesDirectory, { recursive: true });
    }
  }

  // Record that first-run seeding has happened — whether we copied the seed or
  // found the library already populated — so it never runs again on this
  // install.
  mkdirSync(libraryRoot, { recursive: true });
  if (!alreadySeeded) writeFileSync(marker, new Date().toISOString());

  // H-014 is a product package rather than disposable demo content. Install
  // each missing first-party folder once for existing owners too, while never
  // overwriting an Owner/community package that already uses the same id.
  const firstPartyMarker = resolve(
    libraryRoot,
    FIRST_PARTY_RESULT_VIEWS_MARKER,
  );
  if (!existsSync(firstPartyMarker)) {
    for (const id of FIRST_PARTY_RESULT_PACKAGES) {
      const sourceMethod = resolve(sampleMethods, id);
      const sourceRoutine = resolve(sampleRoutines, id);
      const destinationMethod = resolve(config.libraryDirectory, id);
      const destinationRoutine = resolve(config.routinesDirectory, id);
      if (!existsSync(sourceMethod) || !existsSync(sourceRoutine)) continue;
      // A Method/Routine is one dependency pair. If either id is occupied,
      // skip BOTH: installing half could bind unrelated instructions to a
      // shipped Routine (or shipped instructions to an Owner's Routine).
      if (existsSync(destinationMethod) || existsSync(destinationRoutine)) {
        continue;
      }
      mkdirSync(config.libraryDirectory, { recursive: true });
      mkdirSync(config.routinesDirectory, { recursive: true });
      cpSync(sourceMethod, destinationMethod, { recursive: true });
      cpSync(sourceRoutine, destinationRoutine, { recursive: true });
      copied = true;
    }
    if (
      FIRST_PARTY_RESULT_PACKAGES.some(
        (id) =>
          existsSync(resolve(sampleMethods, id)) &&
          existsSync(resolve(sampleRoutines, id)),
      )
    ) {
      writeFileSync(firstPartyMarker, new Date().toISOString());
    }
  }
  return copied;
}
