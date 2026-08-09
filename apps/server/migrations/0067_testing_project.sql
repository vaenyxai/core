-- THE FIRST PROJECT IS CALLED WHAT IT IS FOR.
--
-- Every install is seeded with one real project (id 'vaenyx', via 0003/0031),
-- and its display name has been through three readings: "Vaenyx" (which reads
-- as the app talking about itself), then a sidebar-only mapping to "Testing",
-- then "Projects" (which, on one project, reads as a heading over all of
-- them). Oskar named it Testing Project (2026-08-09) — a name that invites
-- trying things out instead of demanding a filing system on day one.
--
-- The rename happens HERE, in the data, so the sidebar mapping hack can go:
-- one name in one place, shown everywhere the project appears. Guarded on the
-- untouched default name — an Owner who already renamed theirs keeps their
-- word for it.
UPDATE projects
SET name = 'Testing Project'
WHERE id = 'vaenyx' AND name = 'Vaenyx';
