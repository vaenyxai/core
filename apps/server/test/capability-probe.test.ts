// THE ROW'S OWN TEST, tested. A Test button is only worth having if it cannot
// go green for the wrong reason, so what is checked here is mostly the ways it
// could lie: a fixture that is not really a picture or a PDF, a pass awarded
// for an answer that does not match, a switch that is off and a probe that
// performs the thing anyway, and "not built" painted as a failure.
//
// Every probe below runs with a STUB main model, so nothing here touches a
// network, a key or the Owner's account.
import { inflateSync } from "node:zlib";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  namesRed,
  pictureSize,
  probePdf,
  redSquarePng,
  runCapabilityProbe,
} from "../src/modules/core/capability-probe.js";
import { writeGlobalCapabilities } from "../src/modules/core/capabilities.js";
import {
  extractDocumentText,
  inspectDocument,
} from "../src/modules/core/documents.js";
import { writeFetchFolders } from "../src/modules/core/fetching.js";
import type { ModelProvider } from "../src/modules/models/provider.js";

const temporaryDirectories: string[] = [];
const databases: DatabaseHandle[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.sqlite.close();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(resolve(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = temporaryDirectory("vaenyx-probe-db-");
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

/** A main model that answers exactly what the test wants it to, so a probe's
 *  own judgement is what is under test rather than somebody's live account. */
function stubProvider(
  id: string,
  answer: (prompt: string) => { answer: string; webSearchUsed?: boolean },
): ModelProvider {
  return {
    id,
    name: `Stub ${id}`,
    healthCheck: () => ({ ok: true, detail: "stub" }),
    sendChat: async (messages) => {
      const said = answer(messages.at(-1)?.content ?? "");
      return { answer: said.answer, webSearchUsed: said.webSearchUsed ?? false };
    },
  };
}

function probeContext(
  database: DatabaseHandle,
  provider: ModelProvider | null,
  lang: "en" | "zh" = "en",
) {
  return {
    database,
    dataDirectory: temporaryDirectory("vaenyx-probe-data-"),
    secretsDirectory: temporaryDirectory("vaenyx-probe-secrets-"),
    lang,
    owner: { id: "owner-1", name: "Oskar" },
    provider,
  };
}

describe("the fixtures carry an answer we already know", () => {
  it("builds a real PNG with a red square in the middle of white", () => {
    const png = redSquarePng(64);
    expect(pictureSize(png)).toEqual({ width: 64, height: 64 });

    // Unpack it the way a decoder would: the raster is the part a stride or a
    // filter-byte mistake would quietly corrupt, and a corrupted picture would
    // fail a working vision model.
    const start = png.indexOf(Buffer.from("IDAT", "ascii")) + 4;
    const length = png.readUInt32BE(start - 8);
    const raw = inflateSync(png.subarray(start, start + length));
    const stride = 64 * 3 + 1;
    const pixel = (x: number, y: number) => [
      raw[y * stride + 1 + x * 3],
      raw[y * stride + 2 + x * 3],
      raw[y * stride + 3 + x * 3],
    ];
    expect(raw[0]).toBe(0); // per-scanline filter: none
    expect(pixel(32, 32)).toEqual([255, 0, 0]); // the square
    expect(pixel(2, 2)).toEqual([255, 255, 255]); // the field around it
  });

  it("builds a one-page PDF whose code really reads back out", async () => {
    const pdf = probePdf("VAENYX-ABC123");
    expect((await inspectDocument(pdf)).pages).toBe(1);
    expect(await extractDocumentText(pdf)).toContain("VAENYX-ABC123");
  });

  it("only counts a colour the engine really named", () => {
    expect(namesRed("red")).toBe(true);
    expect(namesRed("The square is crimson.")).toBe(true);
    expect(namesRed("红色")).toBe(true);
    // The near-misses that would hand a green tick to an engine which said it
    // could not see anything.
    expect(namesRed("The image is blurred.")).toBe(false);
    expect(namesRed("A hundred small shapes.")).toBe(false);
    expect(namesRed("I cannot see a square.")).toBe(false);
  });

  it("refuses to call a lump of bytes a picture", () => {
    expect(pictureSize(Buffer.from("not a picture at all"))).toBeNull();
    // A JPEG's size lives in a frame header at no fixed offset — the walk has
    // to find it, or a working engine would be reported as broken.
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]),
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x00, 0x03, 0x00]),
    ]);
    expect(pictureSize(jpeg)).toEqual({ width: 768, height: 512 });
  });
});

