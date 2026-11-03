import test from "node:test";
import assert from "node:assert/strict";
import { createAIClient } from "../routes.mjs";
import { createDirectClient } from "../direct.mjs";
function fixture() {
  const receipts = new Map(),
    calls = [],
    settled = [],
    switches = [];
  const journal = {
    reserve: async (id, meta) => {
      if (receipts.has(id)) return false;
      receipts.set(id, { ...meta, state: "pending" });
      return true;
    },
    settle: async (id, value) => receipts.set(id, value),
  };
  const f = {
    receipts,
    calls,
    settled,
    switches,
    journal,
    vaenyx: {
      profile: async () => ({}),
      run: async (request) => {
        calls.push({ route: "vaenyx", request });
        return { engine: "api-gemini", model: "fixture-central", text: "ok" };
      },
    },
    direct: {
      run: async (request) => {
        calls.push({ route: "direct", request });
        return { engine: request.engine, model: request.model, text: "ok" };
      },
    },
    reserveFallback: async () => ({
      id: "reservation",
      authorized: true,
      bounded: true,
    }),
    settleFallback: async (id, result) => settled.push({ id, ...result }),
    onSwitch: (detail) => switches.push(detail),
  };
  return f;
}
const request = {
  task: "synthetic",
  capability: "structured_output",
  prompt: "synthetic prompt",
  requirements: { max_output_tokens: 123 },
};
const policy = {
  enabled: true,
  paidAuthorized: true,
  budgetCents: 20,
  maxCostCents: 10,
  request: { engine: "api-openai", model: "fixture-paid" },
};
test("Vaenyx uses its App selection; Direct API remains independent", async () => {
  const f = fixture(),
    client = createAIClient(f);
  await client.run({ route: "vaenyx", request, requestId: "one" });
  assert.equal(f.calls[0].request.selection, "configured");
  assert.equal(f.calls[0].request.model, undefined);
  f.vaenyx.profile = async () => {
    throw Error("offline");
  };
  await client.run({
    route: "direct",
    request: { ...request, engine: "api-openai", model: "fixture-paid" },
    requestId: "two",
  });
  assert.equal(f.calls[1].route, "direct");
});
test("no automatic paid fallback by default, even for a known pre-dispatch refusal", async () => {
  const f = fixture();
  f.vaenyx.profile = async () => {
    throw Object.assign(Error("offline"), {
      code: "unreachable",
      unknown: false,
    });
  };
  await assert.rejects(
    createAIClient(f).run({ route: "vaenyx", request, requestId: "one" }),
  );
  assert.equal(f.calls.length, 0);
  assert.equal(f.switches.length, 0);
});
test("paid backup needs explicit authorization, a selected model and bounded reserved budget", async () => {
  for (const invalid of [
    { ...policy, paidAuthorized: false },
    { ...policy, budgetCents: 0 },
    { ...policy, maxCostCents: null },
    { ...policy, request: {} },
  ]) {
    const f = fixture();
    f.vaenyx.profile = async () => {
      throw Object.assign(Error("offline"), { unknown: false });
    };
    await assert.rejects(
      createAIClient(f).run({
        route: "vaenyx",
        request,
        requestId: "one",
        fallback: invalid,
      }),
      (e) => e.code === "paid_fallback_not_authorized",
    );
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  f.vaenyx.profile = async () => {
    throw Object.assign(Error("offline"), { unknown: false });
  };
  f.reserveFallback = async () => ({ authorized: false });
  await assert.rejects(
    createAIClient(f).run({
      route: "vaenyx",
      request,
      requestId: "one",
      fallback: policy,
    }),
    (e) => e.code === "paid_fallback_budget_unavailable",
  );
  assert.equal(f.calls.length, 0);
});
test("authorized offline fallback preserves task requirements and names the actual paid model", async () => {
  const f = fixture();
  f.vaenyx.profile = async () => {
    throw Object.assign(Error("offline"), {
      code: "unreachable",
      unknown: false,
    });
  };
  const result = await createAIClient(f).run({
    route: "vaenyx",
    request,
    requestId: "one",
    fallback: policy,
  });
  assert.equal(result.fallback_occurred, true);
  assert.match(result.fallback_disclosure, /api-openai \/ fixture-paid/);
  assert.equal(f.calls[0].request.prompt, request.prompt);
  assert.deepEqual(f.calls[0].request.requirements, request.requirements);
  assert.equal(f.switches.length, 1);
  assert.equal(f.settled[0].state, "completed");
});
test("unknown outcomes never start a backup and durable receipts prevent a second dispatch", async () => {
  const f = fixture();
  f.vaenyx.run = async (request) => {
    f.calls.push({ route: "vaenyx", request });
    throw Object.assign(Error("lost"), {
      unknown: true,
      code: "outcome_unknown",
    });
  };
  await assert.rejects(
    createAIClient(f).run({
      route: "vaenyx",
      request,
      requestId: "one",
      fallback: policy,
    }),
  );
  await assert.rejects(
    createAIClient(f).run({
      route: "vaenyx",
      request,
      requestId: "one",
      fallback: policy,
    }),
    (e) => e.code === "existing_receipt",
  );
  assert.equal(f.calls.length, 1);
  assert.equal([...f.receipts.values()][0].state, "unknown");
});
test("Direct client uses the shared adapter and never reaches a Vaenyx URL", async () => {
  const calls = [];
  const client = createDirectClient({
    provider: "openai",
    apiKey: "synthetic-provider-key",
    fetcher: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return globalThis.Response.json({
        status: "completed",
        model: "fixture-paid",
        usage: { input_tokens: 1, output_tokens: 2 },
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: '{"ok":true}' }],
          },
        ],
      });
    },
  });
  const result = await client.run({
    ...request,
    engine: "api-openai",
    model: "fixture-paid",
  });
  assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
  assert.equal(calls[0].body.max_output_tokens, 123);
  assert.deepEqual(result.structured, { ok: true });
  assert.equal(result.usage.output_tokens, 2);
});
test("post-dispatch provider failures are unknown and retain no secret in the public error", async () => {
  const client = createDirectClient({
    provider: "gemini",
    apiKey: "synthetic-provider-key",
    fetcher: async () =>
      globalThis.Response.json({
        candidates: [{ finishReason: "MAX_TOKENS" }],
      }),
  });
  await assert.rejects(
    client.run({ ...request, model: "fixture-paid" }),
    (e) => e.unknown === true && !e.message.includes("synthetic-provider-key"),
  );
});

