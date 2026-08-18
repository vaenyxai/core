import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { SystemStatus } from "@vaenyx/contracts";

import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";

// Vaenyx-Setup.cmd records the language the install spoke, so a browser that
// has never chosen one opens in the same language instead of snapping back to
// English. Absent or unreadable simply means "no preference".
function readInstallLanguage(config: AppConfig): "en" | "zh" | null {
  try {
    const raw = readFileSync(
      resolve(config.dataDirectory, "..", "config", "language.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { language?: unknown };
    return parsed.language === "zh" || parsed.language === "en"
      ? parsed.language
      : null;
  } catch {
    return null;
  }
}

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
    installLanguage: readInstallLanguage(config),
    status: databaseReady ? "ready" : "degraded",
    mode: config.mode,
    database: {
      engine: "sqlite",
      status: databaseReady ? "ready" : "unavailable",
    },
    timestamp: new Date().toISOString(),
  };
}