describe("reading", () => {
  it("passes only when the model gives back the code that is really printed", async () => {
    const database = createTestDatabase();
    const seen: string[] = [];
    const claude = stubProvider("claude-sub", (prompt) => {
      seen.push(prompt);
      // The code is in the document, not in the prompt, so a stub can only
      // answer it if the probe really handed the file over.
      return { answer: "VAENYX-WRONG1" };
    });
    const failed = await runCapabilityProbe(
      "reading",
      probeContext(database, claude),
    );
    expect(failed.status).toBe("failed");
    expect(failed.detail).toContain("but the test document says VAENYX-");
    expect(seen).toHaveLength(1);
  });

  it("names the local text path when the main model cannot read a PDF", async () => {
    const database = createTestDatabase();
    const gemini = stubProvider("gemini", () => ({ answer: "never asked" }));
    const result = await runCapabilityProbe(
      "reading",
      probeContext(database, gemini),
    );
    expect(result.status).toBe("ok");
    // The two halves of the fork must never be reported as one thing: this
    // machine read the PDF, and the model was only handed words. The three
    // parts the standing sentence exists to carry (copy pack N4) are asserted
    // one by one rather than as a phrase, so a rewording cannot pass while a
    // missing half quietly does not.
    expect(result.engine).toBe("This machine (pdf.js)");
    expect(result.detail).toContain("Stub gemini");
    expect(result.detail).toContain("this machine (pdf.js) did it instead");
    expect(result.detail).toContain(
      "drawings, tables and layout do not reach the model",
    );
  });
});

describe("web", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("is not built for a backend that cannot search, and says so", async () => {
    const database = createTestDatabase();
    const gemini = stubProvider("gemini", () => ({
      answer: today,
      webSearchUsed: true,
    }));
    const result = await runCapabilityProbe(
      "web",
      probeContext(database, gemini),
    );
    // 🔴 Never "failed": nobody wrote this path, so a red cross would send the
    // Owner hunting for a fault that does not exist.
    expect(result.status).toBe("not-implemented");
    expect(result.engine).toBe("Stub gemini");
  });

  it("fails a backend that answered without ever searching", async () => {
    const database = createTestDatabase();
    const codex = stubProvider("codex", () => ({
      answer: today,
      webSearchUsed: false,
    }));
    const result = await runCapabilityProbe(
      "web",
      probeContext(database, codex),
    );
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("without ever searching");
  });

  it("fails a search that came back with the wrong day", async () => {
    const database = createTestDatabase();
    const codex = stubProvider("codex", () => ({
      answer: "1999-12-31",
      webSearchUsed: true,
    }));
    const result = await runCapabilityProbe(
      "web",
      probeContext(database, codex),
    );
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("really did search");
  });

  it("turns a bare internal code into something a household can act on", async () => {
    const database = createTestDatabase();
    const broken: ModelProvider = {
      id: "codex",
      name: "Codex CLI (ChatGPT)",
      healthCheck: () => ({ ok: false, detail: "missing" }),
      sendChat: async () => {
        throw new Error("CODEX_NOT_INSTALLED");
      },
    };
    const result = await runCapabilityProbe(
      "web",
      probeContext(database, broken),
    );
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("not installed on this machine");
    expect(result.detail).not.toContain("CODEX_NOT_INSTALLED");
  });

  it("passes only when the search ran AND the date is right", async () => {
    const database = createTestDatabase();
    const codex = stubProvider("codex", () => ({
      answer: `Today is ${today}.`,
      webSearchUsed: true,
    }));
    const result = await runCapabilityProbe(
      "web",
      probeContext(database, codex),
    );
    expect(result.status).toBe("ok");
    expect(result.detail).toContain(today);
  });
});

describe("fetching", () => {
  // It used to answer "not built" here, which was true of an older design where
  // one backend's own file tool did the opening. Vaenyx opens the file now, so
  // the backend has no part in it — and a Test that named one was contradicting
  // the row's own drawer, its tooltip and both manuals.
  it("opens the file whichever main model is set, and with none set at all", async () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-probe-any-backend-");
    writeFileSync(join(home, "notes.txt"), "the secret is 42\n", "utf8");
    writeGlobalCapabilities(database, { fetching: true });
    writeFetchFolders(database, [home], []);

    const onCodex = await runCapabilityProbe(
      "fetching",
      probeContext(database, stubProvider("codex", () => ({ answer: "" }))),
    );
    expect(onCodex.status).toBe("ok");
    expect(onCodex.detail).toContain("notes.txt");

    // No main model either: nothing here asks one anything, so a missing model
    // would have failed a test that was going to pass.
    const withNoModel = await runCapabilityProbe(
      "fetching",
      probeContext(database, null),
    );
    expect(withNoModel.status).toBe("ok");
  });

  it("fails while no folder has been named", async () => {
    const database = createTestDatabase();
    writeGlobalCapabilities(database, { fetching: true });
    const result = await runCapabilityProbe(
      "fetching",
      probeContext(database, stubProvider("claude-sub", () => ({ answer: "" }))),
    );
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("No folder has been named yet");
  });

  it("really opens a file through the gate, and never names its contents", async () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-probe-home-");
    writeFileSync(join(home, "notes.txt"), "the secret is 42\n", "utf8");
    writeGlobalCapabilities(database, { fetching: true });
    writeFetchFolders(database, [home], []);

    const result = await runCapabilityProbe(
      "fetching",
      probeContext(database, stubProvider("claude-sub", () => ({ answer: "" }))),
    );
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("notes.txt");
    expect(result.detail).not.toContain("42");

    // The open really went through the gate, which means it was written down.
    const audit = database.sqlite
      .prepare("SELECT action FROM audit_events WHERE action LIKE 'fetching.%'")
      .all() as { action: string }[];
    expect(audit.map((row) => row.action)).toContain("fetching.open");
  });

  it("fails honestly when the named folder holds nothing it can open", async () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-probe-binary-");
    writeFileSync(join(home, "photo.dat"), Buffer.from([0x00, 0x01, 0x02]));
    writeGlobalCapabilities(database, { fetching: true });
    writeFetchFolders(database, [home], []);
    const result = await runCapabilityProbe(
      "fetching",
      probeContext(database, stubProvider("claude-sub", () => ({ answer: "" }))),
    );
    expect(result.status).toBe("failed");
    expect(result.detail).toContain("could not open any of the first 1");
    // The gate's own reason travels with it, or the Owner is told a folder
    // full of photos is a broken feature.
    expect(result.detail).toContain("not text");
  });
});

