// FETCHING — "Files on this machine" (design:
// private/docs/library-architecture.md §能力).
//
// 🔴 THIS IS THE ONLY FILE IN VAENYX THAT HANDS THE OWNER'S DISK TO A MODEL, so
// the whole safety story lives here rather than being spread across the callers:
//
//   1. the global switch must be on          (the ceiling, capabilities.ts)
//   2. the mode the Owner is in must allow it (a mode may only narrow)
//   3. the Owner must have named a FOLDER     (empty by default — switching the
//      capability on still reads nothing at all)
//   4. the file must really be inside one of those folders, checked on the
//      REALPATH so a link inside a folder cannot point out of it
//   5. it must be text, and small
//
// A caller never gets a path and permission separately: `grantFetchAccess`
// either returns an object that can open files, or null. There is no way to
// hold one without the other, which is the only shape that survives somebody
// adding a sixth caller in a hurry.
//
// 🔴 Never through a Method Token. `NEVER_VIA_TOKEN` in capabilities.ts already
// strips `fetching` from anything a token carries, in three separate places; the
// grant below takes an Owner id because there is no other kind of caller.
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import type { DatabaseHandle } from "../../db/database.js";
import { recordAudit } from "../guard/audit.js";
import { decideCapabilities } from "./capabilities.js";

const FOLDERS_KEY = "capabilities.fetching.folders";

// Small on purpose. Every extra folder is another thing the Owner has to
// remember they said yes to, and a whitelist nobody can hold in their head is
// not a whitelist.
const MAX_FETCH_FOLDERS = 8;

// About 50,000 words. Big enough for any letter, note, spreadsheet export or
// bit of code; small enough that one careless "read everything" cannot empty
// the Owner's model allowance in a single turn.
export const MAX_FETCH_BYTES = 200_000;

// One folder listing, capped. A Downloads folder with 4,000 files in it would
// otherwise BE the whole answer.
const MAX_FETCH_ENTRIES = 200;

// 🔴 WHICH BACKENDS GET A LIVE TOOL LOOP — and nothing more than that. Fetching
// itself works on every backend: VAENYX opens the file, against the whitelist
// below, and hands over the words. This list only names the channels that can
// ask for a SECOND file after reading the first, because they can put a tool
// call in the middle of an answer; everything else is handed the folder listing
// and the named file up front.
//
// It was once the list of backends that could fetch AT ALL, which made it a
// gate. It is not one any more (Oskar, 2026-08-01: "不应该限制到claude"), and
// anything reading it as one — a Test button that reports "not built", copy that
// names Claude as the only one — is describing a design that is gone.
export const FETCHING_TOOL_LOOP_PROVIDER_IDS = ["claude-sub"];

// 🔴 WHICH FILE DID THEY MEAN. Every backend without a tool loop gets one file
// opened up front, and the rule for choosing it used to be: the message must
// contain the filename, character for character, extension and all. Nobody
// talks like that. "读一下三月的报价单" never matched `quote-march.txt`, so the
// capability was switched on, folders were named, and it still answered from
// nothing (Oskar, 2026-08-17: 把 fetching 這個功能給它做好了).
//
// This matches the way the name is SAID instead: the extension comes off,
// separators become spaces, and a name wins when every one of its own words is
// somewhere in the message. `quote march` therefore matches "the March quote"
// and "quote-march.txt" alike, while `notes` no longer matches a message that
// merely contains the word "notes" as ordinary prose — a one-word name must
// appear as a whole word, not as a fragment of another.
//
// A TIE IS NOT A GUESS. Two files matching equally well is exactly the case
// the Owner said must never be decided silently: the caller is handed both and
// asks, rather than opening the first one and sounding certain.
export interface FetchNameMatch {
  /** The single best file, when one is clearly ahead. */
  best: string | null;
  /** Every name that scored as well as the best — length > 1 means ask. */
  tied: string[];
}

