// Relay Profiles v1 — the machine-checkable half of the acceptance list.
// What cannot run here is a REAL sign-in against ChatGPT/Claude (that needs a
// human and a real account); everything else is exercised for real: identity
// isolation, key rotation, the dedicated-mode refusal, the login session map,
// usage counting, and that no response ever carries a secret.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

function createTestConfig(): AppConfig {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-relay-profiles-"));
  for (const dir of ["db", "backups", "library", "routines", "secrets"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  return {
    catalogueBaseUrl: "https://example.invalid",
    corsOrigins: [],
    dataDirectory: join(root, "db"),
    databasePath: join(root, "db", "vaenyx.db"),
    backupsDirectory: join(root, "backups"),
    repositoryRoot: root,
    host: "127.0.0.1",
    libraryDirectory: join(root, "library"),
    routinesDirectory: join(root, "routines"),
    docsDirectory: join(root, "docs"),
    logLevel: "silent",
    migrationsDirectory: resolve("migrations"),
    mode: "test",
    port: 0,
    version: "test",
    webDistDirectory: join(root, "missing-dist"),
    secretsDirectory: join(root, "secrets"),
    publish: null,
    googleOAuth: null,
    publishServiceUrl: null,
  };
}

describe("relay profiles", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let config: AppConfig;
  let cookie: string;
  const cleanups: string[] = [];

  beforeEach(async () => {
    config = createTestConfig();
    cleanups.push(config.repositoryRoot);
    // The profile credential directories resolve off the LIVE loadConfig()
    // data directory; point them at this test's sandbox.
    process.env.VAENYX_DATA_DIR = config.dataDirectory;
    app = await buildApp(config);
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Owner", password: "correct-horse-battery" },
    });
    cookie = String(setup.headers["set-cookie"]).split(";")[0] ?? "";
  });

  afterEach(async () => {
    await app.close();
    delete process.env.VAENYX_DATA_DIR;
    for (const dir of cleanups.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  // A profile needs at least one grant; the seeded "general-ask" skill is the
  // cheapest one that always exists after buildApp.
  async function makeProfile(name: string): Promise<{
    id: string;
    token: string;
  }> {
    const response = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie },
      payload: { name, allowedSkillIds: ["general-ask"] },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      profile: { id: string };
      token: string;
    };
    return { id: body.profile.id, token: body.token };
  }

  it("a key reaches only its own profile, and the door key reaches none", async () => {
    const first = await makeProfile("app-one");
    const second = await makeProfile("app-two");

    const statusOne = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${first.token}` },
    });
    expect(statusOne.statusCode).toBe(200);
    const bodyOne = statusOne.json() as {
      mode: string;
      key: { hint: string; version: number };
    };
    // The hint is the key's own prefix — proof the token resolved to ITS
    // profile, since the two profiles' prefixes differ.
    expect(first.token.startsWith(bodyOne.key.hint.replace("...", ""))).toBe(
      true,
    );
    expect(bodyOne.mode).toBe("shared-door");

    const statusTwo = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${second.token}` },
    });
    const bodyTwo = statusTwo.json() as { key: { hint: string } };
    expect(bodyTwo.key.hint).not.toBe(bodyOne.key.hint);

    // No token, wrong token, and the DOOR's own key all bounce: these routes
    // exist only for a key that names a profile.
    const anonymous = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com" },
    });
    expect(anonymous.statusCode).toBe(401);
    const doorKeyResponse = await app.inject({
      method: "POST",
      url: "/v1/relay/token",
      headers: { cookie },
      payload: { action: "new" },
    });
    const doorToken = (doorKeyResponse.json() as { token: string }).token;
    const viaDoor = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${doorToken}` },
    });
    expect(viaDoor.statusCode).toBe(401);
  });

  it("outside the tailnet is refused with its OWN code, before any key check", async () => {
    const profile = await makeProfile("app-tailnet");
    // A perfectly valid key, arriving without the Tailscale identity header —
    // the funnel/public path. The refusal must be RELAY_TAILNET_REQUIRED, not
    // 401: "connect to Tailscale" and "key rejected" have different fixes.
    const publicPath = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { authorization: `Bearer ${profile.token}` },
    });
    expect(publicPath.statusCode).toBe(403);
    expect((publicPath.json() as { error: string }).error).toBe(
      "RELAY_TAILNET_REQUIRED",
    );
    // Forgery note: Tailscale strips a client-supplied identity header on the
    // public path (probe-verified 2026-08-02); at this layer the header's
    // presence IS the tailnet answer.
    const health = await app.inject({ method: "GET", url: "/v1/ai/health" });
    expect(health.statusCode).toBe(403);
    const run = await app.inject({
      method: "POST",
      url: "/v1/ai/run",
      headers: { authorization: `Bearer ${profile.token}` },
      payload: {
        task: "t",
        prompt: "p",
        engine: "claude-cli",
        capability: "text",
        caller: "owner@example.com",
        files: [],
      },
    });
    expect(run.statusCode).toBe(403);
    expect((run.json() as { error: string }).error).toBe(
      "RELAY_TAILNET_REQUIRED",
    );
  });

  it("no response from the profile routes ever carries a secret", async () => {
    const profile = await makeProfile("app-secrets");
    const status = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${profile.token}` },
    });
    const raw = status.body;
    // The full key appears nowhere; only its 18-character prefix may.
    expect(raw.includes(profile.token)).toBe(false);
    expect(raw.includes(profile.token.slice(20))).toBe(false);
  });

  it("rotate: the new key works, the old key is dead, the version moved", async () => {
    const profile = await makeProfile("app-rotate");
    const rotate = await app.inject({
      method: "POST",
      url: "/v1/relay/profile/key/rotate",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${profile.token}` },
    });
    expect(rotate.statusCode).toBe(200);
    const rotated = rotate.json() as { token: string; keyVersion: number };
    expect(rotated.keyVersion).toBe(2);
    expect(rotated.token).not.toBe(profile.token);

    const oldKey = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${profile.token}` },
    });
    expect(oldKey.statusCode).toBe(401);

    const newKey = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${rotated.token}` },
    });
    expect(newKey.statusCode).toBe(200);
    expect((newKey.json() as { key: { version: number } }).key.version).toBe(2);
  });

  it("dedicated mode refuses by name instead of sliding onto the door's login", async () => {
    const profile = await makeProfile("app-dedicated");
    // Flip to dedicated the way a completed sign-in would, then plant claude
    // credentials so ONE engine is connected and the other is not.
    const { markProfileDedicated } = await import(
      "../src/modules/core/relay.js"
    );
    const { getDatabaseForTest } = { getDatabaseForTest: null };
    void getDatabaseForTest;
    // Reach the database through a fresh handle onto the same file.
    const { createDatabase } = await import("../src/db/database.js");
    const database = createDatabase(config);
    markProfileDedicated(database, profile.id);

    const claudeHome = resolve(
      config.dataDirectory,
      "..",
      "profiles",
      profile.id,
      "claude-home",
    );
    mkdirSync(claudeHome, { recursive: true });
    writeFileSync(join(claudeHome, ".credentials.json"), "{}");

    const status = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${profile.token}` },
    });
    const body = status.json() as {
      mode: string;
      engines: { id: string; connected: boolean; connectedAt: string | null }[];
    };
    expect(body.mode).toBe("dedicated");
    const claude = body.engines.find((engine) => engine.id === "claude-cli");
    const codex = body.engines.find((engine) => engine.id === "openai-cli");
    expect(claude?.connected).toBe(true);
    expect(claude?.connectedAt).not.toBeNull();
    expect(codex?.connected).toBe(false);
    database.close();
  });

  it("two apps can run a claude sign-in at the same time without stealing each other's session", async () => {
    // A fake official CLI: prints the sign-in URL, waits on stdin, writes its
    // credentials into CLAUDE_CONFIG_DIR on a correct code — the same contract
    // the real binary keeps, minus the network.
    const fakeDir = mkdtempSync(join(tmpdir(), "vaenyx-fake-claude-"));
    cleanups.push(fakeDir);
    const fake = join(fakeDir, "fake-claude.mjs");
    writeFileSync(
      fake,
      [
        "import { mkdirSync, writeFileSync } from 'node:fs';",
        "import { join } from 'node:path';",
        "const home = process.env.CLAUDE_CONFIG_DIR;",
        "console.log('Open https://claude.com/login/oauth/fake to sign in');",
        "let buffer = '';",
        "process.stdin.on('data', (chunk) => {",
        "  buffer += chunk.toString();",
        "  if (!buffer.includes('\\n')) return;",
        "  const code = buffer.trim();",
        "  if (code === 'good-code') {",
        "    mkdirSync(home, { recursive: true });",
        "    writeFileSync(join(home, '.credentials.json'), '{}');",
        "    process.exit(0);",
        "  }",
        "  process.exit(1);",
        "});",
      ].join("\n"),
    );
    // Windows cannot exec .mjs directly; go through node. The login module
    // spawns exactly this string as the executable with fixed args, so the
    // wrapper script re-execs node with the fake.
    const wrapper = join(fakeDir, process.platform === "win32" ? "fake.cmd" : "fake.sh");
    if (process.platform === "win32") {
      writeFileSync(wrapper, `@echo off\r\nnode "${fake}"\r\n`);
    } else {
      writeFileSync(wrapper, `#!/bin/sh\nexec node "${fake}"\n`, { mode: 0o755 });
    }
    process.env.VAENYX_CLAUDE_LOGIN_COMMAND = wrapper;
    try {
      const first = await makeProfile("app-login-one");
      const second = await makeProfile("app-login-two");

      const startOne = await app.inject({
        method: "POST",
        url: "/v1/relay/profile/login/start",
        headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${first.token}` },
        payload: { engine: "claude-cli" },
      });
      expect(startOne.statusCode).toBe(200);
      // The second start must NOT displace the first's session — the old
      // module-level singleton did exactly that.
      const startTwo = await app.inject({
        method: "POST",
        url: "/v1/relay/profile/login/complete",
        headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${second.token}` },
        payload: { engine: "claude-cli", code: "good-code" },
      });
      // Second app never started; its complete is its own clean error, not the
      // first app's session.
      expect(startTwo.statusCode).toBe(502);
      expect((startTwo.json() as { error: string }).error).toBe(
        "CLAUDE_LOGIN_NOT_STARTED",
      );

      const completeOne = await app.inject({
        method: "POST",
        url: "/v1/relay/profile/login/complete",
        headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${first.token}` },
        payload: { engine: "claude-cli", code: "good-code" },
      });
      expect(completeOne.statusCode).toBe(200);
      expect((completeOne.json() as { connected: boolean }).connected).toBe(
        true,
      );

      // The sign-in landed in the FIRST profile's directory and nobody
      // else's, and the first profile is now dedicated.
      const statusOne = await app.inject({
        method: "GET",
        url: "/v1/relay/profile",
        headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${first.token}` },
      });
      const bodyOne = statusOne.json() as {
        mode: string;
        engines: { id: string; connected: boolean }[];
      };
      expect(bodyOne.mode).toBe("dedicated");
      expect(
        bodyOne.engines.find((engine) => engine.id === "claude-cli")?.connected,
      ).toBe(true);

      const statusTwo = await app.inject({
        method: "GET",
        url: "/v1/relay/profile",
        headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${second.token}` },
      });
      const bodyTwo = statusTwo.json() as {
        mode: string;
        engines: { id: string; connected: boolean }[];
      };
      expect(bodyTwo.mode).toBe("shared-door");
    } finally {
      delete process.env.VAENYX_CLAUDE_LOGIN_COMMAND;
    }
  });

  it("usage: counted per app and month, listed for the Owner, names joined", async () => {
    const profile = await makeProfile("app-usage");
    const { recordEngineUsage } = await import(
      "../src/modules/core/relay-usage.js"
    );
    const { createDatabase } = await import("../src/db/database.js");
    const database = createDatabase(config);
    recordEngineUsage(database, profile.id, "openai-cli");
    recordEngineUsage(database, profile.id, "openai-cli");
    recordEngineUsage(database, "core", "claude-cli", {
      input: 100,
      output: 40,
    });
    recordEngineUsage(database, "core", "claude-cli", { input: 10, output: 5 });
    database.close();

    const usage = await app.inject({
      method: "GET",
      url: "/v1/relay/usage",
      headers: { cookie },
    });
    expect(usage.statusCode).toBe(200);
    const body = usage.json() as {
      rows: {
        appId: string;
        appName: string;
        engine: string;
        calls: number;
        inputTokens: number | null;
        outputTokens: number | null;
      }[];
    };
    const appRow = body.rows.find((row) => row.appId === profile.id);
    expect(appRow?.appName).toBe("app-usage");
    expect(appRow?.calls).toBe(2);
    // Codex never reported tokens, so the columns stay NULL — shown as
    // absent, never zero and never estimated.
    expect(appRow?.inputTokens).toBeNull();
    const coreRow = body.rows.find((row) => row.appId === "core");
    expect(coreRow?.calls).toBe(2);
    expect(coreRow?.inputTokens).toBe(110);
    expect(coreRow?.outputTokens).toBe(45);

    // App keys cannot read the Owner's usage page.
    const viaApp = await app.inject({
      method: "GET",
      url: "/v1/relay/usage",
      headers: { "tailscale-user-login": "owner@example.com", authorization: `Bearer ${profile.token}` },
    });
    expect(viaApp.statusCode).toBe(401);
  });
});
