import {
  readAppRouting,
  saveAppRouting,
  resolveAppRoute,
} from "../src/modules/core/relay-routing.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { afterEach, describe, it, expect, vi } from "vitest";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import {
  saveApiConnection,
  readApiConnection,
  removeApiConnection,
} from "../src/modules/core/relay-api-config.js";
import {
  apiCatalogue,
  apiProfileStatus,
  runApiRelay,
} from "../src/modules/core/relay-api.js";
import { writeRelayConfig } from "../src/modules/core/relay.js";
import { writeGlobalCapabilities } from "../src/modules/core/capabilities.js";
import { providerJSON } from "../src/modules/core/relay-api-wire.js";

const roots: string[] = [],
  dbs: DatabaseHandle[] = [];
const A = "11111111-2222-4333-8444-555555555555",
  B = "22222222-2222-4333-8444-555555555555";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-relay-api-"));
  roots.push(root);
  const db = createDatabase({
    dataDirectory: root,
    databasePath: join(root, "fixture.db"),
    backupsDirectory: join(root, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  dbs.push(db);
  for (const id of [A, B])
    db.sqlite
      .prepare(
        "INSERT INTO app_profiles(id,name,token_hash,token_prefix,kind) VALUES (?,? ,?,'fixture','relay')",
      )
      .run(id, id, id);
  writeRelayConfig(db, { enabled: true });
  return { db, secrets: join(root, "secrets"), root };
}
afterEach(() => {
  vi.unstubAllGlobals();
  for (const db of dbs.splice(0)) db.close();
  for (const root of roots.splice(0)) {
    if (!root.startsWith(join(tmpdir(), "vaenyx-relay-api-")))
      throw Error("Unexpected fixture path");
    rmSync(root, { recursive: true, force: true });
  }
  delete process.env.VAENYX_DATA_DIR;
});
const request = {
  engine: "api-openai" as const,
  model: "fixture-model",
  capability: "structured_output" as const,
  task: "synthetic",
  prompt: 'Return {"ok":true}',
};
function mockProvider(
  calls: {
    url: string;
    body: Record<string, unknown> | null;
    authorization: string | null;
  }[],
  onRun?: () => void,
): typeof fetch {
  return async (input, init) => {
    const url = String(input),
      body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({
      url,
      body,
      authorization: new Headers(init?.headers).get("authorization"),
    });
    if (!url.startsWith("https://api.openai.com/v1/"))
      throw Error("Unexpected provider URL");
    if (!body) return Response.json({ data: [{ id: "fixture-model" }] });
    onRun?.();
    return Response.json({
      status: "completed",
      model: "fixture-model",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"ok":true}' }],
        },
      ],
    });
  };
}
describe("one central API Relay", () => {
  it("encrypts credentials, binds ciphertext to the exact App and invalidates replaced connections", () => {
    const { db, secrets } = fixture();
    const c = saveApiConnection(
      db,
      secrets,
      A,
      "openai",
      "synthetic-api-key-a",
    );
    const row = db.sqlite
      .prepare("SELECT value FROM instance_settings WHERE key=?")
      .get("relay.api." + A + ".openai") as { value: string };
    expect(row.value).not.toContain("synthetic-api-key-a");
    db.sqlite
      .prepare("INSERT INTO instance_settings(key,value) VALUES (?,?)")
      .run("relay.api." + B + ".openai", row.value);
    expect(readApiConnection(db, secrets, B, "openai")).toBeNull();
    expect(
      saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-b")
        .revision,
    ).not.toBe(c.revision);
    expect(JSON.stringify(apiProfileStatus(db, secrets, A))).not.toContain(
      "synthetic-api-key",
    );
  });
  it("uses the selected App key and exact model/requirements with no fallback", async () => {
    const { db, secrets } = fixture(),
      calls: {
        url: string;
        body: Record<string, unknown> | null;
        authorization: string | null;
      }[] = [];
    saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
    saveApiConnection(db, secrets, B, "openai", "synthetic-api-key-b");
    const result = await runApiRelay(
      db,
      secrets,
      A,
      {
        ...request,
        requirements: { max_output_tokens: 1234, temperature: 0.2 },
      },
      { fetcher: mockProvider(calls) },
    );
    expect(calls).toHaveLength(2);
    expect(calls[1]?.authorization).toBe("Bearer synthetic-api-key-a");
    expect(calls[1]?.body).toMatchObject({
      model: "fixture-model",
      max_output_tokens: 1234,
      temperature: 0.2,
      store: false,
    });
    expect(result.structured).toEqual({ ok: true });
    expect(result.fallback_occurred).toBe(false);
    expect(result.requested_model).toBe("fixture-model");
  });
  it("never uses another App or machine key when the selected connection is missing", async () => {
    const { db, secrets } = fixture();
    saveApiConnection(db, secrets, B, "openai", "synthetic-api-key-b");
    const fetcher = vi.fn();
    await expect(
      runApiRelay(db, secrets, A, request, { fetcher }),
    ).rejects.toThrow("RELAY_PROFILE_NOT_CONNECTED");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects missing and unavailable models and unsupported requirements before any model POST", async () => {
    const { db, secrets } = fixture(),
      calls: {
        url: string;
        body: Record<string, unknown> | null;
        authorization: string | null;
      }[] = [];
    saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
    const fetcher = mockProvider(calls);
    await expect(
      runApiRelay(
        db,
        secrets,
        A,
        { ...request, model: undefined },
        { fetcher },
      ),
    ).rejects.toThrow("RELAY_MODEL_REQUIRED");
    await expect(
      runApiRelay(
        db,
        secrets,
        A,
        { ...request, model: "invented-model" },
        { fetcher },
      ),
    ).rejects.toThrow("RELAY_MODEL_NOT_AVAILABLE");
    await expect(
      runApiRelay(
        db,
        secrets,
        A,
        { ...request, requirements: { invented: true } },
        { fetcher },
      ),
    ).rejects.toThrow("RELAY_REQUIREMENT_UNSUPPORTED");
    expect(calls.every((c) => c.body === null)).toBe(true);
  });
  it("discovers new model IDs from the live provider catalogue without source changes or assignment", async () => {
    const { db, secrets } = fixture();
    saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
    let model = "fixture-model";
    const fetcher: typeof fetch = async () =>
      Response.json({ data: [{ id: model }] });
    expect(
      (await apiCatalogue(db, secrets, A, true, fetcher)).find(
        (e) => e.engine === "api-openai",
      )?.models[0]?.id,
    ).toBe(model);
    model = "new-fixture-model";
    const current = (await apiCatalogue(db, secrets, A, true, fetcher)).find(
      (e) => e.engine === "api-openai",
    );
    expect(current?.models[0]?.id).toBe(model);
    expect(current?.default_model).toBeNull();
    expect(current?.models[0]?.verified).toEqual([]);
  });
  it("refuses a late result after API disconnect without retrying", async () => {
    const { db, secrets } = fixture(),
      calls: {
        url: string;
        body: Record<string, unknown> | null;
        authorization: string | null;
      }[] = [];
    saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
    await expect(
      runApiRelay(db, secrets, A, request, {
        fetcher: mockProvider(calls, () =>
          removeApiConnection(db, A, "openai"),
        ),
      }),
    ).rejects.toMatchObject({
      message: "RELAY_CONNECTION_CHANGED",
      started: true,
    });
    expect(calls.filter((c) => c.body)).toHaveLength(1);
  });
  it("does not accept a provider-key echo or expose provider error prose", async () => {
    const signal = AbortSignal.timeout(200);
    await expect(
      providerJSON(
        "https://api.openai.com/v1/responses",
        "synthetic-key",
        "responses",
        {},
        signal,
        async () => Response.json({ text: "synthetic-key" }),
      ),
    ).rejects.toThrow("RELAY_PROVIDER_RESPONSE_INVALID");
    await expect(
      providerJSON(
        "https://api.openai.com/v1/responses",
        "synthetic-key",
        "responses",
        {},
        signal,
        async () => new Response("sensitive provider prose", { status: 500 }),
      ),
    ).rejects.toThrow("RELAY_PROVIDER_HTTP_500");
  });
  it("preserves the real HTTP identity gate and exposes paid providers through the existing unified routes", async () => {
    const root = mkdtempSync(join(tmpdir(), "vaenyx-relay-api-"));
    roots.push(root);
    process.env.VAENYX_DATA_DIR = join(root, "data");
    const config = {
      repositoryRoot: root,
      host: "127.0.0.1",
      port: 0,
      version: "test",
      mode: "test",
      corsOrigins: [],
      dataDirectory: join(root, "data"),
      databasePath: join(root, "data", "fixture.db"),
      backupsDirectory: join(root, "backups"),
      libraryDirectory: join(root, "library"),
      routinesDirectory: join(root, "routines"),
      docsDirectory: join(root, "docs"),
      migrationsDirectory: resolve("migrations"),
      logLevel: "silent",
      webDistDirectory: join(root, "missing"),
      secretsDirectory: join(root, "secrets"),
      publish: null,
      googleOAuth: null,
      publishServiceUrl: null,
    } as AppConfig;
    const calls: {
      url: string;
      body: Record<string, unknown> | null;
      authorization: string | null;
    }[] = [];
    vi.stubGlobal("fetch", mockProvider(calls));
    const app = await buildApp(config);
    try {
      const setup = await app.inject({
        method: "POST",
        url: "/v1/setup",
        payload: { name: "Owner", password: "synthetic-long-password" },
      });
      const cookie = String(setup.headers["set-cookie"]).split(";")[0] ?? "";
      const created = await app.inject({
        method: "POST",
        url: "/v1/app-profiles",
        headers: { cookie },
        payload: { name: "Synthetic App", kind: "relay" },
      });
      const { profile, token } = created.json();
      const headers = {
        authorization: "Bearer " + token,
        "tailscale-user-login": "fixture@example.com",
      };
      expect(
        (await app.inject({ url: "/v1/relay/providers" })).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            url: "/v1/relay/providers",
            headers: { "tailscale-user-login": "fixture@example.com" },
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (await app.inject({ url: "/v1/relay/providers", headers })).json()
          .providers.length,
      ).toBe(11);
      expect(
        (
          await app.inject({
            url: "/v1/app-profiles/" + profile.id + "/api-providers",
            headers,
          })
        ).statusCode,
      ).toBe(401);
      const connected = await app.inject({
        method: "POST",
        url: "/v1/app-profiles/" + profile.id + "/api-providers",
        headers: { cookie },
        payload: {
          provider: "openai",
          api_key: "synthetic-api-key-a",
          expected_revision: null,
        },
      });
      expect(connected.statusCode, connected.body).toBe(200);
      expect(connected.body).not.toContain("synthetic-api-key-a");
      await app.inject({
        method: "PUT",
        url: "/v1/relay/settings",
        headers: { cookie },
        payload: { enabled: true },
      });
      const ran = await app.inject({
        method: "POST",
        url: "/v1/ai/run",
        headers,
        payload: request,
      });
      expect(ran.statusCode, ran.body).toBe(200);
      expect(ran.json().structured).toEqual({ ok: true });
      const profileState = await app.inject({
        url: "/v1/relay/profile",
        headers,
      });
      expect(
        profileState
          .json()
          .engines.find((e: { id: string }) => e.id === "api-openai").connected,
      ).toBe(true);
      const models = await app.inject({ url: "/v1/relay/models", headers });
      expect(models.statusCode, models.body).toBe(200);
      expect(
        models
          .json()
          .engines.find((e: { engine: string }) => e.engine === "api-openai")
          .models[0].verified[0].ok,
      ).toBe(true);
    } finally {
      await app.close();
    }
  });
  it("resolves each App's saved model independently and refuses stale or App-overridden choices", async () => {
    const { db, secrets } = fixture();
    saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
    saveApiConnection(db, secrets, B, "openai", "synthetic-api-key-b");
    const calls: {
      url: string;
      body: Record<string, unknown> | null;
      authorization: string | null;
    }[] = [];
    vi.stubGlobal("fetch", mockProvider(calls));
    await runApiRelay(db, secrets, A, {
      ...request,
      capability: "text_analysis",
    });
    await runApiRelay(db, secrets, B, {
      ...request,
      capability: "text_analysis",
    });
    const first = await saveAppRouting(db, secrets, A, {
      revision: null,
      primary: { engine: "api-openai", model: "fixture-model" },
      overrides: {},
    });
    const other = await saveAppRouting(db, secrets, B, {
      revision: null,
      primary: { engine: "api-openai", model: "fixture-model" },
      overrides: {},
    });
    expect(first.revision).not.toBe(other.revision);
    const resolved = resolveAppRoute(
      db,
      A,
      {
        task: "synthetic",
        capability: "structured_output",
        prompt: "test",
        selection: "configured",
      },
      secrets,
    );
    expect(resolved.request.engine).toBe("api-openai");
    expect(resolved.request.model).toBe("fixture-model");
    expect(() =>
      resolveAppRoute(
        db,
        A,
        { ...request, model: "App-overrode-model" },
        secrets,
      ),
    ).toThrow("RELAY_SELECTION_MANAGED");
    expect(() =>
      resolveAppRoute(db, A, { ...request, routing_revision: "old" }, secrets),
    ).toThrow("RELAY_ROUTING_CHANGED");
    expect(readAppRouting(db, B).revision).toBe(other.revision);
    await expect(
      saveAppRouting(
        db,
        secrets,
        A,
        { revision: first.revision, primary: null, overrides: {} },
        () => false,
      ),
    ).rejects.toThrow("RELAY_ROUTING_AUTHORITY_CHANGED");
    expect(readAppRouting(db, A).primary).not.toBeNull();
  });
  it("does not borrow another model's capability evidence when selecting a route", async () => {
    const { db, secrets } = fixture();
    saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
    vi.stubGlobal("fetch", mockProvider([]));
    await expect(
      saveAppRouting(db, secrets, A, {
        revision: null,
        primary: { engine: "api-openai", model: "fixture-model" },
        overrides: {},
      }),
    ).rejects.toThrow("RELAY_MODEL_TEST_REQUIRED");
    expect(readAppRouting(db, A).revision).toBeNull();
  });
});

