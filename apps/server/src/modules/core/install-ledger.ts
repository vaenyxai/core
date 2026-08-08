// THE RECORD OF WHAT WAS INSTALLED, so an update can be honest about what it
// is about to do.
//
// Three questions that had no answer before this file existed, and each one
// matters at exactly the wrong moment — when somebody is deciding whether to
// press Update:
//
//   1. WHICH VERSION DID I ACTUALLY INSTALL? Reading the version out of the
//      files does not answer it: those are the files the Owner may have
//      edited. The number recorded on arrival is the only fixed point.
//   2. HAVE I CHANGED IT? The installer has always refused to overwrite a
//      local copy "because it may have been edited" — while having no way to
//      tell whether it had been. The hash on arrival, compared with the hash
//      now, is that way.
//   3. CAN I GO BACK? Only if the outgoing version was kept. It is kept here,
//      whole, so undoing needs no network — regret usually arrives in the
//      middle of trying to use the thing.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import type { DatabaseHandle } from "../../db/database.js";

export type InstalledKind = "method" | "routine";
export type UpdatePolicy = "follow" | "locked" | "skipped";

export interface InstalledItem {
  id: string;
  installedAt: string;
  installedHash: string | null;
  installedVersion: string;
  kind: InstalledKind;
  publisher: string | null;
  skippedVersion: string | null;
  sourceUrl: string | null;
  updatePolicy: UpdatePolicy;
}

interface InstalledRow {
  id: string;
  installed_at: string;
  installed_hash: string | null;
  installed_version: string;
  kind: string;
  publisher: string | null;
  skipped_version: string | null;
  source_url: string | null;
  update_policy: string;
}

function toItem(row: InstalledRow): InstalledItem {
  return {
    id: row.id,
    installedAt: row.installed_at,
    installedHash: row.installed_hash,
    installedVersion: row.installed_version,
    kind: row.kind as InstalledKind,
    publisher: row.publisher,
    skippedVersion: row.skipped_version,
    sourceUrl: row.source_url,
    updatePolicy: row.update_policy as UpdatePolicy,
  };
}

