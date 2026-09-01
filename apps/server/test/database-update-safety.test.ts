import { backup, DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "../src/db/database.js";

const temporaryDirectories: string[] = [];

function temporary(name: string): string {
  const directory = mkdtempSync(resolve(tmpdir(), `vaenyx-${name}-`));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("candidate-only migrations", () => {
  it("leaves the live database byte-for-byte unchanged when a migration fails", async () => {
    const root = temporary("migration-failure");
    const migrations = resolve(root, "migrations");
    const livePath = resolve(root, "live.db");
    const candidatePath = resolve(root, "candidate.db");
    mkdirSync(migrations);

    const live = new DatabaseSync(livePath);
    live.exec(`
      CREATE TABLE vanta_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE family_data (value TEXT NOT NULL);
      INSERT INTO family_data (value) VALUES ('old');
    `);
    await backup(live, candidatePath);
    live.close();
    const before = readFileSync(livePath);

    writeFileSync(
      resolve(migrations, "9999_deliberate_failure.sql"),
      "CREATE TABLE should_rollback (id INTEGER); THIS IS NOT SQL;",
    );
    const candidate = new DatabaseSync(candidatePath);
    expect(() => runMigrations(candidate, migrations)).toThrow();
    candidate.close();

    expect(readFileSync(livePath)).toEqual(before);
    const unchanged = new DatabaseSync(livePath, { readOnly: true });
    expect(unchanged.prepare("SELECT value FROM family_data").get()).toEqual({
      value: "old",
    });
    expect(
      unchanged
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='should_rollback'",
        )
        .get(),
    ).toBeUndefined();
    unchanged.close();
  });
});
