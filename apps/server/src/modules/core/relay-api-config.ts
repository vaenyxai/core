// Profile-scoped API connections. No fallback to machine or other App credentials.
import { randomUUID } from "node:crypto";
import type { DatabaseHandle } from "../../db/database.js";
import { encryptAppToken, decryptAppToken } from "./token-vault.js";
export const API_PROVIDERS = [
  {
    id: "gemini",
    name: "Gemini",
    base: "https://generativelanguage.googleapis.com/v1beta",
    wire: "gemini",
  },
  {
    id: "groq",
    name: "Groq",
    base: "https://api.groq.com/openai/v1",
    wire: "chat",
  },
  {
    id: "openai",
    name: "OpenAI",
    base: "https://api.openai.com/v1",
    wire: "responses",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    base: "https://api.anthropic.com/v1",
    wire: "anthropic",
  },
  { id: "grok", name: "Grok", base: "https://api.x.ai/v1", wire: "responses" },
  {
    id: "openrouter",
    name: "OpenRouter",
    base: "https://openrouter.ai/api/v1",
    wire: "chat",
  },
  {
    id: "mistral",
    name: "Mistral",
    base: "https://api.mistral.ai/v1",
    wire: "chat",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    base: "https://api.cerebras.ai/v1",
    wire: "chat",
  },
  {
    id: "zhipu",
    name: "Zhipu",
    base: "https://open.bigmodel.cn/api/paas/v4",
    wire: "chat",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    base: "https://api.deepseek.com/v1",
    wire: "chat",
  },
  {
    id: "zai",
    name: "Z.ai",
    base: "https://api.z.ai/api/paas/v4",
    wire: "chat",
  },
] as const;
export type ApiProvider = (typeof API_PROVIDERS)[number]["id"];
export type ApiEngine = `api-${ApiProvider}`;
export interface ApiConnection {
  apiKey: string;
  revision: string;
  connectedAt: string;
}
const keyFor = (profile: string, provider: ApiProvider) =>
  "relay.api." + profile + "." + provider;
export const apiProvider = (id: string) =>
  API_PROVIDERS.find((p) => p.id === id);
export const isApiEngine = (id: string): id is ApiEngine =>
  id.startsWith("api-") && !!apiProvider(id.slice(4));
export function readApiConnection(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  provider: ApiProvider,
): ApiConnection | null {
  const row = db.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(keyFor(profile, provider)) as { value: string } | undefined;
  if (!row) return null;
  try {
    const value = JSON.parse(decryptAppToken(secrets, row.value) ?? "null");
    if (
      value?.profile !== profile ||
      value?.provider !== provider ||
      typeof value.apiKey !== "string" ||
      !value.apiKey
    )
      return null;
    return {
      apiKey: value.apiKey,
      revision: value.revision,
      connectedAt: value.connectedAt,
    };
  } catch {
    return null;
  }
}
export function saveApiConnection(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  provider: ApiProvider,
  apiKey: string,
): ApiConnection {
  if (!apiKey.trim() || apiKey.length > 10000)
    throw Error("RELAY_INVALID_CREDENTIAL");
  const value = {
    profile,
    provider,
    apiKey: apiKey.trim(),
    revision: randomUUID(),
    connectedAt: new Date().toISOString(),
  };
  db.sqlite
    .prepare(
      "INSERT INTO instance_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(
      keyFor(profile, provider),
      encryptAppToken(secrets, JSON.stringify(value)),
    );
  return value;
}
export function removeApiConnection(
  db: DatabaseHandle,
  profile: string,
  provider: ApiProvider,
): void {
  db.sqlite
    .prepare("DELETE FROM instance_settings WHERE key = ?")
    .run(keyFor(profile, provider));
}
