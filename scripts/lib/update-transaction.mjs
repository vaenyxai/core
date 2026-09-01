import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

const FAMILY_SUFFIXES = ["", "-wal", "-shm"];

function familyPath(databasePath, suffix) {
  return `${databasePath}${suffix}`;
}

function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function migrationNames(database) {
  const table = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vanta_migrations'",
    )
    .get();
  if (!table) return [];
  return database
    .prepare("SELECT filename FROM vanta_migrations ORDER BY filename")
    .all()
    .map((row) => row.filename);
}

export function familyMembers(databasePath) {
  return FAMILY_SUFFIXES.filter((suffix) =>
    existsSync(familyPath(databasePath, suffix)),
  ).map((suffix) => familyPath(databasePath, suffix));
}

export function removeFamily(databasePath) {
  for (const suffix of FAMILY_SUFFIXES) {
    rmSync(familyPath(databasePath, suffix), { force: true });
  }
}

export function validateDatabase(databasePath, { checkpoint = true } = {}) {
  if (!existsSync(databasePath)) {
    throw new Error(`Database is missing: ${databasePath}`);
  }
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("PRAGMA foreign_keys = ON;");
    if (checkpoint) {
      const result = database.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
      if (Number(result?.busy ?? 0) !== 0) {
        throw new Error("Database WAL checkpoint was busy.");
      }
    }
    const integrity = database.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
      throw new Error("Database integrity_check failed.");
    }
    const foreignKeys = database.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeys.length > 0) {
      throw new Error("Database foreign_key_check failed.");
    }
    return {
      integrity: "ok",
      foreignKeys: "ok",
      migrations: migrationNames(database),
      sha256: sha256(databasePath),
    };
  } finally {
    database.close();
  }
}

export async function cloneDatabase(sourcePath, destinationPath) {
  mkdirSync(dirname(destinationPath), { recursive: true });
  removeFamily(destinationPath);
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await backup(source, destinationPath);
  } finally {
    source.close();
  }
  return validateDatabase(destinationPath);
}

export async function createUpdateSnapshot(context) {
  const source = new DatabaseSync(context.liveDatabase);
  try {
    source.exec("PRAGMA foreign_keys = ON;");
    const checkpoint = source.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
    if (Number(checkpoint?.busy ?? 0) !== 0) {
      throw new Error("Live database still has an active WAL reader.");
    }
    const integrity = source.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
      throw new Error("Live database integrity_check failed.");
    }
    const foreignKeys = source.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeys.length > 0) {
      throw new Error("Live database foreign_key_check failed.");
    }
    mkdirSync(dirname(context.snapshotDatabase), { recursive: true });
    removeFamily(context.snapshotDatabase);
    await backup(source, context.snapshotDatabase);
  } finally {
    source.close();
  }

  const snapshot = validateDatabase(context.snapshotDatabase);
  await cloneDatabase(context.snapshotDatabase, context.candidateDatabase);
  atomicJson(context.manifestPath, {
    app: {
      previousVersion: context.previousVersion,
      targetVersion: context.targetVersion,
    },
    createdAt: new Date().toISOString(),
    database: {
      file: "snapshot/vaenyx.db",
      migrations: snapshot.migrations,
      sha256: snapshot.sha256,
    },
    transactionId: context.transactionId,
    version: 1,
  });
  return snapshot;
}

function readJournal(context) {
  try {
    return JSON.parse(readFileSync(context.switchJournalPath, "utf8"));
  } catch {
    return null;
  }
}

function writeJournal(context, phase) {
  atomicJson(context.switchJournalPath, {
    candidateDatabase: context.candidateDatabase,
    liveDatabase: context.liveDatabase,
    oldFamilyDatabase: context.oldFamilyDatabase,
    phase,
    snapshotDatabase: context.snapshotDatabase,
    transactionId: context.transactionId,
    updatedAt: new Date().toISOString(),
    version: 1,
  });
}

function fault(phase) {
  if (process.env.VAENYX_UPDATE_FAULT_PHASE === phase) {
    throw new Error(`Injected update interruption after ${phase}.`);
  }
}

export function moveDatabaseFamily(
  sourcePath,
  destinationPath,
  { faultScope = null, mainLast },
) {
  mkdirSync(dirname(destinationPath), { recursive: true });
  const suffixes = mainLast ? ["-wal", "-shm", ""] : ["", "-wal", "-shm"];
  for (const suffix of suffixes) {
    const source = familyPath(sourcePath, suffix);
    if (!existsSync(source)) continue;
    const destination = familyPath(destinationPath, suffix);
    if (existsSync(destination)) {
      throw new Error(
        `Database family destination already exists: ${destination}`,
      );
    }
    renameSync(source, destination);
    if (faultScope) {
      fault(`move:${faultScope}:${suffix || "db"}`);
    }
  }
}

export function switchDatabaseFamilies(context) {
  validateDatabase(context.candidateDatabase);
  validateDatabase(context.liveDatabase);
  if (familyMembers(context.oldFamilyDatabase).length > 0) {
    throw new Error("Old database rollback family already exists.");
  }
  writeJournal(context, "ready");
  fault("ready");
  moveDatabaseFamily(context.liveDatabase, context.oldFamilyDatabase, {
    faultScope: "old",
    mainLast: true,
  });
  writeJournal(context, "old-moved");
  fault("old-moved");
  moveDatabaseFamily(context.candidateDatabase, context.liveDatabase, {
    faultScope: "new",
    mainLast: false,
  });
  writeJournal(context, "new-installed");
  fault("new-installed");
  return validateDatabase(context.liveDatabase);
}

export async function rollbackDatabaseFamilies(context) {
  const oldMainExists = existsSync(context.oldFamilyDatabase);
  if (oldMainExists) {
    removeFamily(context.liveDatabase);
    moveDatabaseFamily(context.oldFamilyDatabase, context.liveDatabase, {
      mainLast: true,
    });
  } else {
    // If power failed while the old sidecars were moving, the main database is
    // still live. Reunite any sidecars already moved before opening it again.
    for (const suffix of ["-wal", "-shm"]) {
      const stranded = familyPath(context.oldFamilyDatabase, suffix);
      if (!existsSync(stranded)) continue;
      rmSync(familyPath(context.liveDatabase, suffix), { force: true });
      renameSync(stranded, familyPath(context.liveDatabase, suffix));
    }
  }

  if (!existsSync(context.liveDatabase)) {
    await cloneDatabase(context.snapshotDatabase, context.liveDatabase);
  }
  const validation = validateDatabase(context.liveDatabase);
  writeJournal(context, "rolled-back");
  return validation;
}

export async function recoverInterruptedSwitch(context) {
  const journal = readJournal(context);
  if (!journal) return { action: "none" };
  if (journal.transactionId !== context.transactionId) {
    throw new Error(
      "Update switch journal belongs to a different transaction.",
    );
  }
  if (journal.phase === "committed") {
    return {
      action: "committed",
      validation: validateDatabase(context.liveDatabase),
    };
  }
  return {
    action: "rolled-back",
    validation: await rollbackDatabaseFamilies(context),
  };
}

export function commitDatabaseSwitch(context) {
  const validation = validateDatabase(context.liveDatabase);
  writeJournal(context, "committed");
  return validation;
}
