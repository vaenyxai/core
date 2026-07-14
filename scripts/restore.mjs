import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import {
  backupRoots,
  backupsDirectory,
  dataDirectory,
  libraryDirectory,
} from "./lib/paths.mjs";

const requestedBackup = process.argv[2];

if (!requestedBackup) {
  throw new Error("A backup folder is required.");
}

const backupDirectory = resolve(requestedBackup);
const insideAllowedBackupRoot = backupRoots.some((backupRoot) => {
  const backupRelativePath = relative(backupRoot, backupDirectory);

  return (
    backupRelativePath !== "" &&
    !backupRelativePath.startsWith("..") &&
    !backupRelativePath.includes("..")
  );
});

if (!insideAllowedBackupRoot) {
  throw new Error("Restore source must be one backup folder inside userdata/backups.");
}

const backupDatabase = resolve(backupDirectory, "vaenyx.db");

if (!existsSync(backupDatabase)) {
  throw new Error("The selected backup does not contain vaenyx.db.");
}

const snapshot = new DatabaseSync(backupDatabase, { readOnly: true });
const integrity = snapshot.prepare("PRAGMA integrity_check").get();
snapshot.close();

if (integrity?.integrity_check !== "ok") {
  throw new Error("The selected backup failed its integrity check.");
}

mkdirSync(dataDirectory, { recursive: true });
const currentDatabase = resolve(dataDirectory, "vaenyx.db");
const safetyDirectory = resolve(
  backupsDirectory,
  `before-restore-${new Date().toISOString().replaceAll(":", "-").replace(".", "-")}`,
);
let safetyUsed = false;

if (existsSync(currentDatabase)) {
  mkdirSync(safetyDirectory, { recursive: true });
  const current = new DatabaseSync(currentDatabase, { readOnly: true });
  await backup(current, resolve(safetyDirectory, "vaenyx.db"));
  current.close();
  safetyUsed = true;
}

copyFileSync(backupDatabase, currentDatabase);
rmSync(`${currentDatabase}-wal`, { force: true });
rmSync(`${currentDatabase}-shm`, { force: true });

const restored = new DatabaseSync(currentDatabase, { readOnly: true });
const restoredIntegrity = restored.prepare("PRAGMA integrity_check").get();
restored.close();

if (restoredIntegrity?.integrity_check !== "ok") {
  throw new Error("Restored database failed its integrity check.");
}

// Restore the library snapshot (methods + routines) if this backup has one.
// Mirror the database's "save a safety copy first, then replace" pattern so a
// bad restore is always reversible. Older backups that predate library support
// have no library folder — leave the current library untouched in that case.
const backupLibrary = resolve(backupDirectory, "library");
const currentLibrary = libraryDirectory;

if (existsSync(backupLibrary)) {
  if (existsSync(currentLibrary)) {
    mkdirSync(safetyDirectory, { recursive: true });
    cpSync(currentLibrary, resolve(safetyDirectory, "library"), { recursive: true });
    safetyUsed = true;
  }

  rmSync(currentLibrary, { recursive: true, force: true });
  cpSync(backupLibrary, currentLibrary, { recursive: true });
  console.log("Library restored from backup.");
} else {
  console.log(
    "This backup has no library snapshot; your current library was left unchanged.",
  );
}

if (safetyUsed) {
  console.log(`Safety backup created: ${safetyDirectory}`);
}

console.log(`Restore completed from: ${backupDirectory}`);
