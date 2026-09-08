-- Each periodic mode report is kept (Oskar, 2026-09-08: 那 Summary 存在我主
-- Mode 的设置里面), so Settings → Modes can show a mode's past summaries
-- without opening the mode itself. One row per report actually sent.
CREATE TABLE IF NOT EXISTS mode_digests (
  id TEXT PRIMARY KEY,
  mode_id TEXT NOT NULL REFERENCES modes(id) ON DELETE CASCADE,
  cadence TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  messages INTEGER NOT NULL,
  chats INTEGER NOT NULL,
  refusals INTEGER NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mode_digests_mode ON mode_digests(mode_id, created_at DESC);
