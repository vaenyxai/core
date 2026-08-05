// WHO SPENT WHAT, by month. The capability design's promise for Token grants
// is that a nod which keeps costing money must keep being visible — the Owner
// otherwise sees only a bill that grew and cannot say which app grew it.
//
// Counted at the moment an engine call is actually attempted (success or
// failure both count: a failed call still hit the subscription). Token counts
// are recorded ONLY when an engine reports them — the Claude SDK does, the
// Codex CLI does not — and a NULL stays NULL rather than being estimated:
// a made-up number beside a real one poisons both.
import type { DatabaseHandle } from "../../db/database.js";

// 'core' = Vaenyx's own model calls; 'door' = a caller on the door's shared
// key; anything else is an app_profiles.id.
export type UsageAppId = string;

export function usageMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function recordEngineUsage(
  database: DatabaseHandle,
  appId: UsageAppId,
  engine: string,
  tokens?: { input?: number; output?: number },
): void {
  try {
    database.sqlite
      .prepare(
        `INSERT INTO relay_usage (month, app_id, engine, calls, input_tokens, output_tokens)
         VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT(month, app_id, engine) DO UPDATE SET
           calls = calls + 1,
           input_tokens = CASE
             WHEN excluded.input_tokens IS NULL THEN input_tokens
             ELSE COALESCE(input_tokens, 0) + excluded.input_tokens END,
           output_tokens = CASE
             WHEN excluded.output_tokens IS NULL THEN output_tokens
             ELSE COALESCE(output_tokens, 0) + excluded.output_tokens END`,
      )
      .run(
        usageMonth(),
        appId,
        engine,
        typeof tokens?.input === "number" ? Math.round(tokens.input) : null,
        typeof tokens?.output === "number" ? Math.round(tokens.output) : null,
      );
  } catch {
    // Usage is bookkeeping: a failure to count must never fail the call
    // being counted.
  }
}

// The model providers have no database handle and should not grow one for
// bookkeeping. buildApp binds the live database here once; until then (and in
// unit tests that never build the app) counting is a no-op — usage must never
// be a reason a call fails.
let boundDatabase: DatabaseHandle | null = null;

export function bindUsageDatabase(database: DatabaseHandle): void {
  boundDatabase = database;
}

export function noteCoreUsage(
  engine: string,
  tokens?: { input?: number; output?: number },
): void {
  if (!boundDatabase) return;
  recordEngineUsage(boundDatabase, "core", engine, tokens);
}

export interface UsageRow {
  appId: string;
  appName: string;
  engine: string;
  calls: number;
  inputTokens: number | null;
  outputTokens: number | null;
}

// This month's spend, one row per (caller, engine), heaviest first. Names are
// joined here so the page never shows a bare UUID: a deleted profile's rows
// survive as "Removed app" — the spend happened and stays answerable.
export function listMonthUsage(database: DatabaseHandle): UsageRow[] {
  const rows = database.sqlite
    .prepare(
      `SELECT u.app_id AS appId, p.name AS profileName, u.engine,
              u.calls, u.input_tokens AS inputTokens, u.output_tokens AS outputTokens
       FROM relay_usage u
       LEFT JOIN app_profiles p ON p.id = u.app_id
       WHERE u.month = ?
       ORDER BY u.calls DESC`,
    )
    .all(usageMonth()) as {
    appId: string;
    profileName: string | null;
    engine: string;
    calls: number;
    inputTokens: number | null;
    outputTokens: number | null;
  }[];
  return rows.map((row) => ({
    appId: row.appId,
    appName:
      row.appId === "core"
        ? "Vaenyx"
        : row.appId === "door"
          ? "Door key"
          : (row.profileName ?? "Removed app"),
    engine: row.engine,
    calls: row.calls,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
  }));
}
