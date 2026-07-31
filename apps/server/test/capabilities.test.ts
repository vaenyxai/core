// The capability vocabulary and the manifest reader. The rule that earns its
// own test is the one that reads backwards: an unknown name in a manifest
// REFUSES the run, where the same unknown name in routine.json is silently
// dropped. Dropping it here would let an old client run a Method without a
// capability it needed and look fine, which is the bug nobody ever finds.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CAPABILITIES,
  CAPABILITY_DEFAULT_ON,
  chargeToken,
  decideCapabilities,
  decideTokenCapabilities,
  readTokenSpend,
  tokenGrantable,
  listCapabilityWaiting,
  missingCapabilities,
  noticeArrivedCapabilities,
  readMethodManifest,
  recordCapabilityWanted,
  refusedCapabilityMessage,
  undeclaredCapabilityMessage,
  writeGlobalCapabilities,
} from "../src/modules/core/capabilities.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-capdb-test-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

function methodFolder(manifest: unknown | null): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-cap-test-"));
  directories.push(directory);
  if (manifest !== null) {
    writeFileSync(
      join(directory, "manifest.json"),
      typeof manifest === "string" ? manifest : JSON.stringify(manifest),
      "utf8",
    );
  }
  return directory;
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("capabilities", () => {
  it("is a closed vocabulary of seven", () => {
    expect([...CAPABILITIES]).toEqual([
      "vision",
      "documents",
      "voice-in",
      "voice-out",
      "draw",
      "web",
      "files",
    ]);
  });

  it("starts on for what the Owner triggers, off for what a Method decides", () => {
    // The line is drawn by who pulls the trigger, not by how dangerous it is.
    expect(CAPABILITY_DEFAULT_ON.vision).toBe(true);
    expect(CAPABILITY_DEFAULT_ON["voice-in"]).toBe(true);
    expect(CAPABILITY_DEFAULT_ON["voice-out"]).toBe(true);
    expect(CAPABILITY_DEFAULT_ON.web).toBe(false);
    expect(CAPABILITY_DEFAULT_ON.files).toBe(false);
    expect(CAPABILITY_DEFAULT_ON.documents).toBe(false);
    expect(CAPABILITY_DEFAULT_ON.draw).toBe(false);
  });

  it("reads a named list", () => {
    const directory = methodFolder({ capabilities: ["vision", "documents"] });
    expect(readMethodManifest(directory)).toEqual({
      capabilities: ["vision", "documents"],
      minimumVersion: null,
    });
  });

  it("REFUSES an unknown capability instead of dropping it", () => {
    const directory = methodFolder({ capabilities: ["vision", "telepathy"] });
    expect(() => readMethodManifest(directory)).toThrow(
      "MANIFEST_UNKNOWN_CAPABILITY:telepathy",
    );
  });

  it("migrates the two old booleans without touching the disk", () => {
    const old = methodFolder({
      permissions: { network: true, readFiles: false },
      learning: { enabled: false, captures: [] },
    });
    expect(readMethodManifest(old).capabilities).toEqual(["web"]);

    const both = methodFolder({
      permissions: { network: true, readFiles: true },
    });
    expect(readMethodManifest(both).capabilities).toEqual(["web", "files"]);

    // The shape every Method on disk carries today: both false, so nothing.
    const shipped = methodFolder({
      permissions: { network: false, readFiles: false },
      learning: { enabled: false, captures: [] },
    });
    expect(readMethodManifest(shipped).capabilities).toEqual([]);
  });

  it("treats a missing manifest as no capabilities, but an unreadable one as a refusal", () => {
    expect(readMethodManifest(methodFolder(null)).capabilities).toEqual([]);
    expect(() => readMethodManifest(methodFolder("{ not json"))).toThrow(
      "MANIFEST_UNREADABLE",
    );
  });

  it("lets a lower layer narrow, never widen", () => {
    const database = createTestDatabase();
    // Default: web is off globally. A Method declaring it is refused, and the
    // reason says which layer refused it.
    const shut = decideCapabilities(database, ["web", "vision"], null);
    expect(shut.allowed).toEqual(["vision"]);
    expect(shut.refused).toEqual([{ capability: "web", reason: "global" }]);

    writeGlobalCapabilities(database, { web: true });
    expect(decideCapabilities(database, ["web"], null).allowed).toEqual(["web"]);

    // A mode may take it away again...
    const modeId = "m1";
    database.sqlite
      .prepare("INSERT INTO modes (id, name, capabilities) VALUES (?, ?, ?)")
      .run(modeId, "Guest", JSON.stringify(["vision"]));
    const inMode = decideCapabilities(database, ["web", "vision"], modeId);
    expect(inMode.allowed).toEqual(["vision"]);
    expect(inMode.refused).toEqual([{ capability: "web", reason: "mode" }]);

    // ...but never give back what the ceiling denies.
    writeGlobalCapabilities(database, { web: false });
    database.sqlite
      .prepare("UPDATE modes SET capabilities = ? WHERE id = ?")
      .run(JSON.stringify(["web", "vision"]), modeId);
    const widened = decideCapabilities(database, ["web"], modeId);
    expect(widened.allowed).toEqual([]);
    expect(widened.refused).toEqual([{ capability: "web", reason: "global" }]);
  });

  it("records only what does not EXIST, and notices when it arrives", () => {
    const database = createTestDatabase();
    // `files` has a word and a chip and no implementation; `web` has all three.
    expect(missingCapabilities(["web", "files", "vision"])).toEqual(["files"]);

    recordCapabilityWanted(database, ["files", "web"]);
    recordCapabilityWanted(database, ["files"]);
    const waiting = listCapabilityWaiting(database);
    // `web` exists — wanting it is not waiting for anything to be built, and
    // counting it would poison the priority signal.
    expect(waiting.map((row) => row.capability)).toEqual(["files"]);
    expect(waiting[0]?.timesWanted).toBe(2);
    expect(waiting[0]?.arrived).toBe(false);

    // Nothing has arrived while the kernel still lacks it.
    expect(noticeArrivedCapabilities(database)).toEqual([]);
  });

  it("gives the two refusals two different sentences, and never says unsupported", () => {
    const off = refusedCapabilityMessage("files", "global");
    const mode = refusedCapabilityMessage("files", "mode");
    expect(off).toContain("switched off");
    expect(off).toContain("Settings");
    expect(mode).toContain("mode you are in");
    expect(off).not.toContain("unsupported");
    expect(mode).not.toContain("unsupported");
    expect(off).not.toBe(mode);
  });

  it("never lets a Token carry files, and only carries what it was granted", () => {
    const database = createTestDatabase();
    writeGlobalCapabilities(database, { web: true, files: true, vision: true });

    // Even with files switched on globally, declared by the Method AND ticked
    // on the token, it does not travel. This is a property of the code.
    expect(tokenGrantable(["vision", "files", "web"])).toEqual([
      "vision",
      "web",
    ]);
    const decided = decideTokenCapabilities(
      database,
      ["vision", "files", "web"],
      ["vision", "files", "web"],
    );
    expect(decided.allowed).not.toContain("files");
    expect(decided.allowed).toEqual(["vision", "web"]);

    // Declared but not granted to this token: not allowed.
    expect(
      decideTokenCapabilities(database, ["vision", "web"], ["vision"]).allowed,
    ).toEqual(["vision"]);
  });

  it("stops a Token at its ceiling before the work, not after the bill", () => {
    const database = createTestDatabase();
    database.sqlite
      .prepare(
        "INSERT INTO app_profiles (id, name, token_hash, token_prefix, spend_limit_cents) VALUES (?, ?, ?, ?, ?)",
      )
      .run("p1", "Estimating", "hash", "vaenyx_app_", 100);

    expect(chargeToken(database, "p1", 60).allowed).toBe(true);
    expect(readTokenSpend(database, "p1").spentCents).toBe(60);
    // 60 + 60 would pass the ceiling, so it is refused and nothing is charged.
    expect(chargeToken(database, "p1", 60).allowed).toBe(false);
    expect(readTokenSpend(database, "p1").spentCents).toBe(60);
    // Exactly on the ceiling is still allowed.
    expect(chargeToken(database, "p1", 40).allowed).toBe(true);
    expect(readTokenSpend(database, "p1").spentCents).toBe(100);
  });

  it("names the capability when one was reached for but never declared", () => {
    expect(undeclaredCapabilityMessage("web")).toContain("use the web");
    expect(undeclaredCapabilityMessage("web")).toContain("never declared");
  });
});
