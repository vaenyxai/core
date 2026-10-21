import { afterEach, describe, expect, it, vi } from "vitest";

const wire = vi.hoisted(() => ({
  requests: [] as { method: string; params: Record<string, unknown> }[],
  starts: [] as string[][],
  echoedModel: null as string | null,
  status: "completed",
  error: "",
  itemType: "agentMessage",
}));
vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  // No credential, profile, filesystem, or real subprocess is used in this test.
  existsSync: () => true,
  mkdirSync: () => undefined,
}));
vi.mock("../src/modules/core/relay-usage.js", () => ({
  noteCoreUsage: vi.fn(),
}));
vi.mock("node:child_process", async () => {
  const { EventEmitter } = await import("node:events");
  const { PassThrough, Writable } = await import("node:stream");
  return {
    spawnSync: (_command: unknown, args: string[]) => ({
      status: 0,
      stdout: args.includes("--version")
        ? "codex 0.0.0-test"
        : "Logged in using ChatGPT",
      stderr: "",
    }),
    spawn: (_command: unknown, args: string[]) => {
      wire.starts.push(args);
      const child = new EventEmitter();
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      let model = "account-default";
      const send = (value: unknown) =>
        stdout.write(JSON.stringify(value) + "\n");
      const stdin = new Writable({
        write(chunk, _encoding, done) {
          const message = JSON.parse(String(chunk));
          wire.requests.push(message);
          queueMicrotask(() => {
            if (message.method === "initialize")
              send({ id: message.id, result: {} });
            if (message.method === "thread/start") {
              model =
                wire.echoedModel ?? message.params.model ?? "account-default";
              send({
                id: message.id,
                result: { model, thread: { id: "synthetic-thread" } },
              });
            }
            if (message.method === "turn/start") {
              send({
                method: "item/completed",
                params: {
                  item: {
                    type: wire.itemType,
                    phase: "final_answer",
                    text: "PONG " + model,
                  },
                },
              });
              send({
                method: "turn/completed",
                params: {
                  turn: {
                    status: wire.status,
                    error: { message: wire.error },
                  },
                },
              });
            }
          });
          done();
        },
      });
      return Object.assign(child, {
        stdout,
        stderr,
        stdin,
        kill: () => {
          stdout.end();
          stderr.end();
          return true;
        },
      });
    },
  };
});

// Never fall through to command discovery on the real machine.
vi.stubEnv("VAENYX_CODEX_COMMAND", "synthetic-codex");
vi.stubEnv("VAENYX_CODEX_HOME", "synthetic-codex-home");
const { CodexProvider } =
  await import("../src/modules/models/codex-provider.js");
const { withPinnedModel } = await import("../src/modules/models/registry.js");
const message = [{ role: "owner" as const, content: "Reply PONG" }];

afterEach(() => {
  wire.requests.length = 0;
  wire.echoedModel = null;
  wire.status = "completed";
  wire.error = "";
  wire.itemType = "agentMessage";
});

describe("selected model reaches Codex on every transport", () => {
  it.each([
    ["chat", {}],
    ["Method", { allowWeb: false }],
    ["quick", { quick: true }],
  ])(
    "uses the saved selection, then a per-call override on %s",
    async (_lane, options) => {
      const provider = new CodexProvider({ model: "owner-choice" });
      const first = await provider.sendChat(message, undefined, options);
      const second = await provider.sendChat(message, undefined, {
        ...options,
        model: "screen-choice",
      });
      expect(first.model).toBe("owner-choice");
      expect(second.model).toBe("screen-choice");
      expect(
        wire.requests
          .filter((r) => r.method === "thread/start")
          .map((r) => r.params.model),
      ).toEqual(["owner-choice", "screen-choice"]);
    },
  );

  it("honours an explicit Text-row model across Method and quick work", async () => {
    const provider = withPinnedModel(
      new CodexProvider({ model: "main-choice" }),
      "text-choice",
    );
    expect(
      (await provider.sendChat(message, undefined, { allowWeb: false })).model,
    ).toBe("text-choice");
    expect(
      (await provider.sendChat(message, undefined, { quick: true })).model,
    ).toBe("text-choice");
    expect(
      wire.starts.filter((args) => !args.includes('web_search="live"')).length,
    ).toBeGreaterThan(0);
  });

  it("leaves an unpinned model to the account", async () => {
    const answer = await new CodexProvider().sendChat(message, undefined, {
      allowWeb: false,
    });
    expect(answer.model).toBe("account-default");
    expect(
      wire.requests.find((r) => r.method === "thread/start")?.params,
    ).not.toHaveProperty("model");
  });

  it.each([{}, { allowWeb: false }, { quick: true }])(
    "refuses a silent model substitution (%j)",
    async (options) => {
      wire.echoedModel = "another-model";
      await expect(
        new CodexProvider({ model: "owner-choice" }).sendChat(
          message,
          undefined,
          options,
        ),
      ).rejects.toThrow("MODEL_NOT_HONOURED");
      expect(wire.requests.some((r) => r.method === "turn/start")).toBe(false);
    },
  );

  it.each([{}, { allowWeb: false }])(
    "rejects provider failure even after partial output (%j)",
    async (options) => {
      wire.status = "failed";
      wire.error =
        "The model owner-choice is not supported when using Codex with this account.";
      await expect(
        new CodexProvider({ model: "owner-choice" }).sendChat(
          message,
          undefined,
          options,
        ),
      ).rejects.toThrow("RELAY_MODEL_NOT_AVAILABLE:openai-cli:owner-choice");
    },
  );

  it("identifies an expired login without exposing the provider payload", async () => {
    wire.status = "failed";
    wire.error = "Your refresh token has expired. secret=not-for-the-ui";
    await expect(new CodexProvider().sendChat(message)).rejects.toThrow(
      /^CODEX_NOT_LOGGED_IN$/,
    );
  });

  it("rejects interrupted output", async () => {
    wire.status = "interrupted";
    await expect(new CodexProvider().sendChat(message)).rejects.toThrow(
      "CODEX_TURN_CANCELLED",
    );
  });

  it("does not grant web tools to a Method while forwarding its model", async () => {
    wire.itemType = "webSearch";
    await expect(
      new CodexProvider({ model: "owner-choice" }).sendChat(
        message,
        undefined,
        { allowWeb: false },
      ),
    ).rejects.toThrow("CODEX_CHAT_BOUNDARY_VIOLATION");
  });
});
