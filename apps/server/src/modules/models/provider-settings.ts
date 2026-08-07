// Owner-facing model-provider management: list the known backends with their
// live connection/health, and connect/disconnect the API-key + local ones by
// writing the local model-providers.json secrets file and re-registering. Codex
// is always present (its own CLI login) and cannot be connected/removed here.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ModelProviderInfo } from "@vaenyx/contracts";

import {
  readProviderConnections,
  type ProviderConnection,
} from "./connections.js";
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
    name: "Claude (API Key)",
    kind: "anthropic",
    needsKey: true,
    needsBaseUrl: false,
  },
  // The subscription mirror of Codex (2026-07-29): the Owner's own Claude
  // plan via the Agent SDK. The "key" is a `claude setup-token` value, not an
  // API key — the connect card labels it accordingly. Wording rule: never
  // state plan quota numbers anywhere; only "uses your own Claude plan,
  // subject to that plan's limits" (quota policy changed three times in four
  // months — a written number becomes a false claim on the next change).
  {
    id: "claude-sub",
    name: "Claude (Subscription)",
    kind: "api-key",
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

/** The Owner's word for a backend ("Claude (Subscription)"), never its id. A
 *  test result that names `claude-sub` sends them looking for something that is
 *  written nowhere on the screen. */
export function providerDisplayName(id: string): string {
  return KNOWN_PROVIDERS.find((known) => known.id === id)?.name ?? id;
}

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
      capabilities: providerCapabilities(known.id),
      ...(connections[known.id]?.model
        ? { model: connections[known.id]?.model }
        : {}),
    };
  });
}

// Which connected backends can power each side engine (Oskar's unified
// model, dev.162): keys live ONLY in the provider entries above; the three
// engine slots (voice input / voice output / vision) are plain pointers —
// empty slot = feature off, auto-filled once when a capable model connects,
// changeable by hand any time. No hidden "auto" resolution.
// 🔴 THESE LISTS MAY ONLY NAME BACKENDS THE ENGINE CODE CAN ACTUALLY CALL.
// They drive two things — what the pickers offer, and where a slot re-points
// when its provider goes away — so a name in here that the engine cannot use
// does not fail politely: it silently hands the job to something that cannot
// do it. That is precisely what happened when they were widened on
// 2026-08-07 to what the BACKENDS can do (Workers AI has MeloTTS, Groq has
// Orpheus, both real) rather than what VAENYX has built: the Owner's
// Speaking slot re-pointed to Workers AI, which this codebase has no way to
// ask for speech. Widening them for real means writing that call first.
//
// The truth, checked against the code and held there by a test
// (models.test.ts, "the capability lists match what the engines implement"):
//   * hearing  — STT_ENGINES in core/voice.ts
//   * speaking — synthesizeSpeech in core/voice.ts (Gemini; plus "browser"
//                and "local", which are engines rather than connections)
//   * vision   — VISION_CANDIDATES in core/vision.ts
// Exported for the test that holds them against the engine tables.
export const CAPABILITY_LISTS_FOR_TESTS = {
  get hearing() { return STT_CAPABLE_PROVIDERS; },
  get speaking() { return TTS_CAPABLE_PROVIDERS; },
  get vision() { return VISION_CAPABLE_PROVIDERS; },
};

const STT_CAPABLE_PROVIDERS = ["groq", "openai"];
const TTS_CAPABLE_PROVIDERS = ["gemini"];
const VISION_CAPABLE_PROVIDERS = ["gemini", "zhipu", "openai", "claude-sub"];
const IMAGE_CAPABLE_PROVIDERS = ["workersai", "gemini", "zhipu", "openai"];

/** What each backend can be used FOR, so the engine pickers can offer the
 *  Owner what they have actually signed in to instead of a fixed menu where
 *  most entries answer "connect this somewhere else first" (Oskar, 2026-07-27).
 *  Signing in adds a backend; it never replaces one, and every slot chooses
 *  from the same accumulated set. */
export function providerCapabilities(id: string): string[] {
  const capabilities: string[] = [];
  // Anything registered as a chat backend can be the main agent.
  capabilities.push("chat");
  if (STT_CAPABLE_PROVIDERS.includes(id)) capabilities.push("voice-in");
  if (TTS_CAPABLE_PROVIDERS.includes(id)) capabilities.push("voice-out");
  if (VISION_CAPABLE_PROVIDERS.includes(id)) capabilities.push("vision");
  if (IMAGE_CAPABLE_PROVIDERS.includes(id)) capabilities.push("image");
  return capabilities;
}

