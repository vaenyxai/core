// WHICH MODEL, asked of the provider itself.
//
// Until now the connect form had a free-text "Model (optional)" box: to move
// off the default you had to already know the exact id, and the ids are
// exactly what nobody can keep up with — "里面有好多 3.5、3.6 什么的" (Oskar,
// 2026-08-07). A hard-coded list would be the same problem one release later,
// so nothing here is hard-coded: every provider is asked what it has, with the
// Owner's own key, and the answer is offered as a list.
//
// Anything we cannot ask (a CLI login, a subscription, a local server with no
// catalogue) says so plainly and keeps the free-text box — never a menu of
// guesses.
import { readProviderConnections } from "./connections.js";
import { OPENAI_COMPATIBLE_PRESETS } from "./registry.js";

export class ModelCatalogueUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ModelCatalogueUnavailableError";
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

// Chat-capable ids only, as far as each provider's own listing lets us tell.
// A provider that mixes embeddings, moderation and speech into one list makes
// the picker useless, so the obvious non-chat families are dropped — by
// pattern, and only where the pattern is unambiguous.
const NOT_CHAT = [
  /embed/i,
  /moderation/i,
  /whisper/i,
  /^tts-/i,
  /-tts(-|$)/i,
  /guard/i,
  /rerank/i,
  /^dall-e/i,
  /image-generation/i,
  /^text-(similarity|search)/i,
];

function chatOnly(ids: string[]): string[] {
  return ids
    .filter((id) => !NOT_CHAT.some((pattern) => pattern.test(id)))
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ModelCatalogueUnavailableError(
      `The provider answered ${response.status} when asked for its model list.`,
    );
  }
  return (await response.json()) as unknown;
}

/** The model ids this provider will accept from this Owner's key. */
export async function listProviderModels(
  secretsDirectory: string,
  providerId: string,
): Promise<string[]> {
  const connection = readProviderConnections(secretsDirectory)[providerId];
  const apiKey = connection?.apiKey?.trim();

  if (providerId === "anthropic") {
    if (!apiKey) throw new ModelCatalogueUnavailableError("No key yet.");
    const body = (await readJson("https://api.anthropic.com/v1/models", {
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    })) as { data?: { id?: string }[] };
    return chatOnly(
      (body.data ?? [])
        .map((entry) => entry.id)
        .filter((id): id is string => Boolean(id)),
    );
  }

  const preset = OPENAI_COMPATIBLE_PRESETS.find(
    (entry) => entry.id === providerId,
  );
  const baseUrl = connection?.baseUrl ?? preset?.baseUrl;
  if (!baseUrl) {
    throw new ModelCatalogueUnavailableError(
      "This backend has no model list to ask for.",
    );
  }
  if (!apiKey) throw new ModelCatalogueUnavailableError("No key yet.");

  const body = (await readJson(`${baseUrl.replace(/\/+$/, "")}/models`, {
    authorization: `Bearer ${apiKey}`,
  })) as { data?: { id?: string }[] };
  return chatOnly(
    (body.data ?? [])
      .map((entry) => entry.id)
      .filter((id): id is string => Boolean(id)),
  );
}
