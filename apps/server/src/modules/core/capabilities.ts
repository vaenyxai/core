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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { DatabaseHandle } from "../../db/database.js";

// Oskar's order, 2026-07-31, and it is the order everywhere: what comes in,
// what goes out, then what it goes and gets. Each word names a FACULTY — the
// ability itself, the way you would describe a person's senses — not the
// direction of a pipe. That is why it is `hearing`, not `voice-in`.
export const CAPABILITIES = [
  "hearing",
  "speaking",
  "vision",
  "drawing",
  "reading",
  // OCR sits beside reading because they compose: a scanned PDF is OCR (the
  // page becomes text, near-free) + reading (the text reaches a model, paid).
  // 🔴 DELIBERATELY ITS OWN CAPABILITY, never folded into reading (Oskar,
  // 2026-08-06) — the combination of the two switches carries meaning a merged
  // one cannot: OCR on + reading off = "turn my scans into text on this
  // machine, for my own eyes, and send them to no model". Same yardstick that
  // split vision from reading: different cost class, different promise.
  // The name is also a DELIBERATE exception to the no-industry-jargon rule:
  // "OCR" is a household word by now, and the Chinese chip 「图转文」explains
  // itself entirely.
  "ocr",
  "fetching",
  "web",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// The vocabulary will grow and change (Oskar: "以后会加,会改"), so renaming has
// to be survivable. An old name MIGRATES; only a name nobody has ever used is
// unknown and refuses the run. Without this table a rename would quietly strip
// capabilities from every Method written before it — which is the same silent
// failure the unknown-name rule exists to prevent.
const RENAMED_TO: Record<string, Capability> = {
  "voice-in": "hearing",
  "voice-out": "speaking",
  draw: "drawing",
  documents: "reading",
  files: "fetching",
  // Older still: the two booleans this all started from.
  network: "web",
  readFiles: "fetching",
};

export function currentCapabilityName(value: unknown): Capability | null {
  if (isCapability(value)) return value;
  if (typeof value === "string" && RENAMED_TO[value]) return RENAMED_TO[value];
  return null;
}

// Deliberately kept apart from `vision`: reading one receipt and reading thirty
// pages of drawings are different levels of reliability AND of cost, and one
// name for both would turn the capability contract into a lie.
export function isCapability(value: unknown): value is Capability {
  return (
    typeof value === "string" &&
    (CAPABILITIES as readonly string[]).includes(value)
  );
}

// Where the thing HAPPENS, not how dangerous it sounds. A capability starts on
// when it is something this app already does on this machine — the Owner
// attaches a photo, records a sentence, asks for a picture, drops in a PDF —
// and starts off when it reaches OUTSIDE the machine (`web`) or into the
// Owner's own files (`fetching`). Those two have to be a deliberate act, never
// something that was already true because nobody looked.
//
// 🔴 These values ARE what a fresh instance gets, and what this instance gets:
// until the Owner touches a switch there is no row in `instance_settings`, so
// `readGlobalCapabilities` falls straight through to here. `reading` and
// `drawing` were false while nothing consulted this table; the gates are real
// now, and false would have meant an attached PDF answering 403 and a request
// for a picture being refused — two things the shipped manual describes as
// working. A default that silently switches off a working feature is a bug,
// not a safe choice.
export const CAPABILITY_DEFAULT_ON: Record<Capability, boolean> = {
  hearing: true,
  speaking: true,
  vision: true,
  drawing: true,
  reading: true,
  // The ONE thing that stays off until asked for: reading files on this
  // machine. Everything else here is Vaenyx doing its job; this is Vaenyx
  // opening the Owner's own folders, and that has to be a decision somebody
  // made rather than a default they inherited.
  fetching: false,
  // On: reactive (it only ever runs when the Owner hands over a scan or a
  // photo of text) and near-free on the dedicated engine.
  ocr: true,
  // On (Oskar, 2026-08-01: "web我觉得要一直打开,不然根本拿不到最新的信息"). A
  // model that cannot look anything up answers today's question with what it
  // memorised a year ago and sounds equally sure either way — being wrong
  // confidently is worse than reaching the internet.
  web: true,
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

// WHO WOULD NOTICE if this switch went off. Switching a capability off is a
// decision with consequences somewhere else in the house, and until now the
// row asked for it with no way to see them: the Owner had to remember which
// of their Methods reads pictures before deciding whether Vision could go
// (Oskar, 2026-08-07). A count is a view, not a setting — nothing here can
// block or change anything, it only says how many Methods declared this
// capability in their manifest.
//
// Reads the library folder, so it is called where a directory listing is
// already acceptable — never inside a chat turn.
export function countMethodsPerCapability(
  libraryDirectory: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!existsSync(libraryDirectory)) return counts;
  let entries: string[];
  try {
    entries = readdirSync(libraryDirectory);
  } catch {
    return counts;
  }
  for (const entry of entries) {
    const directory = join(libraryDirectory, entry);
    let manifest: MethodManifest;
    try {
      manifest = readMethodManifest(directory);
    } catch {
      // A Method whose manifest will not parse is a problem the Library
      // screen reports; it must not take this count down with it.
      continue;
    }
    for (const capability of manifest.capabilities) {
      counts[capability] = (counts[capability] ?? 0) + 1;
    }
  }
  return counts;
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
    // A renamed word migrates; only a word nobody has ever used is unknown, and
    // that still refuses the run.
    const unknown = declared.filter(
      (entry) => currentCapabilityName(entry) === null,
    );
    if (unknown.length > 0) {
      throw new UnknownCapabilityError(unknown.map((entry) => String(entry)));
    }
    return {
      capabilities: [
        ...new Set(
          declared.map((entry) => currentCapabilityName(entry) as Capability),
        ),
      ],
      minimumVersion:
        typeof raw.minimumVersion === "string" ? raw.minimumVersion : null,
    };
  }

  // The oldest shape, still on disk in every Method written before today:
  // {"permissions":{"network":false,"readFiles":false}}. Two booleans map
  // straight onto two capabilities, which is exactly how the design says to
  // start. Nothing needs rewriting on disk for a Method to keep working.
  const permissions =
    raw.permissions && typeof raw.permissions === "object"
      ? (raw.permissions as Record<string, unknown>)
      : {};
  const migrated: Capability[] = [];
  if (permissions.network === true) migrated.push("web");
  if (permissions.readFiles === true) migrated.push("fetching");
  return { capabilities: migrated, minimumVersion: null };
}

