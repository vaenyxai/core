CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owner_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  request TEXT NOT NULL,
  result TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  project_id TEXT NOT NULL,
  skill_id TEXT,
  provider TEXT NOT NULL,
  harness TEXT NOT NULL,
  autonomy_level INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE INDEX IF NOT EXISTS tasks_created_at_index ON tasks(created_at DESC);

INSERT OR IGNORE INTO projects (id, name, description)
VALUES ('vanta', 'Vanta', 'Build and improve your private Vanta Instance.');

INSERT OR IGNORE INTO skills (id, name, description)
VALUES ('general-ask', 'General Ask', 'A simple request handled by the Mock Harness.');
