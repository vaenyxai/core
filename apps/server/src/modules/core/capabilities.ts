// CAPABILITIES — the second half of a Method (design: private/docs/
// library-architecture.md §能力, locked 2026-07-31).
//
// A Method is the recipe; a capability is the kitchen equipment. The community
// writes unlimited recipes; only the operator builds equipment. That is the
// whole security story: a Method is "a Skill with the trust direction
// reversed" — a Skill carries the author's script, so you must defend against
// the author's code, while a Method can only REFERENCE what the operator wrote.
// The author never has code. Not a lock added: nothing to pry.
//
// The vocabulary is CLOSED and shared with routine.json and the model-connection
// screen. Two vocabularies would need a lookup table, lookup tables rot, and the
// Owner would see "Picture in" in Settings and "needs vision" on a Method
// without knowing they are the same thing.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DatabaseHandle } from "../../db/database.js";

export const CAPABILITIES = [
  "vision",
  "documents",
  "voice-in",
  "voice-out",
  "draw",
  "web",
  "files",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// Deliberately kept apart from `vision`: reading one receipt and reading thirty
// pages of drawings are different levels of reliability AND of cost, and one
// name for both would turn the capability contract into a lie.
export function isCapability(value: unknown): value is Capability {
  return (
    typeof value === "string" &&
    (CAPABILITIES as readonly string[]).includes(value)
  );
}

// Whose finger is on the trigger, not how dangerous it is. Reactive
// capabilities happen because the Owner pressed something, so they start on;
// autonomous ones — the Method decides when to act, with nobody watching —
// start off. `documents` is off for cost, `draw` because connecting an image
// engine is itself the switch.
export const CAPABILITY_DEFAULT_ON: Record<Capability, boolean> = {
  vision: true,
  "voice-in": true,
  "voice-out": true,
  documents: false,
  draw: false,
  web: false,
  files: false,
};

export class UnknownCapabilityError extends Error {
  readonly unknown: string[];
  constructor(unknown: string[]) {
    super(`MANIFEST_UNKNOWN_CAPABILITY:${unknown.join(",")}`);
    this.name = "UnknownCapabilityError";
    this.unknown = unknown;
  }
}

export interface MethodManifest {
  capabilities: Capability[];
  /** The oldest Vaenyx that can honour this manifest, when the author set one. */
  minimumVersion: string | null;
}

// Read and normalise a Method's manifest.
//
// 🔴 An unknown capability name REFUSES THE RUN. This is the opposite of
// routine.json, which silently drops what it does not recognise — and the
// difference is deliberate. routine.json only draws chips, so dropping one
// costs a label. The manifest is the ENFORCEMENT list: dropping an unknown
// entry would let an old client run a Method WITHOUT a capability it needed,
// while looking perfectly fine. That is the kind of bug nobody ever finds.
export function readMethodManifest(directory: string): MethodManifest {
  const path = join(directory, "manifest.json");
  if (!existsSync(path)) return { capabilities: [], minimumVersion: null };
  try {
    return capabilitiesFromManifest(
      JSON.parse(readFileSync(path, "utf8")) as unknown,
    );
  } catch (error) {
    if (error instanceof UnknownCapabilityError) throw error;
    // A manifest that cannot be read is not an empty manifest. Refuse rather
    // than run with no restrictions at all.
    throw new Error("MANIFEST_UNREADABLE", { cause: error });
  }
}

// The same rules against an already-parsed manifest — LoadedMethod carries one,
// so a run never has to touch the disk again to know what it may reach for.
export function capabilitiesFromManifest(parsed: unknown): MethodManifest {
  const raw =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};

  const declared = Array.isArray(raw.capabilities) ? raw.capabilities : null;
  if (declared) {
    const unknown = declared.filter((entry) => !isCapability(entry));
    if (unknown.length > 0) {
      throw new UnknownCapabilityError(unknown.map((entry) => String(entry)));
    }
    return {
      capabilities: [...new Set(declared as Capability[])],
      minimumVersion:
        typeof raw.minimumVersion === "string" ? raw.minimumVersion : null,
    };
  }

  // The old shape, still on disk in every Method written before today:
  // {"permissions":{"network":false,"readFiles":false}}. Two booleans map
  // straight onto two capabilities, which is exactly how the design says to
  // start. Nothing needs rewriting on disk for a Method to keep working.
  const permissions =
    raw.permissions && typeof raw.permissions === "object"
      ? (raw.permissions as Record<string, unknown>)
      : {};
  const migrated: Capability[] = [];
  if (permissions.network === true) migrated.push("web");
  if (permissions.readFiles === true) migrated.push("files");
  return { capabilities: migrated, minimumVersion: null };
}

