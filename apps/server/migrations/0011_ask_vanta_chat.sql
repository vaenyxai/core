CREATE TABLE IF NOT EXISTS ask_vanta_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ask_vanta_conversations_updated_at_index
ON ask_vanta_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS ask_vanta_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  web_search_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES ask_vanta_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ask_vanta_messages_conversation_index
ON ask_vanta_messages(conversation_id, created_at ASC);
