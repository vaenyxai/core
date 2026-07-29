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
  ownerEmails: ["owner@example.com"],
  fileHosts: ["files.example.com"],
};

function runOnce(
  database: DatabaseHandle,
  changes: Partial<Parameters<typeof runRelay>[2]>,
) {
  return runRelay(database, resolve(tmpdir(), "vaenyx-relay-no-secrets"), {
    task: "quote-analysis",
    prompt: "Summarise this.",
    engine: "claude-cli",
    capability: "text",
    caller: "owner@example.com",
    files: [],
    ...changes,
  });
}

describe("the subscription door", () => {
  it("starts shut, with nobody on the owner list", () => {
    const database = createTestDatabase();
    expect(readRelayConfig(database)).toEqual(DEFAULT_RELAY_CONFIG);
    expect(DEFAULT_RELAY_CONFIG.enabled).toBe(false);
    expect(DEFAULT_RELAY_CONFIG.ownerEmails).toEqual([]);
  });

  it("keeps the owner list tidy: lower case, no repeats, no blanks", () => {
    const database = createTestDatabase();
    const saved = writeRelayConfig(database, {
      ownerEmails: ["Oskar@Example.com", "  oskar@example.com ", "", "b@x.com"],
    });
    expect(saved.ownerEmails).toEqual(["oskar@example.com", "b@x.com"]);
  });

  it("offers text and image-in, and says so about the other three", () => {
    const database = createTestDatabase();
    const health = relayHealth(database);
    expect(health.on).toBe(false);
    expect(health.engines.map((engine) => engine.id)).toEqual([
      "openai-cli",
      "claude-cli",
    ]);
    for (const engine of health.engines) {
      expect(engine.capabilities).toEqual(["text", "image-in"]);
      expect(engine.capabilities).not.toContain("voice-in");
      expect(engine.capabilities).not.toContain("voice-out");
      expect(engine.capabilities).not.toContain("image-out");
    }
  });

  it("refuses everything while it is switched off", async () => {
    const database = createTestDatabase();
    await expect(runOnce(database, {})).rejects.toThrow("RELAY_OFF");
  });

  it("refuses a caller who is not the owner", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    await expect(
      runOnce(database, { caller: "colleague@example.com" }),
    ).rejects.toThrow("RELAY_NOT_OWNER");
    // The same address in different case and spacing IS the owner: this one
    // gets past the door and is stopped by the NEXT gate instead. Checked that
    // way round on purpose — a test must never reach a real subscription.
    await expect(
      runOnce(database, {
        caller: " Owner@Example.com ",
        capability: "voice-in",
      }),
    ).rejects.toThrow("RELAY_CAPABILITY_UNSUPPORTED");
  });

  it("refuses a capability the subscriptions do not have", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    for (const capability of ["voice-in", "voice-out", "image-out"] as const) {
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
        capability: "image-in",
        files: [{ name: "a.pdf", url: "https://evil.example.net/a.pdf" }],
      }),
    ).rejects.toThrow("RELAY_HOST_NOT_ALLOWED:evil.example.net");
    // Plain http never counts, even on a listed host.
    await expect(
      runOnce(database, {
        capability: "image-in",
        files: [{ name: "a.pdf", url: "http://files.example.com/a.pdf" }],
      }),
    ).rejects.toThrow("RELAY_HOST_NOT_ALLOWED");
  });

  it("refuses more files than the owner allowed", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, { ...OPEN_DOOR, maxFiles: 1 });
    await expect(
      runOnce(database, {
        capability: "image-in",
        files: [
          { name: "a.pdf", url: "https://files.example.com/a.pdf" },
          { name: "b.pdf", url: "https://files.example.com/b.pdf" },
        ],
      }),
    ).rejects.toThrow("RELAY_TOO_MANY_FILES");
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
