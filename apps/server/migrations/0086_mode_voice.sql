-- A Custom Mode may speak in a voice of its own (Oskar, 2026-09-06): one of
-- the voices the Speaking row's engine offers — never a different engine or
-- model. NULL = the same voice as User Mode. JSON: {"gemini"?, "en"?, "zh"?}.
ALTER TABLE modes ADD COLUMN voice TEXT;
