-- H-011: durable, append-safe provenance for approved derived Memory.
--
-- Provenance deliberately has no FK to its source. A deleted Conversation
-- must turn into an honestly unavailable source, not erase the record of why
-- a Memory item was once admitted. `memory_id` is likewise polymorphic across
-- facts and Vaenyx Me profile items, so its integrity is enforced by the only
-- two admission paths in code rather than a misleading single-table FK.
CREATE TABLE memory_provenance (
  id TEXT PRIMARY KEY NOT NULL,
  memory_kind TEXT NOT NULL CHECK (memory_kind IN ('fact', 'profile')),
  memory_id TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (
    source_kind IN (
      'conversation', 'task', 'project_memory', 'manual', 'external',
      'unavailable'
    )
  ),
  source_id TEXT,
  source_message_id TEXT,
  mode_id TEXT,
  project_id TEXT,
  admission_event_id TEXT NOT NULL,
  admitted_at TEXT NOT NULL,
  removed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX memory_provenance_identity_index
ON memory_provenance (
  memory_kind,
  memory_id,
  source_kind,
  COALESCE(source_id, ''),
  COALESCE(source_message_id, ''),
  admission_event_id
);

CREATE INDEX memory_provenance_source_index
ON memory_provenance (source_kind, source_id, mode_id);

CREATE INDEX memory_provenance_memory_index
ON memory_provenance (memory_kind, memory_id, mode_id);

-- Exclusion is a source-level rule. Clearing it retains the row and both
-- timestamps, so restart and re-scan cannot confuse "never excluded" with
-- "the Owner allowed this source again".
CREATE TABLE memory_source_exclusions (
  source_key TEXT PRIMARY KEY NOT NULL,
  source_kind TEXT NOT NULL CHECK (
    source_kind IN ('conversation', 'task', 'project_memory')
  ),
  source_id TEXT NOT NULL,
  mode_id TEXT,
  project_id TEXT,
  excluded_at TEXT NOT NULL,
  cleared_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX memory_source_exclusions_scope_index
ON memory_source_exclusions (source_kind, source_id, mode_id, cleared_at);

-- A forget event contains identifiers only as hashes and never repeats the
-- forgotten value, title, quote, or transcript content.
CREATE TABLE memory_forget_events (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('source_forget', 'conversation_delete_forget')
  ),
  memory_kind TEXT NOT NULL CHECK (memory_kind IN ('fact', 'profile')),
  memory_id_hash TEXT NOT NULL,
  source_id_hash TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('forgotten', 'retained')),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX memory_forget_events_created_index
ON memory_forget_events (created_at DESC);

-- Existing facts already name a source when one is genuinely known. Do not
-- manufacture a Conversation for manual, external, or pre-source rows.
INSERT OR IGNORE INTO memory_provenance (
  id, memory_kind, memory_id, source_kind, source_id, source_message_id,
  mode_id, project_id, admission_event_id, admitted_at
)
SELECT
  'legacy-fact-' || facts.id,
  'fact',
  facts.id,
  CASE
    WHEN facts.source_conversation_id IS NOT NULL THEN 'conversation'
    WHEN facts.source_kind = 'manual' THEN 'manual'
    WHEN facts.source_kind = 'external' THEN 'external'
    ELSE 'unavailable'
  END,
  CASE
    WHEN facts.source_conversation_id IS NOT NULL THEN facts.source_conversation_id
    WHEN facts.source_kind = 'external' THEN facts.source_detail
    ELSE NULL
  END,
  CASE
    WHEN facts.source_conversation_id IS NOT NULL THEN facts.source_message_id
    ELSE NULL
  END,
  facts.mode_id,
  (
    SELECT vaenyx_threads.project_id
    FROM vaenyx_threads
    WHERE vaenyx_threads.conversation_id = facts.source_conversation_id
    LIMIT 1
  ),
  'legacy-fact-admission-' || facts.id,
  facts.recorded_at
FROM facts;

-- A later-created profile item embeds the candidate id and can therefore be
-- linked honestly. Older seeded slots may have been overwritten by an
-- approval without storing that association; those are handled below as
-- unavailable rather than guessed by category or similar prose.
INSERT OR IGNORE INTO memory_provenance (
  id, memory_kind, memory_id, source_kind, source_id, source_message_id,
  mode_id, project_id, admission_event_id, admitted_at
)
SELECT
  'legacy-profile-' || items.id,
  'profile',
  items.id,
  CASE candidates.source_type
    WHEN 'chat_history' THEN 'conversation'
    WHEN 'task_result' THEN 'task'
    WHEN 'project_memory' THEN 'project_memory'
    WHEN 'owner_manual' THEN 'manual'
    ELSE 'unavailable'
  END,
  candidates.source_id,
  NULL,
  candidates.mode_id,
  CASE candidates.source_type
    WHEN 'chat_history' THEN (
      SELECT vaenyx_threads.project_id FROM vaenyx_threads
      WHERE vaenyx_threads.conversation_id = candidates.source_id LIMIT 1
    )
    WHEN 'task_result' THEN (
      SELECT tasks.project_id FROM tasks WHERE tasks.id = candidates.source_id
    )
    WHEN 'project_memory' THEN (
      SELECT project_memories.project_id FROM project_memories
      WHERE project_memories.id = candidates.source_id
    )
    ELSE NULL
  END,
  'legacy-candidate-approval-' || candidates.id,
  COALESCE(candidates.reviewed_at, candidates.updated_at)
FROM vaenyx_me_items AS items
JOIN vaenyx_me_candidates AS candidates
  ON items.id = 'approved-' || candidates.id
WHERE items.status = 'approved'
  AND (candidates.source_type <> 'chat_history' OR candidates.source_id IS NOT NULL);

-- Candidate source union was added before this provenance table. Preserve
-- every honestly named Conversation from that JSON, rather than silently
-- reducing a multi-source approval to its first Conversation.
INSERT OR IGNORE INTO memory_provenance (
  id, memory_kind, memory_id, source_kind, source_id, source_message_id,
  mode_id, project_id, admission_event_id, admitted_at
)
SELECT
  'legacy-profile-json-' || items.id || '-' || sources.key,
  'profile',
  items.id,
  'conversation',
  json_extract(sources.value, '$.conversationId'),
  CASE
    WHEN json_type(sources.value, '$.messageId') = 'text'
      THEN json_extract(sources.value, '$.messageId')
    ELSE NULL
  END,
  candidates.mode_id,
  (
    SELECT vaenyx_threads.project_id FROM vaenyx_threads
    WHERE vaenyx_threads.conversation_id = json_extract(sources.value, '$.conversationId')
    LIMIT 1
  ),
  'legacy-candidate-approval-' || candidates.id,
  COALESCE(candidates.reviewed_at, candidates.updated_at)
FROM vaenyx_me_items AS items
JOIN vaenyx_me_candidates AS candidates
  ON items.id = 'approved-' || candidates.id
JOIN json_each(
  CASE
    WHEN json_valid(candidates.sources_json) THEN
      CASE
        WHEN json_type(candidates.sources_json) = 'array' THEN candidates.sources_json
        ELSE '[]'
      END
    ELSE '[]'
  END
) AS sources
WHERE items.status = 'approved'
  AND candidates.source_type = 'chat_history'
  AND json_type(sources.value) = 'object'
  AND json_type(sources.value, '$.conversationId') = 'text';

INSERT OR IGNORE INTO memory_provenance (
  id, memory_kind, memory_id, source_kind, source_id, source_message_id,
  mode_id, project_id, admission_event_id, admitted_at
)
SELECT
  'legacy-profile-unavailable-' || items.id,
  'profile',
  items.id,
  'unavailable',
  NULL,
  NULL,
  NULL,
  NULL,
  'legacy-profile-admission-' || items.id,
  items.updated_at
FROM vaenyx_me_items AS items
WHERE items.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM memory_provenance
    WHERE memory_kind = 'profile' AND memory_id = items.id
  );

-- Correct the retired pre-release name only for untouched seed rows. Existing
-- Owner-edited text is deliberately left alone.
UPDATE vaenyx_me_items
SET summary = 'Vaenyx only knows the Owner name until the Owner approves more personal context.'
WHERE id = 'owner-identity'
  AND status = 'not_learned'
  AND summary = 'Vanta only knows the Owner name until the Owner approves more personal context.';

UPDATE vaenyx_me_items
SET summary = 'How the Owner prefers Vaenyx to explain, summarize, and ask questions.'
WHERE id = 'communication-style'
  AND status = 'not_learned'
  AND summary = 'How the Owner prefers Vanta to explain, summarize, and ask questions.';
