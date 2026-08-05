// The subscription door. Everything tested here is a promise made to an app
// that cannot see this code, so none of it is assumed: the door starts shut,
// only the Owner's own addresses get through it, it offers exactly two of the
// five capabilities, and a link may only point at a host the Owner listed.
// Nothing here reaches a real subscription — the refusals happen before any
// engine is asked, which is the whole point of testing them.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  DEFAULT_RELAY_CONFIG,
  listRelayCalls,
  readRelayConfig,
  recordRelayCall,
  relayHealth,
  runRelay,
  writeRelayConfig,
} from "../src/modules/core/relay.js";

const temporaryDirectories: string[] = [];
const openDatabases: DatabaseHandle[] = [];

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-relay-test-"));
  temporaryDirectories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    backupsDirectory: resolve(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  openDatabases.push(database);
  return database;
}

afterEach(() => {
  for (const database of openDatabases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed by the test.
    }
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

const OPEN_DOOR = {
  enabled: true,
  fileHosts: ["files.example.com"],
};

// Every call carries an app profile since the shared key retired; the row is
// planted straight into the table with the grants the door serves.
const TEST_PROFILE = "11111111-2222-4333-8444-555555555555";

function plantProfile(database: DatabaseHandle): void {
  database.sqlite
    .prepare(
      `INSERT OR IGNORE INTO app_profiles (id, name, token_hash, token_prefix, kind, capabilities)
       VALUES (?, 'relay-test', 'x', 'vaenyx_app_test...', 'relay', ?)`,
    )
    .run(TEST_PROFILE, JSON.stringify(["vision", "reading"]));
}

function runOnce(
  database: DatabaseHandle,
  changes: Partial<Parameters<typeof runRelay>[2]>,
) {
  plantProfile(database);
  return runRelay(database, resolve(tmpdir(), "vaenyx-relay-no-secrets"), {
    task: "quote-analysis",
    prompt: "Summarise this.",
    engine: "claude-cli",
    capability: "text",
    files: [],
    appProfileId: TEST_PROFILE,
    ...changes,
  });
}

describe("the subscription door", () => {
  it("starts shut", () => {
    const database = createTestDatabase();
    expect(readRelayConfig(database)).toEqual(DEFAULT_RELAY_CONFIG);
    expect(DEFAULT_RELAY_CONFIG.enabled).toBe(false);
  });

  it("offers the same words a Method declares, and says so about the rest", () => {
    const database = createTestDatabase();
    const health = relayHealth(database, TEST_PROFILE);
    expect(health.on).toBe(false);
    expect(health.engines.map((engine) => engine.id)).toEqual([
      "openai-cli",
      "claude-cli",
    ]);
    for (const engine of health.engines) {
      expect(engine.capabilities).toEqual(engine.id === "claude-cli" ? ["text", "vision", "reading"] : ["text", "vision"]);
      expect(engine.capabilities).not.toContain("hearing");
      expect(engine.capabilities).not.toContain("speaking");
      expect(engine.capabilities).not.toContain("drawing");
    }
  });

  it("refuses everything while it is switched off", async () => {
    const database = createTestDatabase();
    await expect(runOnce(database, {})).rejects.toThrow("RELAY_OFF");
  });

  it("ignores the self-declared caller field: the key is the identity", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    // Any caller value, or none, changes nothing — the request is stopped by
    // the NEXT gate either way. Checked that way round on purpose: a test must
    // never reach a real subscription.
    await expect(
      runOnce(database, {
        caller: "anyone@example.com",
        capability: "hearing",
      }),
    ).rejects.toThrow("RELAY_CAPABILITY_UNSUPPORTED");
  });

  it("refuses a capability the subscriptions do not have", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    for (const capability of ["hearing", "speaking", "drawing"] as const) {
      await expect(runOnce(database, { capability })).rejects.toThrow(
        `RELAY_CAPABILITY_UNSUPPORTED:claude-cli:${capability}`,
      );
    }
  });

  it("refuses a link pointing anywhere the owner did not list", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    await expect(
      runOnce(database, {
        capability: "vision",
        files: [{ name: "a.pdf", url: "https://evil.example.net/a.pdf" }],
      }),
    ).rejects.toThrow("RELAY_HOST_NOT_ALLOWED:evil.example.net");
    // Plain http never counts, even on a listed host.
    await expect(
      runOnce(database, {
        capability: "vision",
        files: [{ name: "a.pdf", url: "http://files.example.com/a.pdf" }],
      }),
    ).rejects.toThrow("RELAY_HOST_NOT_ALLOWED");
  });

  it("refuses more files than the owner allowed", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, { ...OPEN_DOOR, maxFiles: 1 });
    await expect(
      runOnce(database, {
        capability: "vision",
        files: [
          { name: "a.pdf", url: "https://files.example.com/a.pdf" },
          { name: "b.pdf", url: "https://files.example.com/b.pdf" },
        ],
      }),
    ).rejects.toThrow("RELAY_TOO_MANY_FILES");
  });

  it("an engine the profile has not connected refuses by name", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    await expect(runOnce(database, {})).rejects.toThrow(
      "RELAY_PROFILE_NOT_CONNECTED:claude-cli",
    );
  });

  it("logs what happened and never what was in it", () => {
    const database = createTestDatabase();
    recordRelayCall(database, {
      task: "quote-analysis",
      engine: "claude-cli",
      capability: "text",
      ms: 14_200,
      ok: false,
      failure: "RELAY_NOT_SIGNED_IN:claude-cli",
    });
    const [entry] = listRelayCalls(database);
    expect(entry).toMatchObject({
      task: "quote-analysis",
      engine: "claude-cli",
      ms: 14_200,
      ok: false,
      failure: "RELAY_NOT_SIGNED_IN:claude-cli",
    });
    // The row has room for what happened and nowhere to put the prompt, the
    // file or the answer.
    expect(Object.keys(entry ?? {}).sort()).toEqual([
      "capability",
      "createdAt",
      "engine",
      "failure",
      "ms",
      "ok",
      "task",
    ]);
  });
});
