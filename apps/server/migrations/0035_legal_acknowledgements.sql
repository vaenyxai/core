-- Legal acknowledgement / consent records (copy pack clause 2.3): every one-time
-- dismissal, gated acknowledgement and consent choice is written here with the
-- key name, the legal.copyVersion in force, the rendered language (EN/ZH), the
-- profile it was given by, an optional recorded choice (e.g. flywheel accept /
-- decline), and a timestamp. Records stay on the device like all other instance
-- data; publish-flow acceptances are additionally recorded server-side by the
-- publish service. Append-only: a fresh row per acknowledgement, so a version
-- change re-gates rather than silently carrying an old consent forward.
CREATE TABLE IF NOT EXISTS legal_acknowledgements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL,
  copy_version TEXT NOT NULL,
  language TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  choice TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_legal_ack_lookup
  ON legal_acknowledgements (profile_id, key_name);
