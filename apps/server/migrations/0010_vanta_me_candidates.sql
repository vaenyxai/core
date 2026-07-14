CREATE TABLE IF NOT EXISTS vanta_me_candidates (
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
      'system_seed'
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

CREATE INDEX IF NOT EXISTS vanta_me_candidates_status_index
ON vanta_me_candidates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS vanta_me_candidates_category_index
ON vanta_me_candidates(category, created_at DESC);

