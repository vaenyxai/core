import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = resolve(import.meta.dirname, "..");
const sourceDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-backup-source-"));
const restoreDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-restore-target-"));
const backupsStore = mkdtempSync(resolve(tmpdir(), "vaenyx-backup-store-"));
let backupDirectory;

try {
  const source = new DatabaseSync(resolve(sourceDirectory, "vaenyx.db"));
  source.exec(`
    CREATE TABLE vanta_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE release_test (
      value TEXT NOT NULL
    );
    INSERT INTO vanta_migrations (filename) VALUES ('release-test.sql');
    INSERT INTO release_test (value) VALUES ('backup-restore-ok');
  `);
  source.close();

  const output = execFileSync(process.execPath, ["scripts/backup.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      VAENYX_DATA_DIR: sourceDirectory,
      VAENYX_BACKUPS_DIR: backupsStore,
      // Point the library at a path that does not exist so the smoke test stays
      // a pure DB round-trip and never reads or copies the real userdata library.
      VAENYX_LIBRARY_DIR: resolve(sourceDirectory, "library", "methods"),
    },
    encoding: "utf8",
  });
  const backupLine = output
    .split(/\r?\n/)
    .find((line) => line.startsWith("Backup created: "));

  if (!backupLine) {
    throw new Error("Backup smoke test did not return its backup path.");
  }

  backupDirectory = backupLine.slice("Backup created: ".length);
  execFileSync(process.execPath, ["scripts/restore.mjs", backupDirectory], {
    cwd: root,
    env: {
      ...process.env,
      VAENYX_DATA_DIR: restoreDirectory,
      VAENYX_BACKUPS_DIR: backupsStore,
      VAENYX_LIBRARY_DIR: resolve(restoreDirectory, "library", "methods"),
    },
    stdio: "ignore",
  });

  const restored = new DatabaseSync(resolve(restoreDirectory, "vaenyx.db"), {
    readOnly: true,
  });
  const value = restored.prepare("SELECT value FROM release_test").get();
  const integrity = restored.prepare("PRAGMA integrity_check").get();
  restored.close();

  if (value?.value !== "backup-restore-ok" || integrity?.integrity_check !== "ok") {
    throw new Error("Backup and restore smoke test failed.");
  }

  console.log("Backup and restore smoke test passed.");
} finally {
  rmSync(sourceDirectory, { force: true, recursive: true });
  rmSync(restoreDirectory, { force: true, recursive: true });
  rmSync(backupsStore, { force: true, recursive: true });
}
