import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import {
  backupsDirectory,
  databasePath,
  libraryDirectory,
  readBackupConfig,
} from "./lib/paths.mjs";

if (!existsSync(databasePath)) {
  throw new Error("No Vaenyx database exists yet. Start Vaenyx and complete setup first.");
}

const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
const destinationDirectory = resolve(backupsDirectory, timestamp);
const destinationDatabase = resolve(destinationDirectory, "vaenyx.db");

mkdirSync(destinationDirectory, { recursive: true });

const source = new DatabaseSync(databasePath, { readOnly: true });
await backup(source, destinationDatabase);
source.close();

const snapshot = new DatabaseSync(destinationDatabase, { readOnly: true });
const integrity = snapshot.prepare("PRAGMA integrity_check").get();
const migrationCount = snapshot
  .prepare("SELECT COUNT(*) AS count FROM vanta_migrations")
  .get();
snapshot.close();

if (integrity?.integrity_check !== "ok") {
  throw new Error("Backup integrity check failed.");
}

// Include the whole library tree (methods + routines) so that a user's
// own and installed Methods/Routines — which live on disk as local-private,
// gitignored content — are captured alongside the database. Default layout is
// <root>/library/{methods,routines}; backing up the parent folder covers both.
function countItemFolders(directory) {
  if (!existsSync(directory)) {
    return 0;
  }

  return readdirSync(directory, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  ).length;
}

let library = { included: false, methods: 0, routines: 0 };

if (existsSync(libraryDirectory)) {
  const destinationLibrary = resolve(destinationDirectory, "library");
  cpSync(libraryDirectory, destinationLibrary, { recursive: true });
  library = {
    included: true,
    methods: countItemFolders(resolve(destinationLibrary, "methods")),
    routines: countItemFolders(resolve(destinationLibrary, "routines")),
  };
  console.log(
    `Library included: ${library.methods} method(s), ${library.routines} routine(s).`,
  );
} else {
  console.log("No library folder found; backed up the database without a library snapshot.");
}

writeFileSync(
  resolve(destinationDirectory, "manifest.json"),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      database: "vaenyx.db",
      integrity: "ok",
      migrations: migrationCount?.count ?? 0,
      library,
      note: "Private Vaenyx instance backup. Keep this folder private.",
    },
    null,
    2,
  ),
);

console.log(`Backup created: ${destinationDirectory}`);

// Retention: keep only the most recent N proper backups (never the safety
// copies a restore creates). Prunes ONLY when the Owner has configured a keep
// count — no silent deletion by default. Runs after a successful backup, so a
// failed run never removes anything.
const keepRaw = Number.parseInt(process.env.VAENYX_BACKUP_KEEP ?? "", 10);
const keep =
  Number.isInteger(keepRaw) && keepRaw >= 1
    ? keepRaw
    : readBackupConfig().keep;

if (keep) {
  const snapshots = readdirSync(backupsDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith("before-restore-") &&
        existsSync(resolve(backupsDirectory, entry.name, "vaenyx.db")),
    )
    .map((entry) => entry.name)
    .sort()
    .reverse(); // timestamp names sort newest-first when reversed

  for (const name of snapshots.slice(keep)) {
    rmSync(resolve(backupsDirectory, name), { recursive: true, force: true });
    console.log(`Retention: removed old backup ${name} (keeping ${keep}).`);
  }
}
