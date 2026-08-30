// TWO KINDS SHARE ONE QUEUE, AND THE COLUMN THAT TELLS THEM APART HAS TO
// SURVIVE THE JOURNEY.
//
// Migration 0059 put fact proposals in vaenyx_me_candidates beside profile
// proposals and split them by proposed_slot. The list query never selected
// that column, so every fact arrived at the client looking like a profile
// trait and was approved as one: it became a Vaenyx Me item and never reached
// the facts table at all. Nothing failed — the contract marks the field
// optional, the API answered 200, and six of them sat in a live queue.
//
// The class of bug is "a SELECT that quietly drops the discriminator", which no
// type checker and no schema validator can catch. So the discriminator gets a
// test of its own.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { listVaenyxMeCandidates } from "../src/modules/core/vaenyx-me.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-shape-test-"));
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

function seed(
  database: DatabaseHandle,
  id: string,
  slot: string | null,
  value: string | null,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO vaenyx_me_candidates
         (id, category, title, proposed_summary, proposed_evidence,
          source_type, confidence, status, created_by,
          proposed_slot, proposed_value, proposed_event_time)
       VALUES (?, 'home', ?, 'summary', 'evidence', 'chat_history', 42,
               'pending_review', 'owner-1', ?, ?, ?)`,
    )
    .run(id, id, slot, value, slot ? "2026-01-01" : null);
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

describe("telling a fact proposal from a profile proposal", () => {
  it("🔴 carries proposed_slot out of the query", () => {
    // The whole defect was this column being absent from the SELECT. Without
    // it the caller cannot route, and routing wrong writes the fact into the
    // wrong table with no error anywhere.
    const database = testDatabase();
    seed(database, "fact-1", "home.address", "12 Example St");
    const listed = listVaenyxMeCandidates(database, null);
    const fact = listed.find((entry) => entry.id === "fact-1");
    expect(fact?.proposedSlot).toBe("home.address");
    expect(fact?.proposedValue).toBe("12 Example St");
    expect(fact?.proposedEventTime).toBe("2026-01-01");
  });

  it("leaves a profile proposal with no slot, which is how it is recognised", () => {
    const database = testDatabase();
    seed(database, "trait-1", null, null);
    const listed = listVaenyxMeCandidates(database, null);
    const trait = listed.find((entry) => entry.id === "trait-1");
    expect(trait?.proposedSlot).toBeNull();
    expect(trait?.proposedValue).toBeNull();
  });

  it("keeps both kinds in the one queue, as 0059 intended", () => {
    const database = testDatabase();
    seed(database, "fact-1", "home.address", "12 Example St");
    seed(database, "trait-1", null, null);
    const listed = listVaenyxMeCandidates(database, null);
    expect(listed.filter((entry) => entry.proposedSlot).length).toBe(1);
    expect(listed.filter((entry) => !entry.proposedSlot).length).toBe(1);
  });
});