// Fill empty engine slots from connected capable providers, and clear slots
// whose provider lost its key (falling back to another capable one when
// possible). Returns whether anything changed.
export function fillEngineDefaults(
  connections: Record<string, ProviderConnection>,
): boolean {
  let changed = false;
  const hasKey = (id: string) => Boolean(connections[id]?.apiKey);

  const voiceProvider = connections.voice?.provider;
  if (!voiceProvider) {
    const pick = STT_CAPABLE_PROVIDERS.find(hasKey);
    if (pick && !connections.voice) {
      connections.voice = { provider: pick };
      changed = true;
    }
  } else if (!hasKey(voiceProvider)) {
    const pick = STT_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) connections.voice = { provider: pick };
    else delete connections.voice;
    changed = true;
  }

  const output = connections.voiceOutput;
  if (!output?.engine) {
    const pick = TTS_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) {
      connections.voiceOutput = { engine: pick };
      changed = true;
    }
  } else if (
    output.engine !== "browser" &&
    output.engine !== "local" &&
    (!TTS_CAPABLE_PROVIDERS.includes(output.engine) ||
      !hasKey(output.engine))
  ) {
    // Two ways to end up pointing at nothing usable: the provider lost its
    // key, or the slot names a backend this build cannot ask for speech at
    // all — which is how an instance was briefly left pointing at Workers AI.
    // Both are repaired the same way, which is why the name is checked as
    // well as the key.
    //
    // This used to empty the slot outright while the other three re-point to
    // another capable backend, so losing one key took Speaking out completely
    // and the row went on showing the engine it no longer had (Oskar's
    // screenshot, 2026-08-07). It behaves like its siblings now, and only
    // empties when there is genuinely nobody left. "browser" and "local"
    // carry no key and are never touched here.
    const pick = TTS_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) connections.voiceOutput = { engine: pick };
    else delete connections.voiceOutput;
    changed = true;
  }

  const visionProvider = connections.vision?.provider;
  if (!visionProvider) {
    const pick = VISION_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) {
      connections.vision = { provider: pick };
      changed = true;
    }
  } else if (!hasKey(visionProvider)) {
    const pick = VISION_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) connections.vision = { provider: pick };
    else delete connections.vision;
    changed = true;
  }

  // The fourth slot, and it behaves like the other three: EMPTY fills, a set
  // one is never overwritten. It used to be written straight from the Cloudflare
  // connect form instead, which meant pasting a token — or opening Edit on a
  // connected card and saving again — silently re-pointed Drawing at Workers AI
  // over whatever the Owner had chosen on that row. "Vaenyx does not quietly
  // switch to another model" is a promise both manuals make; connecting a
  // backend adds one, and which one draws stays the Drawing row's answer.
  const imageProvider = connections.imageOutput?.provider;
  if (!imageProvider) {
    const pick = IMAGE_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) {
      connections.imageOutput = { provider: pick };
      changed = true;
    }
  } else if (!hasKey(imageProvider)) {
    const pick = IMAGE_CAPABLE_PROVIDERS.find(hasKey);
    if (pick) connections.imageOutput = { provider: pick };
    else delete connections.imageOutput;
    changed = true;
  }

  return changed;
}

// One-time migration + repair, run at startup: keys that older builds stored
// INSIDE the engine entries (voice.apiKey was a Groq key, voiceOutput.apiKey
// a Gemini key) move to their real provider entries, then empty slots fill.
export function normalizeEngineConnections(config: {
  secretsDirectory: string;
}): void {
  const connections = readProviderConnections(config.secretsDirectory);
  let changed = false;
  if (connections.voice?.apiKey) {
    if (!connections.groq?.apiKey) {
      connections.groq = { ...connections.groq, apiKey: connections.voice.apiKey };
    }
    connections.voice = { provider: "groq" };
    changed = true;
  }
  if (connections.voiceOutput?.apiKey) {
    if (!connections.gemini?.apiKey) {
      connections.gemini = {
        ...connections.gemini,
        apiKey: connections.voiceOutput.apiKey,
      };
    }
    connections.voiceOutput = {
      engine: connections.voiceOutput.engine ?? "gemini",
      ...(connections.voiceOutput.voice
        ? { voice: connections.voiceOutput.voice }
        : {}),
    };
    changed = true;
  }
  if (fillEngineDefaults(connections)) changed = true;
  if (changed) writeConnections(config.secretsDirectory, connections);
}

export function writeConnections(
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
  // 🔴 AN EMPTY FIELD MEANS "LEAVE IT", NEVER "DELETE IT". The connect form
  // cannot show a stored key — so every time it is reopened to change
  // something ELSE, the key box arrives blank, and writing that blank through
  // deleted the key. Oskar chose a model for Gemini, pressed Update, and
  // Gemini vanished from the Models list with its key gone (2026-08-07).
  // Removing a key has exactly one door, and it is called Disconnect.
  const keep = connections[id];
  const nextKey = input.apiKey?.trim() ? input.apiKey : keep?.apiKey;
  const nextBaseUrl = input.baseUrl?.trim() ? input.baseUrl : keep?.baseUrl;
  connections[id] = {
    ...keep,
    ...(nextKey !== undefined ? { apiKey: nextKey } : {}),
    ...(nextBaseUrl !== undefined ? { baseUrl: nextBaseUrl } : {}),
    // The model is different: an empty model is a real choice — "use the
    // backend's default" — and the form offers it as the first option.
    ...(input.model !== undefined ? { model: input.model } : {}),
  };
  // A newly capable connection auto-fills any empty engine slot (voice
  // input / voice output / vision) — Oskar's install-time expectation.
  fillEngineDefaults(connections);
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
  // Engine slots that pointed at the removed provider re-fill from another
  // capable connection, or empty out.
  fillEngineDefaults(connections);
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
