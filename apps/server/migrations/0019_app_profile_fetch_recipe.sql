-- Mode B (library-architecture §13): an App Profile may be permitted to fetch a
-- method's recipe (instructions + schemas + examples) and run it on its own
-- model, rather than only having Vanta run it (Mode A, /run). Off by default —
-- fetching the recipe hands the recipe + tuned examples to the caller.
ALTER TABLE app_profiles ADD COLUMN fetch_recipe INTEGER NOT NULL DEFAULT 0;