it("keeps authorized local-file research available on an API model without exposing a file reference", async () => {
  const { db, secrets } = fixture();
  saveApiConnection(db, secrets, A, "openai", "synthetic-api-key");
  const localRead = vi.fn(async () => ({
    body: Buffer.from("synthetic"),
    mime: "text/plain",
    fetchedAt: null,
  }));
  let turn = 0;
  const fetcher: typeof fetch = async (_, init) => {
    if (init?.method !== "POST")
      return Response.json({ data: [{ id: "fixture-model" }] });
    const text =
      ++turn === 1
        ? JSON.stringify({
            action: "read_file",
            file_id: "synthetic-file",
            from: 1,
            to: 9,
          })
        : JSON.stringify({
            action: "finish",
            result: { summary: "done" },
            evidence: [],
            missing: [],
            conflicts: [],
            stop_reason: "completed",
          });
    return Response.json({
      status: "completed",
      model: "fixture-model",
      output: [{ type: "message", content: [{ type: "output_text", text }] }],
    });
  };
  const result = await runApiRelay(
    db,
    secrets,
    A,
    {
      ...request,
      capability: "research",
      files: [
        {
          id: "synthetic-file",
          name: "Synthetic.txt",
          file_ref: { version: 1, token: "a".repeat(43) },
        },
      ],
      research: {
        version: 1,
        request_id: "synthetic-request",
        task_id: "synthetic-task",
        constraints_hash: "synthetic-rules",
        constraints: [],
        required_fields: [],
        urls: [],
        allowed_tools: ["read_file"],
        budget: {
          max_elapsed_ms: 10000,
          max_tool_actions: 2,
          max_download_bytes: 1024,
          max_tokens: null,
          max_cost: null,
        },
        context: { subject: null, prior_evidence: [], feedback: [] },
      },
    },
    { fetcher, localRead },
  );
  expect(localRead).toHaveBeenCalledOnce();
  expect(
    result.research?.operations.some(
      (o) => o.action === "read_file" && o.status === "succeeded",
    ),
  ).toBe(true);
  expect(JSON.stringify(result)).not.toContain("a".repeat(43));
});

