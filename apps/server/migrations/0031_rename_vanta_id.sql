-- Rename the internal id 'vanta' -> 'vaenyx' for the seeded Project and Agent, and
-- every foreign-key reference to it. FK enforcement is ON and none of these FKs
-- cascade on UPDATE, so the Project id is moved with an insert-new / repoint-
-- children / delete-old dance. The Agent id has no FK children, so it updates in
-- place. All of this runs in the single migration transaction; every row is
-- preserved, only the key value changes.

-- Agent: no table references agent_profiles(id), so a direct update is safe.
UPDATE agent_profiles SET id = 'vaenyx' WHERE id = 'vanta';

-- Project: create the new-id row first, repoint all children, then drop the old.
INSERT INTO projects (id, name, description)
SELECT 'vaenyx', name, description FROM projects WHERE id = 'vanta';

UPDATE tasks SET project_id = 'vaenyx' WHERE project_id = 'vanta';
UPDATE project_memories SET project_id = 'vaenyx' WHERE project_id = 'vanta';
UPDATE audit_events SET project_id = 'vaenyx' WHERE project_id = 'vanta';
UPDATE vaenyx_threads SET project_id = 'vaenyx' WHERE project_id = 'vanta';

DELETE FROM projects WHERE id = 'vanta';

-- Historical audit rows that named the Project/Agent by its old id.
UPDATE audit_events SET resource_id = 'vaenyx' WHERE resource_id = 'vanta';
