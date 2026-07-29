-- Long-conversation memory (Oskar, 2026-07-29): the model only ever sees the
-- most recent slice of a chat, so a long thread used to simply forget its own
-- beginning. What falls out of that window is now compacted into a rolling
-- summary that rides every later turn. summary_count records how many messages
-- the summary already covers, so it is only regenerated when enough new
-- messages have aged out — never on every turn.
ALTER TABLE ask_vaenyx_conversations ADD COLUMN history_summary TEXT;
ALTER TABLE ask_vaenyx_conversations ADD COLUMN history_summary_count INTEGER NOT NULL DEFAULT 0;
