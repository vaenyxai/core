-- A Method Token's scope grows from "the recipe" to "the recipe + the
-- capabilities that Method declared" (capabilities design, slice 4).
--
-- 🔴 `files` can never appear here. Reading the Owner's disk on behalf of
-- another app is not a thing a token should be able to carry, whatever it says.
-- 🔴 `web` needs its own explicit approval per token: it can turn this machine
-- into somebody else's proxy.
--
-- 🔴 A token grant is one nod that authorises ONGOING spending. Nobody is
-- present when a token calls, so the M1 "this document has 34 pages, shall I?"
-- gate cannot stop that path — it has nobody to ask. Hence a ceiling per token
-- and a running total, so the Owner can see WHICH app spent, instead of only
-- watching a bill grow.
ALTER TABLE app_profiles ADD COLUMN capabilities TEXT;
ALTER TABLE app_profiles ADD COLUMN spend_limit_cents INTEGER;
ALTER TABLE app_profiles ADD COLUMN spent_cents INTEGER NOT NULL DEFAULT 0;
