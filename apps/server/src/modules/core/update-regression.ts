// RE-RUNNING THIS HOUSEHOLD'S OWN EXAMPLES AGAINST AN UPDATED RECIPE.
//
// The update dialog promises "your accumulated examples are kept", and they
// are. That is not the same promise as "they still come out right", and until
// this file existed nobody was checking the difference.
//
// Why it has to exist: the author tested their new version against their own
// cases. The examples in this Library are the ones somebody HERE made, almost
// always about the local convention that made the Method worth keeping. A new
// version that stops honouring them fails silently — the next wrong number
// leaves in a quote, and the first sign of trouble is a customer.
//
// Two rules the check would be worthless without:
//
//   🔴 LEAVE ONE OUT. Methods run with their examples as few-shot. Handing the
//      model the example it is being tested on turns the test into a copying
//      exercise that passes every time, including on a recipe that has been
//      gutted. Each case runs with every OTHER example and not itself.
//
//   🔴 THE OWNER'S EXAMPLES ONLY. An example that came down from the author is
//      part of what is being tested, not evidence about it. Testing the new
//      version against its own shipped cases measures nothing.
//
// It reports and stops. Nothing rolls back on its own — the way back is one
// button in the same dialog, and which way to go is the Owner's call.
import type { DatabaseHandle } from "../../db/database.js";
import type { LoadedMethod, MethodExample, StoredExample } from "./methods.js";

export type RegressionState = "pass" | "fail" | "error";

export interface RegressionCase {
  file: string;
  matched: boolean;
  expected: unknown;
  got: unknown;
}

export interface RegressionResult {
  state: RegressionState;
  checkedCount: number;
  failedCount: number;
  cases: RegressionCase[];
  version: string;
  checkedAt: string;
}

/**
 * Is this the same answer?
 *
 * Deliberately not `JSON.stringify(a) === JSON.stringify(b)`. Key order is an
 * artefact of how the model happened to emit the object and says nothing about
 * whether the answer changed; flagging it would produce a red light on every
 * update and teach the Owner to ignore red lights, which is worse than having
 * none. Numbers written as strings are the same for the same reason — the
 * output schema is what polices types, and this is policing meaning.
 */
export function sameAnswer(expected: unknown, got: unknown): boolean {
  return normalise(expected) === normalise(got);
}

function normalise(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function canonical(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      out[key] = canonical(source[key]);
    }
    return out;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    // "120" and 120 are the same answer differently typed.
    const asNumber = Number(trimmed);
    return trimmed !== "" && Number.isFinite(asNumber)
      ? String(asNumber)
      : trimmed;
  }
  return value;
}

/**
 * The examples worth testing against: the ones somebody here made, newest
 * first.
 *
 * Two exclusions, both load-bearing. Anything the origins table (0061) marks
 * 'author' arrived with the item — it is part of what is being tested, so
 * testing against it measures nothing. And "synthetic" examples were written
 * by the model at draft time; they are a starting shape, never evidence about
 * what this household needs the Method to say.
 */
export function ownExamples(
  examples: StoredExample[],
  authorFiles: ReadonlySet<string>,
): StoredExample[] {
  return examples.filter(
    (example) =>
      !authorFiles.has(example.file) && example.source !== "synthetic",
  );
}

/**
 * Re-run each of the household's examples through the current recipe and see
 * whether it still lands on the stored answer.
 *
 * `limit` exists because each case is a real model call the Owner pays for.
 * The caller says how many; the result says how many were actually run, so a
 * cap can never be mistaken for a clean bill of health.
 */
export async function runRegression(
  method: LoadedMethod,
  examples: StoredExample[],
  run: (
    method: LoadedMethod,
    fewShot: MethodExample[],
    input: unknown,
  ) => Promise<{ output: unknown }>,
  options: {
    authorFiles: ReadonlySet<string>;
    limit: number;
    version: string;
    now: string;
  },
): Promise<RegressionResult> {
  const own = ownExamples(examples, options.authorFiles);
  const subjects = own.slice(0, Math.max(0, options.limit));
  const cases: RegressionCase[] = [];

  for (const subject of subjects) {
    // 🔴 Every other example, and not this one. See the note at the top.
    const fewShot: MethodExample[] = own
      .filter((other) => other.file !== subject.file)
      .map((other) => ({ input: other.input, output: other.output }));
    let got: unknown;
    try {
      got = (await run(method, fewShot, subject.input)).output;
    } catch {
      // The model could not answer. That is not a verdict about the recipe,
      // and calling it a failure would point the Owner at the wrong problem.
      return {
        state: "error",
        checkedCount: cases.length,
        failedCount: cases.filter((entry) => !entry.matched).length,
        cases,
        version: options.version,
        checkedAt: options.now,
      };
    }
    cases.push({
      file: subject.file,
      matched: sameAnswer(subject.output, got),
      expected: subject.output,
      got,
    });
  }

  const failedCount = cases.filter((entry) => !entry.matched).length;
  return {
    state: failedCount > 0 ? "fail" : "pass",
    checkedCount: cases.length,
    failedCount,
    cases,
    version: options.version,
    checkedAt: options.now,
  };
}

export function recordRegression(
  database: DatabaseHandle,
  id: string,
  kind: "method" | "routine",
  result: RegressionResult,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO update_checks
         (id, kind, version, checked_at, state, checked_count, failed_count, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id, kind) DO UPDATE SET
         version = excluded.version,
         checked_at = excluded.checked_at,
         state = excluded.state,
         checked_count = excluded.checked_count,
         failed_count = excluded.failed_count,
         detail = excluded.detail`,
    )
    .run(
      id,
      kind,
      result.version,
      result.checkedAt,
      result.state,
      result.checkedCount,
      result.failedCount,
      JSON.stringify(result.cases.filter((entry) => !entry.matched)),
    );
}

export interface StoredCheck {
  id: string;
  kind: "method" | "routine";
  state: RegressionState;
  version: string;
  checkedAt: string;
  checkedCount: number;
  failedCount: number;
}

/**
 * Every verdict on record. The caller matches `version` against what is
 * installed now: a verdict about a version that has since been replaced says
 * nothing about the one running, and a stale red light is a lie that costs
 * more than silence.
 */
export function listRegressions(database: DatabaseHandle): StoredCheck[] {
  const rows = database.sqlite
    .prepare(
      `SELECT id, kind, state, version, checked_at, checked_count, failed_count
         FROM update_checks`,
    )
    .all() as {
    id: string;
    kind: string;
    state: string;
    version: string;
    checked_at: string;
    checked_count: number;
    failed_count: number;
  }[];
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as "method" | "routine",
    state: row.state as RegressionState,
    version: row.version,
    checkedAt: row.checked_at,
    checkedCount: row.checked_count,
    failedCount: row.failed_count,
  }));
}

/** Forget the verdict — used when the item is updated again, so the light
 *  always describes the version actually installed. */
export function clearRegression(
  database: DatabaseHandle,
  id: string,
  kind: "method" | "routine",
): void {
  database.sqlite
    .prepare(`DELETE FROM update_checks WHERE id = ? AND kind = ?`)
    .run(id, kind);
}
