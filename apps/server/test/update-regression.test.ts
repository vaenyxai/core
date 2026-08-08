// Does the author's new version still get this household's own answers right?
//
// The two rules that make the check worth running at all are the two things
// most worth a test: it must not show the model the example it is testing, and
// it must not test against examples that came with the item.
import { describe, expect, it } from "vitest";

import type { LoadedMethod, MethodExample, StoredExample } from "../src/modules/core/methods.js";
import {
  ownExamples,
  runRegression,
  sameAnswer,
} from "../src/modules/core/update-regression.js";

const METHOD = { id: "m", name: "M" } as unknown as LoadedMethod;

function example(file: string, input: unknown, output: unknown, source = "owner"): StoredExample {
  return { file, input, output, note: null, source, contributor: null, time: null };
}

describe("is this the same answer", () => {
  it("does not care what order the model emitted the keys in", () => {
    // A red light on every update teaches people to ignore red lights, which
    // is worse than not having them.
    expect(sameAnswer({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("treats a number written as a string as the same answer", () => {
    // The output schema polices types. This is policing meaning.
    expect(sameAnswer({ total: 120 }, { total: "120" })).toBe(true);
    expect(sameAnswer({ total: 120 }, { total: 121 })).toBe(false);
  });

  it("ignores whitespace a person cannot see", () => {
    expect(sameAnswer({ note: "level 2 " }, { note: "level 2" })).toBe(true);
  });

  it("notices an answer that actually moved", () => {
    expect(sameAnswer({ unit: "m2" }, { unit: "sqm" })).toBe(false);
  });
});

describe("which examples get tested", () => {
  it("leaves out the ones that came with the item", () => {
    const kept = ownExamples(
      [example("0001.json", 1, 1), example("0002.json", 2, 2)],
      new Set(["0002.json"]),
    );
    expect(kept.map((entry) => entry.file)).toEqual(["0001.json"]);
  });

  it("leaves out the model's own draft-time inventions", () => {
    const kept = ownExamples(
      [example("0001.json", 1, 1, "synthetic"), example("0002.json", 2, 2)],
      new Set(),
    );
    expect(kept.map((entry) => entry.file)).toEqual(["0002.json"]);
  });
});

describe("running the check", () => {
  it("🔴 never shows the model the example it is testing", async () => {
    // Without this the test is a copying exercise: the model is handed the
    // answer as few-shot and repeats it, so a gutted recipe passes every time.
    const seen: MethodExample[][] = [];
    await runRegression(
      METHOD,
      [example("0001.json", "a", "A"), example("0002.json", "b", "B")],
      async (_method, fewShot, input) => {
        seen.push(fewShot);
        return { output: input === "a" ? "A" : "B" };
      },
      { authorFiles: new Set(), limit: 5, now: "t", version: "1.0.0" },
    );
    expect(seen[0]?.map((entry) => entry.input)).toEqual(["b"]);
    expect(seen[1]?.map((entry) => entry.input)).toEqual(["a"]);
  });

  it("turns the light red when an answer moved, and says which one", async () => {
    const result = await runRegression(
      METHOD,
      [example("0001.json", "a", { unit: "m2" })],
      async () => ({ output: { unit: "sqm" } }),
      { authorFiles: new Set(), limit: 5, now: "t", version: "2.0.0" },
    );
    expect(result.state).toBe("fail");
    expect(result.failedCount).toBe(1);
    expect(result.cases[0]?.got).toEqual({ unit: "sqm" });
    expect(result.cases[0]?.expected).toEqual({ unit: "m2" });
  });

  it("a model that could not answer is not a verdict about the recipe", async () => {
    // Reporting "fail" here would point the Owner at the wrong problem and
    // could talk them into rolling back a version that was fine.
    const result = await runRegression(
      METHOD,
      [example("0001.json", "a", "A")],
      async () => {
        throw new Error("offline");
      },
      { authorFiles: new Set(), limit: 5, now: "t", version: "2.0.0" },
    );
    expect(result.state).toBe("error");
  });

  it("reports how many it actually ran, so a cap cannot read as a clean bill", async () => {
    const result = await runRegression(
      METHOD,
      [
        example("0001.json", "a", "A"),
        example("0002.json", "b", "B"),
        example("0003.json", "c", "C"),
      ],
      async (_method, _fewShot, input) => ({ output: String(input).toUpperCase() }),
      { authorFiles: new Set(), limit: 2, now: "t", version: "2.0.0" },
    );
    expect(result.state).toBe("pass");
    expect(result.checkedCount).toBe(2);
  });
});
