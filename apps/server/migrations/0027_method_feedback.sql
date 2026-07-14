-- Flywheel return (library-architecture §10): external apps may send users'
-- corrections back to feed a method's flywheel.
--
-- 1) A new permission bit on the App Profile, like fetch_recipe: off by default,
--    the Owner enables "Send corrections" in Settings. No bit -> 403.
ALTER TABLE app_profiles ADD COLUMN send_feedback INTEGER NOT NULL DEFAULT 0;

-- 2) The local correction store ("本地纠错库"): raw ingested corrections live here
--    in SQLite with their real content and NEVER leave the machine on their own.
--    De-identify + Owner preview/consent is a later internal flow (§9) before any
--    correction becomes a shared examples/*.json. This table is intake only.
--    No FK to app_profiles: corrections are kept even if the token is later removed
--    (the sender id + name are denormalised onto the row, like audit_events).
CREATE TABLE IF NOT EXISTS method_feedback (
  id TEXT PRIMARY KEY NOT NULL,
  method_id TEXT NOT NULL,
  app_profile_id TEXT NOT NULL,
  app_profile_name TEXT NOT NULL,
  -- The version that produced the output (binds that version's content-hash).
  version TEXT NOT NULL,
  -- The method's current content hash at ingest, for provenance.
  content_hash TEXT,
  -- Did `version` still match the current method version at ingest? A mismatch is
  -- stored anyway (§10); it is filtered later by "can the current schema validate".
  version_matched INTEGER NOT NULL DEFAULT 0,
  reaction TEXT NOT NULL CHECK (reaction IN ('confirmed', 'edited', 'rejected')),
  -- Arbitrary JSON payloads, stored as text (or NULL when absent).
  input TEXT,
  ai_output TEXT,
  corrected_output TEXT,
  -- 1/0 if the corrected output was schema-checked (version matched), else NULL.
  output_valid INTEGER,
  note TEXT,
  -- When the correction happened on the caller side (caller-supplied), if given.
  occurred_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS method_feedback_method_index
ON method_feedback(method_id);
