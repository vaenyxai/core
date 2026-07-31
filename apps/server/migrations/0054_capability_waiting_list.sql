-- The waiting list (capabilities design, second flywheel). A Method that needs
-- a capability this Vaenyx does not have yet can be BUILT but not published: an
-- unrunnable Method is not a contribution, it is a request. The attempt to
-- publish IS the vote — no separate vote button, because a button gets organised
-- and gamed while a by-product of real work does not.
--
-- 🔴 Capability NAMES only. Never the Method's name, never its content: "I need
-- the capability to read medical records" already says what the user is doing.
-- Nothing leaves this machine until the Owner opts in — that consent copy is
-- still to be written, so today this table is local only.
--
-- 🔴 Only "this capability does not exist" is recorded. "The Owner switched it
-- off" must never land here: those people are not waiting for anything to be
-- built, and counting them would poison the priority signal.
CREATE TABLE IF NOT EXISTS capability_waiting (
  capability TEXT PRIMARY KEY NOT NULL,
  first_wanted_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  times_wanted INTEGER NOT NULL DEFAULT 1,
  -- Set when this Vaenyx notices the capability has arrived, so the author can
  -- be told. Without this return trip the list is a black hole: people file a
  -- request, hear nothing ever again, and do not come back.
  arrived_at TEXT,
  told_owner_at TEXT
);
