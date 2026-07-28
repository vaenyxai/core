-- Marked photos ("在照片上把不同的东西mark出来", Oskar 2026-07-28): one tap on a
-- conversation photo asks the vision engine where the distinct objects are;
-- the dots + names are kept per image so a reopened chat still shows them
-- without asking the model again. items = JSON [{name, x, y}], x/y percent.
CREATE TABLE image_annotations (
  image_id TEXT PRIMARY KEY,
  items TEXT NOT NULL,
  created_at TEXT NOT NULL
);
