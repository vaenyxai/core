// The Codex CLI (ChatGPT login) as a ModelProvider — the first provider. It
// delegates to the existing harness so behaviour is unchanged; multi-model adds
// sibling providers (OpenAI / Claude / Gemini / local) implementing the same
// interface.
import { getCodexStatus, runAskVaenyxChat } from "../harness/codex.js";

import type {
  ModelChatMessage,
  ModelChatOptions,
  ModelChatResult,
  ModelProvider,
  ModelProviderStatus,
} from "./provider.js";

export class CodexProvider implements ModelProvider {
  readonly id = "codex";
  readonly name = "Codex CLI (ChatGPT)";

  sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    return runAskVaenyxChat(messages, projectContext, options);
  }

  healthCheck(): ModelProviderStatus {
    const status = getCodexStatus();
    if (!status.installed) {
      return { ok: false, detail: "Codex CLI not installed." };
    }
    if (!status.loggedIn) {
      return { ok: false, detail: "Codex CLI not signed in." };
    }
    if (status.authMethod !== "chatgpt") {
      return { ok: false, detail: "Codex requires a ChatGPT login." };
    }
    return { ok: true, detail: `Codex ${status.version ?? ""}`.trim() };
  }
}
