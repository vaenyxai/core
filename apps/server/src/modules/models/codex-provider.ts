// The Codex CLI (ChatGPT login) as a ModelProvider — the first provider. It
// delegates to the existing harness so behaviour is unchanged; multi-model adds
// sibling providers (OpenAI / Claude / Gemini / local) implementing the same
// interface.
import {
  getCodexStatus,
  runAskVaenyxChat,
  runCodexMethodOffline,
} from "../harness/codex.js";
import { noteCoreUsage } from "../core/relay-usage.js";

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
  // The model chosen for this account under Settings → Models (empty = the
  // account's own default). A per-call model still wins; nothing else does.
  readonly #model: string | null;

  constructor(options?: { model?: string | null }) {
    this.#model = options?.model?.trim() || null;
  }

  async sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    // A turn that may not look things up runs on a session spawned WITHOUT the
    // web-search flag — the tool is absent, not discouraged. Enforcement has to
    // live in every backend, or the guarantee is only as strong as the one
    // nobody checked.
    // Counted whichever branch runs: both hit the same subscription. The CLI
    // reports no token counts, so Codex rows on the usage page carry calls
    // only — never an estimate.
    noteCoreUsage("openai-cli");
    if (options?.allowWeb === false) {
      const answer = await runCodexMethodOffline(
        [projectContext, messages.map((m) => m.content).join("\n\n")]
          .filter(Boolean)
          .join("\n\n"),
        options.signal,
      );
      return { answer, webSearchUsed: false };
    }
    return runAskVaenyxChat(messages, projectContext, {
      ...options,
      ...(options?.model?.trim()
        ? { model: options.model.trim() }
        : this.#model
          ? { model: this.#model }
          : {}),
    });
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
