-- WHAT WAS INSTALLED FROM THE COMMUNITY, AND WHAT IT LOOKED LIKE ON ARRIVAL.
--
-- Until now nothing was recorded. An installed item carried its author's
-- version string inside its own method.json and a single origin:"community"
-- stamp, and that was all — no install-time version, no content hash, no
-- source, no date. Three things people need were therefore impossible rather
-- than merely missing:
--
--   • "there is a newer version" — comparable, but nothing said WHICH version
--     this copy actually came from, only what its files currently claim
--   • "you have edited this" — the installer's own comment says it must never
--     overwrite a local copy because it may have been edited, and yet nothing
--     could tell whether it had been. Recording the hash on arrival is the
--     only way to know later.
--   • "put it back" — no previous version was kept anywhere, so an update was
--     a one-way door.
--
-- Shape borrowed from published_items, which already solved the same problem
-- from the other direction.
CREATE TABLE IF NOT EXISTS installed_items (
  -- The folder name, which is the canonical id for both kinds.
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('method', 'routine')),
  -- The author's version at the moment it was installed. NOT re-read from the
  -- files later: that is the number that changes when the Owner edits, and
  -- comparing a catalogue against an edited local copy is how you end up
  -- offering an update to something that is already newer.
  installed_version TEXT NOT NULL,
  -- The content hash on arrival. Comparing it with the hash now is the whole
  -- of "you have edited this" — see C3. Methods only; a Routine has no
  -- equivalent single hash, so it is null there.
  installed_hash TEXT,
  installed_at TEXT NOT NULL,
  -- Where it came from, so provenance survives the item being edited.
  source_url TEXT,
  publisher TEXT,
  -- HOW THE OWNER WANTS TO BE TREATED ABOUT UPDATES.
  --   'follow'  (default) a newer version shows a badge; nothing ever moves
  --             on its own
  --   'locked'  no badge, no offer, a padlock on the card
  --   'skipped' this one version is not mentioned again; the next one is
  -- 🔴 There is no fourth value and there will never be an 'auto'. An author
  -- can change their repository and cannot reach anybody's machine — that is
  -- the strongest security property this product has, and it holds only
  -- because nothing here moves by itself.
  update_policy TEXT NOT NULL DEFAULT 'follow'
    CHECK (update_policy IN ('follow', 'locked', 'skipped')),
  -- The version 'skipped' refers to. A newer one than this is offered again.
  skipped_version TEXT,
  PRIMARY KEY (id, kind)
);

CREATE INDEX IF NOT EXISTS idx_installed_items_kind
  ON installed_items (kind, update_policy);

-- THE WAY BACK. An update copies the outgoing folder in here first, so
-- changing your mind needs no network — and regret usually arrives while you
-- are in the middle of trying to use the thing. A Method is tens of
-- kilobytes; keeping one previous version costs nothing worth counting.
-- Older versions than that live in the community repository, which has git
-- history and is the real archive.
CREATE TABLE IF NOT EXISTS item_rollbacks (
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('method', 'routine')),
  version TEXT NOT NULL,
  -- The whole folder, as {"relative/path": "contents"}. Small, and it means a
  -- restore is a write rather than a download.
  files TEXT NOT NULL,
  replaced_at TEXT NOT NULL,
  PRIMARY KEY (id, kind)
);
