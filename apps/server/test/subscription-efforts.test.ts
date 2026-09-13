// The chat path sends a subscription model only a level that model takes
// (Oskar, 2026-09-13: 单位跟着他们选).
import { beforeEach, describe, expect, it } from "vitest";

import {
  CLAUDE_EFFORT_TIERS,
  CODEX_EFFORT_TIERS,
  effortForModel,
  rememberSubscriptionEfforts,
  resetSubscriptionEffortsForTest,
} from "../src/modules/models/subscription-efforts.js";

describe("which effort a subscription model is sent", () => {
  beforeEach(() => {
    resetSubscriptionEffortsForTest();
  });

  it("sends the stored level when the model takes it", () => {
    rememberSubscriptionEfforts("claude-sub", [
      { id: "sonnet", efforts: ["low", "medium", "high", "xhigh", "max"] },
    ]);
    expect(effortForModel("claude-sub", "sonnet", "max", CLAUDE_EFFORT_TIERS)).toBe("max");
  });

  it("steps down to the highest level the model has below it", () => {
    rememberSubscriptionEfforts("codex", [
      { id: "gpt-5.5", efforts: ["low", "medium", "high", "xhigh"], isDefault: true },
    ]);
    expect(effortForModel("codex", "gpt-5.5", "max", CODEX_EFFORT_TIERS)).toBe("xhigh");
  });

  it("uses the engine's default row when no model is pinned", () => {
    rememberSubscriptionEfforts("codex", [
      { id: "gpt-5.4-mini", efforts: ["low", "medium"] },
      { id: "gpt-5.5", efforts: ["low", "medium", "high", "xhigh"], isDefault: true },
    ]);
    expect(effortForModel("codex", null, "xhigh", CODEX_EFFORT_TIERS)).toBe("xhigh");
    rememberSubscriptionEfforts("claude-sub", [{ id: "default", efforts: ["low", "high"] }]);
    expect(effortForModel("claude-sub", undefined, "medium", CLAUDE_EFFORT_TIERS)).toBe("low");
  });

  it("sends nothing to a model with no levels", () => {
    rememberSubscriptionEfforts("claude-sub", [{ id: "haiku", efforts: [] }]);
    expect(effortForModel("claude-sub", "haiku", "high", CLAUDE_EFFORT_TIERS)).toBeNull();
  });

  it("falls back to the engine's tiers before any catalogue was read", () => {
    expect(effortForModel("codex", "gpt-5.5", "max", CODEX_EFFORT_TIERS)).toBe("xhigh");
    expect(effortForModel("claude-sub", "sonnet", "xhigh", CLAUDE_EFFORT_TIERS)).toBe("xhigh");
  });

  it("sends nothing when no level was asked for", () => {
    expect(effortForModel("claude-sub", "sonnet", null, CLAUDE_EFFORT_TIERS)).toBeNull();
  });
});
