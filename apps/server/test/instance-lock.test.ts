import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { acquireInstanceLock } from "../src/runtime/instance-lock.js";

const temporaryDirectories: string[] = [];

function lockPath(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-lock-"));
  temporaryDirectories.push(directory);
  return resolve(directory, "instance.lock.json");
}

afterEach(() => {
  delete process.env.VAENYX_INSTANCE_LOCK_TOKEN;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("instance lock", () => {
  it("rejects a second owner while the first process is alive", () => {
    const path = lockPath();
    const first = acquireInstanceLock(path, "first");
    expect(() => acquireInstanceLock(path, "second")).toThrow(
      /already running or updating/,
    );
    first.release();
  });

  it("recovers a stale owner record", () => {
    const path = lockPath();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        pid: 2_147_483_647,
        role: "stale",
        token: "old",
        createdAt: "2000-01-01T00:00:00.000Z",
      }),
    );
    const lock = acquireInstanceLock(path, "replacement");
    expect(lock.delegated).toBe(false);
    lock.release();
  });

  it("allows only the owning process to delegate its lock", () => {
    const path = lockPath();
    const owner = acquireInstanceLock(path, "updater");
    process.env.VAENYX_INSTANCE_LOCK_TOKEN = owner.token;
    const child = acquireInstanceLock(path, "candidate");
    expect(child.delegated).toBe(true);
    child.release();
    owner.release();
  });
});
