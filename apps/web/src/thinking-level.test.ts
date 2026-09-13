// The rule this file exists to hold (Oskar, 2026-08-16, extended 2026-09-13):
// a level control is shown ONLY where the model in front of the Owner really
// has one, and it offers exactly the levels that model reports.
import { describe, expect, it } from "vitest";

import {
  clampEffort,
  effortChoices,
  effortOptions,
  type EffortCatalogue,
} from "./thinking-level.js";

const catalogue: EffortCatalogue = {
  codex: [
    { id: "gpt-5.5", efforts: ["low", "medium", "high", "xhigh"], isDefault: true },
    { id: "gpt-5.4-mini", efforts: ["low", "medium", "high", "xhigh"] },
  ],
  "claude-sub": [
    { id: "default", efforts: ["low", "medium", "high", "xhigh", "max"] },
    { id: "sonnet", efforts: ["low", "medium", "high", "xhigh", "max"] },
    { id: "haiku", efforts: [] },
  ],
};

describe("which levels a model offers", () => {
  it("offers exactly the levels each subscription model reports", () => {
    expect(effortChoices("codex", "gpt-5.5", catalogue)).toEqual([
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
    expect(effortChoices("claude-sub", "sonnet", catalogue)).toEqual([
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
  });

  it("reads the engine's default row when no model is pinned", () => {
    expect(effortChoices("codex", null, catalogue)).toHaveLength(4);
    expect(effortChoices("claude-sub", undefined, catalogue)).toHaveLength(5);
  });

  it("shows no picker where the level would change nothing", () => {
    expect(effortChoices("claude-sub", "haiku", catalogue)).toEqual([]);
    // Key-based providers are not sent a level at all.
    expect(effortChoices("openai", "o4-mini", catalogue)).toEqual([]);
    expect(effortChoices("gemini", "gemini-3.7-flash", catalogue)).toEqual([]);
    // A model the catalogue does not list, or a catalogue not read yet.
    expect(effortChoices("codex", "gpt-9", catalogue)).toEqual([]);
    expect(effortChoices("codex", "gpt-5.5", {})).toEqual([]);
    expect(effortChoices(null, null, catalogue)).toEqual([]);
  });

  it("labels the levels in the engine's own words", () => {
    expect(
      effortOptions(["low", "xhigh", "max"], "en").map((option) => option.label),
    ).toEqual(["Low", "Extra High", "Max"]);
    expect(effortOptions(["low"], "zh")[0]?.label).toBe("低");
  });

  // Switching from Claude on Max to Codex must not leave the picker showing a
  // value it does not offer — that reads as a broken control.
  it("keeps a stored level legal for the model now chosen", () => {
    expect(clampEffort(["low", "medium", "high", "xhigh"], "max")).toBe("xhigh");
    expect(clampEffort(["low", "medium", "high", "xhigh", "max"], null)).toBe(
      "medium",
    );
    expect(clampEffort(["low", "high"], "medium")).toBe("low");
    expect(clampEffort(["high", "xhigh"], "low")).toBe("high");
  });
});
