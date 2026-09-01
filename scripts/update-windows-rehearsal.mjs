import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { acquireInstanceLock } from "./lib/instance-lock.mjs";
import {
  createUpdateSnapshot,
  switchDatabaseFamilies,
} from "./lib/update-transaction.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const builtDatabaseModule = resolve(
  repositoryRoot,
  "apps",
  "server",
  "dist",
  "db",
  "database.js",
);
const requested = process.argv[2] ?? "all";
const scenarios =
  requested === "all"
    ? ["contention", "migration", "health", "switch", "interrupted", "success"]
    : [requested];
const allowedScenarios = new Set([
  "contention",
  "health",
  "interrupted",
  "migration",
  "success",
  "switch",
]);

if (!existsSync(builtDatabaseModule)) {
  throw new Error("Build Vaenyx before running the Windows update rehearsal.");
}
for (const scenario of scenarios) {
  if (!allowedScenarios.has(scenario)) {
    throw new Error(`Unknown rehearsal scenario: ${scenario}`);
  }
}

const { runMigrations } = await import(pathToFileURL(builtDatabaseModule).href);
const configSource = readFileSync(
  resolve(repositoryRoot, "apps", "server", "src", "config.ts"),
  "utf8",
);
const targetVersion = configSource.match(/version:\s*"([^"]+)"/)?.[1];
if (!targetVersion)
  throw new Error("Could not read the target Vaenyx version.");
const previousVersion = `${targetVersion}-previous`;
const retainedRoots = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function copyPackageTree(source, destination) {
  const excludedRoots = new Set([
    ".git",
    "node_modules",
    "private",
    "release",
    "userdata",
  ]);
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (
      excludedRoots.has(entry.name) ||
      entry.name === ".env" ||
      entry.name.startsWith(".env.")
    ) {
      continue;
    }
    const from = resolve(source, entry.name);
    const to = resolve(destination, entry.name);
    rmSync(to, { force: true, recursive: true });
    cpSync(from, to, {
      filter: (path) => {
        const name = basename(path);
        return (
          name !== "node_modules" &&
          name !== ".env" &&
          !name.startsWith(".env.")
        );
      },
      recursive: true,
    });
  }
}

function replaceVersion(root, from, to) {
  for (const relativePath of [
    "apps/server/src/config.ts",
    "apps/server/dist/config.js",
  ]) {
    const path = resolve(root, relativePath);
    const before = readFileSync(path, "utf8");
    const after = before.replace(`version: "${from}"`, `version: "${to}"`);
    assert(
      after !== before,
      `Version marker was not found in ${relativePath}.`,
    );
    writeFileSync(path, after, "utf8");
  }
}

function initializeLiveDatabase(installRoot) {
  const dataDirectory = resolve(installRoot, "userdata", "db");
  const databasePath = resolve(dataDirectory, "vaenyx.db");
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("PRAGMA journal_mode = WAL;");
    runMigrations(
      database,
      resolve(installRoot, "apps", "server", "migrations"),
    );
    database.exec(
      "CREATE TABLE h004_rehearsal (value TEXT NOT NULL); INSERT INTO h004_rehearsal (value) VALUES ('old');",
    );
    database.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } finally {
    database.close();
  }
  return databasePath;
}

function readDatabaseState(databasePath) {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return {
      migrationApplied:
        Number(
          database
            .prepare(
              "SELECT COUNT(*) AS count FROM vanta_migrations WHERE filename = '9999_h004_rehearsal.sql'",
            )
            .get()?.count ?? 0,
        ) === 1,
      value: database.prepare("SELECT value FROM h004_rehearsal").get()?.value,
    };
  } finally {
    database.close();
  }
}

function createFixture(scenario) {
  const root = mkdtempSync(resolve(tmpdir(), `vaenyx-h004-${scenario}-`));
  const installRoot = resolve(root, "install");
  const stagedRoot = resolve(root, "staged");
  copyPackageTree(repositoryRoot, installRoot);
  copyPackageTree(repositoryRoot, stagedRoot);
  replaceVersion(installRoot, targetVersion, previousVersion);
  const liveDatabase = initializeLiveDatabase(installRoot);
  const migration =
    scenario === "migration"
      ? "THIS IS NOT VALID SQL;\n"
      : "UPDATE h004_rehearsal SET value = 'new';\n";
  writeFileSync(
    resolve(
      stagedRoot,
      "apps",
      "server",
      "migrations",
      "9999_h004_rehearsal.sql",
    ),
    migration,
    "utf8",
  );
  const configDirectory = resolve(installRoot, "userdata", "config");
  mkdirSync(configDirectory, { recursive: true });
  writeFileSync(
    resolve(configDirectory, "node-path"),
    `${process.execPath}\n`,
    "utf8",
  );
  writeJson(resolve(configDirectory, "update-pending.json"), {
    source: stagedRoot,
    version: targetVersion,
  });
  return {
    configDirectory,
    installRoot,
    liveDatabase,
    root,
    stagedRoot,
  };
}

function runUpdater(fixture, extraEnvironment = {}) {
  const script = resolve(
    fixture.installRoot,
    "scripts",
    "Vaenyx-Apply-Update.ps1",
  );
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      script,
      "-RootOverride",
      fixture.installRoot,
    ],
    {
      cwd: fixture.installRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        VAENYX_UPDATE_FAULT: "",
        VAENYX_UPDATE_FAULT_PHASE: "",
        VAENYX_UPDATE_TEST_ROOT: "1",
        ...extraEnvironment,
      },
      maxBuffer: 50 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  return result;
}