test("changing model or route cannot bypass an unresolved task receipt", async () => {
  const f = fixture();
  f.vaenyx.run = async () => {
    f.calls.push({ route: "vaenyx" });
    throw Object.assign(Error("lost"), { unknown: true });
  };
  const c = createAIClient(f);
  await assert.rejects(
    c.run({ route: "vaenyx", request, requestId: "stable" }),
  );
  await assert.rejects(
    c.run({
      route: "direct",
      request: { ...request, model: "other" },
      requestId: "stable",
    }),
    (e) => e.code === "existing_receipt",
  );
  assert.equal(f.calls.length, 1);
});
test("unknown HTTP 429 is never treated as a safe automatic backup signal", async () => {
  const { safeFailure } = await import("../protocol.mjs");
  assert.equal(
    safeFailure(429, { error: "RELAY_RATE_LIMITED" }, true).unknown,
    true,
  );
});
test("central selection strips stale App engine/model settings", async () => {
  const f = fixture();
  await createAIClient(f).run({
    route: "vaenyx",
    request: { ...request, engine: "old", model: "old", effort: "high" },
    requestId: "route",
  });
  assert.equal(f.calls[0].request.engine, undefined);
  assert.equal(f.calls[0].request.model, undefined);
  assert.equal(f.calls[0].request.effort, undefined);
});

test("a later refusal after any execution started never permits another billed route", async () => {
  const { safeFailure } = await import("../protocol.mjs");
  assert.equal(
    safeFailure(
      403,
      { error: "RELAY_CAPABILITY_UNSUPPORTED", execution_started: true },
      true,
    ).unknown,
    true,
  );
});