describe("vision and drawing without an engine", () => {
  it("asks for a key rather than blaming a model that is not there", async () => {
    const database = createTestDatabase();
    const context = probeContext(database, null);
    for (const capability of ["vision", "drawing"] as const) {
      const result = await runCapabilityProbe(capability, context);
      expect(result.status).toBe("failed");
      expect(result.engine).toBe("");
      expect(result.detail).toContain("add");
    }
  });
});

describe("the two that cannot be tested by machine", () => {
  it("say why instead of failing", async () => {
    const database = createTestDatabase();
    const context = probeContext(database, null);
    const hearing = await runCapabilityProbe("hearing", context);
    expect(hearing.status).toBe("not-implemented");
    expect(hearing.detail).toContain("microphone");
    const speaking = await runCapabilityProbe("speaking", context);
    expect(speaking.status).toBe("not-implemented");
    expect(speaking.detail).toContain("by ear");
  });
});

// ── The route ────────────────────────────────────────────────────────────────

function createTestConfig(): AppConfig {
  const dataDirectory = temporaryDirectory("vaenyx-probe-route-");
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

describe("POST /v1/capability-test/:capability", () => {
  it("refuses in the Owner's own language while the switch is off", async () => {
    const { app, cookie } = await startWithOwner();
    try {
      // Vision ships ON, so it has to be switched off to be refused — which is
      // also the proof that the probe reads the live switch and not a default.
      await app.inject({
        method: "PUT",
        url: "/v1/capabilities",
        headers: { cookie },
        payload: { vision: false },
      });
      const english = await app.inject({
        method: "POST",
        url: "/v1/capability-test/vision",
        headers: { cookie },
      });
      expect(english.statusCode).toBe(200);
      expect(english.json()).toEqual({
        status: "failed",
        engine: "",
        detail: expect.stringContaining("switched off") as unknown as string,
      });
      const chinese = await app.inject({
        method: "POST",
        url: "/v1/capability-test/vision?lang=zh",
        headers: { cookie },
      });
      expect(chinese.json().detail).toContain("关掉");
    } finally {
      await app.close();
    }
  });

  it("needs the Owner, and refuses a word that is not a capability", async () => {
    const { app, cookie } = await startWithOwner();
    try {
      const anonymous = await app.inject({
        method: "POST",
        url: "/v1/capability-test/vision",
      });
      expect(anonymous.statusCode).toBe(401);
      const nonsense = await app.inject({
        method: "POST",
        url: "/v1/capability-test/telepathy",
        headers: { cookie },
      });
      expect(nonsense.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("writes down every test, whichever way it went", async () => {
    const { app, cookie } = await startWithOwner();
    try {
      // Vision ships on and nothing is connected in a fresh instance, so this
      // reaches the probe and fails honestly — the outcome the Guard page has
      // to be able to answer for weeks later.
      const pressed = await app.inject({
        method: "POST",
        url: "/v1/capability-test/vision",
        headers: { cookie },
      });
      expect(pressed.json().status).toBe("failed");
      const events = await app.inject({
        method: "GET",
        url: "/v1/guard/audit",
        headers: { cookie },
      });
      const actions = (events.json() as { action: string }[]).map(
        (event) => event.action,
      );
      expect(actions).toContain("capability.test");

      // A press that never got past the switch is written down too — under the
      // name of what actually happened, which is a refusal, not a test.
      await app.inject({
        method: "POST",
        url: "/v1/capability-test/fetching",
        headers: { cookie },
      });
      const after = await app.inject({
        method: "GET",
        url: "/v1/guard/audit",
        headers: { cookie },
      });
      expect(
        (after.json() as { action: string }[]).map((event) => event.action),
      ).toContain("capability.refused");
    } finally {
      await app.close();
    }
  });
});
