-- Confirm-card corrections -> parse flywheel (local, private). When the Owner
-- edits a Routine's AI-parsed fields on the confirm card before running, we save
-- "message -> confirmed correct input" here and feed the most recent few back as
-- few-shot examples, so chat parsing for that Routine gets better with use. Stays
-- LOCAL: never uploaded, rides the local backup (real corrections live only in
-- SQLite, never in any repo).
CREATE TABLE IF NOT EXISTS routine_parse_examples (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  -- The plain-language message the Owner typed.
  message TEXT NOT NULL,
  -- The confirmed-correct first-step input, as JSON text.
  input TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS routine_parse_examples_routine_index
ON routine_parse_examples(routine_id);
