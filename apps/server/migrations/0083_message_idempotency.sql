-- H-012: one stable device draft id may create at most one canonical Owner
-- message in a Conversation. NULL keeps every older/system-created message
-- unchanged; the partial unique index governs only new idempotent sends.
ALTER TABLE ask_vaenyx_messages ADD COLUMN client_message_id TEXT;

CREATE UNIQUE INDEX ask_vaenyx_messages_client_id_index
ON ask_vaenyx_messages (conversation_id, client_message_id)
WHERE role = 'owner' AND client_message_id IS NOT NULL;
