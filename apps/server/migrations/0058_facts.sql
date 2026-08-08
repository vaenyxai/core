-- WHAT VAENYX KNOWS, AND WHEN IT KNEW IT.
--
-- One row per (slot, value) a fact ever had. Nothing here is ever UPDATEd in
-- place and nothing is ever DELETEd: a fact that stops being true gets a
-- valid_until, and its replacement points back at it. That is what makes
-- "where did I live in March" answerable at all, and it is also what makes
-- every answer traceable to the message it came from.
--
-- TWO TIMES, deliberately:
--   event_time   when the thing was true out in the world ("we moved last
--                March") — coarse is fine, '2025-03' is a legitimate value
--   recorded_at  when Vaenyx learned it
-- They are routinely different, and every wrong answer about "current" address
-- comes from a system that only stored one of them.
--
-- 🔴 WHICH ROW IS CURRENT IS DECIDED BY THIS SCHEMA, NEVER BY A MODEL.
-- Reading is `WHERE valid_until IS NULL`. Superseding is a timestamp
-- comparison in code. Asking a model to pick the fresher of two facts is a
-- measured, repeatable mistake — it has no clock, it is trained to prefer
-- fluent text over recent text, and it gets worse as the context grows. A
-- comparison operator does not.
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY NOT NULL,
  -- Whose fact this is. NULL = User Mode, exactly as every other table in this
  -- database means it (0042). Deliberately NOT a new identity column: a second
  -- notion of "who" is a second thing to get wrong, and the isolation rule
  -- below is only as good as its agreement with the rest of the app.
  mode_id TEXT,
  -- From the closed vocabulary in fact-slots.ts. Enforced in code because
  -- SQLite cannot express "one of this list, or preference:<anything>".
  slot TEXT NOT NULL,
  value TEXT NOT NULL,
  -- When it was true. ISO, and legitimately partial: '2025-03' or '2025'.
  event_time TEXT,
  -- When we learned it. Full ISO, always written explicitly by the caller --
  -- never DEFAULT CURRENT_TIMESTAMP, whose 'YYYY-MM-DD HH:MM:SS' does not sort
  -- against the ISO strings the rest of this codebase writes.
  recorded_at TEXT NOT NULL,
  -- NULL means current. This is the whole read filter.
  valid_until TEXT,
  supersedes_id TEXT REFERENCES facts(id) ON DELETE SET NULL,
  -- Where it came from. SET NULL rather than CASCADE: deleting a conversation
  -- must not silently delete what was learned from it, but the fact should stop
  -- claiming a message that no longer exists.
  source_message_id TEXT REFERENCES ask_vaenyx_messages(id) ON DELETE SET NULL,
  source_conversation_id TEXT REFERENCES ask_vaenyx_conversations(id) ON DELETE SET NULL,
  -- 'owner'    the Owner said it, in their own words
  -- 'manual'   the Owner typed it into the Vaenyx Me screen
  -- 'external' it came through the web or from a file
  -- The last one exists so the poisoning rule can be enforced by a WHERE
  -- clause instead of by hoping. See 0058's companion note in facts.ts.
  source_kind TEXT NOT NULL DEFAULT 'owner',
  -- For an external fact: the URL or file path it came out of, so the Owner
  -- reviewing it can see who is really asking them to remember this.
  source_detail TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  -- RESERVED FOR A FUTURE VECTOR INDEX, unused today and written by nothing.
  -- Three columns cost nothing now. Adding them later means rebuilding an
  -- index over every fact a household has accumulated, on a machine that is
  -- also the family's computer, which is exactly the migration nobody wants to
  -- be handed. When this is filled in: sqlite-vec rescore + a small local
  -- embedding model + RRF against the keyword index below, and no reranker.
  model_id TEXT,
  dim INTEGER,
  content_hash TEXT
);

-- The read that happens on every chat turn: current facts for this mode.
CREATE INDEX IF NOT EXISTS idx_facts_current
  ON facts (mode_id, slot, valid_until);

-- The history read: everything this slot has ever been.
CREATE INDEX IF NOT EXISTS idx_facts_slot_history
  ON facts (slot, mode_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_facts_source
  ON facts (source_conversation_id);

-- KEYWORD SEARCH, tokenised in JavaScript before it gets here.
--
-- `unicode61` is correct precisely BECAUSE the text arriving in this table has
-- already been segmented into space-separated words by Intl.Segmenter. Handed
-- raw Chinese it would index a whole sentence as one token and find nothing;
-- handed segmented Chinese it behaves like it does for English. `trigram` was
-- the obvious-looking alternative and is worse: it cannot match a two-character
-- word, and two characters is the commonest word length in Chinese.
--
-- Not `content=` linked to facts: the indexed text is a TRANSFORM of the row
-- (segmented, lower-cased), not a copy of it, so an external-content table is
-- the honest shape. Rows are kept in step by facts.ts, which owns both writes.
CREATE VIRTUAL TABLE IF NOT EXISTS fact_search USING fts5(
  fact_id UNINDEXED,
  mode_id UNINDEXED,
  body,
  tokenize = 'unicode61'
);
