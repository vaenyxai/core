// Custom Mode M1: mode definitions persist, PINs are stored as hashes and
// surface only as booleans, and deleting a mode returns its content to User
// Mode (mode_id NULL) instead of stranding it.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  createMode,
  deleteMode,
  listModes,
  updateMode,
} from "../src/modules/core/modes.js";

const temporaryDirectories: string[] = [];
const openDatabases: DatabaseHandle[] = [];

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-modes-test-"));
  temporaryDirectories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    backupsDirectory: resolve(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  openDatabases.push(database);
  return database;
}

afterEach(() => {
  // Close before removing — Windows keeps the SQLite file locked otherwise.
  for (const database of openDatabases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("Custom Mode M1", () => {
  it("creates, lists, updates and deletes a mode", () => {
    const database = createTestDatabase();

    const created = createMode(database, {
      name: "Workshop",
      rules: "Stay on the current task.",
      lockSettings: true,
      enterPin: "1234",
    });
    expect(created.name).toBe("Workshop");
    expect(created.lockSettings).toBe(true);
    expect(created.localOnly).toBe(false);
    expect(created.hasEnterPin).toBe(true);
    expect(created.hasExitPin).toBe(false);
    // No plaintext PIN anywhere in the API shape.
    expect(JSON.stringify(created)).not.toContain("1234");

    expect(listModes(database)).toHaveLength(1);

    const updated = updateMode(database, created.id, {
      name: "Workshop 2",
      exitPin: "9999",
      enterPin: "", // clear
    });
    expect(updated.name).toBe("Workshop 2");
    expect(updated.hasEnterPin).toBe(false);
    expect(updated.hasExitPin).toBe(true);

    deleteMode(database, created.id);
    expect(listModes(database)).toHaveLength(0);
  });

  it("deleting a mode returns its content to User Mode", () => {
    const database = createTestDatabase();
    const mode = createMode(database, { name: "Guest" });

    // Tag a project row as belonging to the mode, straight in SQL (the
    // switching UI that will do this arrives in M2).
    database.sqlite
      .prepare(
        "INSERT INTO projects (id, name, description, mode_id) VALUES (?, ?, ?, ?)",
      )
      .run("mode-project", "Sandboxed", "", mode.id);

    deleteMode(database, mode.id);

    const row = database.sqlite
      .prepare("SELECT mode_id FROM projects WHERE id = ?")
      .get("mode-project") as { mode_id: string | null };
    expect(row.mode_id).toBeNull();
  });

  it("rejects a blank name", () => {
    const database = createTestDatabase();
    expect(() => createMode(database, { name: "   " })).toThrow(
      "MODE_NAME_REQUIRED",
    );
  });
});
