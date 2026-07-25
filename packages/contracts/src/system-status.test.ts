import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import { SystemStatusSchema } from "./system-status.js";

describe("SystemStatusSchema", () => {
  it("accepts the expected public system status shape", () => {
    expect(
      Value.Check(SystemStatusSchema, {
        name: "Vaenyx",
        version: "0.1.0",
        installLanguage: "zh",
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
    ).toBe(true);
  });
});
