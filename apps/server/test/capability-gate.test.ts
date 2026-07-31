// The capability ceiling, tested where it is actually enforced. The card in
// Settings promises the Owner that a capability switched off there is out of
// reach of everything — and for a long time nothing but the two Method routes
// ever asked. Each capability here gets both halves of the promise: the route
// REFUSES with the switch off, and the route still runs with it on. Without
// the second half a gate that simply broke the feature would look correct.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { writeGlobalCapabilities } from "../src/modules/core/capabilities.js";
import { generateImage } from "../src/modules/core/image-gen.js";
import { runRelay, writeRelayConfig } from "../src/modules/core/relay.js";

const temporaryDirectories: string[] = [];
const databases: DatabaseHandle[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.sqlite.close();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createTestConfig(): AppConfig {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-capgate-test-"));
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

async function startWithOwner(): Promise<{
  app: Awaited<ReturnType<typeof buildApp>>;
  cookie: string;
}> {
  const app = await buildApp(createTestConfig());
  const setup = await app.inject({
    method: "POST",
    url: "/v1/setup",
    payload: { name: "Oskar", password: "private-password" },
  });
  return { app, cookie: String(setup.headers["set-cookie"]) };
}

async function switchCapability(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  capability: string,
  on: boolean,
): Promise<void> {
  const response = await app.inject({
    method: "PUT",
    url: "/v1/capabilities",
    headers: { cookie },
    payload: { [capability]: on },
  });
  expect(response.statusCode).toBe(200);
}

// A one-pixel PNG and a one-page PDF: enough for a route to accept the body
// and reach — or fail to reach — the engine behind it.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const TINY_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj",
    "trailer<</Root 1 0 R>>",
  ].join("\n"),
  "latin1",
);

describe("the capability ceiling on the routes that perform a capability", () => {
  it("refuses to look at a photo when Vision is off, and looks again when it is on", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "vision", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/vision/describe",
      headers: { cookie, "content-type": "image/png" },
      payload: TINY_PNG,
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("switched off");
    expect(String(refused.json().error)).toContain("Settings");

    // Switched on, the route gets past the ceiling and stops at the next real
    // obstacle instead — no vision model is connected in a test instance.
    // That it is NOT a 403 is the whole point.
    await switchCapability(app, cookie, "vision", true);
    const allowed = await app.inject({
      method: "POST",
      url: "/v1/vision/describe",
      headers: { cookie, "content-type": "image/png" },
      payload: TINY_PNG,
    });
    expect(allowed.statusCode).not.toBe(403);
    expect(String(allowed.json().error)).toContain("vision");

    await app.close();
  });

  it("refuses to mark a photo when Vision is off", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "vision", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/vision/annotate",
      headers: { cookie },
      payload: { imageId: "no-such-image", language: "en" },
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("switched off");

    // On, the same call reaches the image lookup and fails there (404) —
    // past the ceiling.
    await switchCapability(app, cookie, "vision", true);
    const allowed = await app.inject({
      method: "POST",
      url: "/v1/vision/annotate",
      headers: { cookie },
      payload: { imageId: "no-such-image", language: "en" },
    });
    expect(allowed.statusCode).toBe(404);

    await app.close();
  });

  it("answers a Chinese request in Chinese", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "vision", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/vision/describe?lang=zh",
      headers: { cookie, "content-type": "image/png" },
      payload: TINY_PNG,
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("看图片");

    await app.close();
  });

  // A recording has no language until it is transcribed and a PDF has none at
  // all, so these two routes are told which one the Owner is reading the app
  // in. Both were English-only, which is the one refusal a Chinese-speaking
  // Owner is most likely to meet first.
  it("refuses a recording and a document in Chinese when asked to", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "hearing", false);
    const heard = await app.inject({
      method: "POST",
      url: "/v1/voice/transcribe?lang=zh",
      headers: { cookie, "content-type": "audio/webm" },
      payload: Buffer.from("not really audio", "utf8"),
    });
    expect(heard.statusCode).toBe(403);
    expect(String(heard.json().error)).toContain("听");

    await switchCapability(app, cookie, "reading", false);
    const read = await app.inject({
      method: "POST",
      url: "/v1/documents/upload?lang=zh",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "quote.pdf",
      },
      payload: TINY_PDF,
    });
    expect(read.statusCode).toBe(403);
    expect(String(read.json().error)).toContain("读文档");

    await app.close();
  });

  it("refuses to transcribe a recording when Hearing is off", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "hearing", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/voice/transcribe",
      headers: { cookie, "content-type": "audio/webm" },
      payload: Buffer.from("not really audio", "utf8"),
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("listen");

    await switchCapability(app, cookie, "hearing", true);
    const allowed = await app.inject({
      method: "POST",
      url: "/v1/voice/transcribe",
      headers: { cookie, "content-type": "audio/webm" },
      payload: Buffer.from("not really audio", "utf8"),
    });
    expect(allowed.statusCode).not.toBe(403);
    expect(String(allowed.json().error)).toContain("Voice");

    await app.close();
  });

  it("refuses to speak when Speaking is off", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "speaking", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/voice/speak",
      headers: { cookie },
      payload: { text: "Hello there." },
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("speak");

    await switchCapability(app, cookie, "speaking", true);
    const allowed = await app.inject({
      method: "POST",
      url: "/v1/voice/speak",
      headers: { cookie },
      payload: { text: "Hello there." },
    });
    expect(allowed.statusCode).not.toBe(403);
    expect(String(allowed.json().error)).toContain("speech engine");

    await app.close();
  });

  it("refuses a document upload when Reading is off, and takes it when on", async () => {
    const { app, cookie } = await startWithOwner();

    // Reading ships ON — attaching a document is something this machine
    // already does — so switching it off is the state under test here.
    await switchCapability(app, cookie, "reading", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "quote.pdf",
      },
      payload: TINY_PDF,
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("read documents");

    await switchCapability(app, cookie, "reading", true);
    const allowed = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "quote.pdf",
      },
      payload: TINY_PDF,
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toMatchObject({ pages: 1 });

    await app.close();
  });

  it("writes an audit row naming the capability that refused", async () => {
    const { app, cookie } = await startWithOwner();

    await switchCapability(app, cookie, "speaking", false);
    await app.inject({
      method: "POST",
      url: "/v1/voice/speak",
      headers: { cookie },
      payload: { text: "Hello there." },
    });

    const events = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: { cookie },
    });
    expect(events.statusCode).toBe(200);
    const refusals = (events.json() as { action: string; resourceId: string }[])
      .filter((event) => event.action === "capability.refused");
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.resourceId).toBe("speaking");

    await app.close();
  });

  it("says which door stopped it, in the Owner's own language", async () => {
    const { app, cookie } = await startWithOwner();

    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name: "Guest", rules: "Be brief." },
    });
    const modeId = (mode.json() as { id: string }).id;
    await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });

    const widen = await app.inject({
      method: "PUT",
      url: "/v1/capabilities?lang=zh",
      headers: { cookie },
      payload: { fetching: true },
    });
    expect(widen.statusCode).toBe(403);
    expect(String(widen.json().error)).toContain("User Mode");
    expect(String(widen.json().error)).toContain("退出");

    // The row's own Test lives behind the same door and says the same thing.
    const tested = await app.inject({
      method: "POST",
      url: "/v1/capability-test/web?lang=zh",
      headers: { cookie },
      payload: {},
    });
    expect(tested.statusCode).toBe(403);
    expect(String(tested.json().error)).toContain("退出");

    await app.close();
  });

  it("keeps a session inside a mode away from the switches", async () => {
    const { app, cookie } = await startWithOwner();

    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name: "Guest", rules: "Be brief." },
    });
    expect(mode.statusCode).toBe(200);
    const modeId = (mode.json() as { id: string }).id;

    const entered = await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });
    expect(entered.statusCode).toBe(200);

    const widen = await app.inject({
      method: "PUT",
      url: "/v1/capabilities",
      headers: { cookie },
      payload: { fetching: true },
    });
    expect(widen.statusCode).toBe(403);

    await app.close();
  });

  it("blocks the switches at the locked-mode floor as well", async () => {
    const { app, cookie } = await startWithOwner();

    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name: "Locked", rules: "Be brief.", lockSettings: true },
    });
    const modeId = (mode.json() as { id: string }).id;
    await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });

    // The message says WHICH guard stopped it: this one is the shared
    // locked-mode floor, which the capability route was missing from.
    const widen = await app.inject({
      method: "PUT",
      url: "/v1/capabilities",
      headers: { cookie },
      payload: { vision: true },
    });
    expect(widen.statusCode).toBe(403);
    expect(String(widen.json().error)).toContain("locked in this mode");

    await app.close();
  });
});

