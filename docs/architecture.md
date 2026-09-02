# Vaenyx Architecture Notes

Locked invariants the code must not drift from. Each entry records the rule
and why it exists; changing one is a product decision, not a refactor.

## Conversation identity is presentation, not instruction

Conversation title and one-line purpose are Owner-authored identity metadata.
The purpose reuses the previously unused `vaenyx_threads.summary` column and is
exposed as `purpose` at the API boundary; no duplicate storage column exists.
Both fields may be displayed and searched locally, but purpose must never enter
model context. New ordinary Conversations have no Project and appear in
Unsorted. Inbox remains a protected per-Mode Conversation, not the Unsorted
bucket. Project creation, naming, instructions and Memory are explicit Owner
actions under Settings.

## Model-visible means persisted

**Anything that entered a model request must be reconstructable from the
persistent layer; any state that influences behaviour must be persisted —
never inferred back from chat text or model output.**

Why: chat text is presentation, not state. The moment a behaviour depends on
re-reading what the model happened to say (or what the Owner happened to
see), that behaviour becomes unreproducible — edits, truncation, compaction
and retries all rewrite that surface. Vaenyx already has this shape: message
rows, facts, history checkpoints and attachment files are the source of
truth, and each model request is assembled from them every turn. Keep it
that way: a feature that wants to know "what did the model see?" reads the
stores the request was built from, never the transcript. (Same family as the
long-standing rule that a message's processing status is a column, never
something parsed back out of chat text.)
