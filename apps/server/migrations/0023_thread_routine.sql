-- Library v2 (Routine merged into Chat): a chat thread may reference one Routine.
-- When routine_id is set, that chat IS a routine chat — its capability bar shows
-- Journal/Gallery and a message runs the Routine instead of a plain model reply.
-- Routines live on disk (no FK), so this is a plain nullable ADD COLUMN; existing
-- chats keep routine_id = NULL (ordinary chats).

ALTER TABLE vanta_threads ADD COLUMN routine_id TEXT;
