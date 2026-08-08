-- A THIRD KIND OF THREAD: THE ONE VAENYX SPEAKS FROM.
--
-- There is to be exactly one permanent conversation per Mode — pinned, always
-- present, and the fixed place Vaenyx says "I noticed something" instead of
-- the Owner having to go looking. It is a real chat with a real composer; what
-- makes it different is that it cannot be deleted, archived or duplicated,
-- because a permanent surface that can be closed by accident is not permanent.
--
-- WHY A WHOLE TABLE REBUILD. 0013 wrote CHECK (kind IN ('chat','task')) and
-- SQLite cannot alter a CHECK constraint — the only way to widen it is to
-- build the table again. Verified before writing this: nothing in the schema
-- has a foreign key INTO vaenyx_threads, so the copy is safe and no other
-- table's definition needs touching.
--
-- The columns below are the live shape, not 0013's: routine_id (0023) and
-- mode_id (0042) were added by ALTER afterwards, and both are carried over.
CREATE TABLE vaenyx_threads_next (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'task', 'inbox')),
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
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (source_chat_id) REFERENCES ask_vaenyx_conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (conversation_id) REFERENCES ask_vaenyx_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

INSERT INTO vaenyx_threads_next (
  id, owner_id, kind, title, project_id, status, source_chat_id,
  conversation_id, task_id, summary, created_at, updated_at, routine_id, mode_id
)
SELECT
  id, owner_id, kind, title, project_id, status, source_chat_id,
  conversation_id, task_id, summary, created_at, updated_at, routine_id, mode_id
FROM vaenyx_threads;

DROP TABLE vaenyx_threads;

ALTER TABLE vaenyx_threads_next RENAME TO vaenyx_threads;

CREATE INDEX IF NOT EXISTS vaenyx_threads_project_kind_index
ON vaenyx_threads(project_id, kind, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS vaenyx_threads_owner_updated_index
ON vaenyx_threads(owner_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS vaenyx_threads_mode_index
ON vaenyx_threads(mode_id);

-- 🔴 ONE INBOX PER MODE, ENFORCED BY THE DATABASE.
--
-- COALESCE, not the bare column. In SQL every NULL is distinct from every
-- other NULL, so a plain UNIQUE(mode_id) would constrain every Custom Mode and
-- leave User Mode — the one that matters most, the one every household has —
-- completely unconstrained. Folding NULL to '' makes User Mode a value like
-- any other, and a second inbox anywhere becomes impossible rather than merely
-- discouraged.
CREATE UNIQUE INDEX IF NOT EXISTS vaenyx_threads_one_inbox_per_mode
ON vaenyx_threads(COALESCE(mode_id, ''))
WHERE kind = 'inbox';
