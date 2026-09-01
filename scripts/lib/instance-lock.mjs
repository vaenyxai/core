import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

const LOCKED_MESSAGE =
  "Vaenyx is already running or updating. Close the other Vaenyx window and try again.";

function readOwner(lockPath) {
  try {
    const value = JSON.parse(readFileSync(lockPath, "utf8"));
    return value?.version === 1 &&
      Number.isInteger(value.pid) &&
      typeof value.role === "string" &&
      typeof value.token === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}

function processIsAlive(pid) {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

export function assertInstanceLock(lockPath) {
  const token = process.env.VAENYX_INSTANCE_LOCK_TOKEN;
  const owner = readOwner(lockPath);
  if (!token || owner?.token !== token || !processIsAlive(owner.pid)) {
    throw new Error(
      "Vaenyx could not verify its safety lock. Restart Vaenyx and try again.",
    );
  }
}

export function acquireInstanceLock(lockPath, role) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const delegatedToken = process.env.VAENYX_INSTANCE_LOCK_TOKEN;
  const currentOwner = readOwner(lockPath);
  if (
    delegatedToken &&
    currentOwner?.token === delegatedToken &&
    processIsAlive(currentOwner.pid)
  ) {
    return { delegated: true, release() {}, token: delegatedToken };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const token = randomUUID();
    let descriptor = null;
    try {
      descriptor = openSync(lockPath, "wx", 0o600);
      writeFileSync(
        descriptor,
        `${JSON.stringify({
          createdAt: new Date().toISOString(),
          pid: process.pid,
          role,
          token,
          version: 1,
        })}\n`,
        "utf8",
      );
      closeSync(descriptor);
      descriptor = null;
      let released = false;
      return {
        delegated: false,
        token,
        release() {
          if (released) return;
          released = true;
          if (readOwner(lockPath)?.token === token) {
            rmSync(lockPath, { force: true });
          }
        },
      };
    } catch (error) {
      if (descriptor !== null) closeSync(descriptor);
      if (error?.code !== "EEXIST") throw error;
      const owner = readOwner(lockPath);
      if (owner && processIsAlive(owner.pid)) {
        throw new Error(LOCKED_MESSAGE, { cause: error });
      }

      const stalePath = `${lockPath}.stale-${process.pid}-${randomUUID()}`;
      try {
        renameSync(lockPath, stalePath);
        rmSync(stalePath, { force: true });
      } catch {
        if (existsSync(lockPath)) continue;
      }
    }
  }
  throw new Error(LOCKED_MESSAGE);
}
