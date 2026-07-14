import type { SystemStatus } from "@vaenyx/contracts";

import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";

// Remote access moved to Tailscale Funnel; the old Cloudflare Tunnel
// (cloudflared) detection was retired (2026-06-15). The remoteAccess fields stay
// in the contract for compatibility but report a static "not exposed" shape so
// the status endpoint no longer spawns cloudflared on every poll.
export function getSystemStatus(
  config: AppConfig,
  database: DatabaseHandle,
): SystemStatus {
  const databaseReady = database.ping();

  return {
    name: "Vaenyx",
    version: config.version,
    status: databaseReady ? "ready" : "degraded",
    mode: config.mode,
    database: {
      engine: "sqlite",
      status: databaseReady ? "ready" : "unavailable",
    },
    remoteAccess: {
      recommendedProvider: "cloudflare-tunnel-access",
      internetExposure: "disabled",
      cloudflaredInstalled: false,
      cloudflaredServiceStatus: "missing",
      cloudflaredVersion: null,
      accessPolicyRequired: true,
    },
    timestamp: new Date().toISOString(),
  };
}
