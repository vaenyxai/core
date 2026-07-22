-- Per-conversation model NAME (the "model within the provider" half of the
-- picker): NULL means the provider's configured model; a string picks a
-- specific model of the pinned/default provider for this conversation only.
-- Codex ignores it (single-login backend).

ALTER TABLE ask_vaenyx_conversations ADD COLUMN model_name TEXT;
