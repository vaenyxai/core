// WHAT AN UPDATE IS ABOUT TO COST, worked out before it is offered.
//
// A version number tells somebody nothing they can act on. What they need to
// know is what will be different afterwards, and specifically the three things
// that are not obvious and cannot be undone by guessing:
//
//   • the edits they made to this recipe will be overwritten
//   • the keys they gave other apps will stop working until re-approved
//   • their accumulated examples are kept
//
// This module answers those; the dialog just prints them.
//
// 🔴 NOTHING HERE UPDATES ANYTHING. It compares and reports. Installing is the
// Owner's deliberate act every single time, including for an update — an
// author can change their repository and still cannot reach anybody's machine,
// which is the strongest safety property this product has and it holds only
// because nothing moves on its own.
import type { DatabaseHandle } from "../../db/database.js";
import { getInstalledItem, wantsUpdateOffer, type InstalledKind } from "./install-ledger.js";
import { methodContentHash } from "./methods.js";

export interface UpdateConsequences {
  /** The version on this machine, as recorded when it was installed. */
  currentVersion: string;
  /** How many examples are kept through the update. Always kept — said out
   *  loud because it is the reassuring half of the message. */
  examplesKept: number;
  /** Keys held by outside apps that will need approving again. */
  keysNeedingReapproval: string[];
  /** 🔴 Has the Owner changed this since it arrived? */
  locallyEdited: boolean;
  newVersion: string;
  /** Whether a previous version is on disk to go back to. */
  rollbackAvailable: boolean;
}

/** Semver-ish comparison. Community versions are author-supplied strings and
 *  a missing or odd one must never be read as "newer than everything". */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (value: string): number[] =>
    value
      .trim()
      .replace(/^v/i, "")
      .split(/[.\-+]/)
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0));
  const a = parse(candidate);
  const b = parse(current);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

/**
 * Has this item been changed since it was installed?
 *
 * The installer has always refused to overwrite a local copy on the grounds
 * that it "may have been edited", while having no way to tell whether it had
 * been. This is that way: the hash recorded on arrival, against the hash now.
 * Without it somebody eventually loses work they tuned and never finds out
 * where it went.
 */
export function isLocallyEdited(
  database: DatabaseHandle,
  libraryDirectory: string,
  id: string,
): boolean {
  const installed = getInstalledItem(database, id, "method");
  if (!installed?.installedHash) return false;
  try {
    return methodContentHash(libraryDirectory, id) !== installed.installedHash;
  } catch {
    return false;
  }
}

/** Which app keys will stop working when this Method's content changes.
 *
 *  The rule this reads is already settled and is not re-litigated here: a
 *  self-made Method re-locks itself silently, a community one forces the Owner
 *  to approve again. Saying so BEFORE the update is the whole point — an app
 *  starting to answer 409 an hour later is not obviously connected to a button
 *  pressed earlier. */
export function keysNeedingReapproval(
  database: DatabaseHandle,
  methodId: string,
): string[] {
  const rows = database.sqlite
    .prepare(
      `SELECT app_profiles.name AS name
         FROM app_profile_methods
         JOIN app_profiles ON app_profiles.id = app_profile_methods.profile_id
        WHERE app_profile_methods.method_id = ?
          AND app_profiles.enabled = 1`,
    )
    .all(methodId) as unknown as { name: string }[];
  return rows.map((row) => row.name);
}

export function describeUpdate(
  database: DatabaseHandle,
  options: {
    availableVersion: string;
    exampleCount: number;
    id: string;
    kind: InstalledKind;
    libraryDirectory: string;
    rollbackAvailable: boolean;
  },
): UpdateConsequences | null {
  const installed = getInstalledItem(database, options.id, options.kind);
  const currentVersion = installed?.installedVersion ?? "0.0.0";
  if (!isNewerVersion(options.availableVersion, currentVersion)) return null;
  if (!wantsUpdateOffer(installed, options.availableVersion)) return null;

  return {
    currentVersion,
    examplesKept: options.exampleCount,
    keysNeedingReapproval:
      options.kind === "method"
        ? keysNeedingReapproval(database, options.id)
        : [],
    locallyEdited:
      options.kind === "method"
        ? isLocallyEdited(database, options.libraryDirectory, options.id)
        : false,
    newVersion: options.availableVersion,
    rollbackAvailable: options.rollbackAvailable,
  };
}

/**
 * What the dialog should suggest pressing.
 *
 * An edited item defaults to "save a copy" rather than "update": once
 * somebody has changed a recipe they and the author have diverged, and
 * merging by force makes them re-make the same decision at every release.
 */
export function recommendedAction(
  consequences: UpdateConsequences,
): "keep-both" | "update" {
  return consequences.locallyEdited ? "keep-both" : "update";
}
