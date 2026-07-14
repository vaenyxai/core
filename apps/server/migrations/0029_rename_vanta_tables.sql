-- Rename Vanta -> Vaenyx: the ask_vanta_* / vanta_threads / vanta_me_* tables.
-- ALTER TABLE ... RENAME TO preserves all rows, auto-updates the FOREIGN KEY
-- references in child tables' schemas, and renames the internal
-- sqlite_autoindex_* indexes to follow the table. The six explicitly-named
-- indexes keep their old names, so they are dropped and recreated with vaenyx
-- names. Pure structural rename; no data is moved or lost.
--
-- NOTE: the vanta_migrations bookkeeping table is intentionally NOT renamed — the
-- migration runner keys off it to know what has been applied, so renaming it would
-- risk re-running every migration. It is invisible internal bookkeeping.

ALTER TABLE ask_vanta_conversations RENAME TO ask_vaenyx_conversations;
ALTER TABLE ask_vanta_messages RENAME TO ask_vaenyx_messages;
ALTER TABLE vanta_threads RENAME TO vaenyx_threads;
ALTER TABLE vanta_me_items RENAME TO vaenyx_me_items;
ALTER TABLE vanta_me_candidates RENAME TO vaenyx_me_candidates;

DROP INDEX ask_vanta_conversations_updated_at_index;
CREATE INDEX ask_vaenyx_conversations_updated_at_index
ON ask_vaenyx_conversations(updated_at DESC);

DROP INDEX ask_vanta_messages_conversation_index;
CREATE INDEX ask_vaenyx_messages_conversation_index
ON ask_vaenyx_messages(conversation_id, created_at ASC);

DROP INDEX vanta_me_candidates_category_index;
CREATE INDEX vaenyx_me_candidates_category_index
ON vaenyx_me_candidates(category, created_at DESC);

DROP INDEX vanta_me_candidates_status_index;
CREATE INDEX vaenyx_me_candidates_status_index
ON vaenyx_me_candidates(status, created_at DESC);

DROP INDEX vanta_threads_owner_updated_index;
CREATE INDEX vaenyx_threads_owner_updated_index
ON vaenyx_threads(owner_id, status, updated_at DESC);

DROP INDEX vanta_threads_project_kind_index;
CREATE INDEX vaenyx_threads_project_kind_index
ON vaenyx_threads(project_id, kind, status, updated_at DESC);
