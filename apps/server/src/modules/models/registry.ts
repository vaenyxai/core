// The ModelRegistry: the one place model backends are registered and looked up.
// Every model call goes through here — getDefaultProvider().sendChat(...) today,
// a caller-chosen provider by id once multi-model lands — so no caller depends on
// a specific backend. Today only the Codex provider is registered; multi-model
// registers OpenAI / Claude / Gemini / local alongside it.
import { AnthropicProvider } from "./anthropic-provider.js";
import { CodexProvider } from "./codex-provider.js";
import {
  readDefaultProviderId,
  readProviderConnections,
} from "./connections.js";
import { OpenAICompatibleProvider } from "./openai-compatible-provider.js";
import type { ModelProvider } from "./provider.js";

class ModelRegistry {
  private readonly providers = new Map<string, ModelProvider>();
  private defaultId: string | null = null;

  register(provider: ModelProvider, asDefault = false): void {
    this.providers.set(provider.id, provider);
    if (asDefault || this.defaultId === null) {
      this.defaultId = provider.id;
    }
  }

  get(id: string): ModelProvider | null {
    return this.providers.get(id) ?? null;
  }

  setDefault(id: string): void {
    if (this.providers.has(id)) {
      this.defaultId = id;
    }
  }

  list(): ModelProvider[] {
    return [...this.providers.values()];
  }

  default(): ModelProvider {
    const provider = this.defaultId
      ? this.providers.get(this.defaultId)
      : null;
    if (!provider) {
      throw new Error("No model provider is registered.");
    }
    return provider;
  }
}

let registry: ModelRegistry | null = null;

// Build the registry from config at startup: Codex is always the default
// provider; any backend configured in the local model-providers.json secrets
// file is registered alongside it. Called once from buildApp.
export function initModelRegistry(config: {
  secretsDirectory: string;
}): ModelRegistry {
  const next = new ModelRegistry();
  next.register(new CodexProvider(), true);

  const connections = readProviderConnections(config.secretsDirectory);
  const openai = connections.openai;
  if (openai?.apiKey) {
    next.register(
      new OpenAICompatibleProvider({
        id: "openai",
        name: "OpenAI",
        baseUrl: openai.baseUrl ?? "https://api.openai.com/v1",
        apiKey: openai.apiKey,
        model: openai.model ?? "gpt-4o",
        requiresKey: true,
      }),
    );
  }
  const local = connections.local;
  if (local?.baseUrl) {
    next.register(
      new OpenAICompatibleProvider({
        id: "local",
        name: "Local model",
        baseUrl: local.baseUrl,
        apiKey: local.apiKey ?? "",
        model: local.model ?? "local-model",
        requiresKey: false,
      }),
    );
  }
  const anthropic = connections.anthropic;
  if (anthropic?.apiKey) {
    next.register(
      new AnthropicProvider({
        id: "anthropic",
        name: "Claude",
        baseUrl: anthropic.baseUrl ?? "https://api.anthropic.com/v1",
        apiKey: anthropic.apiKey,
        model: anthropic.model ?? "claude-sonnet-5",
      }),
    );
  }
  const gemini = connections.gemini;
  if (gemini?.apiKey) {
    next.register(
      new OpenAICompatibleProvider({
        id: "gemini",
        name: "Gemini",
        baseUrl:
          gemini.baseUrl ??
          "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: gemini.apiKey,
        model: gemini.model ?? "gemini-2.0-flash",
        requiresKey: true,
      }),
    );
  }

  // The Owner can pick which registered backend a chat uses; Codex stays the
  // default until one is chosen. An id that isn't registered is ignored.
  const defaultId = readDefaultProviderId(config.secretsDirectory);
  if (defaultId) {
    next.setDefault(defaultId);
  }

  registry = next;
  return next;
}

export function getModelRegistry(): ModelRegistry {
  if (!registry) {
    // Not initialised (e.g. unit tests): fall back to Codex-only.
    registry = new ModelRegistry();
    registry.register(new CodexProvider(), true);
  }
  return registry;
}

export function getDefaultProvider(): ModelProvider {
  return getModelRegistry().default();
}

// A chat can pin a specific provider; fall back to the default if it is unset
// or no longer registered (e.g. the Owner disconnected it after pinning).
export function resolveProvider(
  providerId: string | null | undefined,
): ModelProvider {
  const registry = getModelRegistry();
  return (providerId ? registry.get(providerId) : null) ?? registry.default();
}
