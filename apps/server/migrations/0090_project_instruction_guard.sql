-- H-016 · Project auto-instruction guard (Oskar, 2026-09-19).
--
-- The automatic Project document is rewritten from conversations that can
-- carry file and web content. A line that could make Vaenyx take or steer an
-- action (a link, payment or bank details, an amount to pay, contact details,
-- an account identifier or credential, a direction to send / share / buy /
-- click …) no longer lands in the document on its own: it waits here, in the
-- Mode's Inbox, until the Owner approves it.

-- Lines held for the Owner. Only 'approved' lines may ride model context;
-- 'pending' and 'rejected' lines are filtered out where context is assembled.
CREATE TABLE project_instruction_holds (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- The Project's Mode, copied so the Inbox can list and guard by Mode.
  mode_id TEXT,
  line TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('link', 'payment', 'contact', 'account', 'directive')),
  -- The Conversation whose rewrite proposed it; NULL for the one-time scan of
  -- documents written before this guard existed.
  conversation_id TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('rewrite', 'legacy')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE INDEX project_instruction_holds_mode_index
ON project_instruction_holds (mode_id, status, created_at);

CREATE INDEX project_instruction_holds_project_index
ON project_instruction_holds (project_id, status);

-- Rejecting a held line is a SOURCE-level rule (in line with H-011): the
-- triggering Conversation can no longer propose held-category content for
-- that Project. Ordinary preference learning from it continues.
CREATE TABLE project_instruction_source_blocks (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, conversation_id)
);

-- Bounded history of the automatic document. Each row is the document as it
-- was BEFORE one change, with who made the change, what kind it was, which
-- Conversation triggered it and when — so the previous version can be put
-- back in one action.
CREATE TABLE project_instruction_versions (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  previous_document TEXT NOT NULL,
  changed_by TEXT NOT NULL CHECK (changed_by IN ('vaenyx', 'owner')),
  change_kind TEXT NOT NULL
    CHECK (change_kind IN ('rewrite', 'approve', 'edit', 'restore', 'legacy-scan')),
  trigger_conversation_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX project_instruction_versions_project_index
ON project_instruction_versions (project_id, created_at);
