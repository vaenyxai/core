// A CORRECTION THAT HAS BEEN KEPT IS NOT WAITING FOR ANYBODY.
//
// Until adopted_at existed (0064), keeping one wrote an example and stopped:
// the tick beside it lived in the browser's memory and was gone on the next
// reload. So the same correction could be kept twice — quietly adding the same
// example again and weighting the few-shot towards one case — and "how many
// are waiting for you" had no honest answer to put on the Methods tab.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  countPendingCorrections,
  listAdoptableFeedback,
  markFeedbackAdopted,
  recordMethodFeedback,
} from "../src/modules/core/method-feedback.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-pending-test-"));
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

function correction(database: DatabaseHandle, methodId: string): string {
  return recordMethodFeedback(database, {
    methodId,
    appProfileId: "app-1",
    appProfileName: "Site Flow",
    version: "1.0.0",
    contentHash: "hash",
    versionMatched: true,
    reaction: "edited",
    input: { area: 10 },
    aiOutput: { total: 1 },
    correctedOutput: { total: 2 },
    outputValid: true,
    note: null,
    occurredAt: null,
  }).id;
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

describe("what is still waiting for the Owner", () => {
  it("counts the corrections nobody has looked at yet, per Method", () => {
    const database = testDatabase();
    correction(database, "takeoff");
    correction(database, "takeoff");
    correction(database, "quote");
    expect(countPendingCorrections(database)).toEqual(
      expect.arrayContaining([
        { methodId: "takeoff", count: 2 },
        { methodId: "quote", count: 1 },
      ]),
    );
  });

  it("🔴 a kept correction stops being offered, and stops being counted", () => {
    // Without this the same correction comes back on every reload and can be
    // kept again, adding the same example twice.
    const database = testDatabase();
    const id = correction(database, "takeoff");
    markFeedbackAdopted(database, id, "2026-08-09T00:00:00.000Z");
    expect(listAdoptableFeedback(database, "takeoff")).toEqual([]);
    expect(countPendingCorrections(database)).toEqual([]);
  });

  it("keeping one does not take the others off the list", () => {
    const database = testDatabase();
    const first = correction(database, "takeoff");
    correction(database, "takeoff");
    markFeedbackAdopted(database, first, "2026-08-09T00:00:00.000Z");
    expect(countPendingCorrections(database)).toEqual([
      { methodId: "takeoff", count: 1 },
    ]);
  });

  it("says nothing is waiting when nothing is", () => {
    expect(countPendingCorrections(testDatabase())).toEqual([]);
  });
});
