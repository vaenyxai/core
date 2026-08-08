-- Proposed FACTS ride the review queue that already exists, rather than
-- getting a second one. Four nullable columns are the whole difference between
-- a proposed trait ("prefers short answers") and a proposed fact
-- (home_address = 44 New Road, true since 2025-03).
--
-- Why not a new source_type value: source_type carries a CHECK constraint, and
-- changing a CHECK in SQLite means rebuilding the table and copying every row
-- of a queue the Owner has pending work in. A nullable column says the same
-- thing and cannot lose anybody's data.
--
-- 🔴 A ROW WITH proposed_slot SET MUST NOT GO THROUGH THE ORDINARY APPROVE
-- PATH. approveVaenyxMeCandidate collapses every candidate in a category onto
-- the one existing vaenyx_me_items row for that category, so approving a
-- second candidate silently overwrites the first. That is survivable for a
-- vague trait and unacceptable for an address. Fact candidates are approved by
-- approveFactCandidate in facts-extract.ts, which writes to `facts` instead.
ALTER TABLE vaenyx_me_candidates ADD COLUMN proposed_slot TEXT;
ALTER TABLE vaenyx_me_candidates ADD COLUMN proposed_value TEXT;

-- When the fact was true out in the world, as the extractor read it out of the
-- Owner's own words: "we moved last March" -> 2025-03. Partial is expected.
ALTER TABLE vaenyx_me_candidates ADD COLUMN proposed_event_time TEXT;

-- Which mode the conversation belonged to, so an approved fact lands in the
-- right household member's memory and not in everybody's.
ALTER TABLE vaenyx_me_candidates ADD COLUMN mode_id TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_slot
  ON vaenyx_me_candidates (proposed_slot, status);

-- Where the extractor got to in each conversation, so a nightly pass reads the
-- new messages and not the whole history again. Also the idle gate: extraction
-- may only run when the conversation has been quiet, because summarising work
-- that is still happening produces facts about a half-finished thought.
CREATE TABLE IF NOT EXISTS fact_extraction_state (
  conversation_id TEXT PRIMARY KEY NOT NULL
    REFERENCES ask_vaenyx_conversations(id) ON DELETE CASCADE,
  last_message_id TEXT,
  last_run_at TEXT NOT NULL,
  -- Bumped when a pass fails, so a conversation that breaks the extractor
  -- backs off instead of being retried every few minutes for ever.
  failures INTEGER NOT NULL DEFAULT 0
);
