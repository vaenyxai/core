-- Per-conversation reasoning level (the chat "model · level" picker). The Codex
-- harness takes model_reasoning_effort at spawn time; this stores the Owner's
-- choice per chat so a chat can run Fast/Balanced/Deep (low/medium/high).
-- Nullable: NULL means use the default ("medium"/Balanced). Existing chats keep
-- NULL.

ALTER TABLE ask_vanta_conversations ADD COLUMN reasoning_effort TEXT;
