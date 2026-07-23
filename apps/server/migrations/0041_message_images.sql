-- Phase B (Owner decision 2026-07-24): a photo can ride ON the message when
-- the conversation's main model reads images directly. image_id names a file
-- under the data directory's images/ folder; NULL = a plain text message.

ALTER TABLE ask_vaenyx_messages ADD COLUMN image_id TEXT;
