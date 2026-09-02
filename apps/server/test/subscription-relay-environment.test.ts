import { describe, expect, it } from "vitest";

import { codexEnvironment } from "../src/modules/harness/codex.js";
import { cleanChildEnvironment } from "../src/modules/models/claude-subscription-provider.js";

describe("subscription relay billing isolation", () => {
  it("strips every OpenAI API billing path from Codex", () => {
    const environment = codexEnvironment(
      {
        Path: "C:\\Windows",
        OPENAI_API_KEY: "paid-secret",
        OPENAI_BASE_URL: "https://paid.example",
        AZURE_OPENAI_API_KEY: "azure-secret",
        CODEX_API_KEY: "codex-secret",
      },
      "11111111-2222-4333-8444-555555555555",
    );
    expect(environment.OPENAI_API_KEY).toBeUndefined();
    expect(environment.OPENAI_BASE_URL).toBeUndefined();
    expect(environment.AZURE_OPENAI_API_KEY).toBeUndefined();
    expect(environment.CODEX_API_KEY).toBeUndefined();
    expect(environment.CODEX_HOME).toContain("11111111-2222-4333-8444-555555555555");
  });

  it("strips Anthropic API billing while preserving subscription auth", () => {
    const previous = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    };
    process.env.ANTHROPIC_API_KEY = "paid-secret";
    process.env.ANTHROPIC_AUTH_TOKEN = "paid-token";
    process.env.ANTHROPIC_BASE_URL = "https://paid.example";
    try {
      const environment = cleanChildEnvironment(
        "subscription-token",
        "11111111-2222-4333-8444-555555555555",
      );
      expect(environment.ANTHROPIC_API_KEY).toBeUndefined();
      expect(environment.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(environment.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(environment.CLAUDE_CODE_OAUTH_TOKEN).toBe("subscription-token");
      expect(environment.CLAUDE_CONFIG_DIR).toContain(
        "11111111-2222-4333-8444-555555555555",
      );
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
