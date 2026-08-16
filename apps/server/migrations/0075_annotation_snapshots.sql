-- Marks belong to the RUN they were checked for (owner, 2026-08-16): editing
-- a photo's marks later used to rewrite every past row showing that photo,
-- because journal and gallery read them through a live join on image_id.
--
-- The marks as confirmed are now written onto the row itself. NULL = a row
-- from before this, which still reads the live join exactly as it did.
ALTER TABLE routine_journal ADD COLUMN annotations_snapshot TEXT;
ALTER TABLE routine_gallery ADD COLUMN annotations_snapshot TEXT;
