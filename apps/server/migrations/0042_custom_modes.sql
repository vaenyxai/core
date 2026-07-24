-- Custom Mode M1 (spec §6): the data foundation, laid early on purpose.
-- `modes` holds each Custom Mode's definition (name, natural-language rules,
-- the two neutral restriction flags the preview already designed, and PIN
-- hashes for M2's enter/exit gates — never the PINs themselves).
-- Every content table gains a `mode_id` ownership column: NULL = User Mode
-- (the unrestricted default), a mode id = created inside that sandbox.
-- No FK on mode_id (routine_id precedent): deleting a mode reassigns its
-- content back to User Mode in code, per spec's fallback rule.

CREATE TABLE modes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '',
  lock_settings INTEGER NOT NULL DEFAULT 0,
  local_only INTEGER NOT NULL DEFAULT 0,
  enter_pin_hash TEXT,
  exit_pin_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vaenyx_threads ADD COLUMN mode_id TEXT;
ALTER TABLE ask_vaenyx_conversations ADD COLUMN mode_id TEXT;
ALTER TABLE projects ADD COLUMN mode_id TEXT;
ALTER TABLE project_memories ADD COLUMN mode_id TEXT;
ALTER TABLE tasks ADD COLUMN mode_id TEXT;

CREATE INDEX vaenyx_threads_mode_index ON vaenyx_threads(mode_id);
CREATE INDEX projects_mode_index ON projects(mode_id);
