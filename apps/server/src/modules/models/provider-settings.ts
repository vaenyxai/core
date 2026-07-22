// Owner-facing model-provider management: list the known backends with their
// live connection/health, and connect/disconnect the API-key + local ones by
// writing the local model-providers.json secrets file and re-registering. Codex
// is always present (its own CLI login) and cannot be connected/removed here.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ModelProviderInfo } from "@vaenyx/contracts";

import { readProviderConnections } from "./connections.js";
import { getModelRegistry, initModelRegistry } from "./registry.js";

interface KnownProvider {
  id: string;
  name: string;
  kind: "cli-login" | "api-key" | "openai-compatible" | "anthropic";
  needsKey: boolean;
  needsBaseUrl: boolean;
}

export const KNOWN_PROVIDERS: KnownProvider[] = [
  {
    id: "codex",
    name: "Codex CLI (ChatGPT)",
    kind: "cli-login",
    needsKey: false,
    needsBaseUrl: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "anthropic",
    name: "Claude",
    kind: "anthropic",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "gemini",
    name: "Gemini",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "grok",
    name: "Grok",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  // Free-tier presets (2026-07-22): generous free quotas, no credit card.
  // Same OpenAI-compatible pathway; ids must match OPENAI_COMPATIBLE_PRESETS.
  {
    id: "groq",
    name: "Groq",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "cerebras",
    name: "Cerebras",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "zhipu",
    name: "Zhipu BigModel",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  {
    id: "mistral",
    name: "Mistral",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: false,
  },
  // Workers AI: key-based cloud, but its endpoint embeds the account id.
  {
    id: "workersai",
    name: "Workers AI (Cloudflare)",
    kind: "api-key",
    needsKey: true,
    needsBaseUrl: true,
  },
  {
    id: "local",
    name: "Local model",
    kind: "openai-compatible",
    needsKey: false,
    needsBaseUrl: true,
  },
];

export function listModelProviders(
  secretsDirectory: string,
): ModelProviderInfo[] {
  const registry = getModelRegistry();
  const defaultId = registry.default().id;
  const connections = readProviderConnections(secretsDirectory);
  return KNOWN_PROVIDERS.map((known) => {
    const provider = registry.get(known.id);
    const health = provider?.healthCheck();
    return {
      id: known.id,
      name: known.name,
      kind: known.kind,
      needsKey: known.needsKey,
      needsBaseUrl: known.needsBaseUrl,
      connected: Boolean(provider),
      healthy: health?.ok ?? false,
      detail: health?.detail ?? "Not connected.",
      isDefault: known.id === defaultId,
      ...(connections[known.id]?.model
        ? { model: connections[known.id]?.model }
        : {}),
    };
  });
}

function writeConnections(
  secretsDirectory: string,
  connections: Record<string, unknown>,
): void {
  mkdirSync(secretsDirectory, { recursive: true });
  writeFileSync(
    resolve(secretsDirectory, "model-providers.json"),
    `${JSON.stringify(connections, null, 2)}\n`,
  );
}

export function connectModelProvider(
  config: { secretsDirectory: string },
  id: string,
  input: { apiKey?: string; baseUrl?: string; model?: string },
): void {
  const known = KNOWN_PROVIDERS.find((provider) => provider.id === id);
  if (!known || known.kind === "cli-login") {
    throw new Error("MODEL_PROVIDER_NOT_CONNECTABLE");
  }
  const connections = readProviderConnections(config.secretsDirectory);
  connections[id] = {
    ...connections[id],
    ...(input.apiKey !== undefined ? { apiKey: input.apiKey } : {}),
    ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
  };
  writeConnections(config.secretsDirectory, connections);
  // Re-register so the new/updated connection takes effect immediately.
  initModelRegistry(config);
}

export function disconnectModelProvider(
  config: { secretsDirectory: string },
  id: string,
): void {
  const connections = readProviderConnections(config.secretsDirectory);
  if (!(id in connections)) return;
  delete connections[id];
  writeConnections(config.secretsDirectory, connections);
  initModelRegistry(config);
}

// Pick which registered backend a chat uses. The id must be currently
// registered (Codex, or a connected provider); stored in model-default.json.
export function setDefaultModelProvider(
  config: { secretsDirectory: string },
  id: string,
): void {
  if (!getModelRegistry().get(id)) {
    throw new Error("MODEL_PROVIDER_NOT_AVAILABLE");
  }
  mkdirSync(config.secretsDirectory, { recursive: true });
  writeFileSync(
    resolve(config.secretsDirectory, "model-default.json"),
    `${JSON.stringify({ id }, null, 2)}\n`,
  );
  initModelRegistry(config);
}
