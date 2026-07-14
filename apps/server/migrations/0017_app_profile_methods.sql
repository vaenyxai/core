-- An App Profile may be granted Library Methods (alongside or instead of
-- Skills). content_hash pins the method's behaviour-defining files at grant
-- time: if the method later changes, the run-time hash no longer matches and
-- the call is rejected until the Owner re-grants — a method can never silently
-- change behaviour under an app that depends on it. method_id is the method's
-- folder name on disk, so there is no skills-style FK to a table.
CREATE TABLE IF NOT EXISTS app_profile_methods (
  app_profile_id TEXT NOT NULL,
  method_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  PRIMARY KEY (app_profile_id, method_id),
  FOREIGN KEY (app_profile_id) REFERENCES app_profiles(id) ON DELETE CASCADE
);
