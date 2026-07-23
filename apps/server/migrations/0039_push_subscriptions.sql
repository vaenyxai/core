-- Web Push subscriptions (Owner request 2026-07-22: a phone notification when
-- a scheduled task finishes). One row per subscribed device/browser. The VAPID
-- keypair lives in the secrets directory; these rows hold only the push
-- endpoint + client keys the browser handed us. Dead endpoints (410/404 on
-- send) are pruned automatically.

CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);