it("requires a fresh primary test after replacing this App's provider credential", async () => {
  const { db, secrets } = fixture();
  saveApiConnection(db, secrets, A, "openai", "synthetic-old");
  vi.stubGlobal("fetch", mockProvider([]));
  await runApiRelay(db, secrets, A, {
    ...request,
    capability: "text_analysis",
  });
  await saveAppRouting(db, secrets, A, {
    revision: null,
    primary: { engine: "api-openai", model: "fixture-model" },
    overrides: {},
  });
  saveApiConnection(db, secrets, A, "openai", "synthetic-new");
  expect(() =>
    resolveAppRoute(
      db,
      A,
      {
        task: "synthetic",
        capability: "text_analysis",
        prompt: "fixture",
        selection: "configured",
      },
      secrets,
    ),
  ).toThrow("RELAY_MODEL_TEST_REQUIRED");
});

it("runs bounded hash-checked inline images through the same API without downloading them", async () => {
  const { db, secrets } = fixture(),
    calls: {
      url: string;
      body: Record<string, unknown> | null;
      authorization: string | null;
    }[] = [];
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
    { createHash } = await import("node:crypto");
  const file = {
    name: "synthetic.png",
    mime: "image/png",
    inline_base64: bytes.toString("base64"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  saveApiConnection(db, secrets, A, "openai", "synthetic-api-key-a");
  const result = await runApiRelay(
    db,
    secrets,
    A,
    { ...request, files: [file] },
    {
      fetcher: mockProvider(calls),
      download: async () => {
        throw Error("Inline input must not download");
      },
    },
  );
  expect(result.structured).toEqual({ ok: true });
  expect(JSON.stringify(calls[1].body)).toContain(
    "data:image/png;base64," + file.inline_base64,
  );
  const before = calls.length;
  await expect(
    runApiRelay(
      db,
      secrets,
      A,
      { ...request, files: [{ ...file, sha256: "0".repeat(64) }] },
      { fetcher: mockProvider(calls) },
    ),
  ).rejects.toMatchObject({
    message: "RELAY_FILE_HASH_MISMATCH",
    started: false,
  });
  expect(calls).toHaveLength(before);
  writeGlobalCapabilities(db, { vision: false });
  await expect(
    runApiRelay(
      db,
      secrets,
      A,
      { ...request, files: [file] },
      { fetcher: mockProvider(calls) },
    ),
  ).rejects.toMatchObject({
    message: "RELAY_CAPABILITY_OFF:vision_analysis",
    started: false,
  });
  expect(calls).toHaveLength(before);
});
