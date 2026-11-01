import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { localFileFixture } from "./local-file-fixture.js";

describe("local file HTTP authorization", () => {
  let app: Awaited<ReturnType<typeof buildApp>>,
    config: AppConfig,
    cookie: string,
    token: string;
  const origin = "https://app.example";
  const tailnet = { "tailscale-user-login": "synthetic-owner@example.test" };
  beforeEach(async () => {
    const root = mkdtempSync(join(tmpdir(), "vaenyx-local-http-test-"));
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
      localFileAllowlistPath: join(root, "approved.json"),
    };
    writeFileSync(
      config.localFileAllowlistPath!,
      JSON.stringify({
        version: 1,
        batch_id: "batch",
        profile_name: "Example App",
        client_origin: origin,
        task_id: "task",
        files: [localFileFixture(root)],
      }),
    );
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
    token = created.json().token;
  });
  afterEach(async () => {
    await app.close();
    delete process.env.VAENYX_DATA_DIR;
    rmSync(config.repositoryRoot, { recursive: true, force: true });
  });
  const approve = (
    headers = { cookie },
    payload: unknown = { batch_id: "batch", file_ids: ["segment"] },
  ) =>
    app.inject({
      method: "POST",
      url: "/v1/app-profiles/local-files",
      headers,
      payload: payload as object,
    });
  it("requires Owner approval of preinstalled IDs and never reveals paths", async () => {
    expect((await approve({ cookie: "" })).statusCode).toBe(403);
    expect(
      (
        await approve({ cookie, "sec-fetch-site": "cross-site" } as {
          cookie: string;
        })
      ).statusCode,
    ).toBe(403);
    const manifest = await app.inject({
      url: "/v1/app-profiles/local-files",
      headers: { cookie },
    });
    expect(manifest.statusCode).toBe(200);
    expect(manifest.body).not.toContain(config.repositoryRoot);
    expect(manifest.json().manifest.files[0]).not.toHaveProperty("path");
    expect(
      (await approve({ cookie }, { batch_id: "batch", file_ids: ["unknown"] }))
        .statusCode,
    ).toBe(403);
    expect(
      (await approve({ cookie }, { batch_id: "other", file_ids: ["segment"] }))
        .statusCode,
    ).toBe(403);
    const granted = await approve();
    expect(granted.statusCode).toBe(200);
    expect(granted.json().grants[0].file.file_ref.token).toHaveLength(43);
    expect(granted.body).not.toContain(config.repositoryRoot);
  });
  it("ignores no arbitrary path: an unlisted file cannot be registered through HTTP", async () => {
    const response = await approve(
      { cookie },
      { files: [{ path: "C:\\other.pdf" }] },
    );
    expect(response.statusCode).toBe(400);
    const mixed = await approve(
      { cookie },
      {
        batch_id: "batch",
        file_ids: ["unknown"],
        files: [{ path: "C:\\other.pdf" }],
      },
    );
    expect(mixed.statusCode).toBe(403);
  });
  it("requires exact approved origin, Tailnet and the bound App Key; revoke closes CORS", async () => {
    const url = "/v1/ai/local-files";
    const preflight = () =>
      app.inject({
        method: "OPTIONS",
        url,
        headers: { origin, "access-control-request-method": "GET" },
      });
    expect((await preflight()).statusCode).toBe(403);
    await approve();
    expect((await preflight()).statusCode).toBe(204);
    expect(
      (
        await app.inject({
          url,
          headers: { origin, authorization: `Bearer ${token}` },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ url, headers: { origin, ...tailnet } })).statusCode,
    ).toBe(401);
    const wrongOrigin = await app.inject({
      url,
      headers: {
        origin: "https://other.example",
        ...tailnet,
        authorization: `Bearer ${token}`,
      },
    });
    expect(wrongOrigin.statusCode).toBe(403);
    expect(wrongOrigin.headers["access-control-allow-origin"]).toBeUndefined();
    const listed = await app.inject({
      url,
      headers: { origin, ...tailnet, authorization: `Bearer ${token}` },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().grants).toHaveLength(1);
    expect(listed.headers["cache-control"]).toBe("no-store");
    const other = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie },
      payload: { name: "Other App", kind: "relay" },
    });
    expect(
      (
        await app.inject({
          url,
          headers: {
            origin,
            ...tailnet,
            authorization: `Bearer ${other.json().token}`,
          },
        })
      ).json().grants,
    ).toEqual([]);
    const revoked = await app.inject({
      method: "POST",
      url: "/v1/app-profiles/local-files/revoke",
      headers: { cookie },
      payload: { task_id: "task" },
    });
    expect(revoked.json()).toEqual({ revoked: 1 });
    expect((await preflight()).statusCode).toBe(403);
  });
});
