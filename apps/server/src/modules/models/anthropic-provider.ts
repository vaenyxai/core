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
    // 16000, not 4096: Claude 5 spends thinking and answer from the same
    // max_tokens budget, and 4096 cut answers off mid-sentence.
    this.#maxTokens = config.maxTokens ?? 16_000;
  }

  async sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    const apiMessages: Record<string, unknown>[] = messages.map((message) => ({
      role: message.role === "owner" ? "user" : "assistant",
      content: message.content,
    }));
    // Vision and documents: Claude takes both as native content blocks, not
    // OpenAI-style image_url. They ride on the LAST owner message as a block
    // array — a PDF sent this way is read page by page, as picture AND text.
    const attachmentBlocks: Record<string, unknown>[] = [];
    if (options?.imageDataUrl) {
      const match = /^data:([^;]+);base64,(.+)$/.exec(options.imageDataUrl);
      if (match) {
        attachmentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: match[1], data: match[2] },
        });
      }
    }
    if (options?.documentBase64) {
      attachmentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: options.documentBase64,
        },
      });
    }
    if (attachmentBlocks.length > 0) {
      for (let index = apiMessages.length - 1; index >= 0; index -= 1) {
        const entry = apiMessages[index];
        if (entry && entry.role === "user") {
          entry.content = [
            ...attachmentBlocks,
            { type: "text", text: String(entry.content ?? "") },
          ];
          break;
        }
      }
    }
    const body: Record<string, unknown> = {
      model: options?.model?.trim() || this.#model,
      max_tokens: this.#maxTokens,
      messages: apiMessages,
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
