-- App Profiles drop their project binding + the memory-read permission.
--
-- An App Profile is now scoped ONLY by its allowedMethodIds + fetchRecipe. It has
-- no project / chat / memory access at all: the absence of a project means zero
-- access, never "all projects". It also never reads project memory, so the
-- per-profile memory_read flag is removed (the memory_write_policy = 'none'
-- guarantee stays).
--
-- default_project_id carried a table-level FOREIGN KEY, so it cannot be removed
-- with a plain ALTER TABLE ... DROP COLUMN. The table is rebuilt. The migration
-- runner wraps this in a transaction with foreign_keys ON, where dropping the
-- old app_profiles would cascade-delete the child grants (app_profile_skills /
-- _methods, ON DELETE CASCADE) and be blocked by tasks.source_app_id. So the
-- child grants are stashed in temp tables and the task→app links are detached,
-- then both are restored against the rebuilt table.

CREATE TEMP TABLE _ap_skills_backup AS SELECT * FROM app_profile_skills;
CREATE TEMP TABLE _ap_methods_backup AS SELECT * FROM app_profile_methods;
CREATE TEMP TABLE _ap_task_links AS
  SELECT id, source_app_id FROM tasks WHERE source_app_id IS NOT NULL;
UPDATE tasks SET source_app_id = NULL;

CREATE TABLE app_profiles_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  token_prefix TEXT NOT NULL,
  output_format TEXT NOT NULL DEFAULT 'json',
  max_autonomy_level INTEGER NOT NULL DEFAULT 0,
  memory_write_policy TEXT NOT NULL DEFAULT 'none',
  fetch_recipe INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_profiles_new (
  id, name, token_hash, token_prefix, output_format, max_autonomy_level,
  memory_write_policy, fetch_recipe, enabled, created_at
)
SELECT
  id, name, token_hash, token_prefix, output_format, max_autonomy_level,
  memory_write_policy, fetch_recipe, enabled, created_at
FROM app_profiles;

-- DROP cascade-empties the child grant tables; we restore them below. Renaming
-- the rebuilt table back keeps the children's "REFERENCES app_profiles" FKs valid.
DROP TABLE app_profiles;
ALTER TABLE app_profiles_new RENAME TO app_profiles;

CREATE INDEX IF NOT EXISTS app_profiles_created_at_index
ON app_profiles(created_at DESC);

INSERT INTO app_profile_skills SELECT * FROM _ap_skills_backup;
INSERT INTO app_profile_methods SELECT * FROM _ap_methods_backup;
UPDATE tasks
  SET source_app_id = (
    SELECT source_app_id FROM _ap_task_links WHERE _ap_task_links.id = tasks.id
  )
  WHERE id IN (SELECT id FROM _ap_task_links);

DROP TABLE _ap_skills_backup;
DROP TABLE _ap_methods_backup;
DROP TABLE _ap_task_links;
