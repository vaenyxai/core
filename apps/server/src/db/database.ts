import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { AppConfig } from "../config.js";

const PENDING_RESTORE_FLAG = "pending-restore.flag";

// If the owner asked to restore a backup, apply it here — BEFORE the database is
// opened — so restore.mjs can safely swap vaenyx.db and the library on disk with
// nothing holding the file. The marker is consumed first so a failed restore
// can't loop on every boot; on failure we keep starting with existing data and
// leave a breadcrumb log.
function applyPendingRestore(config: AppConfig): void {
  const flagPath = resolve(config.dataDirectory, PENDING_RESTORE_FLAG);
  if (!existsSync(flagPath)) return;

  let id = "";
  try {
    id = readFileSync(flagPath, "utf8").trim();
  } catch {
    // A missing or unreadable marker means no restore; keep id empty (set above).
  }
  try {
    rmSync(flagPath, { force: true });
  } catch {
    // If we can't clear the marker, still avoid acting on it below.
  }

  if (!id || id.includes("..") || !/^[A-Za-z0-9._-]+$/.test(id)) return;

  const backupFolder = resolve(config.backupsDirectory, id);
  if (!existsSync(resolve(backupFolder, "vaenyx.db"))) return;

  const script = resolve(config.repositoryRoot, "scripts", "restore.mjs");
  if (!existsSync(script)) return;

  const result = spawnSync(process.execPath, [script, backupFolder], {
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      VAENYX_DATA_DIR: config.dataDirectory,
      VAENYX_BACKUPS_DIR: config.backupsDirectory,
    },
  });

  if (result.status !== 0) {
    try {
      writeFileSync(
        resolve(config.dataDirectory, "pending-restore.failed.log"),
        `${result.stdout ?? ""}${result.stderr ?? ""}`,
      );
    } catch {
      // Best-effort breadcrumb only.
    }
  }
}

export interface DatabaseHandle {
  close: () => void;
  sqlite: DatabaseSync;
  ping: () => boolean;
}

function runMigrations(
  sqlite: DatabaseSync,
  migrationsDirectory: string,
): void {
  if (!existsSync(migrationsDirectory)) {
    throw new Error(`Vaenyx migrations directory not found: ${migrationsDirectory}`);
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS vanta_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedMigrations = new Set(
    sqlite
      .prepare("SELECT filename FROM vanta_migrations")
      .all()
      .map((row) => (row as { filename: string }).filename),
  );
  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  const recordMigration = sqlite.prepare(
    "INSERT INTO vanta_migrations (filename) VALUES (?)",
  );

  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      continue;
    }

    const migration = readFileSync(
      join(migrationsDirectory, filename),
      "utf8",
    );

    sqlite.exec("BEGIN IMMEDIATE;");

    try {
      sqlite.exec(migration);
      recordMigration.run(filename);
      sqlite.exec("COMMIT;");
    } catch (error) {
      sqlite.exec("ROLLBACK;");
      throw error;
    }
  }
}

export function createDatabase(config: AppConfig): DatabaseHandle {
  mkdirSync(config.dataDirectory, { recursive: true });

  // Apply an owner-requested restore before opening the database.
  applyPendingRestore(config);

  // One-time DB filename migration (Vanta -> Vaenyx): if the new-name database is
  // absent but a legacy vanta.db exists in the same directory, move it (with its
  // WAL/SHM sidecars). This lets the rename's maintenance restart adopt the
  // existing data with no manual file rename. A clean prior shutdown checkpoints
  // the WAL, so the data is already in the main file before the move.
  const legacyDbPath = join(config.dataDirectory, "vanta.db");
  if (!existsSync(config.databasePath) && existsSync(legacyDbPath)) {
    renameSync(legacyDbPath, config.databasePath);
    for (const suffix of ["-wal", "-shm"]) {
      const from = `${legacyDbPath}${suffix}`;
      if (existsSync(from)) renameSync(from, `${config.databasePath}${suffix}`);
    }
  }

  const sqlite = new DatabaseSync(config.databasePath);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec("PRAGMA journal_mode = WAL;");
  runMigrations(sqlite, config.migrationsDirectory);
  const integrity = sqlite.prepare("PRAGMA quick_check").get() as
    | { quick_check: string }
    | undefined;

  if (integrity?.quick_check !== "ok") {
    sqlite.close();
    throw new Error("Vaenyx database integrity check failed.");
  }

  return {
    close: () => sqlite.close(),
    sqlite,
    ping: () => {
      const result = sqlite.prepare("SELECT 1 AS ok").get() as
        | { ok: number }
        | undefined;

      return result?.ok === 1;
    },
  };
}
