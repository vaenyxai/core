// The rule this file exists to hold (Oskar, 2026-08-16): a level control is
// shown ONLY where the model in front of the Owner really has one. A picker
// that changes nothing is worse than no picker — it teaches them to distrust
// the ones that work.
import { describe, expect, it } from "vitest";

import {
  clampThinkingLevel,
  thinkingLevelOptions,
  thinkingLevelShape,
} from "./thinking-level.js";

describe("which models have a thinking level", () => {
  it("gives three levels to the models that take three", () => {
    expect(thinkingLevelShape("codex", null)).toBe("three");
    expect(thinkingLevelShape("claude-sub", null)).toBe("three");
    expect(thinkingLevelShape("gemini", "gemini-3.7-flash")).toBe("three");
    expect(thinkingLevelShape("groq", "openai/gpt-oss-120b")).toBe("three");
    expect(thinkingLevelShape("openai", "o4-mini")).toBe("three");
  });

  it("gives two to the models that can only think or not", () => {
    expect(thinkingLevelShape("groq", "qwen/qwen3.6-27b")).toBe("toggle");
    expect(thinkingLevelShape("mistral", "magistral-small-latest")).toBe(
      "toggle",
    );
  });

  // The important half: the same PROVIDER answers differently per model, which
  // is exactly why this is not a per-provider table.
  it("shows nothing for models with no such setting", () => {
    expect(thinkingLevelShape("gemini", "gemini-2.5-flash")).toBe("none");
    expect(thinkingLevelShape("groq", "llama-3.3-70b-versatile")).toBe("none");
    expect(thinkingLevelShape("openai", "gpt-4o")).toBe("none");
    expect(thinkingLevelShape("mistral", "mistral-small-latest")).toBe("none");
    // A local server makes no claim, so neither do we.
    expect(thinkingLevelShape("local", "whatever-they-loaded")).toBe("none");
    expect(thinkingLevelShape(null, null)).toBe("none");
  });

  it("offers a matching number of choices, and none when hidden", () => {
    expect(thinkingLevelOptions("three", "en")).toHaveLength(3);
    expect(thinkingLevelOptions("toggle", "en")).toHaveLength(2);
    expect(thinkingLevelOptions("none", "en")).toHaveLength(0);
    expect(thinkingLevelOptions("three", "zh")[0]?.label).toBe("快");
  });

  // Switching from a three-level model to a two-level one must not leave the
  // picker showing a value it does not offer — that reads as a broken control.
  it("keeps a stored level legal for the model now chosen", () => {
    expect(clampThinkingLevel("toggle", "medium")).toBe("high");
    expect(clampThinkingLevel("toggle", "low")).toBe("low");
    expect(clampThinkingLevel("three", "medium")).toBe("medium");
    expect(clampThinkingLevel("three", null)).toBe("medium");
  });
});
