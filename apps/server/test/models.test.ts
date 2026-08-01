import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AnthropicProvider } from "../src/modules/models/anthropic-provider.js";
import { OpenAICompatibleProvider } from "../src/modules/models/openai-compatible-provider.js";
import {
  connectModelProvider,
  listModelProviders,
  setDefaultModelProvider,
} from "../src/modules/models/provider-settings.js";
import {
  getModelRegistry,
  initModelRegistry,
  resolveProvider,
} from "../src/modules/models/registry.js";

const temporaryDirectories: string[] = [];

interface CapturedRequest {
  url: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function stubFetch(response: Response): { current: CapturedRequest | null } {
  const captured: { current: CapturedRequest | null } = { current: null };
  vi.stubGlobal("fetch", ((url: string | URL, init?: RequestInit) => {
    captured.current = {
      url: String(url),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    return Promise.resolve(response);
  }) as typeof fetch);
  return captured;
}

describe("OpenAICompatibleProvider", () => {
  it("posts a chat completion, maps messages, returns the answer", async () => {
    const captured = stubFetch(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "hi there" } }] }),
        { status: 200 },
      ),
    );

    const provider = new OpenAICompatibleProvider({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1/",
      apiKey: "sk-test",
      model: "gpt-4o",
      requiresKey: true,
    });
    const result = await provider.sendChat(
      [{ role: "owner", content: "hello" }],
      "you are helpful",
    );

    expect(result).toEqual({ answer: "hi there", webSearchUsed: false });
    expect(captured.current?.url).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    expect(captured.current?.headers.authorization).toBe("Bearer sk-test");
    expect(captured.current?.body.model).toBe("gpt-4o");
    expect(captured.current?.body.messages).toEqual([
      { role: "system", content: "you are helpful" },
      { role: "user", content: "hello" },
    ]);
  });

  it("throws with a detail on a non-ok response", async () => {
    stubFetch(new Response("bad key", { status: 401 }));
    const provider = new OpenAICompatibleProvider({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "x",
      model: "gpt-4o",
      requiresKey: true,
    });
    await expect(
      provider.sendChat([{ role: "owner", content: "hi" }]),
    ).rejects.toThrow(/MODEL_PROVIDER_ERROR:openai:401/);
  });

  it("reports health from the key requirement", () => {
    const cloudNoKey = new OpenAICompatibleProvider({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4o",
      requiresKey: true,
    });
    expect(cloudNoKey.healthCheck().ok).toBe(false);

    const localNoKey = new OpenAICompatibleProvider({
      id: "local",
      name: "Local",
      baseUrl: "http://127.0.0.1:11434/v1",
      apiKey: "",
      model: "hermes",
      requiresKey: false,
    });
    expect(localNoKey.healthCheck().ok).toBe(true);
  });
});

describe("AnthropicProvider", () => {
  it("posts to /messages with the Anthropic headers and message shape", async () => {
    const captured = stubFetch(
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "claude says hi" }] }),
        { status: 200 },
      ),
    );

    const provider = new AnthropicProvider({
      id: "anthropic",
      name: "Claude",
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "sk-ant",
      model: "claude-sonnet-5",
    });
    const result = await provider.sendChat(
      [{ role: "owner", content: "hello" }],
      "be brief",
    );

    expect(result).toEqual({ answer: "claude says hi", webSearchUsed: false });
    expect(captured.current?.url).toBe("https://api.anthropic.com/v1/messages");
    expect(captured.current?.headers["x-api-key"]).toBe("sk-ant");
    expect(captured.current?.headers["anthropic-version"]).toBe("2023-06-01");
    // system is top-level; messages carry only the turn.
    expect(captured.current?.body.system).toBe("be brief");
    expect(captured.current?.body.messages).toEqual([
      { role: "user", content: "hello" },
    ]);
  });
});

describe("initModelRegistry", () => {
  it("registers configured providers alongside the default Codex", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    writeFileSync(
      resolve(dir, "model-providers.json"),
      JSON.stringify({
        openai: { apiKey: "sk-x", model: "gpt-4o" },
        local: { baseUrl: "http://127.0.0.1:11434/v1", model: "hermes" },
        anthropic: { apiKey: "sk-ant" },
        "claude-sub": { apiKey: "sk-ant-oat-token" },
        gemini: { apiKey: "g-key" },
        grok: { apiKey: "xai-key" },
      }),
    );

    const registry = initModelRegistry({ secretsDirectory: dir });
    expect(registry.default().id).toBe("codex");
    expect(registry.list().map((provider) => provider.id).sort()).toEqual([
      "anthropic",
      "claude-sub",
      "codex",
      "gemini",
      "grok",
      "local",
      "openai",
    ]);
    expect(getModelRegistry().get("openai")?.name).toBe("OpenAI");
    expect(getModelRegistry().get("anthropic")?.name).toBe("Claude");
    expect(getModelRegistry().get("gemini")?.name).toBe("Gemini");
    expect(getModelRegistry().get("grok")?.name).toBe("Grok");
  });

  it("is Codex-only when nothing is configured", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    // An empty Claude home too: the subscription channel must register only
    // for a connection the Owner actually made, never because the machine
    // happens to have a Claude sign-in lying around.
    const claudeHome = mkdtempSync(resolve(tmpdir(), "vaenyx-claude-home-"));
    temporaryDirectories.push(claudeHome);
    const previousHome = process.env.VAENYX_CLAUDE_HOME;
    process.env.VAENYX_CLAUDE_HOME = claudeHome;
    try {
      const registry = initModelRegistry({ secretsDirectory: dir });
      expect(registry.list().map((provider) => provider.id)).toEqual(["codex"]);
    } finally {
      if (previousHome === undefined) delete process.env.VAENYX_CLAUDE_HOME;
      else process.env.VAENYX_CLAUDE_HOME = previousHome;
    }
  });
});

