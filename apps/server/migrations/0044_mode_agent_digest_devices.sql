-- Custom Mode follow-ups (spec §6):
--   * agent_name — each mode may name its own assistant ("每个 mode 的 Agent");
--     empty = the instance-wide Agent Name.
--   * digest_cadence / digest_last_at — the optional periodic supervision
--     summary pushed to User Mode ("定期摘要"); 'off' = never.
--   * device_modes — "每台配对设备可设每次打开默认进入某 mode". Combined with
--     an exit PIN this is the neutral primitive for a locked device.
ALTER TABLE modes ADD COLUMN agent_name TEXT NOT NULL DEFAULT '';
ALTER TABLE modes ADD COLUMN digest_cadence TEXT NOT NULL DEFAULT 'off';
ALTER TABLE modes ADD COLUMN digest_last_at TEXT;

CREATE TABLE device_modes (
  device_id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  mode_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
