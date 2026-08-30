-- Which mode a device is IN right now, beside which mode it OPENS in
-- (Oskar 2026-08-30: 那台打开是 Yen Mode,为什么我电脑看到是 User Mode).
-- The two were one column and it lied whenever a device entered a mode by
-- hand: "Opens in" stayed at its default while the tablet sat inside the
-- mode. Three values, deliberately: NULL = this device has never reported
-- (an old build; fall back to the Opens-in binding), '' = it reported and
-- is in User Mode, anything else = the mode id it reported being in.
-- Push scoping reads THIS, so notifications follow where the device
-- actually is, not where it is set to start.
ALTER TABLE device_modes ADD COLUMN current_mode_id TEXT;
