-- WeChat-style voice turns (Owner decision 2026-07-22): a spoken message is
-- stored as a voice bubble - the Owner's original recording is kept (audio_id
-- names a file under the data directory's voice/ folder) and the assistant's
-- voice-turn reply is flagged voice so it renders as a playable bubble too.
-- Existing rows default to plain text messages.

ALTER TABLE ask_vaenyx_messages ADD COLUMN voice INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ask_vaenyx_messages ADD COLUMN audio_id TEXT;
