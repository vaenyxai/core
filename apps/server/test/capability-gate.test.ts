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
import {
  writeGlobalCapabilities,
} from "../src/modules/core/capabilities.js";
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
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
    "4 0 obj<</Length 40>>stream\nBT /F1 12 Tf 20 100 Td (QUOTE WORDS) Tj ET\nendstream endobj",
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    "trailer<</Root 1 0 R>>",
  ].join("\n"),
  "latin1",
);

// The page with NO text at all: how a scan looks to the extractor. The upload
// door classifies by content, so this must be guided to OCR, never silently
// read as empty.
const SCANNED_PDF = Buffer.from(
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

  it("a scan is guided to OCR instead of silently reading as empty", async () => {
    const { app, cookie } = await startWithOwner();

    // OCR off: the refusal carries the fix in its own sentence, as a coded
    // error the client turns into a window with the switch-on button.
    await switchCapability(app, cookie, "ocr", false);
    const refused = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "scan.pdf",
      },
      payload: SCANNED_PDF,
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("DOCUMENT_NEEDS_OCR:");

    // OCR on but no engine key in this sandbox: its own sentence pointing at
    // Models — never a silent empty extraction.
    await switchCapability(app, cookie, "ocr", true);
    const unconnected = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "scan.pdf",
      },
      payload: SCANNED_PDF,
    });
    expect(unconnected.statusCode).toBe(503);
    expect(String(unconnected.json().error)).toContain("Mistral");

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

// The MIDDLE layer, tested where it is decided and where it is enforced. The
// column has existed since migration 0053; until now nothing wrote it, so a
// mode could be created, entered and handed to somebody with every capability
// the instance had.
describe("the mode ceiling", () => {
  async function makeMode(
    app: Awaited<ReturnType<typeof buildApp>>,
    cookie: string,
    name: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name, ...extra },
    });
    expect(mode.statusCode).toBe(200);
    return (mode.json() as { id: string }).id;
  }

  it("starts with no restriction of its own, and narrows when the Owner says so", async () => {
    const { app, cookie } = await startWithOwner();
    const modeId = await makeMode(app, cookie, "Guest");

    // A mode nobody has narrowed adds nothing: every row starts where the
    // instance leaves it, which is what every mode made before this screen
    // existed still says.
    const fresh = await app.inject({
      method: "GET",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
    });
    expect(fresh.statusCode).toBe(200);
    expect(fresh.json().narrowed).toBe(false);
    expect(fresh.json().capabilities.drawing).toBe(true);
    // The instance's own switches ride along, because a mode row is meaningless
    // without the ceiling it is measured against. Fetching ships off.
    expect(fresh.json().global.fetching).toBe(false);

    const narrowed = await app.inject({
      method: "PUT",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
      payload: { drawing: false, web: false },
    });
    expect(narrowed.statusCode).toBe(200);
    expect(narrowed.json().narrowed).toBe(true);
    expect(narrowed.json().capabilities.drawing).toBe(false);
    expect(narrowed.json().capabilities.web).toBe(false);
    // A delta, not a whole list: what the request never mentioned is untouched.
    expect(narrowed.json().capabilities.vision).toBe(true);

    await app.close();
  });

  it("refuses to give a mode what the instance has switched off", async () => {
    const { app, cookie } = await startWithOwner();
    const modeId = await makeMode(app, cookie, "Guest");

    // Fetching ships off, so switching it on for a mode is a widening — and a
    // widening is refused rather than stored. A stored-and-ignored tick would
    // read as granted on screen and come alive by itself the day the global
    // switch moved.
    const widen = await app.inject({
      method: "PUT",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
      payload: { fetching: true },
    });
    expect(widen.statusCode).toBe(400);
    expect(String(widen.json().error)).toContain("Switch it on in Capabilities");

    const after = await app.inject({
      method: "GET",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
    });
    expect(after.json().narrowed).toBe(false);

    await app.close();
  });

  it("stops a session inside a mode from touching its own mode's capabilities", async () => {
    const { app, cookie } = await startWithOwner();
    // Not locked: "lock settings" is off, so the shared locked-mode floor does
    // NOT bite here. This is the route's own any-mode door, and without it
    // every unlocked mode could hand itself back whatever it was denied.
    const modeId = await makeMode(app, cookie, "Guest");
    await app.inject({
      method: "PUT",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
      payload: { drawing: false },
    });
    const entered = await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });
    expect(entered.statusCode).toBe(200);

    const widen = await app.inject({
      method: "PUT",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
      payload: { drawing: true },
    });
    expect(widen.statusCode).toBe(403);
    expect(String(widen.json().error)).toContain("User Mode");

    // Reading it is refused too: the list of what this mode still has is the
    // map somebody would use to look for a way out of it.
    const peek = await app.inject({
      method: "GET",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
    });
    expect(peek.statusCode).toBe(403);

    await app.close();
  });

  // The browser performs some capabilities ITSELF — device text-to-speech is
  // spoken by the page and never sends a request — so the only thing that can
  // stop it inside a mode is what this route hands back. It has to carry the
  // session's ceiling as well as the machine's, or a mode's Speaking switch
  // reaches nothing at all.
  it("tells a session inside a mode what IT may do, not only what the machine may", async () => {
    const { app, cookie } = await startWithOwner();
    const modeId = await makeMode(app, cookie, "Guest");
    await app.inject({
      method: "PUT",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
      payload: { speaking: false },
    });
    await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });

    const inside = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { cookie },
    });
    expect(inside.statusCode).toBe(200);
    // The machine still allows it — nothing narrowed the instance — and the
    // session does not. Both facts, because two screens need different ones.
    expect(inside.json().global.speaking).toBe(true);
    expect(inside.json().session.speaking).toBe(false);
    // Everything the mode left alone is untouched in both.
    expect(inside.json().session.vision).toBe(true);

    await app.inject({
      method: "POST",
      url: "/v1/mode/exit",
      headers: { cookie },
      payload: {},
    });
    const outside = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { cookie },
    });
    expect(outside.json().session.speaking).toBe(true);

    await app.close();
  });

  it("refuses the work itself inside a narrowed mode, and blames the mode not the switch", async () => {
    const { app, cookie } = await startWithOwner();
    const modeId = await makeMode(app, cookie, "Guest");
    await app.inject({
      method: "PUT",
      url: `/v1/capabilities/modes/${modeId}`,
      headers: { cookie },
      payload: { vision: false },
    });
    await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId },
    });

    // Vision is ON globally. The only thing refusing is the mode, and the
    // sentence has to say so: "turn it on in Settings" would be both untrue
    // and an invitation to go hunting for a way out of the mode.
    const refused = await app.inject({
      method: "POST",
      url: "/v1/vision/describe",
      headers: { cookie, "content-type": "image/png" },
      payload: TINY_PNG,
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("mode you are in");
    expect(String(refused.json().error)).not.toContain("Settings");

    await app.close();
  });
});