// What this Vaenyx can actually DO, as opposed to what it has a word for. A
// capability needs two independent things to be true — the kernel has it, and
// the connected model can do it — and this is the first of the two. `files` has
// a word and a chip and no implementation behind it yet, which is exactly the
// case the waiting list exists for.
export const CAPABILITY_IMPLEMENTED: Record<Capability, boolean> = {
  vision: true,
  documents: true,
  "voice-in": true,
  "voice-out": true,
  draw: true,
  web: true,
  files: false,
};

export function missingCapabilities(declared: Capability[]): Capability[] {
  return declared.filter((capability) => !CAPABILITY_IMPLEMENTED[capability]);
}

// A Method wanting something this Vaenyx does not have yet: it can be built and
// kept, but not published. Publishing an unrunnable Method is not a
// contribution, it is a request — and a community shelf half greyed out is a
// fatal first impression for a household app. The attempt to publish IS the
// vote; no separate button, because buttons get organised and gamed.
export function recordCapabilityWanted(
  database: DatabaseHandle,
  capabilities: Capability[],
): void {
  for (const capability of capabilities) {
    // Only what does not EXIST. A capability the Owner merely switched off must
    // never land here: that person is not waiting for anything to be built.
    if (CAPABILITY_IMPLEMENTED[capability]) continue;
    database.sqlite
      .prepare(
        `INSERT INTO capability_waiting (capability) VALUES (?)
         ON CONFLICT(capability) DO UPDATE SET times_wanted = times_wanted + 1`,
      )
      .run(capability);
  }
}

export interface CapabilityWaitingRow {
  capability: Capability;
  timesWanted: number;
  arrived: boolean;
}

export function listCapabilityWaiting(
  database: DatabaseHandle,
): CapabilityWaitingRow[] {
  const rows = database.sqlite
    .prepare(
      `SELECT capability, times_wanted AS timesWanted, arrived_at AS arrivedAt
       FROM capability_waiting ORDER BY times_wanted DESC, capability`,
    )
    .all() as { capability: string; timesWanted: number; arrivedAt: string | null }[];
  return rows
    .filter((row) => isCapability(row.capability))
    .map((row) => ({
      capability: row.capability as Capability,
      timesWanted: row.timesWanted,
      arrived: row.arrivedAt !== null,
    }));
}

// The return trip, and it needs no server identity: this machine remembers what
// it was waiting for and, once an update brings the capability, notices by
// itself and has something to tell the author.
export function noticeArrivedCapabilities(database: DatabaseHandle): Capability[] {
  const arrived: Capability[] = [];
  for (const row of listCapabilityWaiting(database)) {
    if (row.arrived || !CAPABILITY_IMPLEMENTED[row.capability]) continue;
    database.sqlite
      .prepare(
        "UPDATE capability_waiting SET arrived_at = CURRENT_TIMESTAMP WHERE capability = ?",
      )
      .run(row.capability);
    arrived.push(row.capability);
  }
  return arrived;
}

