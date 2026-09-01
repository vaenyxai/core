import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { backup, DatabaseSync } from "node:sqlite";

import { acquireInstanceLock } from "./lib/instance-lock.mjs";
import {
  commitDatabaseSwitch,
  moveDatabaseFamily,
  recoverInterruptedSwitch,
  rollbackDatabaseFamilies,
  switchDatabaseFamilies,
} from "./lib/update-transaction.mjs";

const roots = [];

function temporary(name) {
  const root = mkdtempSync(resolve(tmpdir(), `vaenyx-update-${name}-`));
  roots.push(root);
  return root;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createDatabase(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE vanta_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE release_test (value TEXT NOT NULL);
  `);
  database.prepare("INSERT INTO release_test (value) VALUES (?)").run(value);
  database.close();
}

function readValue(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    return database.prepare("SELECT value FROM release_test").get()?.value;
  } finally {
    database.close();
  }
}

async function contextFor(name) {
  const root = temporary(name);
  const context = {
    transactionId: name,
    liveDatabase: resolve(root, "live", "vaenyx.db"),
    candidateDatabase: resolve(root, "candidate", "vaenyx.db"),
    oldFamilyDatabase: resolve(root, "old", "vaenyx.db"),
    snapshotDatabase: resolve(root, "snapshot", "vaenyx.db"),
    switchJournalPath: resolve(root, "switch.json"),
  };
  createDatabase(context.liveDatabase, "old");
  createDatabase(context.candidateDatabase, "new");
  mkdirSync(dirname(context.snapshotDatabase), { recursive: true });
  const source = new DatabaseSync(context.liveDatabase, { readOnly: true });
  await backup(source, context.snapshotDatabase);
  source.close();
  return context;
}

try {
  // A different OS process cannot join a live lock without the delegated token.
  const lockRoot = temporary("lock");
  const lockPath = resolve(lockRoot, "instance.lock.json");
  const lock = acquireInstanceLock(lockPath, "smoke-owner");
  const lockModule = pathToFileURL(
    resolve(import.meta.dirname, "lib", "instance-lock.mjs"),
  ).href;
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { acquireInstanceLock } from ${JSON.stringify(lockModule)}; try { acquireInstanceLock(process.argv[1], 'second-process'); process.exit(24); } catch { process.exit(23); }`,
      lockPath,
    ],
    {
      env: { ...process.env, VAENYX_INSTANCE_LOCK_TOKEN: "" },
    },
  );
  assert(
    child.status === 23,
    "Second-process lock contention was not blocked.",
  );
  lock.release();

  // Every member of a WAL database family moves together.
  const familyRoot = temporary("wal-family");
  const from = resolve(familyRoot, "from", "vaenyx.db");
  const to = resolve(familyRoot, "to", "vaenyx.db");
  mkdirSync(dirname(from), { recursive: true });
  writeFileSync(from, "db");
  writeFileSync(`${from}-wal`, "wal");
  writeFileSync(`${from}-shm`, "shm");
  moveDatabaseFamily(from, to, { mainLast: true });
  for (const suffix of ["", "-wal", "-shm"]) {
    assert(
      !existsSync(`${from}${suffix}`),
      `Source family member remained: ${suffix}`,
    );
    assert(
      readFileSync(`${to}${suffix}`, "utf8") ===
        (suffix || "db").replace("-", ""),
      `Family member was not preserved: ${suffix}`,
    );
  }

  // Windows must refuse a switch while any process still holds the live WAL.
  const held = await contextFor("held-wal");
  const liveHandle = new DatabaseSync(held.liveDatabase);
  liveHandle.exec("PRAGMA journal_mode = WAL; BEGIN IMMEDIATE;");
  let heldFailed = false;
  try {
    switchDatabaseFamilies(held);
  } catch {
    heldFailed = true;
  }
  liveHandle.exec("ROLLBACK;");
  liveHandle.close();
  assert(heldFailed, "An open live database handle did not block the switch.");
  assert(
    readValue(held.liveDatabase) === "old",
    "Open-handle test changed live data.",
  );

  // Power loss at every durable phase always recovers the old code/data pair.
  for (const phase of [
    "ready",
    "move:old:db",
    "old-moved",
    "move:new:db",
    "new-installed",
  ]) {
    const context = await contextFor(`interrupt-${phase.replaceAll(":", "-")}`);
    process.env.VAENYX_UPDATE_FAULT_PHASE = phase;
    let interrupted = false;
    try {
      switchDatabaseFamilies(context);
    } catch {
      interrupted = true;
    } finally {
      delete process.env.VAENYX_UPDATE_FAULT_PHASE;
    }
    assert(interrupted, `Fault injection did not interrupt phase ${phase}.`);
    const recovery = await recoverInterruptedSwitch(context);
    assert(
      recovery.action === "rolled-back",
      `Phase ${phase} did not roll back.`,
    );
    assert(
      readValue(context.liveDatabase) === "old",
      `Phase ${phase} left mixed data.`,
    );
  }

  // A post-switch health failure restores the old family; a committed health
  // check keeps the new family. These are the two allowed terminal states.
  const unhealthy = await contextFor("health-failure");
  switchDatabaseFamilies(unhealthy);
  await rollbackDatabaseFamilies(unhealthy);
  assert(
    readValue(unhealthy.liveDatabase) === "old",
    "Health failure did not restore old data.",
  );

  const healthy = await contextFor("health-success");
  switchDatabaseFamilies(healthy);
  commitDatabaseSwitch(healthy);
  const committed = await recoverInterruptedSwitch(healthy);
  assert(
    committed.action === "committed",
    "Committed switch was not preserved.",
  );
  assert(
    readValue(healthy.liveDatabase) === "new",
    "Committed switch lost new data.",
  );

  console.log("Transactional update smoke test passed.");
} finally {
  delete process.env.VAENYX_UPDATE_FAULT_PHASE;
  for (const root of roots) rmSync(root, { force: true, recursive: true });
}
