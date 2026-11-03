/* global Response, Request, URLSearchParams */
import test from "node:test";
import assert from "node:assert/strict";
import { createRelayVault } from "../vault.mjs";
import { createRelayConnection } from "../connect.mjs";
import { requestJSON } from "../protocol.mjs";
import { validateReturn } from "../return.mjs";
const origin = "https://app.example",
  relay = "https://relay.example",
  ctx = {
    version: 1,
    client_origin: origin,
    return_uri: origin + "/return",
    scope: "a".repeat(64),
    session_binding: "b".repeat(64),
    relay_origin: relay,
  };
function fixture() {
  let row = null,
    c = { ...ctx },
    clock = 1000;
  const store = {
    transact: async (f) => {
      const n = f(globalThis.structuredClone(row));
      if (n.write !== undefined) row = globalThis.structuredClone(n.write);
      return n.result;
    },
  };
  const vault = createRelayVault(store),
    calls = [];
  const f = {
    store,
    vault,
    calls,
    setContext: (x) => {
      c = x;
    },
    advance: (n) => {
      clock += n;
    },
  };
  f.remote = async () =>
    Response.json({
      version: 1,
      token: "fixture-only-key",
      profile_id: "app",
      profile_name: "App",
      key_version: 1,
    });
  f.connection = createRelayConnection({
    vault,
    authorize: async () => c,
    clientName: "Any App",
    returnPath: "/return",
    origin,
    now: () => clock,
    fetcher: async (u, o) => {
      calls.push({ u, o });
      return f.remote(u, o);
    },
  });
  return f;
}
test("one generic connection supports configured or per-start origin without app-specific protocol", async () => {
  for (const explicit of [false, true]) {
    const f = fixture(),
      s = await f.connection.start(explicit ? relay : undefined);
    assert.equal(s.fields.client_name, "Any App");
    assert.equal(f.calls.length, 0);
    const saved = (await f.vault.read()).data.pending;
    assert.equal(JSON.stringify(s).includes(saved.verifier), false);
    await f.connection.complete({
      code: "c".repeat(43),
      state: s.fields.state,
    });
    assert.equal(
      (await f.vault.read()).data.connection.token,
      "fixture-only-key",
    );
    assert.equal(f.calls[0].o.credentials, "omit");
    assert.equal(f.calls[0].o.redirect, "error");
    await assert.rejects(
      f.connection.complete({ code: "c".repeat(43), state: s.fields.state }),
    );
    assert.equal(f.calls.length, 1);
  }
});
test("wrong state, changed session, company and expired proof fail before exchange", async () => {
  for (const kind of ["state", "session", "company", "expiry"]) {
    const f = fixture(),
      s = await f.connection.start();
    if (kind === "session")
      f.setContext({ ...ctx, session_binding: "d".repeat(64) });
    if (kind === "company") f.setContext({ ...ctx, scope: "d".repeat(64) });
    if (kind === "expiry") f.advance(400000);
    await assert.rejects(
      f.connection.complete({
        code: "c".repeat(43),
        state: kind === "state" ? "x".repeat(43) : s.fields.state,
      }),
    );
    assert.equal(f.calls.length, 0);
  }
});
test("vault preserves arbitrary app journals on disconnect and invalidates old handles on identity change", async () => {
  const f = fixture();
  await f.vault.open(ctx.scope);
  await f.vault.update((d) => {
    d.s32Runs = { one: { status: "unknown" } };
    d.custom = { business: true };
    d.connection = { token: "test", attempts: { a: { status: "unknown" } } };
  });
  await f.vault.forgetConnection();
  const d = (await f.vault.read()).data;
  assert.equal(d.connection, null);
  assert.equal(d.custom.business, true);
  assert.equal(d.s32Runs.one.status, "unknown");
  assert.equal(d.attempts.a.status, "unknown");
  const other = createRelayVault(f.store);
  await other.open("f".repeat(64));
  await assert.rejects(f.vault.read());
});
test("parallel exchange consumes proof once", async () => {
  const f = fixture(),
    s = await f.connection.start();
  const r = await Promise.allSettled([
    f.connection.complete({ code: "c".repeat(43), state: s.fields.state }),
    f.connection.complete({ code: "c".repeat(43), state: s.fields.state }),
  ]);
  assert.equal(r.filter((v) => v.status === "fulfilled").length, 1);
  assert.equal(f.calls.length, 1);
});
test("bounded transport rejects token echo and unknown dispatch without leaking diagnostics", async () => {
  await assert.rejects(
    requestJSON(
      relay,
      {},
      {
        secret: "fixture-key",
        run: true,
        fetcher: async () => Response.json({ text: "fixture-key" }),
      },
    ),
    (e) => e.code === "unsafe_response" && e.unknown,
  );
  await assert.rejects(
    requestJSON(
      relay,
      {},
      {
        run: true,
        fetcher: async () => {
          throw Error("private detail");
        },
      },
    ),
    (e) => e.unknown && !e.message.includes("private"),
  );
  await assert.rejects(
    requestJSON(
      relay,
      {},
      {
        limit: 10,
        fetcher: async () => Response.json({ big: "x".repeat(100) }),
      },
    ),
    (e) => e.code === "response_too_large",
  );
});
test("body deadline covers a stalled stream", async () => {
  const response = new Response(new globalThis.ReadableStream());
  await assert.rejects(
    requestJSON(
      relay,
      {},
      { run: true, timeoutMs: 15, fetcher: async () => response },
    ),
    (e) => e.unknown,
  );
});
test("shared return validation rejects wrong origin, duplicate fields and oversized forms", async () => {
  const body = new URLSearchParams({
    code: "c".repeat(43),
    state: "s".repeat(43),
  }).toString();
  const make = (text, source = relay) =>
    new Request(origin + "/return", {
      method: "POST",
      headers: {
        origin: source,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: text,
    });
  assert.equal(
    (
      await validateReturn(make(body), {
        origin,
        relayOrigin: relay,
        returnPath: "/return",
      })
    ).state,
    "s".repeat(43),
  );
  for (const [b, o] of [
    [body, "https://evil.example"],
    [body + "&state=" + "s".repeat(43), relay],
    ["x".repeat(3000), relay],
  ])
    await assert.rejects(
      validateReturn(make(b, o), {
        origin,
        relayOrigin: relay,
        returnPath: "/return",
      }),
    );
});
import { createRelayClient } from "../client.mjs";
test("same run accepts every implemented capability with unchanged per-call requirements", async () => {
  const calls = [];
  const client = createRelayClient({
    connection: {
      read: async () => ({
        data: { connection: { relay_origin: relay, token: "synthetic-key" } },
      }),
    },
    fetcher: async (u, o) => {
      calls.push(JSON.parse(o.body));
      return Response.json({ ok: true });
    },
  });
  for (const capability of [
    "text_analysis",
    "structured_output",
    "vision_analysis",
    "document_analysis",
    "web_search",
    "research",
  ]) {
    const request = {
      engine: "openai-cli",
      model: "fixture",
      capability,
      query: "synthetic",
      allowed_domains: ["example.com"],
      max_results: 2,
      files: [],
      research: { allowed_tools: [] },
    };
    await client.run(request);
    assert.deepEqual(calls.at(-1), request);
  }
  assert.equal(calls.length, 6);
});

test("API providers use the same scoped client and redact provider-key echoes", async () => {
  const calls = [],
    key = "fixture-provider-key";
  const connection = {
    read: async () => ({
      data: { connection: { relay_origin: relay, token: "fixture-app-token" } },
    }),
  };
  const client = createRelayClient({
    connection,
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ connected: true });
    },
  });
  await client.providers();
  await client.connectProvider({ provider: "openai", apiKey: key });
  await client.disconnectProvider({
    provider: "openai",
    expectedRevision: "revision",
  });
  assert.equal(calls[0].url, relay + "/v1/relay/providers");
  assert.equal(calls[1].init.credentials, "omit");
  assert.equal(JSON.parse(calls[1].init.body).api_key, key);
  assert.equal(calls[2].init.method, "DELETE");
  const unsafe = createRelayClient({
    connection,
    fetcher: async () => Response.json({ error: key }),
  });
  await assert.rejects(
    unsafe.connectProvider({ provider: "openai", apiKey: key }),
    (e) => e.code === "unsafe_response" && !e.message.includes(key),
  );
  let run;
  const paid = createRelayClient({
    connection,
    fetcher: async (url, init) => {
      run = JSON.parse(init.body);
      return Response.json({ text: "synthetic" });
    },
  });
  await paid.run({
    engine: "api-gemini",
    model: "fixture-model",
    capability: "structured_output",
    requirements: { max_output_tokens: 123 },
    prompt: "synthetic",
  });
  assert.equal(run.engine, "api-gemini");
  assert.equal(run.requirements.max_output_tokens, 123);
});

