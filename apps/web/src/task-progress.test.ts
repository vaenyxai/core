import { describe, expect, it } from "vitest";

import type { TaskRunProgress } from "@vaenyx/contracts";

import { acceptTaskProgressUpdate } from "./task-progress.js";

function progress(
  runId: string,
  revision: number,
  startedAt = "2026-09-02T00:00:00.000Z",
): TaskRunProgress {
  return {
    version: 1,
    runId,
    taskId: "task-1",
    conversationId: null,
    revision,
    state: "running",
    currentStep: "Working",
    completedSteps: ["Started"],
    statusText: "Task is running.",
    startedAt,
    updatedAt: startedAt,
    finishedAt: null,
    outcomeMessageId: null,
  };
}

describe("durable task progress ordering", () => {
  it("rejects stale and duplicate revisions for the same run", () => {
    const current = progress("run-1", 5);
    expect(acceptTaskProgressUpdate(current, progress("run-1", 4))).toBe(
      current,
    );
    expect(acceptTaskProgressUpdate(current, progress("run-1", 5))).toBe(
      current,
    );
  });

  it("accepts a newer revision and a newer run", () => {
    expect(
      acceptTaskProgressUpdate(progress("run-1", 2), progress("run-1", 3))
        ?.revision,
    ).toBe(3);
    expect(
      acceptTaskProgressUpdate(
        progress("run-1", 8),
        progress("run-2", 1, "2026-09-02T01:00:00.000Z"),
      )?.runId,
    ).toBe("run-2");
  });

  it("does not let an older run replace the visible card", () => {
    const current = progress("run-2", 1, "2026-09-02T01:00:00.000Z");
    expect(
      acceptTaskProgressUpdate(
        current,
        progress("run-1", 99, "2026-09-02T00:00:00.000Z"),
      ),
    ).toBe(current);
  });
});
