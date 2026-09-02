// The subscription door. Everything tested here is a promise made to an app
// that cannot see this code, so none of it is assumed: the door starts shut,
// only the Owner's own addresses get through it, it serves only the
// capabilities its engines actually have (and shows `web` only to a key that
// was granted it), and a link may only point at a host the Owner listed.
// Nothing here reaches a real subscription — the refusals happen before any
// engine is asked, which is the whole point of testing them.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { writeGlobalCapabilities } from "../src/modules/core/capabilities.js";
import {
  DEFAULT_RELAY_CONFIG,
  assertRelayRateLimit,
  listRelayCalls,
  readRelayConfig,
  recordRelayCall,
  recordRelayCapabilityProbe,
  publicRelayError,
  relayHealth,
  runRelay,
  writeRelayConfig,
} from "../src/modules/core/relay.js";
import {
  normalizeSearchEvidence,
  normalizeSearchRunEvidence,
} from "../src/modules/core/relay-search.js";

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

function plantProfile(
  database: DatabaseHandle,
  capabilities: string[] = ["vision", "reading"],
): void {
  database.sqlite
    .prepare(
      `INSERT OR IGNORE INTO app_profiles (id, name, token_hash, token_prefix, kind, capabilities)
       VALUES (?, 'relay-test', 'x', 'vaenyx_app_test...', 'relay', ?)`,
    )
    .run(TEST_PROFILE, JSON.stringify(capabilities));
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

  it("keeps a per-key call limit", () => {
    const key = `rate-${Date.now()}-${Math.random()}`;
    assertRelayRateLimit(key, 2, 1_000_000);
    assertRelayRateLimit(key, 2, 1_000_001);
    expect(() => assertRelayRateLimit(key, 2, 1_000_002)).toThrow(
      "RELAY_RATE_LIMITED",
    );
    expect(() => assertRelayRateLimit(key, 2, 1_060_001)).not.toThrow();
  });

  it("advertises every implemented safe capability without per-key grants", () => {
    const database = createTestDatabase();
    const health = relayHealth(database, TEST_PROFILE);
    expect(health.on).toBe(false);
    expect(health.engines.map((engine) => engine.id)).toEqual([
      "openai-cli",
      "claude-cli",
    ]);
    for (const engine of health.engines) {
      expect(engine.capabilities).toEqual(
        engine.id === "claude-cli"
          ? [
              "text_analysis",
              "structured_output",
              "vision_analysis",
              "document_analysis",
              "web_search",
            ]
          : [
              "text_analysis",
              "structured_output",
              "vision_analysis",
              "web_search",
            ],
      );
      expect(engine.capabilities).not.toContain("hearing");
      expect(engine.capabilities).not.toContain("speaking");
      expect(engine.capabilities).not.toContain("drawing");
      expect(engine.capabilities).toContain("web_search");
    }
  });

  it("does not vary safe capabilities by the old per-key grant list", () => {
    const database = createTestDatabase();
    plantProfile(database, []);
    const health = relayHealth(database, TEST_PROFILE);
    for (const engine of health.engines) {
      expect(engine.capabilities).toContain("web_search");
    }
    const other = relayHealth(
      database,
      "99999999-8888-4777-8666-555555555555",
    );
    for (const engine of other.engines) {
      expect(engine.capabilities).toContain("web_search");
    }
  });

  it("lets any valid relay key reach web without a per-capability grant", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    await expect(runOnce(database, { capability: "web" })).rejects.toThrow(
      "RELAY_PROFILE_NOT_CONNECTED:claude-cli",
    );
  });

  it("refuses a web call while web is off for the whole machine", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    writeGlobalCapabilities(database, { web: false });
    plantProfile(database, ["web"]);
    await expect(runOnce(database, { capability: "web" })).rejects.toThrow(
      "RELAY_CAPABILITY_OFF:web",
    );
  });

  it("lets a granted web call through the gates to the engine itself", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    plantProfile(database, ["web"]);
    // Past both capability layers, and stopped only by the profile having no
    // login on this machine — proof the gate opened without a subscription
    // being touched. The same key's plain text call takes the same path.
    await expect(runOnce(database, { capability: "web" })).rejects.toThrow(
      "RELAY_PROFILE_NOT_CONNECTED:claude-cli",
    );
    await expect(runOnce(database, { capability: "text" })).rejects.toThrow(
      "RELAY_PROFILE_NOT_CONNECTED:claude-cli",
    );
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

  it("refuses an effort or model outside the engine's whitelist, echoing it", async () => {
    const database = createTestDatabase();
    writeRelayConfig(database, OPEN_DOOR);
    // The engine's word comes back with the caller's own value — never a
    // silent acceptance that would do nothing.
    await expect(
      runOnce(database, { engine: "openai-cli", effort: "xhigh" }),
    ).rejects.toThrow("RELAY_EFFORT_INVALID:openai-cli:xhigh");
    await expect(
      runOnce(database, { engine: "openai-cli", model: "gpt-99" }),
    ).rejects.toThrow("RELAY_MODEL_INVALID:openai-cli:gpt-99");
    // Claude's lists are empty on purpose: no equivalent knob, so any value
    // is refused rather than accepted-and-ignored.
    await expect(
      runOnce(database, { engine: "claude-cli", effort: "medium" }),
    ).rejects.toThrow("RELAY_EFFORT_INVALID:claude-cli:medium");
  });

  it("tells callers what each engine will accept", () => {
    const database = createTestDatabase();
    const health = relayHealth(database, TEST_PROFILE);
    const codex = health.engines.find((engine) => engine.id === "openai-cli");
    const claude = health.engines.find((engine) => engine.id === "claude-cli");
    expect(codex?.efforts).toEqual(["low", "medium", "high"]);
    // Empty until a model override verifies live — see RELAY_CODEX_MODELS.
    expect(codex?.models).toEqual([]);
    expect(claude?.efforts).toEqual([]);
    expect(claude?.models).toEqual([]);
  });

  it("reports probe-backed availability and keeps unsupported distinct", () => {
    const database = createTestDatabase();
    recordRelayCapabilityProbe(
      database,
      TEST_PROFILE,
      "openai-cli",
      "web_search",
      {
        available: true,
        unavailableReason: null,
        provider: "openai",
        model: "gpt-test",
        probedAt: "2026-09-03T00:00:00.000Z",
      },
    );
    const health = relayHealth(database, TEST_PROFILE);
    const codex = health.engines.find((engine) => engine.id === "openai-cli");
    const document = codex?.capability_status.find(
      (status) => status.capability === "document_analysis",
    );
    expect(document).toMatchObject({
      supported: false,
      available: false,
      unavailable_reason: "FILE_TRANSPORT_NOT_IMPLEMENTED",
    });
    expect(health.contract_version).toBe(2);
  });

  it("accepts only structured, valid, domain-filtered web evidence", () => {
    expect(
      normalizeSearchEvidence(
        {
          results: [
            {
              title: "OpenAI docs",
              url: "https://openai.com/index/codex/",
              snippet: "Codex",
            },
            { title: "Wrong", url: "https://example.net/private" },
            { title: "Broken", url: "file:///C:/secret.txt" },
          ],
          actions: [
            {
              type: "other",
              query: "https://developers.openai.com/codex/cli/reference",
            },
            { type: "search", query: "untrusted search phrase" },
          ],
        },
        { allowedDomains: ["openai.com"], maxResults: 5 },
      ),
    ).toEqual([
      {
        title: "OpenAI docs",
        url: "https://openai.com/index/codex/",
        snippet: "Codex",
        published_at: null,
      },
      {
        title: "developers.openai.com",
        url: "https://developers.openai.com/codex/cli/reference",
        snippet: "",
        published_at: null,
      },
    ]);
  });

  it("accepts final JSON URLs only when the native search tool ran", () => {
    const finalText = JSON.stringify({
      results: [
        {
          title: "Codex CLI reference",
          url: "https://developers.openai.com/codex/cli/reference",
          snippet: "Live search uses --search.",
          published_at: null,
        },
      ],
    });
    expect(normalizeSearchRunEvidence([], finalText)).toEqual([]);
    expect(
      normalizeSearchRunEvidence(
        [
          {
            type: "open",
            query: "https://developers.openai.com/codex/cli/reference",
          },
        ],
        finalText,
      ),
    ).toEqual([
      {
        title: "Codex CLI reference",
        url: "https://developers.openai.com/codex/cli/reference",
        snippet: "Live search uses --search.",
        published_at: null,
      },
    ]);
  });

  it("never returns engine paths or credentials in public errors", () => {
    expect(
      publicRelayError(new Error("CLAUDE_SDK_NOT_INSTALLED"), "claude-cli"),
    ).toBe("CLAUDE_SDK_NOT_INSTALLED");
    expect(
      publicRelayError(
        new Error("spawn failed at C:\\Users\\Owner\\.claude token=secret"),
        "claude-cli",
      ),
    ).toBe("RELAY_ENGINE_FAILED:claude-cli");
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
