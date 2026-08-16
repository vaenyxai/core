-- READ STATE BELONGS TO THE OWNER, NOT TO THE DEVICE (Oskar, 2026-08-16:
-- "如果手机读了,电脑就要读了").
--
-- Unread dots used to live in each browser's localStorage, so reading a
-- result on the phone left the same result lit on the computer — one person,
-- two contradictory answers to "have I seen this?". The instance is
-- single-owner and already the source of truth for everything else in the
-- sidebar, so the watermark moves here.
--
-- seen_at holds the thread's updated_at AS IT WAS when the Owner last had it
-- open — the same value, copied — so "unread" is the plain comparison
-- updated_at > seen_at with no format mismatch possible between SQLite's
-- CURRENT_TIMESTAMP and the ISO strings the app writes.
--
-- Seeded from updated_at rather than left NULL: everything that already
-- happened counts as read, exactly like the per-device watermark it replaces.
-- A sidebar that lights up wall-to-wall after an update says nothing.
ALTER TABLE vaenyx_threads ADD COLUMN seen_at TEXT;

UPDATE vaenyx_threads SET seen_at = updated_at;
