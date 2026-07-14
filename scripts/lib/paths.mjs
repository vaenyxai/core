// Shared path resolver for the command-line ops scripts (backup / restore /
// diagnose). Keeping all three on one resolver stops them drifting apart.
//
// Resolution rules (2026-07-03 userdata migration, see docs/architecture.md):
//   1. An explicit VAENYX_*_DIR env override always wins. The launcher
//      (Vaenyx-Start.cmd) injects these as absolute paths; the ops smoke test
//      injects temp paths. A relative value is anchored at the repo root.
//   2. Otherwise pick the first candidate that already exists, preferring the
//      canonical userdata/ layout but still resolving gracefully on machines
//      that have not migrated yet (userdata -> private/data -> data).
//   3. If nothing exists yet, fall back to the userdata/ path so a fresh
//      install creates data in the new canonical location.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This file lives at scripts/lib/paths.mjs, so the repo root is two levels up.
export const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const userdataRoot = resolve(repositoryRoot, "userdata");

// Resolve an env override, anchoring a relative value at the repo root (an
// absolute value — what the launcher and tests pass — is returned as-is).
function fromEnv(value) {
  return value ? resolve(repositoryRoot, value) : null;
}

// First candidate directory that already contains `marker`, else null.
function firstContaining(candidates, marker) {
  return (
    candidates.find((directory) => existsSync(resolve(directory, marker))) ??
    null
  );
}

// First candidate directory that already exists, else null.
function firstExisting(candidates) {
  return candidates.find((directory) => existsSync(directory)) ?? null;
}

// --- Database directory ---------------------------------------------------
const dataCandidates = [
  resolve(userdataRoot, "db"),
  resolve(repositoryRoot, "private", "data"),
  resolve(repositoryRoot, "data"),
];
export const dataDirectory =
  fromEnv(process.env.VAENYX_DATA_DIR) ??
  firstContaining(dataCandidates, "vaenyx.db") ??
  dataCandidates[0];
export const databasePath = resolve(dataDirectory, "vaenyx.db");

// --- Backups directory ----------------------------------------------------
const backupsCandidates = [
  resolve(userdataRoot, "backups"),
  resolve(repositoryRoot, "private", "backups"),
  resolve(repositoryRoot, "backups"),
];
export const backupsDirectory =
  fromEnv(process.env.VAENYX_BACKUPS_DIR) ??
  firstExisting(backupsCandidates) ??
  backupsCandidates[0];

// Every root a restore is allowed to read a backup from: the resolved backups
// directory plus the known canonical roots, so an old backup still sitting
// under private/backups stays restorable after migration.
export const backupRoots = [...new Set([backupsDirectory, ...backupsCandidates])];

// --- Library directory ----------------------------------------------------
// Backups snapshot the whole library tree (methods + routines). The launcher
// exposes VAENYX_LIBRARY_DIR pointing at the methods subfolder, so the library
// root is its parent; otherwise fall back userdata/library -> sample-library.
const libraryCandidates = [
  resolve(userdataRoot, "library"),
  resolve(repositoryRoot, "sample-library"),
];
const libraryFromEnv = process.env.VAENYX_LIBRARY_DIR
  ? resolve(repositoryRoot, process.env.VAENYX_LIBRARY_DIR, "..")
  : null;
export const libraryDirectory =
  libraryFromEnv ?? firstExisting(libraryCandidates) ?? libraryCandidates[0];
