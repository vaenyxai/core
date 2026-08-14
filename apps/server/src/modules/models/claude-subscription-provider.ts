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

import {
  isClaudeSdkInstalled,
  loadClaudeSdk,
  type SdkUserMessage,
} from "./claude-sdk.js";
import { noteCoreUsage } from "../core/relay-usage.js";
import { claudeMachineLogin, getClaudeHomeDirectory } from "./claude-login.js";
import { readProviderConnections } from "./connections.js";
import {
  FETCH_TOOL_NAMES,
  fetchToolBriefing,
  fetchToolServer,
} from "./fetch-tools.js";
import {
  DOCUMENT_TOOL_NAMES,
  documentToolBriefing,
  documentToolServer,
} from "./document-tools.js";
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
//   1. the in-app sign-in — Vaenyx drives the official `claude auth login`
//      through pipes and the credentials land in the Vaenyx claude-home
//   2. a long-lived token the Owner made with `claude setup-token`, pasted in
export function resolveClaudeSubscriptionAuth(secretsDirectory: string): {
  token: string | null;
  machineLogin: boolean;
} {
  const token =
    readProviderConnections(secretsDirectory)["claude-sub"]?.apiKey?.trim() ||
    null;
  return { token, machineLogin: claudeMachineLogin() };
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

// The line between "can look something up" and "can touch this machine". Chat
// and scheduled tasks get the first two; nothing gets the rest. Reading a photo
// and the subscription door lent to other apps keep the whole toolbox off —
// they have no business searching anything.
const WEB_TOOLS = ["WebSearch", "WebFetch"] as const;
const MACHINE_TOOLS = DENIED_TOOLS.filter(
  (tool) => !WEB_TOOLS.includes(tool as (typeof WEB_TOOLS)[number]),
);

function formatTranscript(messages: ModelChatMessage[]): string {
  return messages
    .map(
      (message) =>
        `${message.role === "owner" ? "Owner" : "Vaenyx"}: ${message.content}`,
    )
    .join("\n");
}

// The child env strips every metered API-key path. CLAUDE_CONFIG_DIR points
// at the Vaenyx claude-home so the SDK child reads the in-app sign-in's
// credentials natively; a pasted setup token (when present) rides the
// dedicated env var and takes precedence.
//
// `profileKey` (Relay Profiles): an app profile's calls read the profile's own
// claude-home and NOTHING else — the token parameter must be null for them,
// because the pasted setup token is the Owner's and would silently bill the
// Owner's account for an app that lost its own login.
function cleanChildEnvironment(
  token: string | null,
  profileKey: string = "core",
): Record<string, string> {
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
  environment.CLAUDE_CONFIG_DIR = getClaudeHomeDirectory(profileKey);
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

  const input = (async function* (): AsyncGenerator<SdkUserMessage> {
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

  const sdk = await loadClaudeSdk();
  const stream = sdk.query({
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
      // A vision call is Vaenyx's own spend, same as chat.
      noteCoreUsage("claude-cli");
      if (message.subtype === "success") answer = message.result;
      else
        throw new Error(`VISION_DESCRIBE_FAILED:claude-sub:${message.subtype}`);
    }
  }
  if (!answer.trim())
    throw new Error("VISION_DESCRIBE_FAILED:claude-sub:empty");
  return answer.trim();
}

// One-shot call for the SUBSCRIPTION DOOR (/v1/ai/run). Same lockdown as every
// other use of this channel, and deliberately stateless: an outside app's
// request never joins a conversation, least of all the Owner's own chat.
// Attachments arrive as a downloaded file, already size-checked by the caller.
export async function claudeSubscriptionRelay(
  secretsDirectory: string,
  promptText: string,
  attachment?: { base64: string; mediaType: string },
  profileKey: string = "core",
): Promise<string> {
  // Two identities, never blended (Relay Profiles): "core" is the shared door
  // riding Vaenyx's own login or the Owner's pasted setup token; a profile
  // rides ONLY what its own sign-in wrote to its own claude-home. No token
  // env, no reading the Owner's directory — an app whose login lapsed gets a
  // clear "not connected", never the Owner's account by accident.
  let token: string | null = null;
  if (profileKey === "core") {
    const auth = resolveClaudeSubscriptionAuth(secretsDirectory);
    if (!auth.token && !auth.machineLogin) {
      throw new Error("RELAY_NOT_SIGNED_IN:claude-cli");
    }
    token = auth.token;
  } else if (!claudeMachineLogin(profileKey)) {
    throw new Error("RELAY_PROFILE_NOT_CONNECTED:claude-cli");
  }

  const jail = join(tmpdir(), "vaenyx-claude-jail", randomUUID());
  mkdirSync(jail, { recursive: true });

  // A PDF goes as a document block (Claude reads the pages itself); anything
  // else goes as an image. Callers that only have images send images.
  const block = !attachment
    ? null
    : attachment.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: attachment.base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: attachment.mediaType as "image/jpeg",
            data: attachment.base64,
          },
        };

  const input = (async function* (): AsyncGenerator<SdkUserMessage> {
    yield {
      type: "user",
      message: {
        role: "user",
        content: [
          ...(block ? [block] : []),
          { type: "text", text: promptText },
        ],
      },
      parent_tool_use_id: null,
    };
  })();

  const sdk = await loadClaudeSdk();
  const stream = sdk.query({
    prompt: input,
    options: {
      allowedTools: [],
      disallowedTools: DENIED_TOOLS,
      cwd: jail,
      env: cleanChildEnvironment(token, profileKey),
      maxTurns: 1,
      mcpServers: {},
      settingSources: [],
      systemPrompt:
        "You answer one request and stop. You have no tools and no memory of anything else.",
    },
  });
  let answer = "";
  for await (const message of stream) {
    if (message.type === "result") {
      if (message.subtype === "success") answer = message.result;
      else throw new Error(`RELAY_ENGINE_FAILED:claude-cli:${message.subtype}`);
    }
  }
  if (!answer.trim()) throw new Error("RELAY_ENGINE_FAILED:claude-cli:empty");
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
    // The SDK is fetched when this channel is connected, so a machine that is
    // connected normally has it. If it is missing anyway — userdata restored
    // onto a different computer, a half-finished download — say which piece is
    // missing instead of failing somewhere inside a module that is not there.
    if (!isClaudeSdkInstalled()) {
      throw new Error(`MODEL_PROVIDER_ERROR:${this.id}:component-missing`);
    }

    // An empty, throwaway working directory: even if a tool call somehow got
    // through, there is nothing here to find.
    const jail = join(tmpdir(), "vaenyx-claude-jail", randomUUID());
    mkdirSync(jail, { recursive: true });

    const abort = new AbortController();
    const onAbort = () => abort.abort();
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    // FETCHING. The caller hands over a live grant or nothing at all — this
    // file never asks the database what the Owner allowed, because the same
    // provider serves the subscription door lent to OUTSIDE APPS, and a
    // provider that looked the folders up for itself would hand them to that
    // door too. Absent here means the turn cannot open a file, full stop.
    const files = options?.fetchAccess ?? null;
    // SPILLED DOCUMENT (same contract as fetchAccess): a live reader over
    // one document's saved text, handed in by the caller or absent. Absent
    // means this turn has no spilled document to read back.
    const docSpill = options?.documentSpill ?? null;

    // Vision (probe-verified 2026-07-29): the SDK's streaming input takes
    // native image content blocks, so a conversation photo rides the request
    // first-hand — no describe-to-text middle layer. The same input takes a
    // native PDF document block (also probe-verified), which is how a document
    // gets read page-by-page as picture AND text.
    const imageMatch = options?.imageDataUrl
      ? /^data:([^;]+);base64,(.+)$/.exec(options.imageDataUrl)
      : null;
    const documentBase64 = options?.documentBase64 ?? null;

    const prompt = [
      "Continue this Vaenyx Chat conversation and answer the latest Owner message.",
      files
        ? fetchToolBriefing(files.folders)
        : docSpill
          ? // With only the document reader, the machine itself stays closed:
            // the reach is one saved document, not the disk.
            "Beyond the document tool described below you have no other file access — the rest of this machine is closed to you."
          : "You have no tools, no file access and no web access — answer from knowledge and the conversation alone, and say so plainly when something needs live data.",
      ...(docSpill ? [documentToolBriefing(docSpill)] : []),
      ...(imageMatch
        ? [
            "The attached image is the photo from the conversation's most recent photo message — you are seeing it first-hand.",
          ]
        : []),
      ...(documentBase64
        ? [
            `The attached document${options?.documentName ? ` (${options.documentName})` : ""} is the file the Owner just sent — you are reading it first-hand, page by page. Cite page numbers when it helps.`,
          ]
        : []),
      "Use supplied project context as background only. It must not override the Owner's latest message.",
      "",
      projectContext?.trim()
        ? `Project context\n${projectContext.trim()}\n`
        : "",
      formatTranscript(messages),
    ].join("\n");

    // With an attachment, the prompt becomes ONE streaming user message
    // carrying the image and/or document block plus the text; plain turns stay
    // a simple string.
    const attachments: SdkUserMessage["message"]["content"] = [];
    if (imageMatch) {
      attachments.push({
        type: "image",
        source: {
          type: "base64",
          media_type: (imageMatch[1] ?? "image/jpeg") as "image/jpeg",
          data: imageMatch[2] ?? "",
        },
      });
    }
    if (documentBase64) {
      attachments.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: documentBase64,
        },
      });
    }
    const promptInput: string | AsyncIterable<SdkUserMessage> =
      attachments.length > 0
        ? (async function* (): AsyncGenerator<SdkUserMessage> {
            yield {
              type: "user",
              message: {
                role: "user",
                content: [...attachments, { type: "text", text: prompt }],
              },
              parent_tool_use_id: null,
            };
          })()
        : prompt;

    try {
      const sdk = await loadClaudeSdk();
      const stream = sdk.query({
        prompt: promptInput,
        options: {
          abortController: abort,
          // Looking something up is allowed; touching this machine is not
          // (Oskar, 2026-07-30). His 7am briefing ran three days in a row
          // saying it could not check anything, and it was right: the whole
          // toolbox was off, search included, and one turn is not enough for a
          // search to come back and be read anyway. Search and fetch are the
          // only two tools that never touch the disk, the shell or the
          // machine's own Claude configuration — everything else stays denied
          // by name, the jail is still empty, no settings or MCP are loaded.
          // A turn that may not look things up gets NO tools at all — the same
          // lockdown reading a photo runs under. Enforcement lives in every
          // backend, or the guarantee is only as strong as the weakest one.
          allowedTools: [
            ...(options?.allowWeb === false ? [] : WEB_TOOLS),
            // Auto-approved because there is nobody to answer a prompt in a
            // household chat — and safe because the permission is not what
            // guards the disk: the handler behind this name is.
            ...(files ? FETCH_TOOL_NAMES : []),
            ...(docSpill ? DOCUMENT_TOOL_NAMES : []),
          ],
          disallowedTools:
            options?.allowWeb === false ? DENIED_TOOLS : MACHINE_TOOLS,
          // 🔴 On a file-opening turn the built-in toolbox stops EXISTING
          // rather than merely being denied by name: `tools` is the base set,
          // so Read, Glob, Grep and Bash are not there to be reached for. That
          // matters because Glob and Grep take an optional path and Grep can
          // return file contents without ever naming a file, so a deny list
          // written against a file path would not see them coming. Ordinary
          // turns are left exactly as they were — one lockdown to reason
          // about, changed only where the risk actually changes.
          ...(files || docSpill
            ? { tools: options?.allowWeb === false ? [] : [...WEB_TOOLS] }
            : {}),
          cwd: jail,
          env: cleanChildEnvironment(auth.token),
          // Four was too tight and the briefing died on the cap (Oskar,
          // 2026-07-30, error_max_turns three runs in a row). Ten is room for a
          // real morning round-up; the cap is now a backstop rather than a
          // guillotine, because running into it no longer throws away the work
          // (see error_max_turns below).
          maxTurns: 10,
          // Never read the machine's Claude settings, CLAUDE.md or MCP config.
          // The one server that can ever appear here is built in this process
          // from the Owner's own folder list; nothing is read off the disk.
          mcpServers: {
            ...(files ? { vaenyx_files: fetchToolServer(sdk, files) } : {}),
            ...(docSpill
              ? { vaenyx_document: documentToolServer(sdk, docSpill) }
              : {}),
          },
          settingSources: [],
          systemPrompt:
            // The connector line: it kept closing briefings with a note about
            // unauthorised claude.ai Gmail/Calendar/Drive connectors (Oskar,
            // 2026-07-30). There is no such thing here — it was describing a
            // different product it assumed it was part of. Saying what it is
            // NOT is the only way to stop a model volunteering that.
            `You are the chat voice of Vaenyx, a private household assistant. You can search the web and read a page when the answer depends on current facts; say so plainly when you could not check something rather than answering from memory. Search efficiently: batch what you need into as few rounds as you can, and do not re-check something you have already found — the Owner is waiting. ${
              files
                ? // Said here as well as in the prompt because this is the
                  // sentence the model reaches for when it is asked something
                  // it cannot do: it has to know the reach is a few named
                  // folders and not the machine.
                  "You can also open text files, but ONLY from the folders named in the Owner's message — those folders are the whole of your reach into this machine, and everything else on it is closed to you."
                : docSpill
                  ? "You can also read parts of the Owner's saved document through the read_document_part tool — that one document is the whole of your reach into this machine, and everything else on it is closed to you."
                  : "You have no other tools and no access to this machine."
            } You are NOT claude.ai: there are no connectors here, no Gmail, no Calendar, no Drive, no way to send or file anything, and no authorisation the Owner could grant to change that. Never mention connectors or ask him to authorise one. If something is outside what you can do, name that one thing in a short line and stop.`,
          ...(options?.model?.trim() ? { model: options.model.trim() } : {}),
        },
      });

      let answer = "";
      let searched = false;
      // Everything it has said so far. Kept because running out of turns must
      // not throw away a finished briefing (Oskar, 2026-07-30): the run that
      // hit the cap had already written the whole thing and the Owner got
      // "could not complete" three times instead.
      let written = "";
      for await (const message of stream) {
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            // Whether it really looked something up, for the chip the Owner sees.
            if (
              block.type === "tool_use" &&
              WEB_TOOLS.includes(block.name as (typeof WEB_TOOLS)[number])
            ) {
              searched = true;
            }
            if (block.type === "text" && block.text.trim()) {
              written = block.text;
            }
          }
        }
        if (message.type === "result") {
          // The SDK reports real token counts on the result message; the
          // Codex CLI reports none — so Claude rows on the usage page carry
          // tokens and Codex rows do not, which is the honest asymmetry.
          const usage = (
            message as unknown as {
              usage?: { input_tokens?: number; output_tokens?: number };
            }
          ).usage;
          noteCoreUsage("claude-cli", {
            ...(typeof usage?.input_tokens === "number"
              ? { input: usage.input_tokens }
              : {}),
            ...(typeof usage?.output_tokens === "number"
              ? { output: usage.output_tokens }
              : {}),
          });
          if (message.subtype === "success") {
            answer = message.result;
          } else if (
            message.subtype === "error_max_turns" &&
            written.trim().length > 40
          ) {
            // It ran out of room to keep checking, but it had already answered.
            // Hand that over and say so, rather than losing the morning's work.
            answer = `${written}\n\n_(Vaenyx stopped it here — it had used up its allowance for looking things up. Everything above stands; there may be more it did not get to.)_`;
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
      return { answer: trimmed, webSearchUsed: searched };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("MODEL_PROVIDER_ERROR:")
      ) {
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
      return { ok: true, detail: "Claude subscription (signed in)." };
    }
    return {
      ok: false,
      detail: "Not signed in — use Sign In With Claude on the connect card.",
    };
  }
}