// What this Vaenyx can actually DO, as opposed to what it has a word for. A
// capability needs two independent things to be true — the kernel has it, and
// the connected model can do it — and this is the first of the two. It is what
// decides whether the Owner gets a SWITCH on the Capabilities card or the words
// "not built yet".
export const CAPABILITY_IMPLEMENTED: Record<Capability, boolean> = {
  hearing: true,
  speaking: true,
  vision: true,
  drawing: true,
  reading: true,
  ocr: true,
  web: true,
  // Built 2026-08-01 (core/fetching.ts): a whitelist of folders the Owner
  // names, empty until they do, and only text files up to a size cap. Not yet
  // EVERY kind of file, which is where it has to end up (Oskar, 2026-07-31) —
  // a PDF or a scan still goes through Reading's own attach button.
  fetching: true,
};

// A different question, and conflating the two is how a community shelf fills
// up with Methods that do nothing. "This Vaenyx can open files" is true; "a
// METHOD RUN can open files" is not — `executeMethod` hands the backend the
// prompt and the web answer and nothing else, and a Routine step has no
// database to ask in the first place. So a Method declaring `fetching` would
// pass the publish gate, land on somebody else's shelf and quietly answer
// about a file it never opened.
//
// This table is what publishing and the waiting list ask. When a Method run
// really carries the grant, this line goes and the two tables become one.
const CAPABILITY_IN_METHOD_RUNS: Record<Capability, boolean> = {
  ...CAPABILITY_IMPLEMENTED,
  fetching: false,
};

