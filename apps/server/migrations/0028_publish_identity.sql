-- Publishing to the community warehouse (library-architecture §16). The Owner
-- signs in with Google once; that identity is linked and used to attribute their
-- published Methods/Routines. The instance password login is unchanged — Google is
-- only the publisher identity, exactly as any future user will use it.

-- The Google publisher identity linked to the Owner.
CREATE TABLE IF NOT EXISTS publisher_identities (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT,
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Short-lived CSRF state for the Google OAuth redirect, bound to the Owner who
-- started it (single-owner instance: the callback resolves the owner from here,
-- so it does not depend on the session cookie surviving the cross-site redirect).
CREATE TABLE IF NOT EXISTS google_oauth_states (
  state TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- What the Owner has published, so the Library can show a "Published" badge and
-- detect when the local copy has changed since it was last published.
CREATE TABLE IF NOT EXISTS published_items (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('method', 'routine')),
  item_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  publisher_identity_id TEXT,
  publisher_name TEXT NOT NULL,
  commit_sha TEXT,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (kind, item_id)
);

CREATE INDEX IF NOT EXISTS published_items_lookup
ON published_items(kind, item_id);
