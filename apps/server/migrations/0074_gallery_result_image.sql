-- Visual-first, part two (owner, 2026-08-16): a Routine can ask for a
-- PICTURE OF ITS RESULT — the dish it just planned, the room it just
-- described. Generated after the steps finish and kept beside the run, so
-- the result card can lead with what the outcome LOOKS like.
--
-- NULL = this run made none (routine did not ask, the drawing capability is
-- off, or the engine failed) — the card falls back to the fed photo exactly
-- as before, and nothing is ever blocked on a picture.
ALTER TABLE routine_gallery ADD COLUMN result_image_id TEXT;