export function missingCapabilities(declared: Capability[]): Capability[] {
  return declared.filter(
    (capability) => !CAPABILITY_IN_METHOD_RUNS[capability],
  );
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
    // The Method-run table, not the switch table — this counter exists to
    // answer "what should be built next", and what a Method still cannot reach
    // is exactly that.
    if (CAPABILITY_IN_METHOD_RUNS[capability]) continue;
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
    if (row.arrived || !CAPABILITY_IN_METHOD_RUNS[row.capability]) continue;
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
//   global switch (one per capability)      ← the ceiling
//     ∩ mode switch (Owner sets per mode)   ← may only be stricter
//     ∩ app key grant (Owner sets per key)  ← may only be stricter
//       ∩ what the Method declared          ← may only be stricter
//
// The middle two never meet: a browser session is in a mode and has no key, a
// call arriving on a key has no session and so no mode. One or the other sits
// under the ceiling, and the Method's own declaration sits under whichever it
// was.
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

// The ceiling asked about ONE capability where there is no session to be in a
// mode — an outside app calling the relay, a Test the Owner pressed in User
// Mode. Anything that DOES have a session must ask `capabilityRefusedBy`
// instead and pass its mode, or the middle layer is skipped.
export function capabilityOff(
  database: DatabaseHandle,
  capability: Capability,
): boolean {
  return capabilityRefusedBy(database, capability, null) !== null;
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
//
// Every mode created before the Owner had a screen to narrow one sits at NULL,
// so nothing they already made changes behaviour the day this arrives.
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

// WHICH layer said no. A session can only ever meet the first two — it has a
// mode or it does not — so it gets its own narrower type: nothing reading a
// session's refusal should have to handle a reason a session can never carry.
export type SessionRefusalReason = "global" | "mode";
export type CapabilityRefusalReason =
  | SessionRefusalReason
  | "token"
  | "never-via-token";

export interface SessionCapabilityDecision {
  allowed: Capability[];
  /** Why each declared capability was refused — the Owner needs the reason. */
  refused: { capability: Capability; reason: SessionRefusalReason }[];
}

export interface CapabilityDecision {
  allowed: Capability[];
  refused: { capability: Capability; reason: CapabilityRefusalReason }[];
}

// Intersect the three layers. Everything the Method declared is checked against
// the ceiling and then the mode; whatever survives is what the run may reach for.
export function decideCapabilities(
  database: DatabaseHandle,
  declared: Capability[],
  modeId: string | null,
): SessionCapabilityDecision {
  const global = readGlobalCapabilities(database);
  const mode = readModeCapabilities(database, modeId);
  const allowed: Capability[] = [];
  const refused: SessionCapabilityDecision["refused"] = [];
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

// The three layers asked about ONE capability, at the door of the code that is
// about to do the thing. Everywhere that describes a photo, transcribes a
// recording, speaks, draws or reads a document calls this first — the card the
// Owner reads says an off switch is "out of reach of every Method, every mode
// and every app key", and a ceiling nothing consults is decoration.
//
// It answers WHICH layer said no, because the two refusals have two different
// fixes and telling somebody inside a mode to go and change a setting they
// cannot reach is worse than saying nothing.
export function capabilityRefusedBy(
  database: DatabaseHandle,
  capability: Capability,
  modeId: string | null,
): SessionRefusalReason | null {
  return (
    decideCapabilities(database, [capability], modeId).refused[0]?.reason ??
    null
  );
}

// 🔴 A mode may only ever NARROW, so switching one of these ON for a capability
// the instance has switched off is not a narrowing and is REFUSED rather than
// stored. Storing it quietly would put a tick on the Owner's screen that means
// nothing — a switch that looks set and does nothing is exactly the state the
// three layers exist to prevent, and it would come alive by itself the day the
// global switch went back on.
export class ModeAboveCeilingError extends Error {
  readonly capabilities: Capability[];
  constructor(capabilities: Capability[]) {
    super(`MODE_ABOVE_CEILING:${capabilities.join(",")}`);
    this.name = "ModeAboveCeilingError";
    this.capabilities = capabilities;
  }
}

// Write a mode's own list. The body is a CHANGE SET rather than the whole list,
// for the same reason `writeGlobalCapabilities` takes one: the screen sends the
// switch that was just flipped, and a full list from a screen that went stale
// would silently undo whatever changed underneath it.
export function writeModeCapabilities(
  database: DatabaseHandle,
  modeId: string,
  changes: Partial<Record<Capability, boolean>>,
): Capability[] {
  const global = readGlobalCapabilities(database);
  const aboveCeiling = CAPABILITIES.filter(
    (capability) => changes[capability] === true && !global[capability],
  );
  if (aboveCeiling.length > 0) throw new ModeAboveCeilingError(aboveCeiling);

  // NULL so far means "adds no restriction of its own", so the starting point
  // is everything — everything the CEILING allows, which is the whole point of
  // the filter. Seeding from all eight would quietly write down capabilities
  // the instance currently refuses, and the mode would then be handed them by
  // itself the day that global switch went back on. Narrowing is sticky: a
  // mode gains a capability only when the Owner ticks it here, looking at it.
  //
  // From the first switch the Owner touches, this mode carries an explicit list
  // and keeps one, so a mode somebody deliberately narrowed also never gains a
  // capability that is added to the vocabulary later.
  const current =
    readModeCapabilities(database, modeId) ??
    CAPABILITIES.filter((capability) => global[capability]);
  const next = CAPABILITIES.filter((capability) =>
    typeof changes[capability] === "boolean"
      ? changes[capability] === true
      : current.includes(capability),
  );
  const result = database.sqlite
    .prepare("UPDATE modes SET capabilities = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(next), new Date().toISOString(), modeId);
  if (result.changes === 0) throw new Error("MODE_NOT_FOUND");
  return next;
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
export const NEVER_VIA_TOKEN: readonly Capability[] = ["fetching"];
export const NEEDS_OWN_TOKEN_APPROVAL: readonly Capability[] = ["web"];

export function tokenGrantable(declared: Capability[]): Capability[] {
  return declared.filter(
    (capability) => !NEVER_VIA_TOKEN.includes(capability),
  );
}

// global ∩ what this token was granted ∩ what the Method declared — and no mode
// layer, because a token call has no conversation to be in a mode.
//
// Every refusal is REPORTED, including the two that used to drop out silently.
// A call that quietly comes back without having looked at the picture is the
// worst of the three outcomes: the app cannot tell a refusal from a bad answer,
// and neither can the person reading it.
export function decideTokenCapabilities(
  database: DatabaseHandle,
  declared: Capability[],
  granted: Capability[],
): CapabilityDecision {
  const base = decideCapabilities(database, declared, null);
  const allowed: Capability[] = [];
  const refused: CapabilityDecision["refused"] = [...base.refused];
  for (const capability of base.allowed) {
    if (NEVER_VIA_TOKEN.includes(capability)) {
      refused.push({ capability, reason: "never-via-token" });
      continue;
    }
    if (!granted.includes(capability)) {
      refused.push({ capability, reason: "token" });
      continue;
    }
    allowed.push(capability);
  }
  return { allowed, refused };
}

// 🔴 What a key may not be handed, refused at the WRITE and not only at the
// read. The read already strips `fetching` and meets the ceiling, so nothing
// unsafe would run either way — but a grant that is stored and then ignored is
// a tick the Owner can never see on the screen and never take back, and the
// write is the door a future bug reaches first.
export type TokenGrantRefusal = "never" | "ceiling" | "approval";

export class TokenGrantRefusedError extends Error {
  readonly capabilities: Capability[];
  readonly refusal: TokenGrantRefusal;
  constructor(capabilities: Capability[], refusal: TokenGrantRefusal) {
    super(`TOKEN_GRANT_REFUSED:${refusal}:${capabilities.join(",")}`);
    this.name = "TokenGrantRefusedError";
    this.capabilities = capabilities;
    this.refusal = refusal;
  }
}

// Write what the Owner granted ONE app key. A change set, like the other two
// layers: the screen sends the tick that was just made, so a screen that went
// stale cannot silently undo a grant it never showed.
//
// 🔴 A key starts at NOTHING and only ever gains what the Owner ticks, which is
// the opposite direction from a mode (which starts at everything the ceiling
// allows and narrows). That asymmetry is deliberate: a mode is this machine
// wearing a smaller hat, a key is somebody else's program holding a door open.
// It also means every key issued before this screen existed carries nothing,
// rather than quietly gaining reach the day the feature arrived.
export function writeProfileCapabilities(
  database: DatabaseHandle,
  profileId: string,
  changes: Partial<Record<Capability, boolean>>,
  // The capabilities the Owner approved as their own separate act. Anything in
  // NEEDS_OWN_TOKEN_APPROVAL has to appear here as well as in `changes`, so
  // granting it can never be a side effect of ticking something else.
  approved: Capability[] = [],
): Capability[] {
  const turningOn = CAPABILITIES.filter(
    (capability) => changes[capability] === true,
  );

  const never = turningOn.filter((capability) =>
    NEVER_VIA_TOKEN.includes(capability),
  );
  if (never.length > 0) throw new TokenGrantRefusedError(never, "never");

  // A tick above the ceiling would show as "off for the whole machine" on the
  // very screen that just accepted it — invisible, unremovable, and alive again
  // the day the global switch moved. Refused, exactly like a mode's.
  const global = readGlobalCapabilities(database);
  const aboveCeiling = turningOn.filter((capability) => !global[capability]);
  if (aboveCeiling.length > 0) {
    throw new TokenGrantRefusedError(aboveCeiling, "ceiling");
  }

  const unapproved = turningOn.filter(
    (capability) =>
      NEEDS_OWN_TOKEN_APPROVAL.includes(capability) &&
      !approved.includes(capability),
  );
  if (unapproved.length > 0) {
    throw new TokenGrantRefusedError(unapproved, "approval");
  }

  const current = readProfileCapabilities(database, profileId);
  const next = tokenGrantable(
    CAPABILITIES.filter((capability) =>
      typeof changes[capability] === "boolean"
        ? changes[capability] === true
        : current.includes(capability),
    ),
  );
  const result = database.sqlite
    .prepare("UPDATE app_profiles SET capabilities = ? WHERE id = ?")
    .run(JSON.stringify(next), profileId);
  if (result.changes === 0) throw new Error("APP_PROFILE_NOT_FOUND");
  return next;
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

// Each capability said the way the Owner would say it, never the way the code
// says it: they switched off "Picture in", not `vision`.
export type CapabilityLanguage = "en" | "zh";

const PLAIN_WORDS: Record<CapabilityLanguage, Record<Capability, string>> = {
  en: {
    hearing: "listen",
    speaking: "speak",
    vision: "look at pictures",
    drawing: "make pictures",
    reading: "read documents",
    ocr: "turn pictures into text",
    fetching: "open files on this machine",
    web: "use the web",
  },
  zh: {
    hearing: "听",
    speaking: "说话",
    vision: "看图片",
    drawing: "画图",
    reading: "读文档",
    ocr: "图转文",
    fetching: "打开这台机器上的文件",
    web: "上网",
  },
};

// Never "unsupported" — that reads as broken and sends the Owner looking for a
// fault that is not there. Each layer gets its own sentence, because each has
// its own fix: a switch in Settings, a mode nobody in it can change, a tick on
// a key — and one that has no fix at all.
export function refusedCapabilityMessage(
  capability: Capability,
  reason: CapabilityRefusalReason,
  language: CapabilityLanguage = "en",
): string {
  const plain = PLAIN_WORDS[language][capability];
  if (language === "zh") {
    if (reason === "global") {
      return `这需要${plain},而你把这一项关掉了。要用的话,到设置里打开。`;
    }
    if (reason === "mode") return `这需要${plain},而你当前所在的模式不允许。`;
    if (reason === "token") {
      return `这需要${plain},而这把 app key 没有拿到这一项。要给的话,在这把钥匙上勾一下。`;
    }
    return `这需要${plain},而任何 app key 都拿不到这一项。`;
  }
  if (reason === "global") {
    return `This needs to ${plain}, and you have that switched off. Turn it on in Settings to use it.`;
  }
  if (reason === "mode") {
    return `This needs to ${plain}, and the mode you are in does not allow it.`;
  }
  // The two token layers, and they need two sentences: one names something the
  // Owner can go and tick, the other names something nobody can tick at all.
  // Telling an app to ask for a grant that cannot exist is worse than silence.
  if (reason === "token") {
    return `This needs to ${plain}, and this app key was not given that. The Owner can tick it on the key.`;
  }
  return `This needs to ${plain}, and no app key can ever be given that.`;
}

// The refusal the Owner meets when a Method they built will not go out. It is
// the first sentence of the N3 flow, and the window that follows it is in both
// languages — so this one has to be too, or a Chinese-reading household is told
// in English why their own work cannot be shared.
//
// The capabilities are named in the Owner's own words rather than by their code
// names: "fetching" in a sentence is the implementation showing through.
export function cannotShareMessage(
  capabilities: Capability[],
  language: CapabilityLanguage = "en",
): string {
  const plain = capabilities.map(
    (capability) => PLAIN_WORDS[language][capability],
  );
  return language === "zh"
    ? `这个 Method 需要 Vaenyx 还做不到的事(${plain.join("、")}),所以分享不出去。它留在这里,照样能用。`
    : `This Method needs something Vaenyx cannot do yet (${plain.join(", ")}), so it cannot be shared. It is saved here and keeps working for you.`;
}

// Why a mode would not take a capability the Owner just tried to switch on for
// it. It names the fix — the global switch, one card up — because the alternative
// is a switch that springs back with no explanation.
export function modeAboveCeilingMessage(
  capabilities: Capability[],
  language: CapabilityLanguage = "en",
): string {
  const plain = capabilities.map(
    (capability) => PLAIN_WORDS[language][capability],
  );
  return language === "zh"
    ? `整台机器现在都不能${plain.join("、")},模式里当然也开不了。要开的话,先在上面的「能力」里打开。`
    : `This machine cannot ${plain.join(" or ")} at all right now, so a mode cannot be allowed to either. Switch it on in Capabilities first.`;
}

// Why a key would not take a capability the Owner just ticked for it. Three
// refusals, three sentences, because they have three different answers: one is
// never possible, one is a switch one card away, and one is simply a second
// deliberate press.
export function tokenGrantRefusedMessage(
  capabilities: Capability[],
  refusal: TokenGrantRefusal,
  language: CapabilityLanguage = "en",
): string {
  const plain = capabilities.map(
    (capability) => PLAIN_WORDS[language][capability],
  );
  if (language === "zh") {
    if (refusal === "never") {
      return `app key 永远不能${plain.join("、")}。这不是一个开关,是钥匙本身带不了的东西。`;
    }
    if (refusal === "ceiling") {
      return `整台机器现在都不能${plain.join("、")},钥匙自然也给不了。要给的话,先在「能力」里打开。`;
    }
    return `让一把钥匙${plain.join("、")}是单独的一件事:它可以把这台机器变成别人上网的通道。要给的话,单独确认一次。`;
  }
  if (refusal === "never") {
    return `An app key can never ${plain.join(" or ")}. That is not a setting — it is what a key cannot carry.`;
  }
  if (refusal === "ceiling") {
    return `This machine cannot ${plain.join(" or ")} at all right now, so a key cannot be given it either. Switch it on in Capabilities first.`;
  }
  return `Letting a key ${plain.join(" or ")} is its own decision — it can turn this machine into somebody else's way onto the internet. Approve that on its own.`;
}

// ── The one sentence for a backend that cannot ───────────────────────────────
//
// A refusal above is the Owner's own switch saying no. THIS is the other kind
// of no: the switch is on, the Owner asked, and the backend they happen to be
// using cannot do it. Three of those live in the probes and two more in the
// chat turn, and they were five separately worded sentences — which is five
// sentences that drift, until one of them is quietly wrong about what happened.
//
// 🔴 The rule the wording exists to keep: WHEN SOMETHING ELSE DOES THE JOB, IT
// IS NAMED, and what that costs is named with it. A stand-in that nobody
// mentions is the failure mode here — the Owner reads an answer about their
// PDF and never learns that the drawings in it reached nobody.
//
// "Vaenyx cannot … with X" rather than "X cannot …" on purpose: sometimes the
// backend genuinely cannot (a model with no eyes), and sometimes Vaenyx has
// simply not wired it up for that backend (web search). Both are true from the
// Owner's seat, and only one of them is true about the backend, so the sentence
// claims the one that is always true.
export interface BackendStandIn {
  /** What did the job instead. Named, never "something else". */
  by: string;
  /** What using the stand-in costs, in the Owner's own words. */
  cost: string;
}

export function backendCannotMessage(
  backend: string,
  capability: Capability,
  standIn: BackendStandIn | null,
  language: CapabilityLanguage = "en",
): string {
  const plain = PLAIN_WORDS[language][capability];
  if (language === "zh") {
    return standIn
      ? `用${backend},Vaenyx 不能${plain},所以这件事改由${standIn.by}来做 —— ${standIn.cost}。`
      : `用${backend},Vaenyx 不能${plain},也没有拿别的东西顶上。`;
  }
  return standIn
    ? `Vaenyx cannot ${plain} with ${backend}, so ${standIn.by} did it instead — ${standIn.cost}.`
    : `Vaenyx cannot ${plain} with ${backend}, and nothing was put in its place.`;
}

// The tail that turns the note above into something the OWNER hears. The two
// chat-turn sites talk to the model, not to the person, so without this the
// stand-in is named to the only party that already knew about it.
export const SAY_THE_STAND_IN =
  "Tell the Owner this in your own reply wherever it could change the answer. Never let a stand-in pass as the real thing.";

// The message the Owner sees when a Method reaches for something it never
// declared. Naming the capability matters: "this Method wants the web but never
// declared it" is actionable, a wrong answer is not.
export function undeclaredCapabilityMessage(
  capability: Capability,
  language: CapabilityLanguage = "en",
): string {
  const plain = PLAIN_WORDS[language][capability];
  return language === "zh"
    ? `这个 Method 想${plain},但它的 manifest 从来没有声明过这项能力,已经被拒绝。`
    : `This Method tried to ${plain}, but its manifest never declared that capability. It was refused.`;
}
