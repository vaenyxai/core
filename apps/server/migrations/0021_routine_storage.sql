-- Library v2: a Routine's two private, on-device-only stores (§14).
--   Journal = the raw entries the family feeds in.
--   Gallery = the structured results it has generated, kept to revisit.
-- Both are local and NEVER uploaded. routine_id is the on-disk Routine folder id
-- (Routines live in the library tree, not the DB, so there is no FK to them).
-- chat_id is nullable now and gets bound to a Chat in step ② (accumulate mode =
-- one persistent Chat). Gallery stores the structured output JSON, never rendered
-- text, so the view layer can render and re-render it.

CREATE TABLE IF NOT EXISTS routine_journal (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  chat_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS routine_journal_routine_index
ON routine_journal(routine_id, created_at DESC);

CREATE TABLE IF NOT EXISTS routine_gallery (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  chat_id TEXT,
  step_id TEXT,
  output TEXT NOT NULL,
  output_valid INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS routine_gallery_routine_index
ON routine_gallery(routine_id, created_at DESC);