// Copy pack N3. The counter used to be written on the way past a refused
// publish, and the refusal then told the Owner it had been — a record made and
// announced afterwards is not a choice. It now has a door of its own that
// nothing but a yes goes through.
describe("the waiting list", () => {
  it("counts only what a Method run genuinely cannot reach", async () => {
    const { app, cookie } = await startWithOwner();

    const counted = await app.inject({
      method: "POST",
      url: "/v1/capabilities/wanted",
      headers: { cookie },
      payload: { capabilities: ["fetching"] },
    });
    expect(counted.statusCode).toBe(200);
    expect(counted.json().counted).toEqual(["fetching"]);

    // A consent cannot talk the filter out of the way. `vision` runs inside a
    // Method today, so nobody is waiting for it to be built and counting it
    // would poison the only signal this table carries.
    const built = await app.inject({
      method: "POST",
      url: "/v1/capabilities/wanted",
      headers: { cookie },
      payload: { capabilities: ["vision"] },
    });
    expect(built.statusCode).toBe(200);
    expect(built.json().counted).toEqual([]);

    // A word nobody has ever used is not a quiet no-op: it is answered.
    const nonsense = await app.inject({
      method: "POST",
      url: "/v1/capabilities/wanted",
      headers: { cookie },
      payload: { capabilities: ["telepathy"] },
    });
    expect(nonsense.statusCode).toBe(400);

    await app.close();
  });

  it("refuses a session inside a mode", async () => {
    const { app, cookie } = await startWithOwner();
    const mode = await app.inject({
      method: "POST",
      url: "/v1/modes",
      headers: { cookie },
      payload: { name: "Guest" },
    });
    await app.inject({
      method: "POST",
      url: "/v1/mode/switch",
      headers: { cookie },
      payload: { modeId: (mode.json() as { id: string }).id },
    });

    // Whoever is holding a device inside a mode is not the person who answers
    // a question about what this instance writes down.
    const refused = await app.inject({
      method: "POST",
      url: "/v1/capabilities/wanted",
      headers: { cookie },
      payload: { capabilities: ["fetching"] },
    });
    expect(refused.statusCode).toBe(403);
    expect(String(refused.json().error)).toContain("User Mode");

    await app.close();
  });
});

