import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { saveDocument } from "../src/modules/core/documents.js";
import { askVisionModel, saveImage } from "../src/modules/core/vision.js";
vi.mock("../src/modules/core/vision.js", async (original) => ({
  ...(await original<typeof import("../src/modules/core/vision.js")>()),
  askVisionModel: vi.fn(),
}));
const directories: string[] = [];
afterEach(() => {
  vi.clearAllMocks();
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
async function setup() {
  const dataDirectory = mkdtempSync(
    resolve(tmpdir(), "vaenyx-household-source-"),
  );
  directories.push(dataDirectory);
  const config = {
    corsOrigins: [],
    dataDirectory,
    databasePath: resolve(dataDirectory, "test.db"),
    backupsDirectory: resolve(dataDirectory, "backups"),
    repositoryRoot: resolve("../.."),
    host: "127.0.0.1",
    libraryDirectory: resolve("../../sample-library/methods"),
    routinesDirectory: resolve("../../sample-library/routines"),
    docsDirectory: resolve("../../docs"),
    logLevel: "silent",
    migrationsDirectory: resolve("migrations"),
    mode: "test",
    port: 0,
    version: "0.0.0-test",
    webDistDirectory: resolve(dataDirectory, "no-web"),
    secretsDirectory: resolve(dataDirectory, "secrets"),
    publish: null,
    googleOAuth: null,
    publishServiceUrl: null,
    catalogueBaseUrl: "https://example.invalid",
  } as unknown as AppConfig;
  const app = await buildApp(config);
  const response = await app.inject({
    method: "POST",
    url: "/v1/setup",
    payload: { name: "Test Owner", password: "Test-Only-Passphrase" },
  });
  const cookie = String(response.headers["set-cookie"]);
  return { app, cookie, config };
}
describe("household source routes", () => {
  it("requires Owner login, refuses traversal and reads a real stored text file", async () => {
    const { app, cookie, config } = await setup();
    try {
      const assetId = saveDocument(
        config.dataDirectory,
        Buffer.from("Picnic: 12 November 2026. Bring water."),
      );
      const request = {
        method: "POST" as const,
        url: "/v1/household/sources/read",
        payload: { assetId, kind: "document", language: "en" },
      };
      expect((await app.inject(request)).statusCode).toBe(401);
      const result = await app.inject({ ...request, headers: { cookie } });
      expect(result.statusCode).toBe(200);
      expect(result.json().text).toContain("12 November 2026");
      expect(
        (
          await app.inject({
            ...request,
            headers: { cookie },
            payload: { ...request.payload, assetId: "../secret.pdf" },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: "GET",
            url: `/v1/household/documents/${assetId}`,
          })
        ).statusCode,
      ).toBe(401);
      const file = await app.inject({
        method: "GET",
        url: `/v1/household/documents/${assetId}?name=notice.txt`,
        headers: { cookie },
      });
      expect(file.statusCode).toBe(200);
      expect(file.body).toContain("Bring water");
      expect(file.headers["cache-control"]).toBe("no-store");
      expect(file.headers["content-disposition"]).toContain("attachment");
      await app.inject({
        method: "PUT",
        url: "/v1/capabilities",
        headers: { cookie },
        payload: { reading: false },
      });
      expect(
        (await app.inject({ ...request, headers: { cookie } })).statusCode,
      ).toBe(403);
    } finally {
      await app.close();
    }
  });
  it("uses the shared selected Vision path and refuses it when switched off", async () => {
    const { app, cookie, config } = await setup();
    try {
      const assetId = saveImage(
        config.dataDirectory,
        Buffer.from("synthetic image"),
        "image/jpeg",
      );
      vi.mocked(askVisionModel).mockResolvedValue({
        value: {
          engine: "test",
          model: "chosen-model",
          text: JSON.stringify({
            text: "Model AB-001",
            annotations: [{ name: "Model", x: 30, y: 40 }],
          }),
        },
        note: { provider: "test", model: "chosen-model" },
      });
      const request = {
        method: "POST" as const,
        url: "/v1/household/sources/read",
        headers: { cookie },
        payload: { assetId, kind: "image", language: "en" },
      };
      const result = await app.inject(request);
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({
        text: "Model AB-001",
        annotations: [{ name: "Model", x: 30, y: 40 }],
      });
      expect(askVisionModel).toHaveBeenCalledTimes(1);
      await app.inject({
        method: "PUT",
        url: "/v1/capabilities",
        headers: { cookie },
        payload: { vision: false },
      });
      expect((await app.inject(request)).statusCode).toBe(403);
      expect(askVisionModel).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
  it("does not silently truncate long files", async () => {
    const { app, cookie, config } = await setup();
    try {
      const assetId = saveDocument(
        config.dataDirectory,
        Buffer.from("a".repeat(12001)),
      );
      const result = await app.inject({
        method: "POST",
        url: "/v1/household/sources/read",
        headers: { cookie },
        payload: { assetId, kind: "document", language: "en" },
      });
      expect(result.statusCode).toBe(400);
      expect(result.json().error).toContain("12,000");
    } finally {
      await app.close();
    }
  });
});
