// The install ledger and the update decisions that read it. Each test holds a
// rule whose absence loses somebody's work quietly.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import type { DatabaseHandle } from "../src/db/database.js";
import { isNewerVersion, recommendedAction } from "../src/modules/core/community-updates.js";
import {
  availableRollback,
  getInstalledItem,
  keepRollback,
  recordInstall,
  restoreRollback,
  setUpdatePolicy,
  snapshotFolder,
  wantsUpdateOffer,
} from "../src/modules/core/install-ledger.js";

let database: DatabaseHandle;
const temporaries: string[] = [];

function freshDatabase(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE installed_items (
      id TEXT NOT NULL,
      kind TEXT NOT NULL,
      installed_version TEXT NOT NULL,
      installed_hash TEXT,
      installed_at TEXT NOT NULL,
      source_url TEXT,
      publisher TEXT,
      update_policy TEXT NOT NULL DEFAULT 'follow',
      skipped_version TEXT,
      PRIMARY KEY (id, kind)
    );
    CREATE TABLE item_rollbacks (
      id TEXT NOT NULL,
      kind TEXT NOT NULL,
      version TEXT NOT NULL,
      files TEXT NOT NULL,
      replaced_at TEXT NOT NULL,
      PRIMARY KEY (id, kind)
    );
  `);
  return { close: () => sqlite.close(), ping: () => true, sqlite };
}

function scratchFolder(): string {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-ledger-"));
  temporaries.push(root);
  return root;
}

beforeEach(() => {
  database = freshDatabase();
  while (temporaries.length) {
    rmSync(temporaries.pop() as string, { force: true, recursive: true });
  }
});

describe("what was installed", () => {
  it("records the version that ARRIVED, not the one the files claim later", () => {
    // 🔴 The distinction the whole feature rests on. Read the version out of
    // the files and you are reading a number the Owner may have edited — then
    // an update gets offered against their own edit rather than against what
    // the author actually shipped.
    recordInstall(database, {
      id: "estimating-drawing-takeoff",
      kind: "method",
      version: "1.2.0",
      hash: "hash-at-arrival",
    });
    const item = getInstalledItem(database, "estimating-drawing-takeoff", "method");
    expect(item?.installedVersion).toBe("1.2.0");
    expect(item?.installedHash).toBe("hash-at-arrival");
    expect(item?.updatePolicy).toBe("follow");
  });
});

describe("how the Owner wants to be treated", () => {
  it("offers an update by default", () => {
    recordInstall(database, { id: "m", kind: "method", version: "1.0.0" });
    expect(wantsUpdateOffer(getInstalledItem(database, "m", "method"), "1.1.0")).toBe(true);
  });

  it("says nothing at all about a locked item", () => {
    recordInstall(database, { id: "m", kind: "method", version: "1.0.0" });
    setUpdatePolicy(database, "m", "method", "locked");
    expect(wantsUpdateOffer(getInstalledItem(database, "m", "method"), "9.9.9")).toBe(false);
  });

  it("skips one version, not the item", () => {
    // "Not this one" is a different sentence from "stop asking me".
    recordInstall(database, { id: "m", kind: "method", version: "1.0.0" });
    setUpdatePolicy(database, "m", "method", "skipped", "1.1.0");
    const item = getInstalledItem(database, "m", "method");
    expect(wantsUpdateOffer(item, "1.1.0")).toBe(false);
    expect(wantsUpdateOffer(item, "1.2.0")).toBe(true);
  });
});

describe("comparing versions", () => {
  it("orders normal releases", () => {
    expect(isNewerVersion("1.4.0", "1.2.0")).toBe(true);
    expect(isNewerVersion("1.2.0", "1.4.0")).toBe(false);
    expect(isNewerVersion("1.2.0", "1.2.0")).toBe(false);
    expect(isNewerVersion("2.0.0", "1.99.99")).toBe(true);
  });

  it("does not treat a strange version string as newer than everything", () => {
    // Community versions are author-supplied text. A nonsense one must not
    // become an update prompt for every household that installed the item.
    expect(isNewerVersion("banana", "1.2.0")).toBe(false);
    expect(isNewerVersion("", "1.2.0")).toBe(false);
    expect(isNewerVersion("v1.4.0", "1.2.0")).toBe(true);
  });
});

describe("the way back", () => {
  it("keeps the outgoing version and restores it without a network", () => {
    const folder = scratchFolder();
    writeFileSync(join(folder, "recipe.md"), "the old recipe", "utf8");
    writeFileSync(join(folder, "method.json"), '{"version":"1.2.0"}', "utf8");
    mkdirSync(join(folder, "examples"), { recursive: true });
    writeFileSync(join(folder, "examples", "0001.json"), '{"mine":true}', "utf8");

    recordInstall(database, { id: "m", kind: "method", version: "1.2.0" });
    keepRollback(database, { folder, id: "m", kind: "method", version: "1.2.0" });
    expect(availableRollback(database, "m", "method")?.version).toBe("1.2.0");

    // The update lands.
    writeFileSync(join(folder, "recipe.md"), "the new recipe", "utf8");
    writeFileSync(join(folder, "method.json"), '{"version":"1.4.0"}', "utf8");

    expect(restoreRollback(database, "m", "method", folder)).toBe(true);
    expect(readFileSync(join(folder, "recipe.md"), "utf8")).toBe("the old recipe");
    // 🔴 And the Owner's own examples were never the author's to replace.
    expect(readFileSync(join(folder, "examples", "0001.json"), "utf8")).toBe(
      '{"mine":true}',
    );
    expect(getInstalledItem(database, "m", "method")?.installedVersion).toBe("1.2.0");
  });

  it("leaves the examples out of the snapshot", () => {
    const folder = scratchFolder();
    writeFileSync(join(folder, "recipe.md"), "recipe", "utf8");
    mkdirSync(join(folder, "examples"), { recursive: true });
    writeFileSync(join(folder, "examples", "0001.json"), "{}", "utf8");
    const files = snapshotFolder(folder);
    expect(Object.keys(files)).toEqual(["recipe.md"]);
  });

  it("says plainly when there is nothing to go back to", () => {
    expect(restoreRollback(database, "never-installed", "method", scratchFolder())).toBe(
      false,
    );
  });
});

describe("what the dialog should suggest", () => {
  it("recommends keeping both when the Owner has edited it", () => {
    // Once somebody has changed a recipe, they and the author have diverged.
    // Merging by force makes them re-make the same decision at every release.
    expect(
      recommendedAction({
        currentVersion: "1.2.0",
        examplesKept: 12,
        keysNeedingReapproval: [],
        locallyEdited: true,
        newVersion: "1.4.0",
        rollbackAvailable: false,
      }),
    ).toBe("keep-both");
  });

  it("recommends updating an untouched one", () => {
    expect(
      recommendedAction({
        currentVersion: "1.2.0",
        examplesKept: 0,
        keysNeedingReapproval: [],
        locallyEdited: false,
        newVersion: "1.4.0",
        rollbackAvailable: false,
      }),
    ).toBe("update");
  });
});
