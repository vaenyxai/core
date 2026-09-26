// H-006 · update network budget. A stalled update server must fail quickly
// with the plain safe message; a slow download that keeps moving must finish;
// an aborted download must leave no partial file behind.
import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { checkForUpdate, downloadTo } from "../src/modules/core/updates.js";

const directories: string[] = [];
const servers: Server[] = [];

function tempDirectory(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-update-net-"));
  directories.push(directory);
  return directory;
}

async function listen(
  handler: Parameters<typeof createServer>[1],
): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolveListen) =>
    server.listen(0, "127.0.0.1", () => resolveListen()),
  );
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => {
  delete process.env.VAENYX_UPDATE_API;
  delete process.env.VAENYX_UPDATE_CHECK_TIMEOUT_MS;
  delete process.env.VAENYX_UPDATE_STALL_MS;
});

afterAll(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }
  for (const directory of directories) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("update network budget", () => {
  it("fails a stalled release check within its budget, with the plain safe message", async () => {
    // Accepts the connection and never answers.
    const base = await listen(() => undefined);
    process.env.VAENYX_UPDATE_API = `${base}/releases/latest`;
    process.env.VAENYX_UPDATE_CHECK_TIMEOUT_MS = "400";

    const started = Date.now();
    const status = await checkForUpdate("0.4.13.0", tempDirectory());
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(5_000);
    expect(status.phase).toBe("error");
    expect(status.detail ?? "").toContain("VX-UPDATE-NETWORK");
    expect(status.detail ?? "").toMatch(/update server|更新服务器/);
    // Nothing raw leaks into the Owner-facing text.
    expect(status.detail ?? "").not.toMatch(/127\.0\.0\.1|AbortError|TimeoutError|fetch failed/);
  });

  it("finishes a slow download that keeps making progress", async () => {
    const base = await listen((_request, response) => {
      response.writeHead(200, { "content-type": "application/octet-stream" });
      let sent = 0;
      const tick = setInterval(() => {
        response.write("x".repeat(64));
        sent += 1;
        if (sent === 8) {
          clearInterval(tick);
          response.end();
        }
      }, 150);
    });
    process.env.VAENYX_UPDATE_STALL_MS = "500";
    const target = join(tempDirectory(), "vaenyx-setup.zip");

    // 8 chunks × 150 ms ≈ 1.2 s in total — longer than the 500 ms stall
    // budget, but never silent for that long.
    await downloadTo(`${base}/slow.zip`, target);
    expect(readFileSync(target, "utf8")).toHaveLength(8 * 64);
    expect(existsSync(`${target}.part`)).toBe(false);
  });

  it("aborts a stalled download and leaves no blocking partial file", async () => {
    const base = await listen((_request, response) => {
      response.writeHead(200, { "content-type": "application/octet-stream" });
      response.write("x".repeat(128));
      // …and then nothing more, ever.
    });
    process.env.VAENYX_UPDATE_STALL_MS = "300";
    const target = join(tempDirectory(), "vaenyx-setup.zip");

    const started = Date.now();
    await expect(downloadTo(`${base}/stalled.zip`, target)).rejects.toThrow(
      "UPDATE_NETWORK_STALLED",
    );
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(existsSync(`${target}.part`)).toBe(false);
    expect(existsSync(target)).toBe(false);
  });
});
