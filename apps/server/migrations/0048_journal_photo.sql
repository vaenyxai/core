-- A Routine can be fed a photo ("visual first", Oskar 2026-07-28): the photo
-- itself lives on the journal entry so the chat shows a picture, while the
-- extracted text goes only into the run's input behind the scenes.
ALTER TABLE routine_journal ADD COLUMN image_id TEXT;
