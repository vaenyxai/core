-- Reversible at-rest copy of each App Token (Owner decision 2026-07-22: a
-- Token must be viewable / copyable again later, not only at creation).
-- Encrypted with a key that lives in the SECRETS directory - outside userdata
-- and outside every backup - so a leaked backup still cannot reveal tokens:
-- it holds only ciphertext, hash and prefix. Authentication still verifies
-- against token_hash; the cipher is display-only. NULL = created before this
-- feature (not recoverable; a reset issues a recoverable one).

ALTER TABLE app_profiles ADD COLUMN token_cipher TEXT;