function nameWords(fileName: string): string[] {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

/** Does `message` contain `word` as a whole word? CJK has no spaces, so a
 *  plain substring is the only honest test there; Latin words must not match
 *  inside a longer one ("note" must not match "notebook"). */
function mentions(message: string, word: string): boolean {
  if (!/[\p{Script=Latin}\p{Script=Cyrillic}]/u.test(word)) {
    return message.includes(word);
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, "u").test(
    message,
  );
}

export function matchFetchName(
  message: string,
  fileNames: string[],
): FetchNameMatch {
  const haystack = message.toLowerCase();
  let bestScore = 0;
  let tied: string[] = [];

  for (const fileName of fileNames) {
    const words = nameWords(fileName);
    if (words.length === 0) continue;
    // Every word of the name has to be there. Partial matches are how
    // "budget-2025.txt" would open when someone said "2025".
    if (!words.every((word) => mentions(haystack, word))) continue;
    // A longer, more specific name beats a shorter one it contains: asking for
    // "quote march final" should not open `quote.txt`.
    const score = words.join("").length;
    if (score > bestScore) {
      bestScore = score;
      tied = [fileName];
    } else if (score === bestScore) {
      tied.push(fileName);
    }
  }

  return { best: tied.length === 1 ? tied[0]! : null, tied };
}

export type FetchFolderRefusal =
  | "not-absolute"
  | "missing"
  | "not-a-folder"
  | "protected"
  | "too-many";

export interface FetchFolderRejection {
  folder: string;
  reason: FetchFolderRefusal;
}

export interface FetchFolderWrite {
  folders: string[];
  rejected: FetchFolderRejection[];
}

/** One thing found inside a whitelisted folder, for the model to choose from. */
export interface FetchEntry {
  name: string;
  kind: "file" | "folder";
  bytes: number;
  modified: string;
}

export interface FetchedFile {
  path: string;
  text: string;
  bytes: number;
}

// Why a read was refused, as a code the caller turns into a sentence. Each one
// has a different fix, so one word for all of them would be useless to the
// person who has to act on it.
export type FetchRefusal =
  | "outside"
  | "missing"
  | "not-a-file"
  | "too-big"
  | "binary";

export class FetchRefusedError extends Error {
  readonly refusal: FetchRefusal;
  constructor(refusal: FetchRefusal, message: string) {
    super(message);
    this.name = "FetchRefusedError";
    this.refusal = refusal;
  }
}

// Windows compares paths without case and Linux does not, so the comparison has
// to know which machine it is on. Both sides are already canonical (each folder
// was realpath'd when it was saved, each target is realpath'd before it is
// checked) — the lowercasing is insurance against a drive letter or a short
// name that came back cased differently.
function comparable(path: string): string {
  return process.platform === "win32" ? path.toLowerCase() : path;
}

// 🔴 NOT `startsWith`. The folder C:\Users\oskar\Docs is a string prefix of
// C:\Users\oskar\DocsSecret, so a prefix test hands over a folder the Owner
// never named. `relative` answers the question that was actually asked: how do
// you get from the folder to the target, and does that involve leaving it.
function containment(
  folder: string,
  target: string,
): "same" | "inside" | "outside" {
  const step = relative(comparable(folder), comparable(target));
  if (step === "") return "same";
  if (step === ".." || step.startsWith(`..${sep}`) || isAbsolute(step)) {
    return "outside";
  }
  return "inside";
}

function canonical(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

export function readFetchFolders(database: DatabaseHandle): string[] {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(FOLDERS_KEY) as { value?: string } | undefined;
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    // A list that cannot be read is not a list that allows everything.
    return [];
  }
}

// Normalise-on-write, the same discipline the relay's origin list uses: what
// lands in the database is already absolute, already real, already deduped.
// Doing it here rather than at read time means the check that matters — is this
// file inside one of the folders — never has to trust a stored string.
//
// `protectedPaths` is Vaenyx's own private data (the database, the backups, the
// stored model keys). A folder that contains it, or sits inside it, is refused
// however the Owner typed it: the point of the whitelist is that the Owner
// chooses, and nobody chooses to hand over their own key store by accident.
export function writeFetchFolders(
  database: DatabaseHandle,
  folders: string[],
  protectedPaths: string[],
): FetchFolderWrite {
  const guarded = protectedPaths
    .map((path) => canonical(path) ?? resolve(path))
    .filter((path) => path.length > 0);
  const kept: string[] = [];
  const rejected: FetchFolderRejection[] = [];

  for (const raw of folders) {
    const typed = raw.trim();
    if (!typed) continue;
    if (!isAbsolute(typed)) {
      rejected.push({ folder: typed, reason: "not-absolute" });
      continue;
    }
    const real = canonical(typed);
    if (!real) {
      rejected.push({ folder: typed, reason: "missing" });
      continue;
    }
    let stats;
    try {
      stats = statSync(real);
    } catch {
      rejected.push({ folder: typed, reason: "missing" });
      continue;
    }
    if (!stats.isDirectory()) {
      rejected.push({ folder: typed, reason: "not-a-folder" });
      continue;
    }
    const clashes = guarded.some(
      (path) =>
        containment(real, path) !== "outside" ||
        containment(path, real) !== "outside",
    );
    if (clashes) {
      rejected.push({ folder: typed, reason: "protected" });
      continue;
    }
    if (kept.some((entry) => comparable(entry) === comparable(real))) continue;
    if (kept.length >= MAX_FETCH_FOLDERS) {
      rejected.push({ folder: typed, reason: "too-many" });
      continue;
    }
    kept.push(real);
  }

  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = CURRENT_TIMESTAMP`,
    )
    .run(FOLDERS_KEY, JSON.stringify(kept));
  return { folders: kept, rejected };
}

/** Permission and the ability to use it, welded together. */
export interface FetchAccess {
  /** The folders this turn may look in — absolute, real, already checked. */
  readonly folders: string[];
  list(folder?: string): FetchEntry[];
  open(path: string): FetchedFile;
}

export interface FetchGrant {
  actorId: string;
  actorName: string;
  /** Vaenyx's own data directories, never readable however the folders are set. */
  protectedPaths: string[];
  modeId?: string | null;
}

// The one question, asked once per turn. null means "this turn may not open
// files", for any of the three reasons, and the caller has nothing it could use
// even if it wanted to.
//
// `decideCapabilities` wants a DECLARED list, because it was written for a
// Method manifest. A chat turn has no manifest, so the turn itself declares the
// one capability it is asking about — which keeps global ∩ mode as the ceiling
// and adds no fourth path that could read the switches differently.
export function grantFetchAccess(
  database: DatabaseHandle,
  grant: FetchGrant,
): FetchAccess | null {
  const decision = decideCapabilities(
    database,
    ["fetching"],
    grant.modeId ?? null,
  );
  if (!decision.allowed.includes("fetching")) return null;

  const folders = readFetchFolders(database)
    .map((folder) => canonical(folder))
    .filter((folder): folder is string => folder !== null);
  if (folders.length === 0) return null;

  const guarded = grant.protectedPaths
    .map((path) => canonical(path) ?? resolve(path))
    .filter((path) => path.length > 0);

  // Every open is audited. The Guard page shows the most recent 200 events, so
  // a turn that reads a folderful of files does push older events off the first
  // page — which is the right trade: an unrecorded read of the Owner's disk is
  // the thing that must never happen, and the record is what makes the whole
  // capability answerable afterwards.
  const note = (
    action: string,
    decisionWord: "allowed" | "denied",
    reason: string,
    resourceId: string,
  ): void => {
    recordAudit(database, {
      actorType: "owner",
      actorId: grant.actorId,
      actorName: grant.actorName,
      action,
      decision: decisionWord,
      reason,
      resourceType: "file",
      resourceId,
    });
  };

  // Where a path the model names actually points. Absolute paths are taken as
  // they are; anything else is tried inside each folder in turn, because the
  // natural thing for a model to say is "notes/january.md" after it has seen a
  // listing.
  const locate = (path: string): string | null => {
    const typed = path.trim();
    if (!typed) return null;
    if (isAbsolute(typed)) return canonical(typed);
    for (const folder of folders) {
      const real = canonical(join(folder, typed));
      if (real) return real;
    }
    return null;
  };

  const inFolder = (real: string): boolean =>
    folders.some((folder) => containment(folder, real) === "inside") &&
    !guarded.some((path) => containment(path, real) !== "outside");

  return {
    folders,
    list(folder) {
      const asked = folder?.trim() ? folder.trim() : null;
      const target = asked ? locate(asked) : null;
      // Named a folder and it is either not there or not one of the allowed
      // ones: refuse, rather than quietly listing everything instead — a
      // listing the model did not ask for is a listing it will believe.
      const reachable =
        target !== null &&
        folders.some((entry) => containment(entry, target) !== "outside") &&
        !guarded.some((path) => containment(path, target) !== "outside");
      if (asked && !reachable) {
        note(
          "fetching.list",
          "denied",
          "A folder outside the ones the Owner allowed was refused.",
          asked,
        );
        throw new FetchRefusedError(
          "outside",
          "That folder is not one of the folders you allowed.",
        );
      }
      const roots = target && reachable ? [target] : folders;
      const out: FetchEntry[] = [];
      for (const root of roots) {
        let names: string[];
        try {
          names = readdirSync(root);
        } catch {
          continue;
        }
        for (const name of names) {
          if (out.length >= MAX_FETCH_ENTRIES) break;
          const full = join(root, name);
          let stats;
          try {
            stats = statSync(full);
          } catch {
            // A link that points nowhere, or a file that vanished between the
            // listing and the stat. Leaving it out is the honest answer.
            continue;
          }
          out.push({
            name: roots.length === 1 ? name : full,
            kind: stats.isDirectory() ? "folder" : "file",
            bytes: stats.isDirectory() ? 0 : stats.size,
            modified: stats.mtime.toISOString(),
          });
        }
      }
      note(
        "fetching.list",
        "allowed",
        `Listed ${out.length} item(s) in an allowed folder.`,
        target ?? folders.join(", "),
      );
      return out;
    },

    open(path) {
      const real = locate(path);
      if (!real) {
        note("fetching.open", "denied", "No such file.", path);
        throw new FetchRefusedError("missing", "There is no such file.");
      }
      // 🔴 The containment test runs on the REALPATH, so a link sitting inside
      // an allowed folder and pointing at the rest of the disk is refused here
      // rather than followed.
      if (!inFolder(real)) {
        note(
          "fetching.open",
          "denied",
          "A file outside the folders the Owner allowed was refused.",
          real,
        );
        throw new FetchRefusedError(
          "outside",
          "That file is not inside any of the folders you allowed.",
        );
      }
      let stats;
      try {
        stats = statSync(real);
      } catch {
        note("fetching.open", "denied", "No such file.", real);
        throw new FetchRefusedError("missing", "There is no such file.");
      }
      if (!stats.isFile()) {
        note("fetching.open", "denied", "Not a file.", real);
        throw new FetchRefusedError(
          "not-a-file",
          "That is a folder, not a file.",
        );
      }
      // The size is checked BEFORE the read, the way the document page gate is,
      // so a refusal costs nothing and names the number.
      if (stats.size > MAX_FETCH_BYTES) {
        note(
          "fetching.open",
          "denied",
          `Refused a file of ${stats.size} bytes; the limit is ${MAX_FETCH_BYTES}.`,
          real,
        );
        throw new FetchRefusedError(
          "too-big",
          `That file is ${Math.round(stats.size / 1000)} KB. Vaenyx only opens files up to ${Math.round(MAX_FETCH_BYTES / 1000)} KB this way.`,
        );
      }
      const buffer = readFileSync(real);
      // Refused by CONTENT, never by extension: renaming a photo to .txt would
      // walk straight past an extension list, and the point is not to send
      // megabytes of gibberish to a model that will confidently invent
      // something about it.
      if (!looksLikeText(buffer)) {
        note(
          "fetching.open",
          "denied",
          "Refused a file that is not text.",
          real,
        );
        throw new FetchRefusedError(
          "binary",
          "That file is not text, so Vaenyx cannot open it this way. A PDF or a scan goes through the chat's own attach button instead.",
        );
      }
      note(
        "fetching.open",
        "allowed",
        `Opened ${stats.size} bytes of text from an allowed folder.`,
        real,
      );
      return { path: real, text: buffer.toString("utf8"), bytes: stats.size };
    },
  };
}

// Two questions, both cheap: does it contain a zero byte (nothing textual
// does), and is the whole thing valid UTF-8. A UTF-16 document fails the first
// and a JPEG fails both, which is the right answer for each.
function looksLikeText(buffer: Buffer): boolean {
  const head = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (head.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}