test("configured calls cannot override central choice and reject unbound or malformed replies", async () => {
  const valid = {
    contract_revision: "2.3",
    selection_source: "app_profile",
    routing_revision: "rev",
    engine: "api-openai",
    requested_model: "fixture",
    model: "fixture-2026-11-03",
    text: "synthetic",
    fallback_occurred: false,
  };
  const connection = {
    read: async () => ({
      data: { connection: { relay_origin: relay, token: "synthetic-key" } },
    }),
  };
  let wire;
  for (const patch of [
    null,
    { engine: 4 },
    { model: "other" },
    { routing_revision: "old" },
    { selection_source: "client" },
    { fallback_occurred: true },
  ]) {
    const c = createRelayClient({
      connection,
      fetcher: async (_, init) => {
        wire = JSON.parse(init.body);
        return Response.json({ ...valid, ...patch });
      },
    });
    const run = c.runConfigured({
      capability: "text_analysis",
      prompt: "synthetic",
      engine: "app-override",
      model: "override",
      effort: "high",
      routing_revision: "rev",
    });
    if (patch)
      await assert.rejects(
        run,
        (e) => e.unknown === true && e.code === "response_binding_mismatch",
      );
    else assert.equal((await run).model, valid.model);
    assert.equal(wire.selection, "configured");
    assert.equal(wire.engine, undefined);
    assert.equal(wire.model, undefined);
    assert.equal(wire.effort, undefined);
  }
});
test("configured selection uses each App capability and exposes paid route without probing a model", async () => {
  const paths = [];
  const c = createRelayClient({
    connection: {
      read: async () => ({
        data: { connection: { relay_origin: relay, token: "synthetic-key" } },
      }),
    },
    fetcher: async (url) => {
      paths.push(url);
      return Response.json(
        url.endsWith("/profile")
          ? {
              mode: "dedicated",
              configured_selection: true,
              engines: [{ engine: "api-gemini", login_status: "connected" }],
            }
          : {
              revision: "r1",
              primary: { engine: "api-gemini", model: "main" },
              overrides: {
                research: { engine: "api-gemini", model: "research" },
              },
            },
      );
    },
  });
  const r = await c.configuredSelection("research");
  assert.equal(r.model, "research");
  assert.equal(r.may_charge, true);
  assert.equal(paths.length, 2);
  assert.ok(paths.every((p) => !p.endsWith("/run")));
});
