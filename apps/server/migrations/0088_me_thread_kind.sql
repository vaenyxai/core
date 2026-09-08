-- A FOURTH KIND OF THREAD: THE ONE THE OWNER SPEAKS INTO ABOUT THEMSELVES.
--
-- Vaenyx Me gets a conversation of its own (Oskar, 2026-09-08): the Owner
-- drops notes, transcribed recordings, photos and documents about themselves
-- there, Vaenyx says what it read, and every durable thing becomes a card the
-- Owner keeps or refuses. One per Mode, permanent, protected like the inbox.
--
-- WHY A WHOLE TABLE REBUILD. The kind CHECK cannot be altered in SQLite; 0066
-- widened it the same way and the columns below are the live shape since then
-- (seen_at arrived in 0071). Nothing has a foreign key INTO vaenyx_threads.
CREATE TABLE vaenyx_threads_next (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'task', 'inbox', 'me')),
  title TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pinned', 'archived')),
  source_chat_id TEXT,
  conversation_id TEXT UNIQUE,
  task_id TEXT UNIQUE,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  routine_id TEXT,
  mode_id TEXT,
  seen_at TEXT,
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (source_chat_id) REFERENCES ask_vaenyx_conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (conversation_id) REFERENCES ask_vaenyx_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

INSERT INTO vaenyx_threads_next (
  id, owner_id, kind, title, project_id, status, source_chat_id,
  conversation_id, task_id, summary, created_at, updated_at, routine_id,
  mode_id, seen_at
)
SELECT
  id, owner_id, kind, title, project_id, status, source_chat_id,
  conversation_id, task_id, summary, created_at, updated_at, routine_id,
  mode_id, seen_at
FROM vaenyx_threads;

DROP TABLE vaenyx_threads;

ALTER TABLE vaenyx_threads_next RENAME TO vaenyx_threads;

CREATE INDEX IF NOT EXISTS vaenyx_threads_project_kind_index
ON vaenyx_threads(project_id, kind, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS vaenyx_threads_owner_updated_index
ON vaenyx_threads(owner_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS vaenyx_threads_mode_index
ON vaenyx_threads(mode_id);

CREATE UNIQUE INDEX IF NOT EXISTS vaenyx_threads_one_inbox_per_mode
ON vaenyx_threads(COALESCE(mode_id, ''))
WHERE kind = 'inbox';

-- One Vaenyx Me conversation per Mode, enforced the same way as the inbox.
CREATE UNIQUE INDEX IF NOT EXISTS vaenyx_threads_one_me_per_mode
ON vaenyx_threads(COALESCE(mode_id, ''))
WHERE kind = 'me';
