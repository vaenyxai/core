-- Per-conversation model provider (the "model" side of the chat "model · level"
-- picker). NULL means use the registry default provider; existing chats keep
-- NULL and follow the Owner's chosen default. A pinned id that is no longer
-- registered falls back to the default at send time (see resolveProvider).

ALTER TABLE ask_vaenyx_conversations ADD COLUMN model_provider_id TEXT;
