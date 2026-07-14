ALTER TABLE tasks ADD COLUMN agent TEXT NOT NULL DEFAULT 'Vanta';

INSERT OR IGNORE INTO skills (id, name, description)
VALUES (
  'forge-readonly',
  'Forge Read-only Review',
  'Ask Forge to inspect the Vanta repository without changing files or using network tools.'
);
