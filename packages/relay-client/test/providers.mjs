/* global Response */
import test from "node:test";
import assert from "node:assert/strict";
import { createDirectClient } from "../direct.mjs";
const wires = {
  zai: "chat",
  deepseek: "chat",
  gemini: "gemini",
  groq: "chat",
  openai: "responses",
  anthropic: "anthropic",
  grok: "responses",
  openrouter: "chat",
  mistral: "chat",
  cerebras: "chat",
  zhipu: "chat",
};
const reply = (wire, model, text = '{"ok":true}') =>
  wire === "responses"
    ? {
        status: "completed",
        model,
        output: [{ type: "message", content: [{ type: "output_text", text }] }],
      }
    : wire === "anthropic"
      ? { model, stop_reason: "end_turn", content: [{ type: "text", text }] }
      : wire === "gemini"
        ? {
            modelVersion: model,
            candidates: [
              { finishReason: "STOP", content: { parts: [{ text }] } },
            ],
          }
        : {
            model,
            choices: [{ finish_reason: "stop", message: { content: text } }],
          };
test("all provider presets share one portable adapter, exact model and explicit requirements", async () => {
  for (const [provider, wire] of Object.entries(wires)) {
    const calls = [],
      client = createDirectClient({
        provider,
        apiKey: "SYNTHETIC-KEY",
        fetcher: async (url, init) => {
          calls.push({ url, init });
          return Response.json(
            init.method === "GET"
              ? wire === "gemini"
                ? {
                    models: [
                      {
                        name: "models/synthetic-model",
                        supportedGenerationMethods: ["generateContent"],
                      },
                    ],
                  }
                : { data: [{ id: "synthetic-model" }] }
              : reply(wire, "synthetic-model"),
          );
        },
      });
    assert.equal((await client.models())[0].id, "synthetic-model");
    const out = await client.run({
      model: "synthetic-model",
      capability: "structured_output",
      prompt: "JSON only",
      requirements: { max_output_tokens: 432 },
    });
    assert.deepEqual(out.structured, { ok: true });
    assert.equal(out.requested_model, "synthetic-model");
    assert.equal(calls[1].init.redirect, "manual");
    assert.equal(calls[1].url.includes("SYNTHETIC-KEY"), false);
    const body = JSON.parse(calls[1].init.body);
    assert.equal(
      wire === "gemini"
        ? body.generationConfig.maxOutputTokens
        : wire === "responses"
          ? body.max_output_tokens
          : body.max_tokens,
      432,
    );
  }
});
test("Google audio input uses the same adapter without a second App implementation", async () => {
  let body;
  const c = createDirectClient({
    provider: "gemini",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async (_, init) => {
      body = JSON.parse(init.body);
      return Response.json(reply("gemini", "fixture"));
    },
  });
  await c.run(
    {
      model: "fixture",
      capability: "structured_output",
      prompt: "Return JSON for synthetic audio",
    },
    {
      attachments: [
        { name: "sample.webm", mime: "audio/webm", base64: "QUJD" },
      ],
    },
  );
  assert.deepEqual(body.contents[0].parts[1].inlineData, {
    mimeType: "audio/webm",
    data: "QUJD",
  });
});
test("search has the common evidence envelope and never trusts a URL in model prose", async () => {
  const c = createDirectClient({
    provider: "openai",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async () =>
      Response.json({
        ...reply(
          "responses",
          "fixture",
          "A synthetic answer with https://invented.example",
        ),
        output: [
          {
            type: "web_search_call",
            action: {
              sources: [
                {
                  url: "https://example.com/source",
                  title: "Synthetic source",
                },
              ],
            },
          },
          {
            type: "message",
            content: [{ type: "output_text", text: "Synthetic answer" }],
          },
        ],
      }),
  });
  const r = await c.run({
    model: "fixture",
    capability: "web_search",
    query: "synthetic",
    allowed_domains: ["example.com"],
  });
  assert.deepEqual(r.citations, ["https://example.com/source"]);
  assert.equal(r.results[0].title, "Synthetic source");
  const ungrounded = createDirectClient({
    provider: "openai",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async () =>
      Response.json(reply("responses", "fixture", "https://invented.example")),
  });
  await assert.rejects(
    ungrounded.run({
      model: "fixture",
      capability: "web_search",
      query: "synthetic",
    }),
    (e) => e.unknown && e.code === "RELAY_VERIFIABLE_SOURCES_REQUIRED",
  );
});
test("native dated aliases report their actual snapshot; unrelated models fail as unknown", async () => {
  const c = createDirectClient({
    provider: "openai",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async () =>
      Response.json(reply("responses", "synthetic-model-2026-11-03")),
  });
  const out = await c.run({
    model: "synthetic-model",
    capability: "structured_output",
    prompt: "synthetic",
  });
  assert.equal(out.model, "synthetic-model-2026-11-03");
  assert.equal(out.requested_model, "synthetic-model");
  const other = createDirectClient({
    provider: "openai",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async () => Response.json(reply("responses", "unrelated")),
  });
  await assert.rejects(
    other.run({
      model: "synthetic-model",
      capability: "structured_output",
      prompt: "synthetic",
    }),
    (e) => e.unknown,
  );
});
test("redirects and stalled native responses are bounded and never forwarded or retried", async () => {
  let calls = 0;
  const redirect = createDirectClient({
    provider: "openai",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async () => {
      calls++;
      return new Response(null, {
        status: 302,
        headers: { location: "https://other.invalid" },
      });
    },
  });
  await assert.rejects(
    redirect.run({
      model: "fixture",
      capability: "text_analysis",
      prompt: "synthetic",
    }),
    (e) => e.unknown,
  );
  assert.equal(calls, 1);
  const stalled = createDirectClient({
    provider: "openai",
    apiKey: "SYNTHETIC-KEY",
    timeoutMs: 15,
    fetcher: async () => new Response(new globalThis.ReadableStream()),
  });
  await assert.rejects(
    stalled.run({
      model: "fixture",
      capability: "text_analysis",
      prompt: "synthetic",
    }),
    (e) => e.unknown,
  );
});

test("few-shot Gemini messages retain roles and media through the shared adapter", async () => {
  let body;
  const c = createDirectClient({
    provider: "gemini",
    apiKey: "SYNTHETIC-KEY",
    fetcher: async (_, init) => {
      body = JSON.parse(init.body);
      return Response.json(reply("gemini", "fixture"));
    },
  });
  await c.run(
    { model: "fixture", capability: "structured_output", prompt: "ignored" },
    {
      messages: [
        { role: "user", text: "Example question" },
        { role: "assistant", text: '{"ok":false}' },
        {
          role: "user",
          text: "Now classify",
          files: [{ name: "sample", mime: "image/png", base64: "QUJD" }],
        },
      ],
    },
  );
  assert.equal(body.contents[1].role, "model");
  assert.equal(body.contents[1].parts[0].text, '{"ok":false}');
  assert.deepEqual(body.contents[2].parts[1].inlineData, {
    mimeType: "image/png",
    data: "QUJD",
  });
});