describe("provider-settings", () => {
  it("lists all known providers, Codex connected and the rest not", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    initModelRegistry({ secretsDirectory: dir });

    const list = listModelProviders(dir);
    expect(list.map((provider) => provider.id).sort()).toEqual([
      "anthropic",
      "cerebras",
      "claude-sub",
      "codex",
      "gemini",
      "grok",
      "groq",
      "local",
      "mistral",
      "openai",
      "openrouter",
      "workersai",
      "zhipu",
    ]);
    expect(list.find((provider) => provider.id === "codex")?.connected).toBe(
      true,
    );
    expect(list.find((provider) => provider.id === "openai")?.connected).toBe(
      false,
    );
  });

  it("connects a provider: persists it and re-registers it", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    initModelRegistry({ secretsDirectory: dir });

    connectModelProvider({ secretsDirectory: dir }, "openai", {
      apiKey: "sk-new",
      model: "gpt-4o-mini",
    });

    expect(getModelRegistry().get("openai")).not.toBeNull();
    const openai = listModelProviders(dir).find(
      (provider) => provider.id === "openai",
    );
    expect(openai?.connected).toBe(true);
    expect(openai?.model).toBe("gpt-4o-mini");
    const saved = JSON.parse(
      readFileSync(resolve(dir, "model-providers.json"), "utf8"),
    ) as { openai?: { apiKey?: string } };
    expect(saved.openai?.apiKey).toBe("sk-new");
  });

  it("refuses to connect Codex here (it uses its own CLI login)", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    expect(() =>
      connectModelProvider({ secretsDirectory: dir }, "codex", {
        apiKey: "x",
      }),
    ).toThrow();
  });

  it("sets a connected provider as the default and marks it", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    initModelRegistry({ secretsDirectory: dir });
    connectModelProvider({ secretsDirectory: dir }, "openai", { apiKey: "sk" });

    setDefaultModelProvider({ secretsDirectory: dir }, "openai");

    expect(getModelRegistry().default().id).toBe("openai");
    const list = listModelProviders(dir);
    expect(list.find((provider) => provider.id === "openai")?.isDefault).toBe(
      true,
    );
    expect(list.find((provider) => provider.id === "codex")?.isDefault).toBe(
      false,
    );
    const saved = JSON.parse(
      readFileSync(resolve(dir, "model-default.json"), "utf8"),
    ) as { id?: string };
    expect(saved.id).toBe("openai");
  });

  it("refuses to default to a provider that is not connected", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    initModelRegistry({ secretsDirectory: dir });
    expect(() =>
      setDefaultModelProvider({ secretsDirectory: dir }, "openai"),
    ).toThrow();
  });

  // 🔴 Connecting adds a backend; it never re-points a row the Owner has
  // already answered. The picture slot learnt this the hard way — it used to be
  // written straight from the Cloudflare form, so saving a token switched
  // Drawing to Workers AI over the Owner's own choice, every single time.
  it("fills an empty engine slot on connect and never overwrites a chosen one", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    const stored = () =>
      JSON.parse(readFileSync(resolve(dir, "model-providers.json"), "utf8")) as {
        imageOutput?: { provider?: string };
        vision?: { provider?: string };
      };

    connectModelProvider({ secretsDirectory: dir }, "zhipu", { apiKey: "sk-z" });
    expect(stored().imageOutput?.provider).toBe("zhipu");
    expect(stored().vision?.provider).toBe("zhipu");

    // A second capable backend arrives. Both slots are answered already, so
    // both stay where the Owner left them.
    connectModelProvider({ secretsDirectory: dir }, "openai", { apiKey: "sk-o" });
    expect(stored().imageOutput?.provider).toBe("zhipu");
    expect(stored().vision?.provider).toBe("zhipu");
  });
});

describe("resolveProvider (per-chat pinning)", () => {
  it("uses the pinned provider, else falls back to the default", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-models-"));
    temporaryDirectories.push(dir);
    writeFileSync(
      resolve(dir, "model-providers.json"),
      JSON.stringify({ openai: { apiKey: "sk-x" } }),
    );
    initModelRegistry({ secretsDirectory: dir });

    // Unset / unknown -> the registry default (Codex here).
    expect(resolveProvider(null).id).toBe("codex");
    expect(resolveProvider(undefined).id).toBe("codex");
    expect(resolveProvider("does-not-exist").id).toBe("codex");
    // A registered, pinned provider is used as-is.
    expect(resolveProvider("openai").id).toBe("openai");
  });
});
