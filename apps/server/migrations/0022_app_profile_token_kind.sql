-- Library v2: a Token (App Profile) is now one of two kinds.
--   'method'  — bundles 1+ Methods; the app composes them itself (Mode A/B).
--   'routine' — references exactly one Routine; the app calls it as a black box
--               and Vanta runs the whole flow (stateless: no Journal/Gallery).
-- Existing profiles are all method tokens, so kind defaults to 'method'.
-- routine_content_hash pins the Routine version at grant time (the version lock,
-- mirroring app_profile_methods.content_hash for method tokens). Plain ADD COLUMN
-- (no FK on these), so no table rebuild.

ALTER TABLE app_profiles ADD COLUMN kind TEXT NOT NULL DEFAULT 'method';
ALTER TABLE app_profiles ADD COLUMN routine_id TEXT;
ALTER TABLE app_profiles ADD COLUMN routine_content_hash TEXT;