async function prepareInterruptedSwitch(fixture) {
  const updatesRoot = resolve(fixture.installRoot, "userdata", "updates");
  const rollbackRoot = resolve(updatesRoot, "rollback");
  const context = {
    version: 1,
    transactionId: `rehearsal-${Date.now()}`,
    phase: "candidate-verified",
    previousVersion,
    targetVersion,
    root: fixture.installRoot,
    updatesRoot,
    rollbackRoot,
    codeRollback: resolve(rollbackRoot, "code"),
    liveDataDirectory: dirname(fixture.liveDatabase),
    liveDatabase: fixture.liveDatabase,
    snapshotDatabase: resolve(rollbackRoot, "snapshot", "vaenyx.db"),
    candidateDatabase: resolve(rollbackRoot, "candidate", "db", "vaenyx.db"),
    oldFamilyDatabase: resolve(rollbackRoot, "live-family", "vaenyx.db"),
    manifestPath: resolve(rollbackRoot, "manifest.json"),
    switchJournalPath: resolve(fixture.configDirectory, "update-switch.json"),
    updatedAt: new Date().toISOString(),
  };
  copyPackageTree(fixture.installRoot, context.codeRollback);
  writeJson(
    resolve(fixture.configDirectory, "update-transaction.json"),
    context,
  );
  await createUpdateSnapshot(context);

  const candidate = new DatabaseSync(context.candidateDatabase);
  try {
    candidate.exec("PRAGMA journal_mode = WAL;");
    runMigrations(
      candidate,
      resolve(fixture.stagedRoot, "apps", "server", "migrations"),
    );
    candidate.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } finally {
    candidate.close();
  }
  copyPackageTree(fixture.stagedRoot, fixture.installRoot);

  process.env.VAENYX_UPDATE_FAULT_PHASE = "old-moved";
  try {
    switchDatabaseFamilies(context);
    throw new Error("Interrupted-switch fault injection did not fire.");
  } catch (error) {
    if (!String(error).includes("Injected update interruption")) throw error;
  } finally {
    delete process.env.VAENYX_UPDATE_FAULT_PHASE;
  }
}

function assertTerminalState(fixture, expectedPhase) {
  const resultPath = resolve(fixture.configDirectory, "update-result.json");
  assert(existsSync(resultPath), "Update result was not written.");
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  assert(
    result.phase === expectedPhase,
    `Expected ${expectedPhase}, got ${result.phase}.`,
  );
  const state = readDatabaseState(fixture.liveDatabase);
  const expectedNew = expectedPhase === "success";
  assert(
    state.value === (expectedNew ? "new" : "old"),
    "Database value is from the wrong release.",
  );
  assert(
    state.migrationApplied === expectedNew,
    "Migration ledger is from the wrong release.",
  );
  const source = readFileSync(
    resolve(fixture.installRoot, "apps", "server", "src", "config.ts"),
    "utf8",
  );
  assert(
    source.includes(
      `version: "${expectedNew ? targetVersion : previousVersion}"`,
    ),
    "Application code is from the wrong release.",
  );
  for (const path of [
    resolve(fixture.configDirectory, "instance.lock.json"),
    resolve(fixture.configDirectory, "update-pending.json"),
    resolve(fixture.configDirectory, "update-switch.json"),
    resolve(fixture.configDirectory, "update-transaction.json"),
    resolve(fixture.installRoot, "userdata", "updates"),
  ]) {
    assert(!existsSync(path), `Completed transaction left ${path}.`);
  }
  if (!expectedNew) {
    const log = readFileSync(
      resolve(fixture.installRoot, "userdata", "logs", "update.log"),
      "utf8",
    );
    assert(
      log.includes("Rollback passed database-backed startup health.") ||
        log.includes(
          "Interrupted update recovered; the previous version passed health.",
        ),
      "Rollback startup health was not recorded.",
    );
  }
}

for (const scenario of scenarios) {
  const fixture = createFixture(scenario);
  try {
    if (scenario === "contention") {
      const lockPath = resolve(fixture.configDirectory, "instance.lock.json");
      const lock = acquireInstanceLock(lockPath, "rehearsal-owner");
      try {
        const result = runUpdater(fixture);
        assert(
          result.status === 1,
          "Contending updater did not return failure.",
        );
        assert(
          existsSync(resolve(fixture.configDirectory, "update-pending.json")),
          "Contending updater removed the pending update.",
        );
        assert(
          !existsSync(
            resolve(fixture.configDirectory, "update-transaction.json"),
          ),
          "Contending updater changed transaction state.",
        );
        assert(
          readDatabaseState(fixture.liveDatabase).value === "old",
          "Contending updater changed live data.",
        );
      } finally {
        lock.release();
      }
    } else {
      if (scenario === "interrupted") await prepareInterruptedSwitch(fixture);
      const environment =
        scenario === "health"
          ? { VAENYX_UPDATE_FAULT: "health-check" }
          : scenario === "switch"
            ? { VAENYX_UPDATE_FAULT_PHASE: "old-moved" }
            : {};
      const result = runUpdater(fixture, environment);
      if (result.status !== 0) {
        const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        throw new Error(
          `Updater failed in ${scenario}:\n${output.slice(-6000)}`,
        );
      }
      assertTerminalState(
        fixture,
        scenario === "success" ? "success" : "rolled-back",
      );
    }
    console.log(`  ok   ${scenario}`);
  } catch (error) {
    retainedRoots.push(fixture.root);
    console.error(
      `  FAIL ${scenario}: ${error instanceof Error ? error.message : error}`,
    );
    throw error;
  } finally {
    if (
      !retainedRoots.includes(fixture.root) &&
      process.env.VAENYX_KEEP_REHEARSAL !== "1"
    ) {
      rmSync(fixture.root, { force: true, recursive: true });
    }
  }
}

if (retainedRoots.length > 0) {
  console.error(`Retained failed rehearsal roots: ${retainedRoots.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Windows transactional update rehearsal passed.");
}
