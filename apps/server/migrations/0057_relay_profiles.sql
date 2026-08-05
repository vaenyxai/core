-- Relay Profiles v1: each app gets its own subscription identity.
--
-- Why: the Subscription Door had ONE pair of logins (Vaenyx's own) serving
-- every caller. relay.ts said so itself in its opening comment and named the
-- upgrade: "Anything that wants a list of its own has to become a per-app key
-- first." App keys (app_profiles) already exist, so a profile now also owns
-- its credential directories on disk (userdata/profiles/<id>/) and this
-- migration adds what the database side needs.
--
-- dedicated_login: 0 = the legacy path — the profile's calls ride the door's
-- shared credentials, exactly as every existing app does today. It flips to 1
-- the first time the app completes its OWN sign-in, and never flips back: once
-- a profile has its own identity, an expired login must become a clear
-- "not connected" error, never a silent fall back onto the Owner's account —
-- an account switch nobody chose is billing fraud against yourself.
--
-- key_version / key_rotated_at: an app can rotate its own key. The version is
-- bookkeeping the app can display; the secret itself is returned once and only
-- its hash is stored, same as ever.
ALTER TABLE app_profiles ADD COLUMN dedicated_login INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_profiles ADD COLUMN key_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE app_profiles ADD COLUMN key_rotated_at TEXT;

-- Monthly usage, one row per (month, caller, engine). Counted at the moment an
-- engine call is actually attempted, so the numbers answer "which app spent
-- this" — the promise the capability design makes for Token grants: a nod that
-- keeps costing money must keep being visible.
--
-- app_id is an app_profiles.id, or 'door' (a caller on the door's shared key),
-- or 'core' (Vaenyx's own model calls). Token columns stay NULL until an
-- engine actually reports token counts — never estimated, never pretended.
-- The thin call log gains WHO: appId (or 'door'), so a row in Recent calls can
-- be pinned to the app that made it. Still never the prompt, the file or the
-- answer.
ALTER TABLE relay_calls ADD COLUMN app_id TEXT;

CREATE TABLE IF NOT EXISTS relay_usage (
  month TEXT NOT NULL,
  app_id TEXT NOT NULL,
  engine TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  PRIMARY KEY (month, app_id, engine)
);
