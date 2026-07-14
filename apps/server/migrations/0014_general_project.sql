INSERT OR IGNORE INTO projects (id, name, description)
VALUES (
  'general',
  'General',
  'Unfiled chats and tasks that are not assigned to a named Project.'
);

UPDATE vanta_threads
SET project_id = 'general'
WHERE project_id IS NULL;
