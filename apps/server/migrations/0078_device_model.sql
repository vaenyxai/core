-- The device's hardware model (Oskar 2026-08-30: 显示每一台 tablet 的型号),
-- reported by the browser where it will say (Android Chrome gives e.g.
-- "SM-X510" via client hints; Apple's browsers give nothing). Display-only:
-- the Owner-given label stays the name, this answers "which hardware is that".
ALTER TABLE device_modes ADD COLUMN model TEXT;
