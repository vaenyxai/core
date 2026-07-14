import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import type { AppConfig } from "../../config.js";

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
  if (existsSync(marker)) {
    return false;
  }

  const alreadyPopulated =
    countItemFolders(config.libraryDirectory) > 0 ||
    countItemFolders(config.routinesDirectory) > 0;

  if (!alreadyPopulated) {
    mkdirSync(config.libraryDirectory, { recursive: true });
    cpSync(sampleMethods, config.libraryDirectory, { recursive: true });
    if (existsSync(sampleRoutines)) {
      mkdirSync(config.routinesDirectory, { recursive: true });
      cpSync(sampleRoutines, config.routinesDirectory, { recursive: true });
    }
  }

  // Record that first-run seeding has happened — whether we copied the seed or
  // found the library already populated — so it never runs again on this
  // install.
  mkdirSync(libraryRoot, { recursive: true });
  writeFileSync(marker, new Date().toISOString());
  return !alreadyPopulated;
}
