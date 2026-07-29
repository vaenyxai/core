// Model-provider connections (API keys / base URLs / model ids) live in a local
// secrets file — never in git or the cloud, the same rule as the publish
// credentials. Shape: { "openai": { "apiKey": "...", "model": "gpt-4o" },
// "local": { "baseUrl": "http://127.0.0.1:11434/v1", "model": "..." }, ... }.
// A later slice adds a Settings UI to edit this; for now it is a secrets file.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ProviderConnection {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  // Voice output entry only: which TTS engine + which prebuilt voice.
  engine?: string;
  voice?: string;
  // Local-voice per-language picks (voice output entry only).
  zhVoice?: string;
  enVoice?: string;
  // Vision entry only: the pinned vision engine ("auto" = entry absent).
  provider?: string;
  // Cloudflare entry only: its API URL carries the account, so the account id
  // is part of the connection. Looked up from the token when it is saved, so
  // nobody has to go and find it (see image-gen.ts).
  accountId?: string;
  // Cloudflare entry only: the picture model. Separate from `model`, which is
  // what chat uses on the same connection — one login, two different jobs.
  imageModel?: string;
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

// Import-cycle-free writer (claude-login and the subscription provider write
// through here; provider-settings keeps its own equivalent for the same file).
export function writeProviderConnections(
  secretsDirectory: string,
  connections: Record<string, ProviderConnection>,
): void {
  mkdirSync(secretsDirectory, { recursive: true });
  writeFileSync(
    resolve(secretsDirectory, "model-providers.json"),
    `${JSON.stringify(connections, null, 2)}\n`,
  );
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
