// A ModelProvider for the Anthropic (Claude) Messages API. Its request shape
// differs from OpenAI's (a separate top-level `system`, required `max_tokens`,
// `x-api-key` + `anthropic-version` headers, a `content` block array response),
// so it is its own provider. Raw fetch — no SDK dependency; non-streaming for
// now (the whole answer is emitted once via onDelta).
import type {
  ModelChatMessage,
  ModelChatOptions,
  ModelChatResult,
  ModelProvider,
  ModelProviderStatus,
} from "./provider.js";

const ANTHROPIC_VERSION = "2023-06-01";

export interface AnthropicConfig {
  id: string;
  name: string;
  baseUrl: string; // e.g. https://api.anthropic.com/v1
  apiKey: string;
  model: string;
  maxTokens?: number;
}

interface AnthropicResponse {
  content?: { type?: string; text?: string }[];
}

export class AnthropicProvider implements ModelProvider {
  readonly id: string;
  readonly name: string;
  readonly #baseUrl: string;
  readonly #apiKey: string;
  readonly #model: string;
  readonly #maxTokens: number;

  constructor(config: AnthropicConfig) {
    this.id = config.id;
    this.name = config.name;
    this.#baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.#apiKey = config.apiKey;
    this.#model = config.model;
    this.#maxTokens = config.maxTokens ?? 4096;
  }

  async sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    const body: Record<string, unknown> = {
      model: this.#model,
      max_tokens: this.#maxTokens,
      messages: messages.map((message) => ({
        role: message.role === "owner" ? "user" : "assistant",
        content: message.content,
      })),
    };
    if (projectContext && projectContext.trim()) {
      body.system = projectContext;
    }

    const response = await fetch(`${this.#baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.#apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `MODEL_PROVIDER_ERROR:${this.id}:${response.status}:${detail.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as AnthropicResponse;
    const answer = (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
    if (options?.onDelta && answer) {
      options.onDelta(answer);
    }
    return { answer, webSearchUsed: false };
  }

  healthCheck(): ModelProviderStatus {
    if (!this.#apiKey) {
      return { ok: false, detail: `${this.name} needs an API key.` };
    }
    return { ok: true, detail: `${this.name} (${this.#model})` };
  }
}
