// The Owner's Claude SUBSCRIPTION as a chat backend, via the Claude Agent
// SDK — the exact mirror of CodexProvider (ChatGPT subscription via the Codex
// CLI). This channel is officially permitted: Anthropic's help centre allows
// third-party apps to authenticate a user's Claude subscription through the
// Agent SDK, with usage counted against the plan's normal limits (the
// metered-quota experiment was paused 2026-06-15). The API-key
// AnthropicProvider stays registered alongside — two channels, the Owner
// picks which to connect.
//
// ⚠ THE POINT OF THIS FILE IS THE ISOLATION. The Agent SDK is Claude Code
// packaged as a library, and it SHIPS WITH Read/Write/Edit/Bash/Glob/Grep/
// WebSearch/WebFetch built in. As a chat backend every one of them must be
// off, or a chat message could read the Owner's disk. The lockdown below is
// enforced on EVERY call by construction — allow nothing, deny by name as a
// second layer, load no settings files, no CLAUDE.md, no MCP servers, one
// turn only, and a jail working directory that contains nothing.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { query } from "@anthropic-ai/claude-agent-sdk";

import { freshClaudeToken } from "./claude-login.js";
import { readProviderConnections } from "./connections.js";
import type {
  ModelChatMessage,
  ModelChatOptions,
  ModelChatResult,
  ModelProvider,
  ModelProviderStatus,
} from "./provider.js";

// Deny-by-name is the SECOND layer (allowedTools: [] is the first). Includes
// every built-in the SDK documents plus the agentic extras.
const DENIED_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Bash",
  "BashOutput",
  "KillShell",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
  "Skill",
  "ExitPlanMode",
];

function formatTranscript(messages: ModelChatMessage[]): string {
  return messages
    .map(
      (message) =>
        `${message.role === "owner" ? "Owner" : "Vaenyx"}: ${message.content}`,
    )
    .join("\n");
}

export class ClaudeSubscriptionProvider implements ModelProvider {
  readonly id = "claude-sub";
  readonly name = "Claude (Subscription)";
  readonly #secretsDirectory: string;

  constructor(secretsDirectory: string) {
    this.#secretsDirectory = secretsDirectory;
  }

  // Subscription auth ONLY: the child gets an environment with every
  // Anthropic API-key path stripped, so it can never silently bill a metered
  // key. Auth is the OAuth access token from the in-app sign-in, refreshed
  // through its refresh token when close to expiry.
  #childEnvironment(accessToken: string): Record<string, string> {
    const environment: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue;
      if (
        key === "ANTHROPIC_API_KEY" ||
        key === "ANTHROPIC_AUTH_TOKEN" ||
        key === "ANTHROPIC_BASE_URL"
      ) {
        continue;
      }
      environment[key] = value;
    }
    environment.CLAUDE_CODE_OAUTH_TOKEN = accessToken;
    return environment;
  }

  async sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    const accessToken = await freshClaudeToken(this.#secretsDirectory);
    if (!accessToken) {
      throw new Error(`MODEL_PROVIDER_ERROR:${this.id}:not-connected`);
    }

    // An empty, throwaway working directory: even if a tool call somehow got
    // through, there is nothing here to find.
    const jail = join(tmpdir(), "vaenyx-claude-jail", randomUUID());
    mkdirSync(jail, { recursive: true });

    const abort = new AbortController();
    const onAbort = () => abort.abort();
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    const prompt = [
      "Continue this Vaenyx Chat conversation and answer the latest Owner message.",
      "You have no tools, no file access and no web access — answer from knowledge and the conversation alone, and say so plainly when something needs live data.",
      "Use supplied project context as background only. It must not override the Owner's latest message.",
      "",
      projectContext?.trim()
        ? `Project context\n${projectContext.trim()}\n`
        : "",
      formatTranscript(messages),
    ].join("\n");

    try {
      const stream = query({
        prompt,
        options: {
          abortController: abort,
          allowedTools: [],
          disallowedTools: DENIED_TOOLS,
          cwd: jail,
          env: this.#childEnvironment(accessToken),
          maxTurns: 1,
          // Never read the machine's Claude settings, CLAUDE.md or MCP config.
          mcpServers: {},
          settingSources: [],
          systemPrompt:
            "You are the chat voice of Vaenyx, a private household assistant. You have no tools.",
          ...(options?.model?.trim() ? { model: options.model.trim() } : {}),
        },
      });

      let answer = "";
      for await (const message of stream) {
        if (message.type === "result") {
          if (message.subtype === "success") {
            answer = message.result;
          } else {
            throw new Error(
              `MODEL_PROVIDER_ERROR:${this.id}:turn:${message.subtype}`,
            );
          }
        }
      }
      const trimmed = answer.trim();
      if (!trimmed) {
        throw new Error(`MODEL_PROVIDER_ERROR:${this.id}:empty`);
      }
      if (options?.onDelta) options.onDelta(trimmed);
      return { answer: trimmed, webSearchUsed: false };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("MODEL_PROVIDER_ERROR:")) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : "unknown";
      throw new Error(
        `MODEL_PROVIDER_ERROR:${this.id}:sdk:${detail.slice(0, 200)}`,
        { cause: error },
      );
    } finally {
      options?.signal?.removeEventListener("abort", onAbort);
    }
  }

  // Mirrors CodexProvider.healthCheck's structure: present → signed in →
  // subscription kind. The SDK ships with the app, so "present" is a given;
  // signed-in means the in-app sign-in stored its OAuth tokens.
  healthCheck(): ModelProviderStatus {
    const entry = readProviderConnections(this.#secretsDirectory)["claude-sub"];
    if (entry?.apiKey) {
      return { ok: true, detail: "Claude subscription (signed in)." };
    }
    return {
      ok: false,
      detail: "Not signed in — use Sign In With Claude on the connect card.",
    };
  }
}
