-- WHOSE EXAMPLE IS THIS?
--
-- Architecture only this round. Sharing examples with the community is NOT
-- built and must not be until the redaction pipeline exists: the Terms
-- (8.6(b)) say a publish submission carries no Examples and no raw
-- corrections, and that allowing them later requires on-device redaction, a
-- preview of exactly what would be sent, and explicit consent. None of that
-- is here yet.
--
-- What IS here is the distinction those rules will need, recorded from now on
-- so that turning the feature on later is adding a rule rather than
-- reconstructing history nobody kept:
--
--   'author' — arrived with the item and belongs to whoever wrote it. An
--              update REPLACES these, because the author's newer set is part
--              of the newer recipe.
--   'mine'   — this household's, produced by using the thing. An update never
--              touches these, and nothing leaves this machine.
--
-- Existing rows are 'mine', which is true: nothing has ever shipped an example
-- with an item, so everything on any disk today was made here.
CREATE TABLE IF NOT EXISTS example_origins (
  method_id TEXT NOT NULL,
  -- The examples/NNNN.json file name, which is its identity on disk.
  example_file TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'mine' CHECK (origin IN ('author', 'mine')),
  -- Which outside app sent the correction this example came from, if any.
  -- Recorded now because a contradiction between two apps ("A says DD/MM, B
  -- says MM/DD") has to be resolvable by a person, and "who told us" is the
  -- only thing that makes it resolvable.
  source_app TEXT,
  source_key_id TEXT,
  recorded_at TEXT NOT NULL,
  -- Whether this has ever been offered to the item's author. Set by a feature
  -- that does not exist yet; false for everything until it does.
  contributed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (method_id, example_file)
);

CREATE INDEX IF NOT EXISTS idx_example_origins_method
  ON example_origins (method_id, origin);
