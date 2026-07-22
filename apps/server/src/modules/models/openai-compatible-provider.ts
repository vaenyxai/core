// A ModelProvider for any OpenAI Chat Completions-compatible endpoint: OpenAI
// itself, and local servers (Ollama / LM Studio / llama.cpp) that expose the
// same POST /chat/completions API. Raw fetch — no SDK dependency. Non-streaming
// for now (the whole answer is emitted once via onDelta); native streaming is a
// later refinement.
import type {
  ModelChatMessage,
  ModelChatOptions,
  ModelChatResult,
  ModelProvider,
  ModelProviderStatus,
} from "./provider.js";

export interface OpenAICompatibleConfig {
  id: string;
  name: string;
  baseUrl: string; // e.g. https://api.openai.com/v1 or http://127.0.0.1:11434/v1
  apiKey: string;
  model: string;
  // Cloud APIs need a key; a local endpoint usually does not.
  requiresKey: boolean;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly id: string;
  readonly name: string;
  readonly #baseUrl: string;
  readonly #apiKey: string;
  readonly #model: string;
  readonly #requiresKey: boolean;

  constructor(config: OpenAICompatibleConfig) {
    this.id = config.id;
    this.name = config.name;
    this.#baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.#apiKey = config.apiKey;
    this.#model = config.model;
    this.#requiresKey = config.requiresKey;
  }

  async sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    const chatMessages: { role: string; content: string }[] = [];
    if (projectContext && projectContext.trim()) {
      chatMessages.push({ role: "system", content: projectContext });
    }
    for (const message of messages) {
      chatMessages.push({
        role: message.role === "owner" ? "user" : "assistant",
        content: message.content,
      });
    }

    const response = await fetch(`${this.#baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.#apiKey ? { authorization: `Bearer ${this.#apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: options?.model?.trim() || this.#model,
        messages: chatMessages,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `MODEL_PROVIDER_ERROR:${this.id}:${response.status}:${detail.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const answer = data.choices?.[0]?.message?.content ?? "";
    if (options?.onDelta && answer) {
      options.onDelta(answer);
    }
    return { answer, webSearchUsed: false };
  }

  healthCheck(): ModelProviderStatus {
    if (this.#requiresKey && !this.#apiKey) {
      return { ok: false, detail: `${this.name} needs an API key.` };
    }
    return { ok: true, detail: `${this.name} (${this.#model})` };
  }
}
