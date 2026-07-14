// Vaenyx multi-model — the provider-neutral model interface (see
// docs/multi-model.md). Every model backend (the Codex CLI today; OpenAI /
// Claude / Gemini / a generic local endpoint next) implements this, and all
// model calls route through the ModelRegistry — nothing imports a specific
// backend directly.
//
// The chat types are aliased from the current Codex channel so this first
// extraction is behaviour-preserving; they are already backend-neutral in shape
// (a message list + optional project context + options like the reasoning tier,
// streaming callback and abort signal).
import type {
  AskVaenyxInputMessage,
  AskVaenyxResult,
  RunAskVaenyxOptions,
} from "../harness/codex.js";

export type ModelChatMessage = AskVaenyxInputMessage;
export type ModelChatResult = AskVaenyxResult;
export type ModelChatOptions = RunAskVaenyxOptions;

// A provider's connection health, for the Settings connection card and the
// composer's provider picker (an unhealthy provider is shown unavailable, with
// the reason).
export interface ModelProviderStatus {
  ok: boolean;
  detail: string;
}

export interface ModelProvider {
  readonly id: string;
  readonly name: string;
  sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult>;
  healthCheck(): ModelProviderStatus;
}