// The THIRD layer. The column has existed since migration 0055; until now
// nothing wrote it, so every key's grant list was empty and a key could do
// nothing beyond the recipe however it was set up.
describe("what one app key may do", () => {
  async function makeKey(
    app: Awaited<ReturnType<typeof buildApp>>,
    cookie: string,
    name: string,
  ): Promise<string> {
    const created = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie },
      payload: {
        name,
        kind: "method",
        allowedMethodIds: ["sample-summary"],
      },
    });
    expect(created.statusCode).toBe(200);
    return (created.json() as { profile: { id: string } }).profile.id;
  }

  it("starts a key at nothing and grants exactly what the Owner ticks", async () => {
    const { app, cookie } = await startWithOwner();
    const keyId = await makeKey(app, cookie, "Customer portal");

    const fresh = await app.inject({
      method: "GET",
      url: "/v1/app-profiles",
      headers: { cookie },
    });
    expect(
      (fresh.json() as { id: string; capabilities: string[] }[]).find(
        (item) => item.id === keyId,
      )?.capabilities,
    ).toEqual([]);

    const granted = await app.inject({
      method: "PUT",
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { vision: true } },
    });
    expect(granted.statusCode).toBe(200);
    expect(granted.json().profile.capabilities).toEqual(["vision"]);

    // A change set: a write about `vision` leaves everything else where it was.
    const second = await app.inject({
      method: "PUT",
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { reading: true } },
    });
    expect(second.json().profile.capabilities).toEqual(["vision", "reading"]);

    await app.close();
  });

  it("refuses `fetching` through the route as well as the storage", async () => {
    const { app, cookie } = await startWithOwner();
    const keyId = await makeKey(app, cookie, "Estimating");

    // Switched ON for the whole machine, so the ceiling is not what refuses
    // this: no key may ever carry it, and the route is the gate a future bug
    // reaches first.
    await switchCapability(app, cookie, "fetching", true);
    const refused = await app.inject({
      method: "PUT",
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { fetching: true } },
    });
    expect(refused.statusCode).toBe(400);
    expect(String(refused.json().error)).toContain("can never");

    const after = await app.inject({
      method: "GET",
      url: "/v1/app-profiles",
      headers: { cookie },
    });
    expect(
      (after.json() as { id: string; capabilities: string[] }[]).find(
        (item) => item.id === keyId,
      )?.capabilities,
    ).toEqual([]);

    await app.close();
  });

  it("grants web with a plain tick, off for every key until then", async () => {
    // The approval ceremony retired (Oskar 2026-08-30: 不要 approve,就是一个
    // toggle). What stands: a key starts at NOTHING, so web is off until the
    // Owner ticks it — and the tick works on its own, no second press.
    const { app, cookie } = await startWithOwner();
    const keyId = await makeKey(app, cookie, "Quote app");

    const before = await app.inject({
      method: "GET",
      url: "/v1/app-profiles",
      headers: { cookie },
    });
    expect(
      (before.json() as { id: string; capabilities: string[] }[]).find(
        (item) => item.id === keyId,
      )?.capabilities,
    ).toEqual([]);

    const ticked = await app.inject({
      method: "PUT",
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { vision: true, web: true } },
    });
    expect(ticked.statusCode).toBe(200);
    expect(ticked.json().profile.capabilities).toEqual(["vision", "web"]);

    await app.close();
  });

  it("keeps a session inside a mode from granting a key anything", async () => {
    const { app, cookie } = await startWithOwner();
    const keyId = await makeKey(app, cookie, "Guest app");
    // Deliberately NOT locked: this is the route's own any-mode door. A key is
    // a hole in the ceiling that outlives the session, so a mode that could
    // grant one could walk straight out of itself through another program.
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
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { vision: true } },
    });
    expect(widen.statusCode).toBe(403);
    expect(String(widen.json().error)).toContain("User Mode");

    await app.close();
  });

  it("will not grant above the ceiling, and the ceiling still wins afterwards", async () => {
    const { app, cookie } = await startWithOwner();
    const keyId = await makeKey(app, cookie, "Drawing app");

    await switchCapability(app, cookie, "drawing", false);
    const above = await app.inject({
      method: "PUT",
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { drawing: true } },
    });
    expect(above.statusCode).toBe(400);
    expect(String(above.json().error)).toContain("Switch it on in Capabilities");

    // Granted while the machine allowed it, then switched off again: the grant
    // is KEPT rather than quietly deleted — the Owner did tick it, and it comes
    // back with the switch. What it buys the key meanwhile is nothing, which is
    // the ceiling doing its job over a key that has the capability ticked (the
    // decision itself is proved in capabilities.test.ts, where a run can be
    // decided without a model behind it).
    await switchCapability(app, cookie, "drawing", true);
    const granted = await app.inject({
      method: "PUT",
      url: `/v1/app-profiles/${keyId}/capabilities`,
      headers: { cookie },
      payload: { changes: { drawing: true } },
    });
    expect(granted.json().profile.capabilities).toEqual(["drawing"]);
    await switchCapability(app, cookie, "drawing", false);

    const after = await app.inject({
      method: "GET",
      url: "/v1/app-profiles",
      headers: { cookie },
    });
    expect(
      (after.json() as { id: string; capabilities: string[] }[]).find(
        (item) => item.id === keyId,
      )?.capabilities,
    ).toEqual(["drawing"]);

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
      generateImage(database, directory, directory, "a red bicycle", null),
    ).rejects.toThrow("IMAGE_CAPABILITY_OFF");

    // Switched on, it gets past the ceiling and stops at the missing engine.
    writeGlobalCapabilities(database, { drawing: true });
    await expect(
      generateImage(database, directory, directory, "a red bicycle", null),
    ).rejects.toThrow("IMAGE_NOT_CONNECTED");

    // The same door, one layer down: Drawing is on for the instance and off
    // for this mode, and the picture is refused all the same. This is the
    // backstop below the chat path — the caller asks first to save a model
    // call, so if this one only knew about the global switch a new caller
    // would silently walk past the mode.
    const modeId = "m-draw";
    database.sqlite
      .prepare("INSERT INTO modes (id, name, capabilities) VALUES (?, ?, ?)")
      .run(modeId, "Guest", JSON.stringify(["vision"]));
    await expect(
      generateImage(database, directory, directory, "a red bicycle", modeId),
    ).rejects.toThrow("IMAGE_CAPABILITY_OFF");
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
      fileHosts: ["files.example.com"],
    });

    // Every call carries a key since the shared one retired; this one is
    // granted vision, so the sequence proves the ceiling first, then the
    // door's own host check — nothing is fetched either way.
    const relayProfileId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    database.sqlite
      .prepare(
        `INSERT INTO app_profiles (id, name, token_hash, token_prefix, kind, capabilities)
         VALUES (?, 'gate-test', 'x', 'vaenyx_app_gate...', 'relay', ?)`,
      )
      .run(relayProfileId, JSON.stringify(["vision", "reading"]));
    const call = {
      task: "quote-analysis",
      prompt: "What is in this picture?",
      engine: "claude-cli" as const,
      capability: "vision" as const,
      files: [{ name: "a.png", url: "https://evil.example.net/a.png" }],
      appProfileId: relayProfileId,
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

  it("does not require a relay key capability list", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-capgate-relaykey-"));
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
      fileHosts: ["files.example.com"],
    });
    database.sqlite
      .prepare(
        "INSERT INTO app_profiles (id, name, token_hash, token_prefix) VALUES (?, ?, ?, ?)",
      )
      .run("key-door", "Quote app", "hash-door", "vaenyx_app_");

    // Relay v2 has no per-key capability list. Vision is ON for the whole
    // machine, so an empty legacy list gets past authorization to the host
    // allowlist without another grant.
    const call = {
      task: "quote-analysis",
      prompt: "What is in this picture?",
      engine: "claude-cli" as const,
      capability: "vision" as const,
      caller: "owner@example.com",
      files: [{ name: "a.png", url: "https://evil.example.net/a.png" }],
      appProfileId: "key-door",
    };
    await expect(runRelay(database, directory, call)).rejects.toThrow(
      "RELAY_HOST_NOT_ALLOWED",
    );
  });
});
