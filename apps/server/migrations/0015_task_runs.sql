-- Each execution of a task is a durable run record. The task keeps a
-- denormalized "latest" status/result for the status light and current view;
-- task_runs holds the per-execution history that scheduling, retry, and run
-- history build on.
CREATE TABLE IF NOT EXISTS task_runs (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  result TEXT NOT NULL DEFAULT '',
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'schedule')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS task_runs_task_index
ON task_runs(task_id, started_at DESC);
