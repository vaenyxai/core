-- Visual-first results (owner rule, 2026-08-16): a Gallery result remembers
-- the photo its run was fed, so the result card can LEAD with the marked
-- photo. NULL = the run had no photo (or predates this) — renders as before.
ALTER TABLE routine_gallery ADD COLUMN image_id TEXT;
