-- The flywheel's outbound queue (copy pack Part K). An example waits here for
-- 48 hours before it is sent to the Method's publisher, so the Owner has a
-- chance to catch what the de-identifier missed.
--
-- The wait is a WITHDRAWAL WINDOW, not a consent step. Consent is taken once,
-- at activation (K3), on a surface that describes the whole mechanism; nothing
-- in this table records a consent event, because agreement is never inferred
-- from silence (Core Privacy Policy 7.2).
CREATE TABLE IF NOT EXISTS flywheel_queue (
  id TEXT PRIMARY KEY NOT NULL,
  method_id TEXT NOT NULL,
  -- The de-identified pair, as it would be sent. Stored already stripped: the
  -- raw correction stays in method_feedback and never leaves the device.
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  note TEXT,
  -- What the stripper changed, so the Owner can see what it thought it found.
  redactions TEXT NOT NULL DEFAULT '[]',
  -- 'sensitive' rows are held back for the G4 always-ask and never auto-send.
  sensitive INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- When the window closes. Nothing is sent before this.
  send_after TEXT NOT NULL,
  -- 'waiting' | 'withdrawn' | 'sent' | 'failed'
  state TEXT NOT NULL DEFAULT 'waiting'
    CHECK (state IN ('waiting', 'withdrawn', 'sent', 'failed')),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS flywheel_queue_due_index
  ON flywheel_queue(state, send_after);
CREATE INDEX IF NOT EXISTS flywheel_queue_method_index
  ON flywheel_queue(method_id);
