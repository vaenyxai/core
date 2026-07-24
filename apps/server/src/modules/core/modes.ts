// Custom Mode M1 (spec §6): the CRUD over mode definitions. A Custom Mode is
// a neutral restricted sandbox the Owner will be able to switch into (M2);
// M1 lays the data foundation — real storage for the definitions and the
// mode_id ownership columns on every content table. All management happens
// from User Mode only; PINs are stored as salted hashes, never plaintext.
import { createHash, randomUUID } from "node:crypto";

import type { CreateModeRequest, Mode, UpdateModeRequest } from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

interface ModeRow {
  id: string;
  name: string;
  rules: string;
  lock_settings: number;
  local_only: number;
  enter_pin_hash: string | null;
  exit_pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

function toMode(row: ModeRow): Mode {
  return {
    id: row.id,
    name: row.name,
    rules: row.rules,
    lockSettings: row.lock_settings === 1,
    localOnly: row.local_only === 1,
    hasEnterPin: row.enter_pin_hash !== null,
    hasExitPin: row.exit_pin_hash !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Local PINs are convenience locks, not account security (the main login
// always overrides them) — a per-mode salted hash keeps them out of plain
// sight without pretending to be more than they are.
function pinHash(modeId: string, pin: string): string {
  return createHash("sha256").update(`${modeId}\n${pin}`).digest("hex");
}

// Internal row access for the switch/exit gates (M2) — hashes never leave
// the server module boundary.
export function getModeRowById(
  database: DatabaseHandle,
  modeId: string,
): {
  id: string;
  name: string;
  enterPinHash: string | null;
  exitPinHash: string | null;
} | null {
  const row = database.sqlite
    .prepare("SELECT * FROM modes WHERE id = ?")
    .get(modeId) as unknown as ModeRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    enterPinHash: row.enter_pin_hash,
    exitPinHash: row.exit_pin_hash,
  };
}

export function findMode(database: DatabaseHandle, modeId: string): Mode | null {
  const row = database.sqlite
    .prepare("SELECT * FROM modes WHERE id = ?")
    .get(modeId) as unknown as ModeRow | undefined;
  return row ? toMode(row) : null;
}

export function modePinMatches(
  modeId: string,
  pin: string,
  storedHash: string,
): boolean {
  return pinHash(modeId, pin) === storedHash;
}

export function listModes(database: DatabaseHandle): Mode[] {
  const rows = database.sqlite
    .prepare("SELECT * FROM modes ORDER BY created_at ASC")
    .all();
  return (rows as unknown as ModeRow[]).map(toMode);
}

export function createMode(
  database: DatabaseHandle,
  input: CreateModeRequest,
): Mode {
  const name = input.name.trim();
  if (!name) {
    throw new Error("MODE_NAME_REQUIRED");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  database.sqlite
    .prepare(
      `INSERT INTO modes (
        id, name, rules, lock_settings, local_only,
        enter_pin_hash, exit_pin_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      name,
      input.rules?.trim() ?? "",
      input.lockSettings ? 1 : 0,
      input.localOnly ? 1 : 0,
      input.enterPin?.trim() ? pinHash(id, input.enterPin.trim()) : null,
      input.exitPin?.trim() ? pinHash(id, input.exitPin.trim()) : null,
      now,
      now,
    );
  return listModes(database).find((mode) => mode.id === id)!;
}

export function updateMode(
  database: DatabaseHandle,
  modeId: string,
  input: UpdateModeRequest,
): Mode {
  const existing = database.sqlite
    .prepare("SELECT * FROM modes WHERE id = ?")
    .get(modeId) as unknown as ModeRow | undefined;
  if (!existing) {
    throw new Error("MODE_NOT_FOUND");
  }
  const name = input.name?.trim() ?? existing.name;
  if (!name) {
    throw new Error("MODE_NAME_REQUIRED");
  }
  // PIN fields: undefined = keep, "" = clear, value = set anew.
  const enterPinHash =
    input.enterPin === undefined
      ? existing.enter_pin_hash
      : input.enterPin.trim()
        ? pinHash(modeId, input.enterPin.trim())
        : null;
  const exitPinHash =
    input.exitPin === undefined
      ? existing.exit_pin_hash
      : input.exitPin.trim()
        ? pinHash(modeId, input.exitPin.trim())
        : null;
  database.sqlite
    .prepare(
      `UPDATE modes
       SET name = ?, rules = ?, lock_settings = ?, local_only = ?,
           enter_pin_hash = ?, exit_pin_hash = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      name,
      input.rules === undefined ? existing.rules : input.rules.trim(),
      (input.lockSettings ?? existing.lock_settings === 1) ? 1 : 0,
      (input.localOnly ?? existing.local_only === 1) ? 1 : 0,
      enterPinHash,
      exitPinHash,
      new Date().toISOString(),
      modeId,
    );
  return listModes(database).find((mode) => mode.id === modeId)!;
}

// Deleting a mode returns its content to User Mode (spec's fallback rule —
// nothing is ever lost or stranded), then removes the definition.
export function deleteMode(database: DatabaseHandle, modeId: string): Mode {
  const mode = listModes(database).find((item) => item.id === modeId);
  if (!mode) {
    throw new Error("MODE_NOT_FOUND");
  }
  for (const table of [
    "vaenyx_threads",
    "ask_vaenyx_conversations",
    "projects",
    "project_memories",
    "tasks",
  ]) {
    database.sqlite
      .prepare(`UPDATE ${table} SET mode_id = NULL WHERE mode_id = ?`)
      .run(modeId);
  }
  database.sqlite.prepare("DELETE FROM modes WHERE id = ?").run(modeId);
  return mode;
}
