CREATE TABLE IF NOT EXISTS app_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  token_prefix TEXT NOT NULL,
  default_project_id TEXT NOT NULL,
  output_format TEXT NOT NULL DEFAULT 'json',
  max_autonomy_level INTEGER NOT NULL DEFAULT 0,
  memory_read INTEGER NOT NULL DEFAULT 0,
  memory_write_policy TEXT NOT NULL DEFAULT 'none',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS app_profile_skills (
  app_profile_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  PRIMARY KEY (app_profile_id, skill_id),
  FOREIGN KEY (app_profile_id) REFERENCES app_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

ALTER TABLE tasks ADD COLUMN source_app_id TEXT REFERENCES app_profiles(id);

CREATE INDEX IF NOT EXISTS app_profiles_created_at_index
ON app_profiles(created_at DESC);
