-- LOCAL CONVERSATION SEARCH.
--
-- The canonical message table remains the source of truth. This FTS table is
-- only a rebuildable, local search projection: no model, network service, or
-- attachment bytes ever enter it. `vaenyx_conversation_search_text` is a
-- deterministic SQLite function registered by database.ts before migrations;
-- it removes credential-shaped text and segments Chinese before indexing.
CREATE VIRTUAL TABLE IF NOT EXISTS conversation_message_search USING fts5(
  message_id UNINDEXED,
  conversation_id UNINDEXED,
  mode_id UNINDEXED,
  role UNINDEXED,
  created_at UNINDEXED,
  body,
  tokenize = 'unicode61'
);

-- Populate every conversation already on the instance. The same expression
-- is used by the live triggers and the startup repair, so migration and steady
-- state cannot disagree about what is searchable.
INSERT INTO conversation_message_search (
  message_id, conversation_id, mode_id, role, created_at, body
)
SELECT
  messages.id,
  messages.conversation_id,
  COALESCE(conversations.mode_id, ''),
  messages.role,
  messages.created_at,
  vaenyx_conversation_search_text(messages.content)
FROM ask_vaenyx_messages AS messages
JOIN ask_vaenyx_conversations AS conversations
  ON conversations.id = messages.conversation_id
WHERE NOT (messages.role = 'assistant' AND messages.status = 'failed');

CREATE TRIGGER conversation_message_search_insert
AFTER INSERT ON ask_vaenyx_messages
BEGIN
  INSERT INTO conversation_message_search (
    message_id, conversation_id, mode_id, role, created_at, body
  )
  SELECT
    NEW.id,
    NEW.conversation_id,
    COALESCE(conversations.mode_id, ''),
    NEW.role,
    NEW.created_at,
    vaenyx_conversation_search_text(NEW.content)
  FROM ask_vaenyx_conversations AS conversations
  WHERE conversations.id = NEW.conversation_id
    AND NOT (NEW.role = 'assistant' AND NEW.status = 'failed');
END;

CREATE TRIGGER conversation_message_search_update
AFTER UPDATE OF content, role, status, created_at, conversation_id ON ask_vaenyx_messages
BEGIN
  DELETE FROM conversation_message_search WHERE message_id = OLD.id;
  INSERT INTO conversation_message_search (
    message_id, conversation_id, mode_id, role, created_at, body
  )
  SELECT
    NEW.id,
    NEW.conversation_id,
    COALESCE(conversations.mode_id, ''),
    NEW.role,
    NEW.created_at,
    vaenyx_conversation_search_text(NEW.content)
  FROM ask_vaenyx_conversations AS conversations
  WHERE conversations.id = NEW.conversation_id
    AND NOT (NEW.role = 'assistant' AND NEW.status = 'failed');
END;

CREATE TRIGGER conversation_message_search_delete
AFTER DELETE ON ask_vaenyx_messages
BEGIN
  DELETE FROM conversation_message_search WHERE message_id = OLD.id;
END;

-- Deleting a Mode reassigns its conversations to User Mode. Keep the indexed
-- metadata in the same transaction; authorization still joins the canonical
-- conversation row and never trusts this projection by itself.
CREATE TRIGGER conversation_message_search_mode_update
AFTER UPDATE OF mode_id ON ask_vaenyx_conversations
BEGIN
  UPDATE conversation_message_search
  SET mode_id = COALESCE(NEW.mode_id, '')
  WHERE conversation_id = NEW.id;
END;
