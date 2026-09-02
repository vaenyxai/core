-- H-009: a structured question is a versioned part attached to one assistant
-- message. Its immutable wording is separate from its one canonical
-- resolution so every client sees the same state after reload.
CREATE TABLE ask_vaenyx_structured_questions (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  assistant_message_id TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version = 1),
  prompt TEXT NOT NULL,
  help_text TEXT,
  options_json TEXT NOT NULL,
  allow_free_text INTEGER NOT NULL DEFAULT 1 CHECK (allow_free_text = 1),
  allow_skip INTEGER NOT NULL DEFAULT 1 CHECK (allow_skip = 1),
  plain_text_fallback TEXT NOT NULL,
  loop_depth INTEGER NOT NULL DEFAULT 1 CHECK (loop_depth BETWEEN 1 AND 2),
  resolution_kind TEXT CHECK (
    resolution_kind IS NULL OR
    resolution_kind IN ('choice', 'free_text', 'skip')
  ),
  resolution_option_id TEXT,
  resolution_text TEXT,
  resolution_display_text TEXT,
  resolved_at TEXT,
  owner_message_id TEXT UNIQUE,
  reply_message_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES ask_vaenyx_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (assistant_message_id) REFERENCES ask_vaenyx_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_message_id) REFERENCES ask_vaenyx_messages(id) ON DELETE SET NULL,
  FOREIGN KEY (reply_message_id) REFERENCES ask_vaenyx_messages(id) ON DELETE SET NULL
);

CREATE INDEX ask_vaenyx_structured_questions_open_index
ON ask_vaenyx_structured_questions(conversation_id, resolved_at, created_at);

-- Every retry is recorded, including attempts that lost first-resolution-wins.
-- The canonical question row never changes after its first accepted answer.
CREATE TABLE ask_vaenyx_structured_question_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('choice', 'free_text', 'skip')),
  option_id TEXT,
  answer_text TEXT,
  accepted INTEGER NOT NULL CHECK (accepted IN (0, 1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES ask_vaenyx_structured_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

CREATE INDEX ask_vaenyx_structured_question_attempts_question_index
ON ask_vaenyx_structured_question_attempts(question_id, created_at);
