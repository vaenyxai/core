-- The subscription door's log (Oskar, 2026-07-29). Deliberately thin: when, what
-- kind of job, which subscription, how long, and whether it worked. The prompt,
-- the file and the answer are never written down — the whole point of the door
-- is that a customer's drawing passes through this machine without staying on
-- it. The door's settings live in instance_settings under "relay.config".
CREATE TABLE IF NOT EXISTS relay_calls (
  id TEXT PRIMARY KEY NOT NULL,
  task TEXT NOT NULL,
  engine TEXT NOT NULL,
  capability TEXT NOT NULL,
  ms INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  failure TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS relay_calls_created_at ON relay_calls (created_at DESC);
