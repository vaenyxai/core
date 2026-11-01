import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

const origin = "https://app.example",
  returnUri = origin + "/connect/return",
  verifier = "v".repeat(43);
const fields = {
  version: "1",
  client_name: "Example App",
  client_origin: origin,
  return_uri: returnUri,
  state: "s".repeat(43),
  code_challenge_method: "S256",
  code_challenge: createHash("sha256").update(verifier).digest("base64url"),
};
const tailnet = { "tailscale-user-login": "synthetic-owner@example.test" };
describe("relay connection HTTP boundary", () => {
  let app: Awaited<ReturnType<typeof buildApp>>,
    config: AppConfig,
    cookie: string,
    profileId: string,
    token: string;
  beforeEach(async () => {
    const root = mkdtempSync(join(tmpdir(), "vaenyx-connect-test-"));
    for (const dir of ["db", "backups", "library", "routines", "secrets"])
      mkdirSync(join(root, dir));
    config = {
      catalogueBaseUrl: "https://example.invalid",
      corsOrigins: [origin],
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
    process.env.VAENYX_DATA_DIR = config.dataDirectory;
    app = await buildApp(config);
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Owner", password: "synthetic-test-password" },
    });
    cookie = String(setup.headers["set-cookie"]).split(";")[0]!;
    const created = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie },
      payload: { name: "Example App", kind: "relay" },
    });
    const result = created.json();
    profileId = result.profile.id;
    token = result.token;
  });
  afterEach(async () => {
    await app.close();
    delete process.env.VAENYX_DATA_DIR;
    rmSync(config.repositoryRoot, { recursive: true, force: true });
  });
  async function start(extra = "") {
    return app.inject({
      method: "POST",
      url: "/v1/relay/connect/start",
      headers: {
        ...tailnet,
        origin,
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: new URLSearchParams(fields).toString() + extra,
    });
  }
  async function approve() {
    const begun = await start();
    expect(begun.statusCode).toBe(303);
    const id = new URL(
      String(begun.headers.location),
      "https://core.example",
    ).searchParams.get("connect")!;
    const response = await app.inject({
      method: "POST",
      url: "/v1/app-profiles/connect/" + id + "/approve",
      headers: { cookie },
      payload: { profile_id: profileId, confirmed_origin: origin },
    });
    expect(response.statusCode).toBe(200);
    return { id, ...response.json() } as {
      id: string;
      code: string;
      state: string;
      return_uri: string;
    };
  }
  const exchange = (code: string, extra = {}) =>
    app.inject({
      method: "POST",
      url: "/v1/relay/connect/exchange",
      headers: { ...tailnet, origin },
      payload: {
        version: 1,
        code,
        code_verifier: verifier,
        client_origin: origin,
        return_uri: returnUri,
        ...extra,
      },
    });
  it("denies unapproved CORS even when general application CORS permits that origin", async () => {
    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/v1/relay/connect/exchange",
      headers: { origin, "access-control-request-method": "POST" },
    });
    expect(preflight.statusCode).toBe(403);
    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
    const began = await start();
    expect(began.statusCode).toBe(303);
    expect(began.headers["access-control-allow-origin"]).toBeUndefined();
    expect(began.headers["cache-control"]).toBe("no-store");
    expect(began.body).not.toContain(token);
    expect(String(began.headers.location)).not.toContain(fields.state);
    const afterStart = await app.inject({
      method: "OPTIONS",
      url: "/v1/relay/connect/exchange",
      headers: { origin, "access-control-request-method": "POST" },
    });
    expect(afterStart.statusCode).toBe(403);
  });
  it("requires Tailnet and a unique, bounded form payload", async () => {
    const outside = await app.inject({
      method: "POST",
      url: "/v1/relay/connect/start",
      headers: { origin, "content-type": "application/x-www-form-urlencoded" },
      payload: new URLSearchParams(fields).toString(),
    });
    expect(outside.statusCode).toBe(403);
    expect(outside.json().error).toBe("RELAY_TAILNET_REQUIRED");
    expect((await start("&state=duplicate")).statusCode).toBe(400);
    expect((await start("&unexpected=value")).statusCode).toBe(400);
    const json = await app.inject({
      method: "POST",
      url: "/v1/relay/connect/start",
      headers: { ...tailnet, origin },
      payload: fields,
    });
    expect(json.statusCode).toBe(400);
  });
  it("requires Owner authentication and rejects cross-site approval", async () => {
    const begun = await start(),
      id = new URL(
        String(begun.headers.location),
        "https://core.example",
      ).searchParams.get("connect")!;
    const url = "/v1/app-profiles/connect/" + id;
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
    const before = await app.inject({
      method: "GET",
      url,
      headers: { cookie },
    });
    expect(before.json().status).toBe("pending");
    expect(before.body).not.toContain(token);
    const hostile = await app.inject({
      method: "POST",
      url: url + "/approve",
      headers: { cookie, "sec-fetch-site": "cross-site" },
      payload: { profile_id: profileId, confirmed_origin: origin },
    });
    expect(hostile.statusCode).toBe(403);
    const denied = await app.inject({
      method: "POST",
      url: url + "/deny",
      headers: { cookie },
      payload: {},
    });
    expect(denied.json().status).toBe("denied");
  });
  it("enables only the approved origin and atomically exchanges the existing key once", async () => {
    const grant = await approve();
    expect(grant.return_uri).toBe(returnUri);
    expect(grant.state).toBe(fields.state);
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/v1/relay/connect/exchange",
      headers: { origin, "access-control-request-method": "POST" },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(origin);
    expect(allowed.headers["access-control-allow-credentials"]).toBeUndefined();
    const hostile = await app.inject({
      method: "OPTIONS",
      url: "/v1/relay/connect/exchange",
      headers: {
        origin: "https://other.example",
        "access-control-request-method": "POST",
      },
    });
    expect(hostile.statusCode).toBe(403);
    expect(hostile.headers["access-control-allow-origin"]).toBeUndefined();
    expect(
      (await exchange(grant.code, { code_verifier: "x".repeat(43) }))
        .statusCode,
    ).toBe(403);
    const both = await Promise.all([
      exchange(grant.code),
      exchange(grant.code),
    ]);
    expect(both.filter((r) => r.statusCode === 200)).toHaveLength(1);
    const success = both.find((r) => r.statusCode === 200)!;
    expect(success.json()).toMatchObject({
      version: 1,
      token,
      profile_id: profileId,
      key_version: 1,
    });
    expect(success.headers["cache-control"]).toBe("no-store");
    const current = await app.inject({
      method: "GET",
      url: "/v1/relay/profile",
      headers: { ...tailnet, authorization: "Bearer " + token },
    });
    expect(current.statusCode).toBe(200);
  });
  it("does not let a Custom Mode approve or inspect a connection", async () => {
    const begun = await start(),
      id = new URL(
        String(begun.headers.location),
        "https://core.example",
      ).searchParams.get("connect")!;
    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name: "Restricted" },
    });
    const entered = await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId: mode.json().id },
    });
    expect(entered.statusCode).toBe(200);
    const path = "/v1/app-profiles/connect/" + id;
    expect(
      (await app.inject({ method: "GET", url: path, headers: { cookie } }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: path + "/approve",
          headers: { cookie },
          payload: { profile_id: profileId, confirmed_origin: origin },
        })
      ).statusCode,
    ).toBe(403);
  });
});
