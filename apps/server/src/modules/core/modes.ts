// Custom Mode M1 (spec §6): the CRUD over mode definitions. A Custom Mode is
// a neutral restricted sandbox the Owner will be able to switch into (M2);
// M1 lays the data foundation — real storage for the definitions and the
// mode_id ownership columns on every content table. All management happens
// from User Mode only; PINs are stored as salted hashes, never plaintext.
import { createHash, randomUUID } from "node:crypto";

import type {
  CreateModeRequest,
  DeviceMode,
  Mode,
  UpdateModeRequest,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import { sendPushToAllDevices } from "./push.js";

interface ModeRow {
  id: string;
  name: string;
  rules: string;
  lock_settings: number;
  local_only: number;
  enter_pin_hash: string | null;
  exit_pin_hash: string | null;
  agent_name: string;
  digest_cadence: string;
  digest_last_at: string | null;
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
    agentName: row.agent_name,
    digestCadence:
      row.digest_cadence === "daily" ||
      row.digest_cadence === "weekly" ||
      row.digest_cadence === "monthly"
        ? row.digest_cadence
        : "off",
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
        enter_pin_hash, exit_pin_hash, agent_name, digest_cadence,
        digest_last_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      name,
      input.rules?.trim() ?? "",
      input.lockSettings ? 1 : 0,
      input.localOnly ? 1 : 0,
      input.enterPin?.trim() ? pinHash(id, input.enterPin.trim()) : null,
      input.exitPin?.trim() ? pinHash(id, input.exitPin.trim()) : null,
      input.agentName?.trim() ?? "",
      input.digestCadence ?? "off",
      // Start the digest clock now, so enabling it never fires a summary
      // covering everything that came before.
      now,
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
  const now = new Date().toISOString();
  const nextCadence = input.digestCadence ?? existing.digest_cadence;
  database.sqlite
    .prepare(
      `UPDATE modes
       SET name = ?, rules = ?, lock_settings = ?, local_only = ?,
           enter_pin_hash = ?, exit_pin_hash = ?, agent_name = ?,
           digest_cadence = ?, digest_last_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      name,
      input.rules === undefined ? existing.rules : input.rules.trim(),
      (input.lockSettings ?? existing.lock_settings === 1) ? 1 : 0,
      (input.localOnly ?? existing.local_only === 1) ? 1 : 0,
      enterPinHash,
      exitPinHash,
      input.agentName === undefined
        ? existing.agent_name
        : input.agentName.trim(),
      nextCadence,
      // Turning the digest on (re)starts its clock; leaving it on keeps it.
      nextCadence !== "off" && existing.digest_cadence === "off"
        ? now
        : existing.digest_last_at,
      now,
      modeId,
    );
  return listModes(database).find((mode) => mode.id === modeId)!;
}

// ── Device default mode (spec §6) ────────────────────────────────────────
// "每台配对设备可设每次打开默认进入某 mode". A device is just an id the
// browser keeps; combined with an exit PIN this is the neutral primitive
// for a device that stays inside one mode.

export function listDeviceModes(database: DatabaseHandle): DeviceMode[] {
  const rows = database.sqlite
    .prepare(
      `SELECT device_modes.device_id AS deviceId,
              device_modes.label AS label,
              device_modes.mode_id AS modeId,
              modes.name AS modeName,
              device_modes.updated_at AS updatedAt
       FROM device_modes
       LEFT JOIN modes ON modes.id = device_modes.mode_id
       ORDER BY device_modes.updated_at DESC`,
    )
    .all() as unknown as {
    deviceId: string;
    label: string;
    modeId: string | null;
    modeName: string | null;
    updatedAt: string;
  }[];
  return rows.map((row) => ({
    deviceId: row.deviceId,
    label: row.label,
    modeId: row.modeId,
    modeName: row.modeName,
    updatedAt: row.updatedAt,
  }));
}

// Register (or refresh) this device, optionally setting its default mode.
export function setDeviceMode(
  database: DatabaseHandle,
  deviceId: string,
  input: { modeId?: string | null; label?: string; register?: boolean },
): DeviceMode[] {
  if (input.modeId && !findMode(database, input.modeId)) {
    throw new Error("MODE_NOT_FOUND");
  }
  const existing = database.sqlite
    .prepare("SELECT label, mode_id FROM device_modes WHERE device_id = ?")
    .get(deviceId) as { label: string; mode_id: string | null } | undefined;
  // A device re-registering on open keeps whatever name the Owner gave it.
  const label =
    input.register && existing?.label
      ? existing.label
      : input.label?.trim() || existing?.label || "Device";
  const modeId =
    input.modeId === undefined ? (existing?.mode_id ?? null) : input.modeId;
  database.sqlite
    .prepare(
      `INSERT INTO device_modes (device_id, label, mode_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET
         label = excluded.label,
         mode_id = excluded.mode_id,
         updated_at = excluded.updated_at`,
    )
    .run(deviceId, label, modeId, new Date().toISOString());
  return listDeviceModes(database);
}

export function getDeviceDefaultMode(
  database: DatabaseHandle,
  deviceId: string,
): string | null {
  const row = database.sqlite
    .prepare("SELECT mode_id FROM device_modes WHERE device_id = ?")
    .get(deviceId) as { mode_id: string | null } | undefined;
  return row?.mode_id ?? null;
}

export function forgetDevice(
  database: DatabaseHandle,
  deviceId: string,
): DeviceMode[] {
  database.sqlite
    .prepare("DELETE FROM device_modes WHERE device_id = ?")
    .run(deviceId);
  return listDeviceModes(database);
}

// ── Periodic supervision digest (spec §6) ────────────────────────────────
// Called from the once-a-minute scheduler. Each mode with a digest cadence
// gets one push per period summarising what happened inside it; a quiet
// period sends nothing (no noise), but still moves the clock forward.
const DIGEST_INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Is this Mode's digest due?
 *
 * Monthly is not 30 days. A fixed interval drifts — twelve 30-day periods land
 * five days short of a year, so a digest that started on the 1st walks
 * backwards through the month until it stops meaning "monthly" to the person
 * reading it. One calendar month from the last one, clamped when the target
 * month is short (the 31st becomes the 30th, or the 28th in February) so
 * January never skips a turn.
 */
export function digestIsDue(
  cadence: string,
  since: string,
  nowMs: number,
): boolean {
  const last = new Date(since).getTime();
  if (Number.isNaN(last)) return false;
  if (cadence === "monthly") {
    // UTC arithmetic, deliberately. Doing this in local time makes the answer
    // depend on daylight saving: the last Sunday in March moves the clock, so
    // "one month after 31 March" came out an hour late and the check said not
    // yet — on this machine, in April, and nowhere else. A monthly summary
    // does not care which hour it lands on; a test that passes in Sydney and
    // fails in CI cares a great deal.
    const next = new Date(since);
    const day = next.getUTCDate();
    next.setUTCMonth(next.getUTCMonth() + 1);
    // setUTCMonth rolls a short month over into the next one (31 Jan + 1 month
    // becomes 3 March); pull it back to the last day the month actually has,
    // so February never goes without one.
    if (next.getUTCDate() !== day) next.setUTCDate(0);
    return nowMs >= next.getTime();
  }
  const interval = DIGEST_INTERVAL_MS[cadence];
  if (!interval) return false;
  return nowMs - last >= interval;
}

export function runDueModeDigests(database: DatabaseHandle): void {
  const rows = database.sqlite
    .prepare(
      "SELECT id, name, digest_cadence, digest_last_at FROM modes WHERE digest_cadence != 'off'",
    )
    .all() as unknown as {
    id: string;
    name: string;
    digest_cadence: string;
    digest_last_at: string | null;
  }[];
  const now = Date.now();
  for (const row of rows) {
    const since = row.digest_last_at ?? new Date(now).toISOString();
    if (!digestIsDue(row.digest_cadence, since, now)) continue;

    const messages = (
      database.sqlite
        .prepare(
          `SELECT COUNT(*) AS n
           FROM ask_vaenyx_messages
           JOIN ask_vaenyx_conversations
             ON ask_vaenyx_conversations.id = ask_vaenyx_messages.conversation_id
           WHERE ask_vaenyx_conversations.mode_id = ?
             AND ask_vaenyx_messages.created_at > ?`,
        )
        .get(row.id, since) as { n: number }
    ).n;
    const chats = (
      database.sqlite
        .prepare(
          `SELECT COUNT(*) AS n FROM ask_vaenyx_conversations
           WHERE mode_id = ? AND updated_at > ?`,
        )
        .get(row.id, since) as { n: number }
    ).n;

    database.sqlite
      .prepare("UPDATE modes SET digest_last_at = ? WHERE id = ?")
      .run(new Date(now).toISOString(), row.id);

    if (messages === 0) continue;
    void sendPushToAllDevices(
      database,
      {
        title: `Mode "${row.name}" — ${row.digest_cadence} summary`,
        body: `${messages} message${messages === 1 ? "" : "s"} across ${chats} chat${chats === 1 ? "" : "s"}. Open Modes → View Activity to read them.`,
        url: "/",
      },
      "mode",
    ).catch(() => undefined);
  }
}

// Deleting a mode returns its content to User Mode (spec's fallback rule —
// nothing is ever lost or stranded), then removes the definition.
export function deleteMode(database: DatabaseHandle, modeId: string): Mode {
  const mode = listModes(database).find((item) => item.id === modeId);
  if (!mode) {
    throw new Error("MODE_NOT_FOUND");
  }
  // Devices pointing at this mode fall back to User Mode (spec 建议 G).
  database.sqlite
    .prepare("UPDATE device_modes SET mode_id = NULL WHERE mode_id = ?")
    .run(modeId);
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
