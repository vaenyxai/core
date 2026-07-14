UPDATE agent_profiles
SET editable = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ('vanta', 'forge');
