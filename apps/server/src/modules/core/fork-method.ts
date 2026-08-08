// EDITING SOMEBODY ELSE'S RECIPE MAKES IT YOURS — with their name on it.
//
// The rule this implements, and why it has to be at the moment of EDITING
// rather than at the moment of updating:
//
//   Examples flow to the author of the recipe that produced them.
//
// That single sentence covers every case with no exceptions. An unmodified
// community Method sends its corrections upstream to the author. A modified
// one cannot — the corrections describe a recipe that author never wrote, and
// they have no way to tell. And if the modified one is published, the people
// who install it send THEIR corrections to whoever modified it, because that
// is now the author of the recipe they are running.
//
// It only works if a modified copy can never still claim to be the community
// item. So editing forks, immediately, rather than leaving a changed thing
// wearing somebody else's identity until an update happens to notice.
//
// THE ORIGINAL STAYS (Oskar, 2026-08-09). Two reasons: the Owner keeps
// receiving the author's fixes for it, and any Routine still pointing at it
// keeps working. The fork is a new item beside it, not a replacement.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ForkResult {
  forkId: string;
  originalId: string;
}

export class ForkIdTakenError extends Error {
  constructor(id: string) {
    super(`FORK_ID_TAKEN:${id}`);
    this.name = "ForkIdTakenError";
  }
}

/** A folder name from a person's chosen title: lower case, ascii-safe, and
 *  never empty. The id is the identity on disk, so it cannot carry anything a
 *  path would object to. */
export function toFolderId(title: string, fallback: string): string {
  const cleaned = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

/**
 * An id nothing is using yet, from the one the name suggests.
 *
 * Editing the same community Method a second time is normal — a person tries
 * something, then tries something else. Refusing the second edit because the
 * first copy is still there would be answering a reasonable act with an error.
 */
export function freeForkId(libraryDirectory: string, wanted: string): string {
  if (!existsSync(join(libraryDirectory, wanted))) return wanted;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${wanted}-${n}`;
    if (!existsSync(join(libraryDirectory, candidate))) return candidate;
  }
  throw new ForkIdTakenError(wanted);
}

/** What to put in the name box before the Owner types. Recognisable, and
 *  obviously theirs. */
export function suggestForkName(originalName: string, zh: boolean): string {
  return zh ? `${originalName}(我的)` : `${originalName} (mine)`;
}

/**
 * Copy a Method into a new folder that belongs to this household, with the
 * original permanently recorded on it.
 *
 * 🔴 `derivedFrom` is written by this function and never by a form. It is what
 * makes publishing the fork legitimate — community content is CC BY 4.0, so a
 * derivative is allowed WITH attribution — and it is what stops a fork being
 * quietly passed off as original work.
 */
export function forkMethod(options: {
  forkId: string;
  forkName: string;
  libraryDirectory: string;
  originalId: string;
}): ForkResult {
  const source = join(options.libraryDirectory, options.originalId);
  const target = join(options.libraryDirectory, options.forkId);
  if (!existsSync(source)) throw new Error(`METHOD_MISSING:${options.originalId}`);
  if (existsSync(target)) throw new ForkIdTakenError(options.forkId);

  // The examples come along: they were produced by THIS recipe, so they belong
  // with the copy that keeps it. The original keeps its own copy of them,
  // which is right — it is still the author's recipe and still theirs.
  cpSync(source, target, { recursive: true });

  const metaPath = join(target, "method.json");
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;
  } catch {
    // Unreadable identity file: the copy still becomes this household's, it
    // just starts from nothing rather than failing the whole fork.
    meta = {};
  }

  const originalOwner = typeof meta.owner === "string" ? meta.owner : "";
  const originalVersion = typeof meta.version === "string" ? meta.version : "0.0.0";

  meta.id = options.forkId;
  meta.name = options.forkName;
  // It is this household's now: the author's updates no longer apply to it,
  // and its corrections stay here.
  meta.origin = "self";
  meta.owner = "";
  // Its own version line starts again; it is not a continuation of theirs.
  meta.version = "0.1.0";
  // 🔴 Permanent, and not editable through any form. Publishing a derivative
  // is allowed BECAUSE this is here.
  meta.derivedFrom = {
    author: originalOwner,
    id: options.originalId,
    version: originalVersion,
  };
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  return { forkId: options.forkId, originalId: options.originalId };
}

/** Read the attribution off a Method, for the card and the publish form. */
export function readDerivedFrom(
  libraryDirectory: string,
  methodId: string,
): { author: string; id: string; version: string } | null {
  try {
    const meta = JSON.parse(
      readFileSync(join(libraryDirectory, methodId, "method.json"), "utf8"),
    ) as { derivedFrom?: { author?: string; id?: string; version?: string } };
    const from = meta.derivedFrom;
    if (!from?.id) return null;
    return {
      author: from.author ?? "",
      id: from.id,
      version: from.version ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * May corrections from this Method be sent to a community author?
 *
 * Only when the recipe is still theirs. A fork's corrections describe a recipe
 * its original author never wrote — sending them is not a privacy question, it
 * is misinformation, and the receiving author has no way to detect it.
 */
export function mayReturnCorrectionsUpstream(
  libraryDirectory: string,
  methodId: string,
): boolean {
  try {
    const meta = JSON.parse(
      readFileSync(join(libraryDirectory, methodId, "method.json"), "utf8"),
    ) as { derivedFrom?: unknown; origin?: unknown };
    if (meta.derivedFrom) return false;
    return meta.origin === "community";
  } catch {
    return false;
  }
}
