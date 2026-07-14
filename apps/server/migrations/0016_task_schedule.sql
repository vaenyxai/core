-- Scheduling / heartbeat: a task can repeat on a cadence. Off by default; the
-- Owner explicitly enables a schedule per task. The in-process scheduler re-runs
-- due tasks (each execution is a task_run with trigger='schedule').
ALTER TABLE tasks ADD COLUMN schedule_cadence TEXT;
ALTER TABLE tasks ADD COLUMN next_run_at TEXT;
ALTER TABLE tasks ADD COLUMN schedule_enabled INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS tasks_schedule_index
ON tasks(schedule_enabled, next_run_at);
