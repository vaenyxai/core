-- WHICH STEP A CORRECTION IS ABOUT.
--
-- A one-step Routine is unambiguous. A multi-step one is not, and a correction
-- that does not say where it came from gets filed against whichever Method the
-- app happened to name — which is the first step, or the last, or whichever
-- one its author found easiest to reference. The wrong part then accumulates
-- examples teaching it something that went wrong somewhere else, and nothing
-- anywhere reports a problem: the recipe simply gets worse at its job while
-- the review queue looks healthy.
--
-- The recipe chain handed to an app already carries a stepId per entry, for
-- exactly this return trip. Recording it here closes the loop.
ALTER TABLE method_feedback ADD COLUMN routine_id TEXT;
ALTER TABLE method_feedback ADD COLUMN step_id TEXT;

CREATE INDEX IF NOT EXISTS idx_method_feedback_step
  ON method_feedback (routine_id, step_id);
