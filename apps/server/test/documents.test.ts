// Document Reading + the M1 cost gate. The gate protects the Owner's own
// money, so its two load-bearing facts are tested, not assumed: the page count
// is REAL (the copy interpolates it), and a gated document cannot be read
// without the Owner's answer even if the client skips the screen.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import {
  DOCUMENT_GATE_PAGES,
  inspectDocument,
} from "../src/modules/core/documents.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createTestConfig(): AppConfig {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-doc-test-"));
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

// A minimal, valid multi-page PDF built by hand — no fixture file, no
// dependency, and the page count is whatever this asks for.
function makePdf(pageCount: number): Buffer {
  const kids: string[] = [];
  const objects: string[] = [];
  let next = 3;
  for (let index = 0; index < pageCount; index += 1) {
    const pageId = next;
    const contentId = next + 1;
    next += 2;
    kids.push(`${pageId} 0 R`);
    objects.push(
      `${pageId} 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents ${contentId} 0 R/Resources<</Font<</F1 999 0 R>>>>>>endobj`,
    );
    const stream = `BT /F1 12 Tf 20 100 Td (PAGE ${index + 1}) Tj ET`;
    objects.push(
      `${contentId} 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj`,
    );
  }
  const body = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    `2 0 obj<</Type/Pages/Kids[${kids.join(" ")}]/Count ${pageCount}>>endobj`,
    ...objects,
    "999 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    "trailer<</Root 1 0 R>>",
  ].join("\n");
  return Buffer.from(body, "latin1");
}

// Reading is one of the seven capability switches, enforced at the upload
// route (capability-gate.test.ts owns that half). It ships ON, but these tests
// set it anyway rather than lean on a default: what they are about is the page
// count and the cost gate, and they should not start failing the day somebody
// changes their mind about the shipped value.
async function switchReadingOn(
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
): Promise<void> {
  const response = await app.inject({
    method: "PUT",
    url: "/v1/capabilities",
    headers: { cookie },
    payload: { reading: true },
  });
  expect(response.statusCode).toBe(200);
}

describe("document reading", () => {
  it("reports the file's real page count", async () => {
    const facts = await inspectDocument(makePdf(12));
    expect(facts.pages).toBe(12);
  });

  it("flags the cost gate only at or above the threshold", async () => {
    const app = await buildApp(createTestConfig());
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Oskar", password: "private-password" },
    });
    const cookie = String(setup.headers["set-cookie"]);
    await switchReadingOn(app, cookie);

    const small = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "receipt.pdf",
      },
      payload: makePdf(2),
    });
    expect(small.statusCode).toBe(200);
    expect(small.json()).toMatchObject({ pages: 2, needsCostGate: false });

    const big = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: {
        cookie,
        "content-type": "application/pdf",
        "x-document-name": "drawings.pdf",
      },
      payload: makePdf(DOCUMENT_GATE_PAGES + 2),
    });
    expect(big.statusCode).toBe(200);
    expect(big.json()).toMatchObject({
      pages: DOCUMENT_GATE_PAGES + 2,
      needsCostGate: true,
    });

    await app.close();
  });

  it("refuses a file that is not a readable PDF, in words", async () => {
    const app = await buildApp(createTestConfig());
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Oskar", password: "private-password" },
    });
    const cookie = String(setup.headers["set-cookie"]);
    await switchReadingOn(app, cookie);

    const junk = await app.inject({
      method: "POST",
      url: "/v1/documents/upload",
      headers: { cookie, "content-type": "application/pdf" },
      payload: Buffer.from("this is not a pdf at all", "utf8"),
    });
    expect(junk.statusCode).toBe(400);
    expect(String(junk.json().error)).toContain("PDF");

    await app.close();
  });
});
