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

## Derived Memory keeps source lineage

Approved facts and Vaenyx Me traits write one `memory_provenance` row per known
source in the same transaction as admission. Candidate merges preserve the
union of sources. A source may be a Conversation/message, task, Project Memory,
manual Owner entry, external source, or an explicit `unavailable` legacy
marker; migration 0082 backfills only links already provable from stored ids.

Conversation exclusion is a persistent source-level rule checked before scan,
queue, and approval. Forgetting a source soft-removes its active provenance and
retires a derived item only when no other valid source remains. Any unknown
legacy source blocks automatic removal. Permanent Conversation deletion
requires a fresh hashed preview revision and an explicit keep-or-forget choice;
the selected Memory action and transcript deletion share one SQLite
transaction. Forget audit rows contain only hashed ids, outcome, reason and
time—never Memory or transcript text.

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