describe("the capability ceiling below the routes", () => {
  it("refuses to make a picture when Drawing is off, whoever asks", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-capgate-draw-"));
    temporaryDirectories.push(directory);
    const database = createDatabase({
      dataDirectory: directory,
      databasePath: join(directory, "vaenyx.db"),
      backupsDirectory: join(directory, "backups"),
      migrationsDirectory: resolve("migrations"),
    } as Parameters<typeof createDatabase>[0]);
    databases.push(database);

    // Drawing ships ON, so the switch is thrown off explicitly. The refusal
    // has to happen before any provider is consulted, which is also why this
    // test needs no network.
    writeGlobalCapabilities(database, { drawing: false });
    await expect(
      generateImage(database, directory, directory, "a red bicycle"),
    ).rejects.toThrow("IMAGE_CAPABILITY_OFF");

    // Switched on, it gets past the ceiling and stops at the missing engine.
    writeGlobalCapabilities(database, { drawing: true });
    await expect(
      generateImage(database, directory, directory, "a red bicycle"),
    ).rejects.toThrow("IMAGE_NOT_CONNECTED");
  });

  it("refuses an outside app's picture at the relay door when Vision is off", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-capgate-relay-"));
    temporaryDirectories.push(directory);
    const database = createDatabase({
      dataDirectory: directory,
      databasePath: join(directory, "vaenyx.db"),
      backupsDirectory: join(directory, "backups"),
      migrationsDirectory: resolve("migrations"),
    } as Parameters<typeof createDatabase>[0]);
    databases.push(database);
    writeRelayConfig(database, {
      enabled: true,
      ownerEmails: ["owner@example.com"],
      fileHosts: ["files.example.com"],
    });

    // A link the Owner never allowed: it fails at the door's own host check,
    // which sits AFTER the ceiling and before anything is fetched. So the
    // same call proves both halves without touching the network.
    const call = {
      task: "quote-analysis",
      prompt: "What is in this picture?",
      engine: "claude-cli" as const,
      capability: "vision" as const,
      caller: "owner@example.com",
      files: [{ name: "a.png", url: "https://evil.example.net/a.png" }],
    };

    writeGlobalCapabilities(database, { vision: false });
    await expect(runRelay(database, directory, call)).rejects.toThrow(
      "RELAY_CAPABILITY_OFF:vision",
    );

    writeGlobalCapabilities(database, { vision: true });
    await expect(runRelay(database, directory, call)).rejects.toThrow(
      "RELAY_HOST_NOT_ALLOWED",
    );
  });
});
