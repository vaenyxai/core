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

// The install-wizard sharing card (copy pack A3) records interest in a
// capability that does not exist yet. It is a plain local preference — NOT a
// legal acknowledgement, NOT a consent event, and never evidence of an
// authorisation — so it lives here, beside the other instance settings, and
// never in legal_acknowledgements.
export function setSharingPreference(
  database: DatabaseHandle,
  choice: "interested" | "not-interested",
): void {
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES ('sharing_preference', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    )
    .run(choice);
}

// Corrections become examples on their own unless the Owner turns it off. On by
// default because the cost of a bad example is "delete it" and the cost of
// asking every time is that nobody ever says yes, so the Method never improves.
// Local only: this switch has nothing to do with sharing anything.
export function autoExamplesEnabled(database: DatabaseHandle): boolean {
  return getSetting(database, "auto_examples", "on") !== "off";
}

export function setAutoExamples(
  database: DatabaseHandle,
  enabled: boolean,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES ('auto_examples', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    )
    .run(enabled ? "on" : "off");
}

export function getSharingPreference(
  database: DatabaseHandle,
): "interested" | "not-interested" | null {
  const value = getSetting(database, "sharing_preference", "");
  return value === "interested" || value === "not-interested" ? value : null;
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
