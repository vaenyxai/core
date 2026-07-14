// Model-provider connections (API keys / base URLs / model ids) live in a local
// secrets file — never in git or the cloud, the same rule as the publish
// credentials. Shape: { "openai": { "apiKey": "...", "model": "gpt-4o" },
// "local": { "baseUrl": "http://127.0.0.1:11434/v1", "model": "..." }, ... }.
// A later slice adds a Settings UI to edit this; for now it is a secrets file.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ProviderConnection {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function readProviderConnections(
  secretsDirectory: string,
): Record<string, ProviderConnection> {
  try {
    const raw = JSON.parse(
      readFileSync(resolve(secretsDirectory, "model-providers.json"), "utf8"),
    ) as unknown;
    return raw && typeof raw === "object"
      ? (raw as Record<string, ProviderConnection>)
      : {};
  } catch {
    // Absent / unreadable -> no extra providers configured (Codex-only).
    return {};
  }
}

// The Owner's chosen default provider (which backend a chat uses), in its own
// small local file so the flat connections map stays clean. Absent -> Codex.
export function readDefaultProviderId(secretsDirectory: string): string | null {
  try {
    const raw = JSON.parse(
      readFileSync(resolve(secretsDirectory, "model-default.json"), "utf8"),
    ) as { id?: unknown };
    return typeof raw.id === "string" ? raw.id : null;
  } catch {
    return null;
  }
}
