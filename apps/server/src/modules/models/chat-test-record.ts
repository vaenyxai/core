// The last main-model test, kept so the Settings card can show WHAT was
// tested, WHEN, and which model the engine reported — instead of a green tick
// that outlives the setting it was earned on. One record per account, keyed
// by provider; a test on a different model overwrites the old one, because a
// tick for a model no longer chosen is a tick for nothing.
import type { DatabaseHandle } from "../../db/database.js";

export interface ChatTestRecord {
  provider: string;
  requestedModel: string | null;
  model: string | null;
  effort: string | null;
  status: "passed" | "failed" | "blocked";
  message: string;
  durationMs: number;
  timestamp: string;
}

const KEY_PREFIX = "models.chat-test.";

export function readChatTestRecord(
  database: DatabaseHandle,
  provider: string,
): ChatTestRecord | null {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(`${KEY_PREFIX}${provider}`) as { value?: string } | undefined;
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as ChatTestRecord;
  } catch {
    return null;
  }
}

export function writeChatTestRecord(
  database: DatabaseHandle,
  record: ChatTestRecord,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = CURRENT_TIMESTAMP`,
    )
    .run(`${KEY_PREFIX}${record.provider}`, JSON.stringify(record));
}
