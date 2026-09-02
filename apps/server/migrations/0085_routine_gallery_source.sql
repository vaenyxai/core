-- H-014: every new Gallery result points to the exact Journal input that made
-- it. This enables a deterministic local Correct & Rerun path without guessing
-- by timestamps or changing historical output.
ALTER TABLE routine_gallery ADD COLUMN journal_entry_id TEXT
  REFERENCES routine_journal(id) ON DELETE SET NULL;

CREATE INDEX routine_gallery_journal_entry_index
ON routine_gallery(journal_entry_id);
