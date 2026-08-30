// THE ONE CONVERSATION VAENYX SPEAKS FROM.
//
// One per Mode, permanent, pinned, and protected against the three ordinary
// ways a conversation ends: deleted, archived, or quietly duplicated until
// nobody knows which one is real. It is otherwise an ordinary chat — same
// composer, same history, same model — because a surface the Owner cannot
// speak back into is a notification tray wearing a chat's clothes.
//
// 🔴 THE PROTECTION HANGS OFF `kind`, NEVER OFF A TITLE OR A KNOWN ID.
// The title is the agent's name and the Owner can change it. A hardcoded id
// would be a second source of truth that drifts the first time somebody
// restores a backup. `kind = 'inbox'` is the only fact about this row that no
// ordinary action can alter, so every guard reads that and nothing else.
//
// The database enforces "one per Mode" on top of this (0066), on
// COALESCE(mode_id, '') so that User Mode — where mode_id is NULL, and where
// every household has exactly one — is constrained like all the others.
import { randomUUID } from "node:crypto";

import type { DatabaseHandle } from "../../db/database.js";
import { getOwner } from "../guard/auth.js";

export interface InboxThread {
  id: string;
  conversationId: string;
  modeId: string | null;
}

interface InboxRow {
  id: string;
  conversation_id: string | null;
  mode_id: string | null;
}

/** The Mode's inbox, if it has been made yet. */
export function findInboxThread(
  database: DatabaseHandle,
  modeId: string | null,
): InboxThread | null {
  const row = database.sqlite
    .prepare(
      // IS, not =, because User Mode is NULL and = never matches NULL.
      `SELECT id, conversation_id, mode_id
         FROM vaenyx_threads
        WHERE kind = 'inbox' AND mode_id IS ?`,
    )
    .get(modeId) as InboxRow | undefined;
  if (!row?.conversation_id) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    modeId: row.mode_id,
  };
}

/**
 * The Mode's inbox, made if it is not there yet.
 *
 * Idempotent by construction: the unique index means a second caller racing
 * this one loses its insert, and the loser then reads the winner's row rather
 * than failing. Called on demand rather than by a migration — a migration
 * cannot know the agent's name, and inventing a conversation for a Mode nobody
 * has opened yet is work done for a screen nobody is looking at.
 */
export function ensureInboxThread(
  database: DatabaseHandle,
  ownerId: string,
  modeId: string | null,
  title: string,
): InboxThread {
  const existing = findInboxThread(database, modeId);
  if (existing) return existing;

  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_conversations
           (id, owner_id, title, mode_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, ownerId, title, modeId, now, now);

    database.sqlite
      .prepare(
        `INSERT INTO vaenyx_threads
           (id, owner_id, kind, title, status, conversation_id, mode_id,
            created_at, updated_at, seen_at)
         VALUES (?, ?, 'inbox', ?, 'pinned', ?, ?, ?, ?, ?)`,
      )
      .run(id, ownerId, title, id, modeId, now, now, now);
  } catch (error) {
    // Lost a race against another caller: the row the winner wrote is just as
    // good as the one this call wanted, so read it rather than throwing.
    const winner = findInboxThread(database, modeId);
    if (winner) return winner;
    throw error;
  }

  return { id, conversationId: id, modeId };
}

/**
 * Is this conversation the Mode's protected inbox?
 *
 * Every guard goes through here so there is one definition of "protected", and
 * so adding a second protected kind later is one change rather than a hunt.
 */
export function isProtectedThread(
  database: DatabaseHandle,
  conversationId: string,
): boolean {
  const row = database.sqlite
    .prepare(
      `SELECT 1 AS found FROM vaenyx_threads
        WHERE conversation_id = ? AND kind = 'inbox'`,
    )
    .get(conversationId) as { found: number } | undefined;
  return row !== undefined;
}

/**
 * Vaenyx speaks: drop a note into a Mode's inbox conversation.
 *
 * THE rule this exists for (Oskar, 2026-08-30): 任何要通知我的信息,都是主对话
 * 告诉我 — anything the system wants to tell the Owner arrives as a message in
 * the one conversation Vaenyx speaks from, with a push at most announcing it.
 * Mode digests, rule-refusal alerts and blocked-action notices all land here
 * (modeId = null: the Owner's own User Mode inbox).
 *
 * Best-effort by design: a note is never worth failing the event it reports.
 */
export function postInboxNote(
  database: DatabaseHandle,
  modeId: string | null,
  text: string,
): void {
  try {
    const owner = getOwner(database);
    if (!owner) return;
    // "Vaenyx" only ever names a BRAND-NEW inbox; the /inbox route re-syncs
    // the title to the agent's real name every time anybody reads it.
    const inbox = ensureInboxThread(database, owner.id, modeId, "Vaenyx");
    const now = new Date().toISOString();
    database.sqlite
      .prepare(
        `INSERT INTO ask_vaenyx_messages (
          id, conversation_id, role, content, status, web_search_used, created_at
        ) VALUES (?, ?, 'assistant', ?, 'completed', 0, ?)`,
      )
      .run(randomUUID(), inbox.conversationId, text, now);
    // The thread rises in the sidebar the moment the note lands.
    database.sqlite
      .prepare("UPDATE ask_vaenyx_conversations SET updated_at = ? WHERE id = ?")
      .run(now, inbox.conversationId);
    database.sqlite
      .prepare("UPDATE vaenyx_threads SET updated_at = ? WHERE id = ?")
      .run(now, inbox.id);
  } catch {
    // Never break the caller.
  }
}

/**
 * Remove a Mode's inbox, for when the Mode itself is being deleted.
 *
 * deleteMode sets mode_id = NULL across five tables on its way out. With the
 * unique index in place that would drag a Custom Mode's inbox into User Mode,
 * where an inbox already exists, and the whole delete would fail half way
 * through — so the inbox goes first, deliberately, before anything is moved.
 */
export function deleteInboxThreadForMode(
  database: DatabaseHandle,
  modeId: string,
): void {
  const inbox = findInboxThread(database, modeId);
  if (!inbox) return;
  // The thread row cascades from the conversation (0013's FK), so deleting the
  // conversation is enough and leaves nothing orphaned.
  database.sqlite
    .prepare("DELETE FROM ask_vaenyx_conversations WHERE id = ?")
    .run(inbox.conversationId);
}
