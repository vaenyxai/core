// The models the Owner has FOUND, TESTED and chosen to USE (Oskar,
// 2026-09-05: 搜索 → test → 使用). The top of Settings picks only among
// these; the middle of Settings is where a model earns its place with one
// real answer. One list per backend, each entry carrying the test it passed,
// so a tick never outlives the evidence it was earned on.
import type { DatabaseHandle } from "../../db/database.js";

export interface ModelAdmissionTest {
  status: "ok" | "failed";
  requestedModel: string;
  /** What the engine said answered, when it says so; otherwise null. */
  model: string | null;
  modelReportedByEngine: boolean;
  message: string;
  durationMs: number;
  timestamp: string;
}

export interface AdoptedModel {
  id: string;
  adoptedAt: string;
  test: ModelAdmissionTest | null;
}

const ADOPTED_KEY = "models.adopted";
const TESTS_KEY = "models.admission-tests";

function readJson<T>(database: DatabaseHandle, key: string, fallback: T): T {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(key) as { value?: string } | undefined;
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

function writeJson(database: DatabaseHandle, key: string, value: unknown): void {
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = CURRENT_TIMESTAMP`,
    )
    .run(key, JSON.stringify(value));
}

/** provider -> model -> the last real test on it. */
export function readAdmissionTests(
  database: DatabaseHandle,
): Record<string, Record<string, ModelAdmissionTest>> {
  return readJson(database, TESTS_KEY, {});
}

export function recordAdmissionTest(
  database: DatabaseHandle,
  provider: string,
  test: ModelAdmissionTest,
): void {
  const tests = readAdmissionTests(database);
  tests[provider] = { ...tests[provider], [test.requestedModel]: test };
  writeJson(database, TESTS_KEY, tests);
}

/** provider -> the models in use, each with its latest test. */
export function readAdoptedModels(
  database: DatabaseHandle,
): Record<string, AdoptedModel[]> {
  const stored = readJson<Record<string, AdoptedModel[]>>(
    database,
    ADOPTED_KEY,
    {},
  );
  const tests = readAdmissionTests(database);
  const merged: Record<string, AdoptedModel[]> = {};
  for (const [provider, models] of Object.entries(stored)) {
    merged[provider] = models.map((entry) => ({
      ...entry,
      test: tests[provider]?.[entry.id] ?? entry.test,
    }));
  }
  return merged;
}

/** Only a model that just answered may be used: the last test on it must
 *  have passed. Re-adopting an adopted model is a no-op. */
export function adoptModel(
  database: DatabaseHandle,
  provider: string,
  model: string,
): Record<string, AdoptedModel[]> {
  const test = readAdmissionTests(database)[provider]?.[model];
  if (!test || test.status !== "ok") {
    throw new Error("MODEL_NOT_TESTED");
  }
  const stored = readJson<Record<string, AdoptedModel[]>>(
    database,
    ADOPTED_KEY,
    {},
  );
  const current = stored[provider] ?? [];
  if (!current.some((entry) => entry.id === model)) {
    stored[provider] = [
      ...current,
      { id: model, adoptedAt: new Date().toISOString(), test },
    ];
    writeJson(database, ADOPTED_KEY, stored);
  }
  return readAdoptedModels(database);
}

export function unadoptModel(
  database: DatabaseHandle,
  provider: string,
  model: string,
): Record<string, AdoptedModel[]> {
  const stored = readJson<Record<string, AdoptedModel[]>>(
    database,
    ADOPTED_KEY,
    {},
  );
  const current = stored[provider] ?? [];
  const next = current.filter((entry) => entry.id !== model);
  if (next.length === 0) delete stored[provider];
  else stored[provider] = next;
  writeJson(database, ADOPTED_KEY, stored);
  return readAdoptedModels(database);
}
