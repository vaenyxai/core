-- Archive makes a scheduled Conversation quiet without forgetting how it was
-- scheduled. The cadence/time fields stay on tasks; this flag records that the
-- schedule was enabled when Archive paused it, rather than already off by the
-- Owner. Restore deliberately leaves both states paused.
ALTER TABLE tasks
ADD COLUMN schedule_paused_by_archive INTEGER NOT NULL DEFAULT 0;
