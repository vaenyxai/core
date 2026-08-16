-- EDIT ROUTINE v1: history keeps its shape when a Routine changes in place.
--
-- Gallery: results were always stored as structured output and rendered with
-- the routine's CURRENT view — fine while a view never changed, wrong the
-- moment the Owner edits one (an old result would be dressed in a layout its
-- fields never had). New rows record the view (and the executionHash) they
-- were made under; rows from before this migration stay NULL and the first
-- view-changing save stamps them with the OLD view, so nothing loses its
-- look and nothing borrows the new one.
ALTER TABLE routine_gallery ADD COLUMN view_snapshot TEXT;
ALTER TABLE routine_gallery ADD COLUMN routine_hash TEXT;

-- Parse examples: the Owner's corrections teach the AI parse how to fill the
-- FIRST step's input fields, so they only make sense while that field shape
-- holds. New rows record the input-schema revision they were made under;
-- NULL rows are pre-edit history, and the first schema-changing save stamps
-- them with the OLD revision — after that, selection reads only examples
-- whose revision matches the running schema.
ALTER TABLE routine_parse_examples ADD COLUMN input_schema_rev TEXT;
