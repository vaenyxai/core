-- WHAT THE INBOX IS POINTING AT, AS ITS OWN DURABLE RECORD (H-001).
--
-- The inbox count is already derived live from candidate status — that part
-- stays, because a derived number cannot drift. What this table adds is the
-- REFERENCE: which sources have entered the inbox, per Mode, exactly once.
-- Today there is one source kind and the mapping is one-to-one, so the table
-- looks redundant; the day a second kind arrives (a failed task, a date), the
-- inbox needs a spine that is not "whatever some other table's status implies",
-- and retrofitting a spine under a live surface is the expensive version of
-- writing it down now.
--
-- No status column, deliberately. Handled-ness is read by joining to the
-- source's own durable state (candidate status is SQL, not chat text or model
-- output) — a second status here would be a second clock to keep right.
CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY NOT NULL,
  -- NULL is User Mode and is a real value; the unique index below folds it to
  -- '' so that User Mode is deduplicated like every other Mode instead of
  -- being the one Mode where duplicates are legal.
  mode_id TEXT,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('vaenyx_me_candidate')),
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS inbox_items_one_per_source
ON inbox_items(COALESCE(mode_id, ''), source_kind, source_id);

-- Backfill: everything currently waiting becomes an inbox item, in its own
-- Mode. Profile and fact proposals share the one source kind — the split
-- between them is proposed_slot, not a second kind (H-001, in as many words).
INSERT OR IGNORE INTO inbox_items (id, mode_id, source_kind, source_id)
SELECT 'inbox-' || id, mode_id, 'vaenyx_me_candidate', id
FROM vaenyx_me_candidates
WHERE status = 'pending_review';
