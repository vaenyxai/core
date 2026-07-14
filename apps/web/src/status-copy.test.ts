import { describe, expect, it } from "vitest";

import {
  getCodexAuthCopy,
  getProviderConnectionCopy,
  getProviderConnectionDetail,
  getRemoteAccessCopy,
  getRemoteAccessDetail,
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
        status: "ready",
        mode: "test",
        database: {
          engine: "sqlite",
          status: "ready",
        },
        remoteAccess: {
          recommendedProvider: "cloudflare-tunnel-access",
          internetExposure: "disabled",
          cloudflaredInstalled: false,
          cloudflaredServiceStatus: "missing",
          cloudflaredVersion: null,
          accessPolicyRequired: true,
        },
        timestamp: "2026-06-05T00:00:00.000Z",
      }),
    ).toBe("Your private Vaenyx Instance is ready");
  });

  it("keeps remote access conservative by default", () => {
    const remoteAccess = {
      recommendedProvider: "cloudflare-tunnel-access" as const,
      internetExposure: "disabled" as const,
      cloudflaredInstalled: false,
      cloudflaredServiceStatus: "missing" as const,
      cloudflaredVersion: null,
      accessPolicyRequired: true as const,
    };

    expect(getRemoteAccessCopy(remoteAccess)).toBe("Local only");
    expect(getRemoteAccessDetail(remoteAccess)).toContain("not exposed");
  });

  it("shows cloudflared readiness without implying internet exposure", () => {
    const remoteAccess = {
      recommendedProvider: "cloudflare-tunnel-access" as const,
      internetExposure: "disabled" as const,
      cloudflaredInstalled: true,
      cloudflaredServiceStatus: "installed" as const,
      cloudflaredVersion: "cloudflared version 2026.6.0",
      accessPolicyRequired: true as const,
    };

    expect(getRemoteAccessCopy(remoteAccess)).toBe("Cloudflare ready");
    expect(getRemoteAccessDetail(remoteAccess)).toContain(
      "Access policy",
    );
  });

  it("shows when the Cloudflare Tunnel service is running", () => {
    const remoteAccess = {
      recommendedProvider: "cloudflare-tunnel-access" as const,
      internetExposure: "disabled" as const,
      cloudflaredInstalled: true,
      cloudflaredServiceStatus: "running" as const,
      cloudflaredVersion: "cloudflared version 2026.6.0",
      accessPolicyRequired: true as const,
    };

    expect(getRemoteAccessCopy(remoteAccess)).toBe("Tunnel service running");
    expect(getRemoteAccessDetail(remoteAccess)).toContain(
      "Windows service",
    );
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
