-- When VAENYX_PUBLISH_SERVICE_URL is set, the Owner signs in to the operator-
-- hosted core-cloud publish service (Google/GitHub) and we keep the resulting
-- opaque session token here (one row per owner) + the public display name. The
-- token is a credential — local only, never leaves the machine except as a
-- bearer to the service.
CREATE TABLE IF NOT EXISTS publish_service_session (
  owner_id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);
