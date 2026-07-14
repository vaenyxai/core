-- Rename the user-visible names Vanta -> Vaenyx. The invisible ids stay 'vanta'
-- until 0031 (F3). Only rows that still hold the original seeded value are touched,
-- so any Owner edits are preserved.

UPDATE projects SET name = 'Vaenyx' WHERE id = 'vanta' AND name = 'Vanta';

UPDATE projects
SET description = 'Build and improve your private Vaenyx Instance.'
WHERE id = 'vanta'
  AND description = 'Build and improve your private Vanta Instance.';

UPDATE agent_profiles SET name = 'Vaenyx' WHERE id = 'vanta' AND name = 'Vanta';

UPDATE instance_settings
SET value = 'My Vaenyx'
WHERE key = 'instance_name' AND value = 'My Vanta';

UPDATE tasks SET agent = 'Vaenyx' WHERE agent = 'Vanta';
