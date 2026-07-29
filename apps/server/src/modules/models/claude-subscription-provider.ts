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
import { existsSync, mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

import { readProviderConnections } from "./connections.js";
import type {
  ModelChatMessage,
  ModelChatOptions,
  ModelChatResult,
  ModelProvider,
  ModelProviderStatus,
} from "./provider.js";

// Auth = the OFFICIAL tool's output, never our own OAuth (private's red line,
// 2026-07-29: re-implementing the handshake with another app's client id is
// impersonation, and the official permission is scoped to "via the Agent
// SDK"). Two sanctioned forms, in order:
//   1. a long-lived token the Owner made with `claude setup-token`, pasted in
//   2. an existing Claude Code sign-in on this machine (the SDK child reads
//      the CLI's own credentials natively — nothing configured at all)
export function resolveClaudeSubscriptionAuth(secretsDirectory: string): {
  token: string | null;
  machineLogin: boolean;
} {
  const token =
    readProviderConnections(secretsDirectory)["claude-sub"]?.apiKey?.trim() ||
    null;
  const machineLogin = existsSync(
    join(homedir(), ".claude", ".credentials.json"),
  );
  return { token, machineLogin };
}

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

// The child env strips every metered API-key path; with a setup token it is
// injected, with a machine login the SDK child finds the CLI's credentials by
// itself.
function cleanChildEnvironment(token: string | null): Record<string, string> {
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
  if (token) environment.CLAUDE_CODE_OAUTH_TOKEN = token;
  return environment;
}

// One-shot vision call for the Picture Input ENGINE (describe / annotate):
// the same hard lockdown as chat, an image block plus the tool's prompt in a
// single streaming user message, plain text back. Lets the Owner's Claude
// subscription power the vision engine slot (Oskar, 2026-07-29).
export async function claudeSubscriptionVision(
  secretsDirectory: string,
  promptText: string,
  imageBase64: string,
  mediaType: string,
): Promise<string> {
  const auth = resolveClaudeSubscriptionAuth(secretsDirectory);
  if (!auth.token && !auth.machineLogin) {
    throw new Error("VISION_NOT_CONNECTED");
  }

  const jail = join(tmpdir(), "vaenyx-claude-jail", randomUUID());
  mkdirSync(jail, { recursive: true });

  const input = (async function* (): AsyncGenerator<SDKUserMessage> {
    yield {
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg",
              data: imageBase64,
            },
          },
          { type: "text", text: promptText },
        ],
      },
      parent_tool_use_id: null,
    };
  })();

  const stream = query({
    prompt: input,
    options: {
      allowedTools: [],
      disallowedTools: DENIED_TOOLS,
      cwd: jail,
      env: cleanChildEnvironment(auth.token),
      maxTurns: 1,
      mcpServers: {},
      settingSources: [],
      systemPrompt: "You are an image-reading tool. You have no tools.",
    },
  });
  let answer = "";
  for await (const message of stream) {
    if (message.type === "result") {
      if (message.subtype === "success") answer = message.result;
      else throw new Error(`VISION_DESCRIBE_FAILED:claude-sub:${message.subtype}`);
    }
  }
  if (!answer.trim()) throw new Error("VISION_DESCRIBE_FAILED:claude-sub:empty");
  return answer.trim();
}

export class ClaudeSubscriptionProvider implements ModelProvider {
  readonly id = "claude-sub";
  readonly name = "Claude (Subscription)";
  readonly #secretsDirectory: string;

  constructor(secretsDirectory: string) {
    this.#secretsDirectory = secretsDirectory;
  }

  async sendChat(
    messages: ModelChatMessage[],
    projectContext?: string,
    options?: ModelChatOptions,
  ): Promise<ModelChatResult> {
    const auth = resolveClaudeSubscriptionAuth(this.#secretsDirectory);
    if (!auth.token && !auth.machineLogin) {
      throw new Error(`MODEL_PROVIDER_ERROR:${this.id}:not-connected`);
    }

    // An empty, throwaway working directory: even if a tool call somehow got
    // through, there is nothing here to find.
    const jail = join(tmpdir(), "vaenyx-claude-jail", randomUUID());
    mkdirSync(jail, { recursive: true });

    const abort = new AbortController();
    const onAbort = () => abort.abort();
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    // Vision (probe-verified 2026-07-29): the SDK's streaming input takes
    // native image content blocks, so a conversation photo rides the request
    // first-hand — no describe-to-text middle layer.
    const imageMatch = options?.imageDataUrl
      ? /^data:([^;]+);base64,(.+)$/.exec(options.imageDataUrl)
      : null;

    const prompt = [
      "Continue this Vaenyx Chat conversation and answer the latest Owner message.",
      "You have no tools, no file access and no web access — answer from knowledge and the conversation alone, and say so plainly when something needs live data.",
      ...(imageMatch
        ? [
            "The attached image is the photo from the conversation's most recent photo message — you are seeing it first-hand.",
          ]
        : []),
      "Use supplied project context as background only. It must not override the Owner's latest message.",
      "",
      projectContext?.trim()
        ? `Project context\n${projectContext.trim()}\n`
        : "",
      formatTranscript(messages),
    ].join("\n");

    // With a photo, the prompt becomes ONE streaming user message carrying
    // the image block plus the text; plain turns stay a simple string.
    const promptInput: string | AsyncIterable<SDKUserMessage> = imageMatch
      ? (async function* (): AsyncGenerator<SDKUserMessage> {
          yield {
            type: "user",
            message: {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: (imageMatch[1] ??
                      "image/jpeg") as "image/jpeg",
                    data: imageMatch[2] ?? "",
                  },
                },
                { type: "text", text: prompt },
              ],
            },
            parent_tool_use_id: null,
          };
        })()
      : prompt;

    try {
      const stream = query({
        prompt: promptInput,
        options: {
          abortController: abort,
          allowedTools: [],
          disallowedTools: DENIED_TOOLS,
          cwd: jail,
          env: cleanChildEnvironment(auth.token),
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
  // signed-in means a pasted setup token, or a Claude Code login already on
  // this machine (visible to the server's user account).
  healthCheck(): ModelProviderStatus {
    const auth = resolveClaudeSubscriptionAuth(this.#secretsDirectory);
    if (auth.token) {
      return { ok: true, detail: "Claude subscription (setup token)." };
    }
    if (auth.machineLogin) {
      return { ok: true, detail: "Claude Code sign-in on this machine." };
    }
    return {
      ok: false,
      detail:
        "Not connected. Run `claude setup-token` in a terminal and paste the token here.",
    };
  }
}
