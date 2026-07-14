CREATE TABLE IF NOT EXISTS vanta_threads (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'task')),
  title TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pinned', 'archived')),
  source_chat_id TEXT,
  conversation_id TEXT UNIQUE,
  task_id TEXT UNIQUE,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (source_chat_id) REFERENCES ask_vanta_conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (conversation_id) REFERENCES ask_vanta_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS vanta_threads_project_kind_index
ON vanta_threads(project_id, kind, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS vanta_threads_owner_updated_index
ON vanta_threads(owner_id, status, updated_at DESC);

INSERT OR IGNORE INTO vanta_threads (
  id, owner_id, kind, title, project_id, status, conversation_id, created_at, updated_at
)
SELECT id, owner_id, 'chat', title, NULL, 'active', id, created_at, updated_at
FROM ask_vanta_conversations;

INSERT OR IGNORE INTO vanta_threads (
  id, owner_id, kind, title, project_id, status, task_id, created_at, updated_at
)
SELECT
  tasks.id,
  (SELECT owners.id FROM owners ORDER BY owners.created_at ASC LIMIT 1),
  'task',
  tasks.title,
  tasks.project_id,
  'active',
  tasks.id,
  tasks.created_at,
  COALESCE(tasks.completed_at, tasks.created_at)
FROM tasks;
