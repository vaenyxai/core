// In-app Backup & Restore. Backups are timestamped folders under
// private/backups holding the SQLite database plus the whole local library
// (Methods/Routines). Creating a backup is safe while Vaenyx runs (the backup
// script opens the DB read-only and uses SQLite's online backup). Restoring
// must NOT overwrite an open database, so restore is deferred: we drop a
// pending-restore marker and restart; the swap happens at boot, before the DB
// is opened (see applyPendingRestore in db/database.ts).
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import type { BackupEntry } from "@vaenyx/contracts";

import type { AppConfig } from "../../config.js";

export const PENDING_RESTORE_FLAG = "pending-restore.flag";

// A backup id is a single folder name — no path separators, no traversal.
const BACKUP_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isValidBackupId(id: string): boolean {
  return BACKUP_ID_PATTERN.test(id) && !id.includes("..");
}

function folderSizeBytes(directory: string): number {
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name);
    try {
      total += entry.isDirectory() ? folderSizeBytes(full) : statSync(full).size;
    } catch {
      // A file vanishing mid-scan just doesn't count toward the size.
    }
  }
  return total;
}

export function listBackups(config: AppConfig): BackupEntry[] {
  const root = config.backupsDirectory;
  if (!existsSync(root)) return [];

  const entries: BackupEntry[] = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const folder = resolve(root, item.name);
    // A valid restore point must contain a database file.
    if (!existsSync(resolve(folder, "vaenyx.db"))) continue;

    const kind = item.name.startsWith("before-restore-") ? "safety" : "backup";
    let createdAt = "";
    let migrations = 0;
    let library = { included: false, methods: 0, routines: 0 };

    try {
      const manifest = JSON.parse(
        readFileSync(resolve(folder, "manifest.json"), "utf8"),
      ) as Record<string, unknown>;
      if (typeof manifest.createdAt === "string") createdAt = manifest.createdAt;
      if (typeof manifest.migrations === "number") {
        migrations = manifest.migrations;
      }
      const lib = manifest.library as Record<string, unknown> | undefined;
      if (lib && typeof lib === "object") {
        library = {
          included: lib.included === true,
          methods: Number(lib.methods) || 0,
          routines: Number(lib.routines) || 0,
        };
      }
    } catch {
      // Safety copies and pre-library backups may have no manifest.
    }

    if (!createdAt) {
      try {
        createdAt = statSync(folder).mtime.toISOString();
      } catch {
        createdAt = "";
      }
    }

    entries.push({
      id: item.name,
      createdAt,
      kind,
      sizeBytes: folderSizeBytes(folder),
      migrations,
      library,
    });
  }

  entries.sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
  return entries;
}

export function backupExists(config: AppConfig, id: string): boolean {
  if (!isValidBackupId(id)) return false;
  return existsSync(resolve(config.backupsDirectory, id, "vaenyx.db"));
}

// Runs scripts/backup.mjs (reused, already tested) with the server's paths.
export function createBackupNow(config: AppConfig): {
  ok: boolean;
  output: string;
} {
  const script = resolve(config.repositoryRoot, "scripts", "backup.mjs");
  if (!existsSync(script)) {
    return { ok: false, output: "backup.mjs not found." };
  }
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      VAENYX_DATA_DIR: config.dataDirectory,
      VAENYX_BACKUPS_DIR: config.backupsDirectory,
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { ok: result.status === 0, output };
}

// Marks a backup to be restored on next boot. The actual file swap happens in
// applyPendingRestore(), before the database is opened.
export function requestRestore(config: AppConfig, id: string): void {
  writeFileSync(
    resolve(config.dataDirectory, PENDING_RESTORE_FLAG),
    id,
    "utf8",
  );
}