// ── The three layers ─────────────────────────────────────────────────────────
//
//   global switch (one per capability)     ← the ceiling
//     ∩ mode switch (Owner sets per mode)  ← may only be stricter
//       ∩ what the Method declared          ← may only be stricter
//
// 🔴 A lower layer may only ever NARROW. A capability switched off globally is
// out of reach of every mode, every Method and every Token, whatever they say
// about themselves. The moment a lower layer can push the ceiling up, the
// ceiling is not a ceiling and the entire guarantee goes with it.
const GLOBAL_KEY = "capabilities.global";

export function readGlobalCapabilities(
  database: DatabaseHandle,
): Record<Capability, boolean> {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(GLOBAL_KEY) as { value?: string } | undefined;
  const stored: Record<string, unknown> = row?.value
    ? (JSON.parse(row.value) as Record<string, unknown>)
    : {};
  const out = {} as Record<Capability, boolean>;
  for (const capability of CAPABILITIES) {
    out[capability] =
      typeof stored[capability] === "boolean"
        ? (stored[capability] as boolean)
        : CAPABILITY_DEFAULT_ON[capability];
  }
  return out;
}

export function writeGlobalCapabilities(
  database: DatabaseHandle,
  changes: Partial<Record<Capability, boolean>>,
): Record<Capability, boolean> {
  const next = { ...readGlobalCapabilities(database) };
  for (const capability of CAPABILITIES) {
    const value = changes[capability];
    if (typeof value === "boolean") next[capability] = value;
  }
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = CURRENT_TIMESTAMP`,
    )
    .run(GLOBAL_KEY, JSON.stringify(next));
  return next;
}

// A mode's own list. NULL/absent means "this mode adds no restriction", which is
// deliberately different from an empty list ("this mode allows nothing").
export function readModeCapabilities(
  database: DatabaseHandle,
  modeId: string | null,
): Capability[] | null {
  if (!modeId) return null;
  const row = database.sqlite
    .prepare("SELECT capabilities FROM modes WHERE id = ?")
    .get(modeId) as { capabilities?: string | null } | undefined;
  if (!row?.capabilities) return null;
  try {
    const parsed = JSON.parse(row.capabilities) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isCapability);
  } catch {
    return null;
  }
}

export interface CapabilityDecision {
  allowed: Capability[];
  /** Why each declared capability was refused — the Owner needs the reason. */
  refused: { capability: Capability; reason: "global" | "mode" }[];
}

// Intersect the three layers. Everything the Method declared is checked against
// the ceiling and then the mode; whatever survives is what the run may reach for.
export function decideCapabilities(
  database: DatabaseHandle,
  declared: Capability[],
  modeId: string | null,
): CapabilityDecision {
  const global = readGlobalCapabilities(database);
  const mode = readModeCapabilities(database, modeId);
  const allowed: Capability[] = [];
  const refused: CapabilityDecision["refused"] = [];
  for (const capability of declared) {
    if (!global[capability]) {
      refused.push({ capability, reason: "global" });
      continue;
    }
    if (mode && !mode.includes(capability)) {
      refused.push({ capability, reason: "mode" });
      continue;
    }
    allowed.push(capability);
  }
  return { allowed, refused };
}

// ── What a Method Token may carry ────────────────────────────────────────────
//
// 🔴 `files` can NEVER be granted through a token. Reading the Owner's disk on
// behalf of another app is not something a token should be able to carry,
// whatever the Method declared and whatever the Owner ticked — so this is a
// property of the code, not a default someone can turn around.
// 🔴 `web` needs its own explicit approval per token: it can turn this machine
// into somebody else's proxy, which is a different question from "may this app
// use my Method".
export const NEVER_VIA_TOKEN: readonly Capability[] = ["files"];
export const NEEDS_OWN_TOKEN_APPROVAL: readonly Capability[] = ["web"];

export function tokenGrantable(declared: Capability[]): Capability[] {
  return declared.filter(
    (capability) => !NEVER_VIA_TOKEN.includes(capability),
  );
}

// global ∩ what this token was granted ∩ what the Method declared — and no mode
// layer, because a token call has no conversation to be in a mode.
export function decideTokenCapabilities(
  database: DatabaseHandle,
  declared: Capability[],
  granted: Capability[],
): CapabilityDecision {
  const base = decideCapabilities(database, declared, null);
  const allowed: Capability[] = [];
  const refused = [...base.refused];
  for (const capability of base.allowed) {
    if (NEVER_VIA_TOKEN.includes(capability)) continue; // never, silently
    if (!granted.includes(capability)) continue; // not granted to this token
    allowed.push(capability);
  }
  return { allowed, refused };
}

// What the Owner granted this particular token. Absent = nothing beyond the
// recipe, which is what every token issued before capabilities existed carries:
// a token never silently gains reach because the feature arrived.
export function readProfileCapabilities(
  database: DatabaseHandle,
  profileId: string,
): Capability[] {
  const row = database.sqlite
    .prepare("SELECT capabilities FROM app_profiles WHERE id = ?")
    .get(profileId) as { capabilities?: string | null } | undefined;
  if (!row?.capabilities) return [];
  try {
    const parsed = JSON.parse(row.capabilities) as unknown;
    return Array.isArray(parsed) ? tokenGrantable(parsed.filter(isCapability)) : [];
  } catch {
    return [];
  }
}

export interface TokenSpend {
  limitCents: number | null;
  spentCents: number;
}

export function readTokenSpend(
  database: DatabaseHandle,
  profileId: string,
): TokenSpend {
  const row = database.sqlite
    .prepare(
      "SELECT spend_limit_cents AS limitCents, spent_cents AS spentCents FROM app_profiles WHERE id = ?",
    )
    .get(profileId) as
    | { limitCents: number | null; spentCents: number }
    | undefined;
  return {
    limitCents: row?.limitCents ?? null,
    spentCents: row?.spentCents ?? 0,
  };
}

// Charge a token and say whether it may still run. The ceiling is checked
// BEFORE the work, because the point is to stop spending, not to report it.
export function chargeToken(
  database: DatabaseHandle,
  profileId: string,
  cents: number,
): { allowed: boolean; spend: TokenSpend } {
  const spend = readTokenSpend(database, profileId);
  if (spend.limitCents !== null && spend.spentCents + cents > spend.limitCents) {
    return { allowed: false, spend };
  }
  database.sqlite
    .prepare("UPDATE app_profiles SET spent_cents = spent_cents + ? WHERE id = ?")
    .run(cents, profileId);
  return {
    allowed: true,
    spend: { ...spend, spentCents: spend.spentCents + cents },
  };
}

// Never "unsupported" — that reads as broken and sends the Owner looking for a
// fault that is not there. The two real reasons need two different sentences,
// because they have two different fixes.
export function refusedCapabilityMessage(
  capability: Capability,
  reason: "global" | "mode",
): string {
  const plain: Record<Capability, string> = {
    vision: "look at pictures",
    documents: "read multi-page documents",
    "voice-in": "listen",
    "voice-out": "speak",
    draw: "make pictures",
    web: "use the web",
    files: "read files",
  };
  return reason === "global"
    ? `This needs to ${plain[capability]}, and you have that switched off. Turn it on in Settings to use it.`
    : `This needs to ${plain[capability]}, and the mode you are in does not allow it.`;
}

// The message the Owner sees when a Method reaches for something it never
// declared. Naming the capability matters: "this Method wants the web but never
// declared it" is actionable, a wrong answer is not.
export function undeclaredCapabilityMessage(capability: Capability): string {
  const plain: Record<Capability, string> = {
    vision: "look at pictures",
    documents: "read multi-page documents",
    "voice-in": "listen",
    "voice-out": "speak",
    draw: "make pictures",
    web: "use the web",
    files: "read files",
  };
  return `This Method tried to ${plain[capability]}, but its manifest never declared that capability. It was refused.`;
}