export function recordInstall(
  database: DatabaseHandle,
  input: {
    hash?: string | null;
    id: string;
    kind: InstalledKind;
    publisher?: string | null;
    sourceUrl?: string | null;
    version: string;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO installed_items (
         id, kind, installed_version, installed_hash, installed_at,
         source_url, publisher, update_policy
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'follow')
       ON CONFLICT(id, kind) DO UPDATE SET
         installed_version = excluded.installed_version,
         installed_hash = excluded.installed_hash,
         installed_at = excluded.installed_at,
         source_url = excluded.source_url,
         publisher = excluded.publisher,
         -- An update does not silently re-arm a version the Owner skipped or
         -- a lock they set; only the version they now have moves.
         skipped_version = NULL`,
    )
    .run(
      input.id,
      input.kind,
      input.version,
      input.hash ?? null,
      new Date().toISOString(),
      input.sourceUrl ?? null,
      input.publisher ?? null,
    );
}

export function getInstalledItem(
  database: DatabaseHandle,
  id: string,
  kind: InstalledKind,
): InstalledItem | null {
  const row = database.sqlite
    .prepare(`SELECT * FROM installed_items WHERE id = ? AND kind = ?`)
    .get(id, kind) as unknown as InstalledRow | undefined;
  return row ? toItem(row) : null;
}

export function listInstalledItems(database: DatabaseHandle): InstalledItem[] {
  const rows = database.sqlite
    .prepare(`SELECT * FROM installed_items ORDER BY id ASC`)
    .all() as unknown as InstalledRow[];
  return rows.map(toItem);
}

export function setUpdatePolicy(
  database: DatabaseHandle,
  id: string,
  kind: InstalledKind,
  policy: UpdatePolicy,
  skippedVersion: string | null = null,
): void {
  database.sqlite
    .prepare(
      `UPDATE installed_items
          SET update_policy = ?, skipped_version = ?
        WHERE id = ? AND kind = ?`,
    )
    .run(policy, policy === "skipped" ? skippedVersion : null, id, kind);
}

/**
 * Should this item be offered as an update?
 *
 * 'locked' never is. 'skipped' is offered again only for a version other than
 * the one that was skipped — skipping is about one release, not about giving
 * up on the item.
 */
export function wantsUpdateOffer(
  item: InstalledItem | null,
  availableVersion: string,
): boolean {
  if (!item) return true;
  if (item.updatePolicy === "locked") return false;
  if (item.updatePolicy === "skipped" && item.skippedVersion === availableVersion) {
    return false;
  }
  return true;
}

// ── Keeping a way back ────────────────────────────────────────────────────

/** Read a whole item folder into memory as {relative path: contents}. Small
 *  by nature: recipes and JSON, tens of kilobytes. */
export function snapshotFolder(folder: string): Record<string, string> {
  const files: Record<string, string> = {};
  if (!existsSync(folder)) return files;
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      // A backup is for going back, not for carrying every accumulated
      // example along with it — those are the Owner's and stay put.
      const relativePath = relative(folder, full).split("\\").join("/");
      if (relativePath.startsWith("examples/")) continue;
      try {
        if (statSync(full).size > 2_000_000) continue;
        files[relativePath] = readFileSync(full, "utf8");
      } catch {
        // Binary or unreadable: skipped rather than corrupting the snapshot.
      }
    }
  };
  walk(folder);
  return files;
}

export function keepRollback(
  database: DatabaseHandle,
  input: { folder: string; id: string; kind: InstalledKind; version: string },
): void {
  const files = snapshotFolder(input.folder);
  if (Object.keys(files).length === 0) return;
  database.sqlite
    .prepare(
      `INSERT INTO item_rollbacks (id, kind, version, files, replaced_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id, kind) DO UPDATE SET
         version = excluded.version,
         files = excluded.files,
         replaced_at = excluded.replaced_at`,
    )
    .run(
      input.id,
      input.kind,
      input.version,
      JSON.stringify(files),
      new Date().toISOString(),
    );
}

export interface RollbackInfo {
  replacedAt: string;
  version: string;
}

export function availableRollback(
  database: DatabaseHandle,
  id: string,
  kind: InstalledKind,
): RollbackInfo | null {
  const row = database.sqlite
    .prepare(
      `SELECT version, replaced_at AS replacedAt FROM item_rollbacks
        WHERE id = ? AND kind = ?`,
    )
    .get(id, kind) as unknown as RollbackInfo | undefined;
  return row ?? null;
}

/**
 * Put the previous version back. Deliberately offline: everything needed is
 * already on this disk, because the moment somebody wants to undo an update
 * is usually the moment they are trying to get something done.
 */
export function restoreRollback(
  database: DatabaseHandle,
  id: string,
  kind: InstalledKind,
  folder: string,
): boolean {
  const row = database.sqlite
    .prepare(`SELECT version, files FROM item_rollbacks WHERE id = ? AND kind = ?`)
    .get(id, kind) as unknown as { files: string; version: string } | undefined;
  if (!row) return false;
  let files: Record<string, string>;
  try {
    files = JSON.parse(row.files) as Record<string, string>;
  } catch {
    return false;
  }

  // The examples are the Owner's and are not in the snapshot, so the folder is
  // cleared of everything EXCEPT them before the old files go back.
  if (existsSync(folder)) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.name === "examples") continue;
      rmSync(join(folder, entry.name), { force: true, recursive: true });
    }
  }
  mkdirSync(folder, { recursive: true });
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = resolve(folder, relativePath);
    // Never write outside the item's own folder, whatever the snapshot says.
    if (!target.startsWith(resolve(folder))) continue;
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(target, contents, "utf8");
  }

  database.sqlite
    .prepare(
      `UPDATE installed_items SET installed_version = ? WHERE id = ? AND kind = ?`,
    )
    .run(row.version, id, kind);
  database.sqlite
    .prepare(`DELETE FROM item_rollbacks WHERE id = ? AND kind = ?`)
    .run(id, kind);
  return true;
}
