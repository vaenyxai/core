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
  readMethodManifest,
  undeclaredCapabilityMessage,
} from "../src/modules/core/capabilities.js";

const directories: string[] = [];

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

  it("names the capability when one was reached for but never declared", () => {
    expect(undeclaredCapabilityMessage("web")).toContain("use the web");
    expect(undeclaredCapabilityMessage("web")).toContain("never declared");
  });
});
