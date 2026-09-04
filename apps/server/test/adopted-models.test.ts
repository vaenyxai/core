// Find -> Test -> Use (Oskar, 2026-09-05): a model joins the pickers only
// after one real answer, its evidence travels with it, and dropping it is
// one step.
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  adoptModel,
  readAdmissionTests,
  readAdoptedModels,
  recordAdmissionTest,
  unadoptModel,
  type ModelAdmissionTest,
} from "../src/modules/models/adopted-models.js";
import type { DatabaseHandle } from "../src/db/database.js";

function database(): DatabaseHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    `CREATE TABLE instance_settings (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL,
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );
  return { sqlite } as unknown as DatabaseHandle;
}

function test(model: string, status: "ok" | "failed"): ModelAdmissionTest {
  return {
    status,
    requestedModel: model,
    model: status === "ok" ? model : null,
    modelReportedByEngine: true,
    message: status === "ok" ? "Answered." : "refused",
    durationMs: 1200,
    timestamp: "2026-09-05T00:00:00.000Z",
  };
}

describe("adopting a model", () => {
  it("refuses a model that has not passed a test", () => {
    const db = database();
    expect(() => adoptModel(db, "claude-sub", "haiku")).toThrow(
      "MODEL_NOT_TESTED",
    );
    recordAdmissionTest(db, "claude-sub", test("haiku", "failed"));
    expect(() => adoptModel(db, "claude-sub", "haiku")).toThrow(
      "MODEL_NOT_TESTED",
    );
    expect(readAdoptedModels(db)).toEqual({});
  });

  it("keeps the evidence with the model, latest test winning", () => {
    const db = database();
    recordAdmissionTest(db, "claude-sub", test("sonnet", "ok"));
    const adopted = adoptModel(db, "claude-sub", "sonnet");
    expect(adopted["claude-sub"]).toHaveLength(1);
    expect(adopted["claude-sub"]?.[0]).toMatchObject({
      id: "sonnet",
      test: { status: "ok", model: "sonnet" },
    });
    // Adopting twice is one entry; a newer test shows through.
    adoptModel(db, "claude-sub", "sonnet");
    recordAdmissionTest(db, "claude-sub", test("sonnet", "failed"));
    const again = readAdoptedModels(db)["claude-sub"];
    expect(again).toHaveLength(1);
    expect(again?.[0]?.test?.status).toBe("failed");
    expect(readAdmissionTests(db)["claude-sub"]?.sonnet?.status).toBe("failed");
  });

  it("drops a model in one step and leaves the others alone", () => {
    const db = database();
    recordAdmissionTest(db, "codex", test("gpt-5.4", "ok"));
    recordAdmissionTest(db, "codex", test("gpt-5.4-mini", "ok"));
    adoptModel(db, "codex", "gpt-5.4");
    adoptModel(db, "codex", "gpt-5.4-mini");
    const left = unadoptModel(db, "codex", "gpt-5.4");
    expect(left.codex?.map((entry) => entry.id)).toEqual(["gpt-5.4-mini"]);
    expect(unadoptModel(db, "codex", "gpt-5.4-mini")).toEqual({});
    // Dropping something never adopted is not an error.
    expect(unadoptModel(db, "codex", "nothing")).toEqual({});
  });
});
