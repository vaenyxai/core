-- H-013: progress is part of the authoritative task_runs row, not a stream of
-- token/log events. Existing runs receive one compact terminal snapshot.
ALTER TABLE task_runs ADD COLUMN progress_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE task_runs ADD COLUMN progress_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_runs ADD COLUMN progress_state TEXT NOT NULL DEFAULT 'queued'
  CHECK (progress_state IN (
    'queued', 'running', 'waiting_for_owner', 'completed', 'failed',
    'cancelled', 'interrupted'
  ));
ALTER TABLE task_runs ADD COLUMN progress_current_step TEXT;
ALTER TABLE task_runs ADD COLUMN progress_completed_steps_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE task_runs ADD COLUMN progress_status_text TEXT NOT NULL DEFAULT '';
ALTER TABLE task_runs ADD COLUMN progress_conversation_id TEXT;
ALTER TABLE task_runs ADD COLUMN progress_outcome_message_id TEXT;
ALTER TABLE task_runs ADD COLUMN progress_updated_at TEXT;

UPDATE task_runs
SET progress_revision = 1,
    progress_state = CASE
      WHEN status = 'completed' THEN 'completed'
      WHEN status = 'failed' THEN 'failed'
      ELSE 'interrupted'
    END,
    progress_completed_steps_json = CASE
      WHEN status = 'completed' THEN '["Result saved"]'
      ELSE '[]'
    END,
    progress_status_text = CASE
      WHEN status = 'completed' THEN 'Result ready.'
      WHEN status = 'failed' THEN 'This run stopped safely. Open the result for details.'
      ELSE 'This run was interrupted by a restart. Retry when ready.'
    END,
    progress_updated_at = COALESCE(finished_at, started_at);

CREATE INDEX task_runs_progress_task_index
ON task_runs(task_id, started_at DESC, progress_revision DESC);
