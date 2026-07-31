-- Per-mode capability switches (capabilities design, three layers: global ∩ mode
-- ∩ what the Method declared). A mode may only ever NARROW what the global
-- switches allow — if a mode could widen them the ceiling would not be a
-- ceiling, and the whole guarantee goes with it. NULL = this mode adds no
-- restriction of its own, which is different from "an empty list" (that would
-- mean the mode allows nothing).
ALTER TABLE modes ADD COLUMN capabilities TEXT;
