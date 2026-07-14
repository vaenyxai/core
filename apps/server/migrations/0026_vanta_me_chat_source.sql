-- Auto-learn: allow chat history as a Vanta Me candidate source. SQLite cannot
-- alter a CHECK in place, so rebuild the table with the widened source_type set.
-- No foreign keys reference this table, so a plain copy is safe.

CREATE TABLE vanta_me_candidates_new (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  proposed_summary TEXT NOT NULL,
  proposed_evidence TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'owner_manual'
    CHECK (source_type IN (
      'owner_manual',
      'project_memory',
      'task_result',
      'forge_suggestion',
      'system_seed',
      'chat_history'
    )),
  source_id TEXT,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'deleted')),
  review_note TEXT,
  created_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO vanta_me_candidates_new
SELECT id, category, title, proposed_summary, proposed_evidence, source_type,
       source_id, confidence, status, review_note, created_by, reviewed_by,
       reviewed_at, created_at, updated_at
FROM vanta_me_candidates;

DROP TABLE vanta_me_candidates;
ALTER TABLE vanta_me_candidates_new RENAME TO vanta_me_candidates;

CREATE INDEX IF NOT EXISTS vanta_me_candidates_status_index
ON vanta_me_candidates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS vanta_me_candidates_category_index
ON vanta_me_candidates(category, created_at DESC);
