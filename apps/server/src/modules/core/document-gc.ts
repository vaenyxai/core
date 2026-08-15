// Document cleanup (2026-08-15): uploaded documents and their extracted-text
// sidecars used to have no delete path at all — deleting a conversation
// cascade-deleted its message rows and left the files on disk forever.
//
// Two layers close that, and neither trusts the other to have run:
//   • the delete path: deleteAskVaenyxConversation collects its own
//     document ids BEFORE the cascade and calls removeUnreferencedDocuments
//     after it — a file goes the moment no message row anywhere still
//     references it;
//   • the safety net: a post-boot sweep removes whatever any other path
//     orphaned (a Mode's inbox deleted with the Mode, an upload that was
//     never attached to a message, a file the delete path could not remove
//     because something held it open). Age-gated: only files older than a
//     day are touched, so an upload sitting between "uploaded" and
//     "attached" can never be swept out from under the Owner.
//
// Everything funnels through documents.ts's id-pattern-guarded helpers, so
// nothing outside the documents directory can ever be named or deleted.
import type { DatabaseHandle } from "../../db/database.js";
import { deleteDocumentFiles, listStoredDocuments } from "./documents.js";

// How old a file must be before the sweep may touch it. A day is far past
// any real upload-to-send gap while still reclaiming space promptly.
export const SWEEP_MINIMUM_AGE_MS = 24 * 60 * 60_000;

function isReferenced(database: DatabaseHandle, documentId: string): boolean {
  const row = database.sqlite
    .prepare(
      `SELECT 1 AS found FROM ask_vaenyx_messages WHERE document_id = ? LIMIT 1`,
    )
    .get(documentId) as { found: number } | undefined;
  return row !== undefined;
}

// Delete each named document's files unless some message row — in ANY
// conversation — still references it. Returns how many were removed.
export function removeUnreferencedDocuments(
  database: DatabaseHandle,
  dataDirectory: string,
  documentIds: string[],
): number {
  let removed = 0;
  for (const documentId of new Set(documentIds)) {
    if (isReferenced(database, documentId)) continue;
    if (deleteDocumentFiles(dataDirectory, documentId)) removed += 1;
  }
  return removed;
}

// The boot-time safety net: every stored file old enough to touch and
// referenced by no message row goes. Returns how many were removed.
export function sweepOrphanDocuments(
  database: DatabaseHandle,
  dataDirectory: string,
  now = Date.now(),
): number {
  let removed = 0;
  for (const stored of listStoredDocuments(dataDirectory)) {
    if (now - stored.modifiedAt < SWEEP_MINIMUM_AGE_MS) continue;
    if (isReferenced(database, stored.documentId)) continue;
    if (deleteDocumentFiles(dataDirectory, stored.documentId)) removed += 1;
  }
  return removed;
}
