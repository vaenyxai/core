-- Scheduled tasks: precise schedule beyond a plain cadence (real cron).
--   schedule_time         "HH:MM" local time of day (daily / weekly / monthly)
--   schedule_day_of_week  0-6 (Sun-Sat), for weekly
--   schedule_day_of_month 1-31, for monthly
-- Existing scheduled tasks keep NULLs and fall back to defaults (09:00, and the
-- weekday/day they were enabled on) until re-set. Plain nullable ADD COLUMNs.

ALTER TABLE tasks ADD COLUMN schedule_time TEXT;
ALTER TABLE tasks ADD COLUMN schedule_day_of_week INTEGER;
ALTER TABLE tasks ADD COLUMN schedule_day_of_month INTEGER;
