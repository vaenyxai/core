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
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
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
export const instanceLockPath = process.env.VAENYX_INSTANCE_LOCK_PATH
  ? resolve(repositoryRoot, process.env.VAENYX_INSTANCE_LOCK_PATH)
  : resolve(dataDirectory, "..", "config", "instance.lock.json");

// --- Backup config (userdata/config/backup.json) ---------------------------
// Owner-set backup preferences: an optional destination folder (another disk,
// USB drive, NAS or a cloud-synced folder — snapshots are write-once files, so
// unlike the live database they MAY be cloud-synced) and an optional
// keep-most-recent-N retention count. Absent/invalid file = defaults.
// Derived from the (env-aware) data directory — userdata/db → userdata/config —
// so scripts and the server read the SAME file even under VAENYX_DATA_DIR
// overrides (tests, custom installs).
export const backupConfigPath = resolve(
  dataDirectory,
  "..",
  "config",
  "backup.json",
);

export function readBackupConfig() {
  try {
    const raw = JSON.parse(readFileSync(backupConfigPath, "utf8"));
    const destination =
      typeof raw.destination === "string" &&
      raw.destination.trim() !== "" &&
      isAbsolute(raw.destination.trim())
        ? raw.destination.trim()
        : null;
    const keep =
      Number.isInteger(raw.keep) && raw.keep >= 1 && raw.keep <= 500
        ? raw.keep
        : null;
    const passphrase =
      typeof raw.passphrase === "string" && raw.passphrase !== ""
        ? raw.passphrase
        : null;
    return { destination, keep, passphrase };
  } catch {
    return { destination: null, keep: null, passphrase: null };
  }
}

// --- Backups directory ----------------------------------------------------
const backupsCandidates = [
  resolve(userdataRoot, "backups"),
  resolve(repositoryRoot, "private", "backups"),
  resolve(repositoryRoot, "backups"),
];
const configuredDestination = readBackupConfig().destination;
export const backupsDirectory =
  fromEnv(process.env.VAENYX_BACKUPS_DIR) ??
  configuredDestination ??
  firstExisting(backupsCandidates) ??
  backupsCandidates[0];

// Every root a restore is allowed to read a backup from: the resolved backups
// directory, the Owner-configured destination, plus the known canonical roots —
// so an old backup under private/backups, or a snapshot on the configured
// external destination, stays restorable either way.
export const backupRoots = [
  ...new Set(
    [backupsDirectory, configuredDestination, ...backupsCandidates].filter(
      Boolean,
    ),
  ),
];

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
