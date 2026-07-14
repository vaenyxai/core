-- Project dual instruction windows (spec §7, locked 2026-07-02): a manual
-- window the Owner writes, and an automatic Document Vaenyx rewrites on a
-- cadence from the project's chats. Both are injected into the project's model
-- context. instructions_auto_rounds counts completed chat rounds since the
-- last automatic rewrite (the cadence is an engine parameter).
ALTER TABLE projects ADD COLUMN instructions_manual TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN instructions_auto TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN instructions_auto_updated_at TEXT;
ALTER TABLE projects ADD COLUMN instructions_auto_rounds INTEGER NOT NULL DEFAULT 0;
