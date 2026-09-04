// The ModelRegistry: the one place model backends are registered and looked up.
// Every model call goes through here — getDefaultProvider().sendChat(...) today,
// a caller-chosen provider by id once multi-model lands — so no caller depends on
// a specific backend. Today only the Codex provider is registered; multi-model
// registers OpenAI / Claude / Gemini / local alongside it.
import { AnthropicProvider } from "./anthropic-provider.js";
import {
  ClaudeSubscriptionProvider,
  resolveClaudeSubscriptionAuth,
} from "./claude-subscription-provider.js";
import { CodexProvider } from "./codex-provider.js";
import { describeEnginePair, type EngineChoice } from "./engine-slots.js";
import {
  readDefaultProviderId,
  readProviderConnections,
} from "./connections.js";
import { OpenAICompatibleProvider } from "./openai-compatible-provider.js";
import type { ModelProvider } from "./provider.js";

// Key-based OpenAI-compatible backends: id ↔ endpoint ↔ sensible default model.
// provider-settings.ts KNOWN_PROVIDERS must list the same ids to make them
// connectable in Settings → Models.
export const OPENAI_COMPATIBLE_PRESETS = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  {
    id: "gemini",
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // Alias rather than a pinned version: Google retires specific models for
    // new API keys, which breaks first-time setups only (see vision.ts).
    model: "gemini-flash-latest",
  },
  {
    id: "grok",
    name: "Grok",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4",
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "llama-3.3-70b",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-chat-v3-0324:free",
  },
  {
    id: "zhipu",
    name: "Zhipu BigModel",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.7-flash",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
  },
] as const;

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
    const provider = this.defaultId ? this.providers.get(this.defaultId) : null;
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
// The Text row's explicit choice, or null while it follows the main model.
let textChoice: EngineChoice | null = null;

export function initModelRegistry(config: {
  secretsDirectory: string;
}): ModelRegistry {
  const next = new ModelRegistry();
  const connections = readProviderConnections(config.secretsDirectory);
  next.register(new CodexProvider({ model: connections.codex?.model }), true);
  // The Claude-subscription mirror of Codex — registered ONLY once the Owner
  // has connected it (pasted `claude setup-token` value), so it flows through
  // the same Add a Model path as every other backend instead of squatting in
  // the connected list as "needs attention" (Oskar, 2026-07-29).
  // Registered when EITHER sanctioned auth form exists: a pasted setup token,
  // or a Claude Code login already on this machine (the SDK child reads the
  // CLI's own credentials natively).
  const claudeSubAuth = resolveClaudeSubscriptionAuth(config.secretsDirectory);
  if (claudeSubAuth.token || claudeSubAuth.machineLogin) {
    next.register(
      new ClaudeSubscriptionProvider(config.secretsDirectory, {
        model: connections["claude-sub"]?.model,
      }),
    );
  }
  // Every key-based OpenAI-compatible backend registers the same way — one
  // table, not one hand-rolled block per provider. Groq / Cerebras / OpenRouter
  // are the free-tier presets (2026-07-22): generous free quotas, no card.
  // Keys live ONLY in these provider entries (normalizeEngineConnections
  // migrates any key an older build stored inside an engine slot).
  for (const preset of OPENAI_COMPATIBLE_PRESETS) {
    const connection = connections[preset.id];
    if (!connection?.apiKey) continue;
    next.register(
      new OpenAICompatibleProvider({
        id: preset.id,
        name: preset.name,
        baseUrl: connection.baseUrl ?? preset.baseUrl,
        apiKey: connection.apiKey,
        model: connection.model ?? preset.model,
        requiresKey: true,
      }),
    );
  }
  // Cloudflare Workers AI is OpenAI-compatible but its endpoint embeds the
  // Owner's own account id, so the base URL comes from the connection.
  const workersai = connections.workersai;
  if (workersai?.apiKey && workersai.baseUrl) {
    next.register(
      new OpenAICompatibleProvider({
        id: "workersai",
        name: "Workers AI",
        baseUrl: workersai.baseUrl,
        apiKey: workersai.apiKey,
        model: workersai.model ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
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

  // The Owner can pick which registered backend a chat uses; Codex stays the
  // default until one is chosen. An id that isn't registered is ignored.
  const defaultId = readDefaultProviderId(config.secretsDirectory);
  if (defaultId) {
    next.setDefault(defaultId);
  }
  // The Text row (Oskar, 2026-09-05): chat and every other written job use
  // it. Following the main model — the default — is the registry default
  // itself; an explicit choice is remembered here and applied per call.
  const text = describeEnginePair(config.secretsDirectory, "text");
  textChoice = text.follows.primary ? null : text.primary;

  registry = next;
  return next;
}

/** The same backend, answering with one fixed model unless a call names its
 *  own. How a row's "provider + model" choice becomes a provider object. */
export function withPinnedModel(
  provider: ModelProvider,
  model: string,
): ModelProvider {
  return {
    id: provider.id,
    name: provider.name,
    healthCheck: () => provider.healthCheck(),
    sendChat: (messages, projectContext, options) =>
      provider.sendChat(messages, projectContext, {
        ...options,
        model: options?.model?.trim() || model,
      }),
  };
}

export function getModelRegistry(): ModelRegistry {
  if (!registry) {
    // Not initialised (e.g. unit tests): fall back to Codex-only.
    registry = new ModelRegistry();
    registry.register(new CodexProvider(), true);
  }
  return registry;
}

// What answers when nothing more specific was asked for: the Text row —
// the main model unless the Owner pointed Text somewhere else. An explicit
// Text backend that is no longer connected fails by name rather than quietly
// sliding back to the main model (the Settings row shows the same fact).
export function getDefaultProvider(): ModelProvider {
  const registry = getModelRegistry();
  const choice = textChoice;
  if (!choice) return registry.default();
  const provider = registry.get(choice.provider);
  if (!provider) {
    throw new Error(`TEXT_ENGINE_NOT_CONNECTED:${choice.provider}`);
  }
  return choice.model ? withPinnedModel(provider, choice.model) : provider;
}

// A chat can pin a specific provider; fall back to the default if it is unset
// or no longer registered (e.g. the Owner disconnected it after pinning).
export function resolveProvider(
  providerId: string | null | undefined,
): ModelProvider {
  const registry = getModelRegistry();
  return (providerId ? registry.get(providerId) : null) ?? getDefaultProvider();
}
