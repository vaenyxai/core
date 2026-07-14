// Owner-set backup preferences (userdata/config/backup.json): an optional
// destination folder — another disk, USB drive, NAS, or a cloud-synced folder
// (snapshots are write-once, so unlike the live database they may be synced) —
// and an optional keep-most-recent-N retention count. Mirrors the resolver in
// scripts/lib/paths.mjs so the CLI scripts and the server agree.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, resolve } from "node:path";

import type { AppConfig } from "../../config.js";

export interface BackupSchedule {
  cadence: "daily" | "weekly";
  hour: number; // 0–23 local time; weekly runs on Sunday
}

export interface BackupConfig {
  destination: string | null;
  keep: number | null;
  // Backup password (optional encryption). Stored locally only — it protects
  // the copies that leave this machine (USB / cloud-synced snapshots). NEVER
  // returned by any endpoint; the API exposes only `encrypted: boolean`.
  passphrase: string | null;
  schedule: BackupSchedule | null;
}

function configPath(config: AppConfig): string {
  return resolve(config.dataDirectory, "..", "config", "backup.json");
}

export function readBackupConfig(config: AppConfig): BackupConfig {
  try {
    const raw = JSON.parse(readFileSync(configPath(config), "utf8")) as {
      destination?: unknown;
      keep?: unknown;
      passphrase?: unknown;
      schedule?: unknown;
    };
    const destination =
      typeof raw.destination === "string" &&
      raw.destination.trim() !== "" &&
      isAbsolute(raw.destination.trim())
        ? raw.destination.trim()
        : null;
    const keep =
      Number.isInteger(raw.keep) &&
      (raw.keep as number) >= 1 &&
      (raw.keep as number) <= 500
        ? (raw.keep as number)
        : null;
    const passphrase =
      typeof raw.passphrase === "string" && raw.passphrase !== ""
        ? raw.passphrase
        : null;
    const rawSchedule = raw.schedule as
      | { cadence?: unknown; hour?: unknown }
      | null
      | undefined;
    const schedule: BackupSchedule | null =
      rawSchedule &&
      (rawSchedule.cadence === "daily" || rawSchedule.cadence === "weekly") &&
      Number.isInteger(rawSchedule.hour) &&
      (rawSchedule.hour as number) >= 0 &&
      (rawSchedule.hour as number) <= 23
        ? {
            cadence: rawSchedule.cadence,
            hour: rawSchedule.hour as number,
          }
        : null;
    return { destination, keep, passphrase, schedule };
  } catch {
    return { destination: null, keep: null, passphrase: null, schedule: null };
  }
}

// --- Automatic-backup state (userdata/config/backup-state.json) -------------
// Written by the scheduler after each automatic run so the UI can show what
// happened. Kept separate from backup.json (owner-set preferences).
export interface BackupAutoState {
  lastRunAt: string | null;
  lastOk: boolean | null;
}

function statePath(config: AppConfig): string {
  return resolve(config.dataDirectory, "..", "config", "backup-state.json");
}

export function readBackupAutoState(config: AppConfig): BackupAutoState {
  try {
    const raw = JSON.parse(readFileSync(statePath(config), "utf8")) as {
      lastRunAt?: unknown;
      lastOk?: unknown;
    };
    return {
      lastRunAt: typeof raw.lastRunAt === "string" ? raw.lastRunAt : null,
      lastOk: typeof raw.lastOk === "boolean" ? raw.lastOk : null,
    };
  } catch {
    return { lastRunAt: null, lastOk: null };
  }
}

export function writeBackupAutoState(
  config: AppConfig,
  state: BackupAutoState,
): void {
  const path = statePath(config);
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

// Validate + persist. A destination must be an absolute path we can actually
// create and write into — checked HERE so the Owner finds out at save time,
// not at 3am when a scheduled backup silently fails.
export function writeBackupConfig(
  config: AppConfig,
  next: BackupConfig,
): { ok: true } | { ok: false; error: string } {
  if (next.destination !== null) {
    if (!isAbsolute(next.destination)) {
      return {
        ok: false,
        error: "The destination must be a full path (like D:\\VaenyxBackups).",
      };
    }
    try {
      mkdirSync(next.destination, { recursive: true });
      const probe = resolve(next.destination, ".vaenyx-write-test");
      writeFileSync(probe, "ok", "utf8");
      rmSync(probe, { force: true });
    } catch {
      return {
        ok: false,
        error:
          "Vaenyx could not write to that folder. Check the drive is connected and the path is correct.",
      };
    }
  }
  const path = configPath(config);
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { ok: true };
}

// Where backups go right now: the configured destination, else the default
// local backups folder.
export function effectiveBackupsDirectory(config: AppConfig): string {
  return readBackupConfig(config).destination ?? config.backupsDirectory;
}

// Every root backups may live in (destination + local default), deduped —
// listing and restore look in both, so safety copies written locally during a
// restore stay visible alongside snapshots on an external destination.
export function backupSearchRoots(config: AppConfig): string[] {
  return [
    ...new Set(
      [effectiveBackupsDirectory(config), config.backupsDirectory].filter(
        (root) => existsSync(root),
      ),
    ),
  ];
}
