import type { InstanceSettings, UpdateInstanceSettingsRequest } from "@vaenyx/contracts";

import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";
import { getCodexStatus } from "../harness/codex.js";

function getSetting(
  database: DatabaseHandle,
  key: string,
  fallback: string,
): string {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;

  return row?.value ?? fallback;
}

export function getInstanceSettings(
  config: AppConfig,
  database: DatabaseHandle,
): InstanceSettings {
  const codex = getCodexStatus();

  return {
    instanceName: getSetting(database, "instance_name", "My Vaenyx"),
    agentName: getSetting(database, "agent_name", "Vaenyx"),
    version: config.version,
    mode: config.mode,
    bindAddress: `${config.host}:${config.port}`,
    dataStorage: "Local SQLite on this machine",
    providerConnection:
      codex.loggedIn && codex.authMethod === "chatgpt"
        ? "chatgpt-connected"
        : codex.loggedIn
          ? "unsupported-auth"
          : "not-connected",
    harness:
      codex.loggedIn && codex.authMethod === "chatgpt"
        ? "codex-harness"
        : "mock-harness",
    codex: {
      ...codex,
      repositoryAccess: "vaenyx-read-only",
    },
    autonomyLevel: 0,
  };
}

export function updateInstanceSettings(
  config: AppConfig,
  database: DatabaseHandle,
  input: UpdateInstanceSettingsRequest,
): InstanceSettings {
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES ('instance_name', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    )
    .run(input.instanceName.trim());

  if (input.agentName?.trim()) {
    database.sqlite
      .prepare(
        `INSERT INTO instance_settings (key, value, updated_at)
         VALUES ('agent_name', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      )
      .run(input.agentName.trim());
  }

  return getInstanceSettings(config, database);
}
