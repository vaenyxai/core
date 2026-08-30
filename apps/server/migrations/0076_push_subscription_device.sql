-- Mode-scoped push (Oskar 2026-08-30: 每一台 device 的推送只是自己当前这个
-- mode 的推送). A push subscription learns WHICH device it belongs to — the
-- same device id the Modes screen already pairs (device_modes) — so a send can
-- be scoped to the devices whose current mode matches the event's mode.
-- Legacy rows keep NULL and count as User Mode devices, which is what every
-- subscription made before modes existed actually is.
ALTER TABLE push_subscriptions ADD COLUMN device_id TEXT;
