CREATE TABLE IF NOT EXISTS vanta_me_items (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_learned',
  evidence TEXT,
  confidence INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO vanta_me_items (
  id, category, title, summary, status, evidence, confidence, sort_order
)
VALUES
  (
    'owner-identity',
    'identity',
    'Owner identity',
    'Vanta only knows the Owner name until the Owner approves more personal context.',
    'not_learned',
    NULL,
    0,
    10
  ),
  (
    'communication-style',
    'communication',
    'Communication style',
    'How the Owner prefers Vanta to explain, summarize, and ask questions.',
    'not_learned',
    NULL,
    0,
    20
  ),
  (
    'stable-preferences',
    'preferences',
    'Stable preferences',
    'Long-term preferences that should shape future responses only after review.',
    'not_learned',
    NULL,
    0,
    30
  ),
  (
    'decision-patterns',
    'decisions',
    'Decision patterns',
    'Repeated ways the Owner evaluates tradeoffs, risk, cost, time, and simplicity.',
    'not_learned',
    NULL,
    0,
    40
  ),
  (
    'project-behaviour',
    'projects',
    'Project behaviour',
    'How the Owner tends to work across projects and what each project expects.',
    'not_learned',
    NULL,
    0,
    50
  ),
  (
    'trust-by-project',
    'trust',
    'Trust by Project',
    'Which projects, skills, or workflows may deserve higher or lower autonomy later.',
    'not_learned',
    NULL,
    0,
    60
  ),
  (
    'autonomy-suggestions',
    'autonomy',
    'Autonomy suggestions',
    'Possible future autonomy changes waiting for explicit Owner approval.',
    'not_learned',
    NULL,
    0,
    70
  );
