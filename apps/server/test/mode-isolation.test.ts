// H-007 · Custom Mode capability isolation (2026-09-19). A Custom Mode never
// gains a capability because the Owner switched it on for themselves, and a
// session inside any Custom Mode never reaches the Owner's account-level
// doors: app keys, the relay, model connections, the capability switches and
// other Modes' conversations.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  answerModeCapabilityNotice,
  decideCapabilities,
  migrateLegacyModeCapabilities,
  readModeCapabilities,
  readModeCapabilityNotice,
  writeGlobalCapabilities,
} from "../src/modules/core/capabilities.js";
import { createMode, listModes } from "../src/modules/core/modes.js";

const temporaryDirectories: string[] = [];
const databases: DatabaseHandle[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-mode-iso-"));
  temporaryDirectories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    backupsDirectory: resolve(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

function insertLegacyMode(database: DatabaseHandle, id: string, name: string) {
  // A mode made before the narrowing screen: its list is NULL.
  database.sqlite
    .prepare("INSERT INTO modes (id, name) VALUES (?, ?)")
    .run(id, name);
}

describe("explicit Custom Mode capability lists", () => {
  it("a new and a legacy mode both refuse fetching after the Owner turns it on globally", () => {
    const database = createTestDatabase();
    const fresh = createMode(database, { name: "Kids" });
    insertLegacyMode(database, "legacy", "Grandma");
    migrateLegacyModeCapabilities(database);

    writeGlobalCapabilities(database, { fetching: true });
    // User Mode gets it; neither Custom Mode does.
    expect(decideCapabilities(database, ["fetching"], null).allowed).toEqual([
      "fetching",
    ]);
    for (const modeId of [fresh.id, "legacy"]) {
      expect(decideCapabilities(database, ["fetching"], modeId).refused).toEqual([
        { capability: "fetching", reason: "mode" },
      ]);
    }
  });

  it("a capability turned off globally is off in every mode", () => {
    const database = createTestDatabase();
    const fresh = createMode(database, { name: "Kids" });
    writeGlobalCapabilities(database, { vision: false });
    expect(decideCapabilities(database, ["vision"], fresh.id).refused).toEqual([
      { capability: "vision", reason: "global" },
    ]);
    // …and turning it back on globally restores it only because the mode's
    // own list already had it.
    writeGlobalCapabilities(database, { vision: true });
    expect(decideCapabilities(database, ["vision"], fresh.id).allowed).toEqual([
      "vision",
    ]);
  });

  it("new modes never start from 'no restriction'", () => {
    const database = createTestDatabase();
    writeGlobalCapabilities(database, { fetching: true, web: false });
    const mode = createMode(database, { name: "Kids" });
    const stored = database.sqlite
      .prepare("SELECT capabilities FROM modes WHERE id = ?")
      .get(mode.id) as { capabilities: string | null };
    expect(stored.capabilities).not.toBeNull();
    // Ship defaults the instance allows: web is off globally right now, and
    // fetching never ships on.
    expect(readModeCapabilities(database, mode.id)).toEqual([
      "hearing",
      "speaking",
      "vision",
      "drawing",
      "reading",
      "ocr",
    ]);
    // Web coming back on globally does NOT add it to this mode.
    writeGlobalCapabilities(database, { web: true });
    expect(decideCapabilities(database, ["web"], mode.id).refused).toEqual([
      { capability: "web", reason: "mode" },
    ]);
  });
});

describe("the one-time migration of legacy modes", () => {
  it("runs once, records what changed, and is a no-op when rerun", () => {
    const database = createTestDatabase();
    insertLegacyMode(database, "legacy", "Grandma");
    writeGlobalCapabilities(database, { fetching: true });

    const first = migrateLegacyModeCapabilities(database);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      modeId: "legacy",
      modeName: "Grandma",
      lost: ["fetching"],
    });
    expect(readModeCapabilities(database, "legacy")).not.toContain("fetching");
    const log = database.sqlite
      .prepare(
        "SELECT value FROM instance_settings WHERE key = 'modes.capabilities.explicit_migration'",
      )
      .get() as { value: string };
    expect(JSON.parse(log.value)).toHaveLength(1);

    expect(migrateLegacyModeCapabilities(database)).toEqual([]);
    expect(
      JSON.parse(
        (
          database.sqlite
            .prepare(
              "SELECT value FROM instance_settings WHERE key = 'modes.capabilities.explicit_migration'",
            )
            .get() as { value: string }
        ).value,
      ),
    ).toHaveLength(1);
  });

  it("leaves no notice when the mode lost nothing it was receiving", () => {
    const database = createTestDatabase();
    insertLegacyMode(database, "legacy", "Grandma");
    const [change] = migrateLegacyModeCapabilities(database);
    expect(change?.lost).toEqual([]);
    expect(readModeCapabilityNotice(database, "legacy")).toBeNull();
    expect(listModes(database)[0]?.capabilityNotice).toBeUndefined();
  });

  it("shows the notice once, and re-enable puts the capability back for that mode", () => {
    const database = createTestDatabase();
    insertLegacyMode(database, "legacy", "Grandma");
    insertLegacyMode(database, "other", "Kids");
    writeGlobalCapabilities(database, { fetching: true });
    migrateLegacyModeCapabilities(database);

    const modes = listModes(database);
    expect(modes.find((mode) => mode.id === "legacy")?.capabilityNotice).toEqual({
      lost: ["fetching"],
    });

    const after = answerModeCapabilityNotice(database, "legacy", true);
    expect(after).toContain("fetching");
    expect(decideCapabilities(database, ["fetching"], "legacy").allowed).toEqual([
      "fetching",
    ]);
    expect(readModeCapabilityNotice(database, "legacy")).toBeNull();
    // Only that mode: the other one still refuses.
    expect(decideCapabilities(database, ["fetching"], "other").refused).toEqual([
      { capability: "fetching", reason: "mode" },
    ]);

    // Dismissing clears the notice and changes nothing.
    answerModeCapabilityNotice(database, "other", false);
    expect(readModeCapabilityNotice(database, "other")).toBeNull();
    expect(readModeCapabilities(database, "other")).not.toContain("fetching");
  });
});

