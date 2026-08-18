import { describe, expect, it } from "vitest";

import {
  getCodexAuthCopy,
  getProviderConnectionCopy,
  getProviderConnectionDetail,
  getStatusCopy,
} from "./status-copy.js";

describe("getStatusCopy", () => {
  it("keeps the initial connection state understandable", () => {
    expect(getStatusCopy(null)).toBe(
      "Connecting to your private Vaenyx Instance",
    );
  });

  it("describes a ready instance without technical language", () => {
    expect(
      getStatusCopy({
        name: "Vaenyx",
        version: "0.1.0",
        installLanguage: null,
        status: "ready",
        mode: "test",
        database: {
          engine: "sqlite",
          status: "ready",
        },
        timestamp: "2026-06-05T00:00:00.000Z",
      }),
    ).toBe("Your private Vaenyx Instance is ready");
  });

  it("describes the confirmed ChatGPT/Codex Auth route clearly", () => {
    expect(getProviderConnectionCopy("chatgpt-connected")).toBe(
      "Connected through ChatGPT / Codex Auth",
    );
    expect(getProviderConnectionDetail("chatgpt-connected")).toContain(
      "Forge read-only tasks",
    );
    expect(getCodexAuthCopy("chatgpt")).toBe("ChatGPT Subscription Auth");
  });

  it("keeps unsupported and missing auth states understandable", () => {
    expect(getProviderConnectionCopy("unsupported-auth")).toBe(
      "Codex is signed in, but not with ChatGPT Auth",
    );
    expect(getProviderConnectionCopy("not-connected")).toBe("Not connected");
    expect(getCodexAuthCopy("none")).toBe("Not signed in");
  });
});
