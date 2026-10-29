import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

it("installs only Dinner, persists reversible shelf changes and protects Owner-only access", async () => {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-shelf-test-"));
  const repositoryRoot = resolve("../..");
  const config = {
    repositoryRoot,
    dataDirectory,
    databasePath: resolve(dataDirectory, "test.db"),
    migrationsDirectory: resolve("migrations"),
    libraryDirectory: resolve(dataDirectory, "library/methods"),
    routinesDirectory: resolve(dataDirectory, "library/routines"),
    secretsDirectory: resolve(dataDirectory, "secrets"),
    backupsDirectory: resolve(dataDirectory, "backups"),
    webDistDirectory: resolve(dataDirectory, "missing-web"),
    docsDirectory: resolve(repositoryRoot, "docs"),
    host: "127.0.0.1",
    port: 3197,
    mode: "test",
    updateProbe: true,
    corsOrigins: [],
    logLevel: "silent",
    version: "test",
    publish: null,
    googleOAuth: null,
    publishServiceUrl: null,
    catalogueBaseUrl: "https://example.invalid",
  } as AppConfig;
  let app = await buildApp(config);
  const path = "/v1/library/routine-shelf";
  const id = "vaenyx-dinner-planner";
  try {
    expect(readdirSync(config.routinesDirectory)).toEqual([id]);
    expect(readdirSync(config.libraryDirectory)).toEqual([id]);
    const unauthorised = await app.inject({
      method: "POST",
      url: path,
      payload: { ids: [id], removed: true },
    });
    expect(unauthorised.statusCode).toBe(401);
    expect((await app.inject({ url: path })).statusCode).toBe(401);
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Test Owner", password: "test-password-only" },
    });
    const headers = {
      cookie: String(setup.headers["set-cookie"]).split(";")[0]!,
    };
    const list = await app.inject({ url: "/v1/routines", headers });
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0]).toMatchObject({ id, name: "Dinner" });
    const conversation = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers,
      payload: { title: "Dinner fixture", routineId: id },
    });
    expect(conversation.statusCode).toBe(200);
    const conversationId = conversation.json().id;
    const original = (
      await app.inject({ url: "/v1/library/routines/" + id, headers })
    ).json();
    const bad = await app.inject({
      method: "POST",
      url: path,
      headers,
      payload: { ids: [id, "missing"], removed: true },
    });
    expect(bad.statusCode).toBe(404);
    expect((await app.inject({ url: path, headers })).json()).toEqual({
      removedIds: [],
    });
    const removed = await app.inject({
      method: "POST",
      url: path,
      headers,
      payload: { ids: [id], removed: true },
    });
    expect(removed.json()).toEqual({ removedIds: [id] });
    // Reboot uses only this temporary database and package directory.
    await app.close();
    app = await buildApp(config);
    expect((await app.inject({ url: path, headers })).json()).toEqual({
      removedIds: [id],
    });
    expect(
      (await app.inject({ url: "/v1/library/routines/" + id, headers })).json(),
    ).toEqual(original);
    expect(
      (
        await app.inject({ url: "/v1/ask-vaenyx/conversations", headers })
      ).json(),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: conversationId })]),
    );
    const restored = await app.inject({
      method: "POST",
      url: path,
      headers,
      payload: { ids: [id], removed: false },
    });
    expect(restored.json()).toEqual({ removedIds: [] });
    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers,
      payload: { name: "Guest", lockSettings: true },
    });
    expect(mode.statusCode).toBe(200);
    const entered = await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers,
      payload: { modeId: mode.json().id },
    });
    expect(entered.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: path,
          headers,
          payload: { ids: [id], removed: true },
        })
      ).statusCode,
    ).toBe(403);
    expect((await app.inject({ url: path, headers })).statusCode).toBe(403);
  } finally {
    await app.close();
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});