function createTestConfig(): AppConfig {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-mode-audit-"));
  temporaryDirectories.push(dataDirectory);
  return {
    corsOrigins: [],
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    backupsDirectory: resolve(dataDirectory, "backups"),
    repositoryRoot: resolve("..", ".."),
    host: "127.0.0.1",
    libraryDirectory: resolve("..", "..", "sample-library", "methods"),
    routinesDirectory: resolve("..", "..", "sample-library", "routines"),
    docsDirectory: resolve("..", "..", "docs"),
    logLevel: "silent",
    migrationsDirectory: resolve("migrations"),
    mode: "test",
    port: 3000,
    version: "0.0.0-test",
    webDistDirectory: resolve(dataDirectory, "missing-web-dist"),
    secretsDirectory: resolve(dataDirectory, "secrets"),
    publish: null,
    googleOAuth: null,
    publishServiceUrl: null,
    catalogueBaseUrl: "https://example.invalid",
  } as unknown as AppConfig;
}

describe("the cross-Mode audit", () => {
  it("keeps keys, the relay, connections, switches and other Modes' data out of an unlocked mode", async () => {
    const app = await buildApp(createTestConfig());
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Owner", password: "private-password" },
    });
    const cookie = String(setup.headers["set-cookie"]);

    // User Mode reaches all of these.
    const ownList = await app.inject({
      method: "GET",
      url: "/v1/app-profiles",
      headers: { cookie },
    });
    expect(ownList.statusCode).toBe(200);
    const conversation = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie },
      payload: {},
    });
    expect(conversation.statusCode).toBe(200);
    const ownConversationId = (conversation.json() as { id: string }).id;

    // An UNLOCKED family mode: the locked-mode floor does not apply here.
    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name: "Kids" },
    });
    const modeId = (mode.json() as { id: string }).id;
    const entered = await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });
    expect(entered.statusCode).toBe(200);

    const refused: [string, string, unknown?][] = [
      ["GET", "/v1/app-profiles"],
      ["POST", "/v1/app-profiles", { name: "x", kind: "method" }],
      ["GET", "/v1/app-profiles/any/token"],
      ["GET", "/v1/relay/profile"],
      ["GET", "/v1/relay/usage"],
      ["POST", "/v1/models/providers/openai", { apiKey: "sk-test-not-real" }],
      ["DELETE", "/v1/models/providers/openai"],
      ["PUT", "/v1/capabilities", { fetching: true }],
      ["GET", `/v1/capabilities/modes/${modeId}`],
      ["PUT", `/v1/capabilities/modes/${modeId}`, { fetching: true }],
    ];
    for (const [method, url, payload] of refused) {
      const response = await app.inject({
        method: method as "GET",
        url,
        headers: { cookie },
        ...(payload ? { payload: payload as Record<string, unknown> } : {}),
      });
      expect([method, url, response.statusCode]).toEqual([method, url, 403]);
    }

    // The Owner's own conversation does not exist from inside the mode.
    const peek = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${ownConversationId}/messages`,
      headers: { cookie },
    });
    expect(peek.statusCode).toBe(404);

    // The chat's model picker still reads the provider list — which carries
    // no key material.
    const providers = await app.inject({
      method: "GET",
      url: "/v1/models/providers",
      headers: { cookie },
    });
    expect(providers.statusCode).toBe(200);
    expect(providers.body).not.toContain("sk-test-not-real");

    await app.close();
  });
});
