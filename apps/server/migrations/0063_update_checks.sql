-- DID THE AUTHOR'S NEW VERSION BREAK WHAT THIS HOUSEHOLD ACTUALLY USES IT FOR?
--
-- An update replaces the recipe. The examples stay — that is the promise the
-- update dialog makes, and it is kept. But "your examples are kept" is not the
-- same as "your examples still come out right", and until now nothing looked.
--
-- The author cannot look for us. They tested their recipe against their own
-- cases; the corrections in this Library are the ones somebody here made,
-- usually about the local convention that made the Method worth keeping. A new
-- version that quietly stops honouring them is exactly the failure this product
-- cannot afford, because nobody would notice until a wrong number had already
-- gone out in a quote.
--
-- So the check is: re-run the household's own examples through the new recipe
-- and compare. The result is not advice and does not move anything — it turns
-- on a light. The way back (item_rollbacks, 0060) is already there.
CREATE TABLE IF NOT EXISTS update_checks (
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('method', 'routine')),
  -- The version that was checked. A later update supersedes the verdict, so a
  -- red light from two versions ago never lingers over a version nobody tested.
  version TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  -- 'pass'  every example re-ran to the same answer
  -- 'fail'  at least one did not
  -- 'error' the run could not complete (model offline, timeout); NOT a verdict
  --         about the recipe, and shown differently on purpose
  state TEXT NOT NULL CHECK (state IN ('pass', 'fail', 'error')),
  checked_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  -- The failing cases, as JSON, so the Owner can see WHICH answer moved rather
  -- than being told something vague went wrong.
  detail TEXT,
  PRIMARY KEY (id, kind)
);
