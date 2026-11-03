import { apiModelHonoured } from "./providers.mjs";
import { exactOrigin, problem, requestJSON } from "./protocol.mjs";
export function relayJSON({
  address,
  token,
  path,
  method,
  body,
  timeoutMs = 20000,
  limit = 2000000,
  run = false,
  fetcher = globalThis.fetch,
}) {
  exactOrigin(address);
  if (
    typeof token !== "string" ||
    !token ||
    !/^\/v1\/(ai|relay)\/[a-z0-9/?=_-]+$/.test(path)
  )
    throw problem("invalid_request");
  return requestJSON(
    address + path,
    {
      method: method || (body === undefined ? "GET" : "POST"),
      credentials: "omit",
      headers: {
        authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    {
      fetcher,
      timeoutMs,
      limit,
      run,
      secret: [
        token,
        ...(typeof body?.api_key === "string" ? [body.api_key] : []),
      ],
    },
  );
}
export function createRelayClient({ connection, fetcher = globalThis.fetch }) {
  async function request(
    path,
    { permission, operation = "read", write = false, body, ...options } = {},
  ) {
    const { data } = await connection.read({
      operation,
      write,
      ...(permission ? { permission } : {}),
    });
    if (!data.connection) throw problem("unconfigured", { unconfigured: true });
    return relayJSON({
      address: data.connection.relay_origin,
      token: data.connection.token,
      path,
      body,
      fetcher,
      ...options,
    });
  }
  return {
    request,
    routing: () => request("/v1/relay/routing", { timeoutMs: 4000 }),
    providers: () => request("/v1/relay/providers", { operation: "providers" }),
    connectProvider: ({ provider, apiKey, expectedRevision = null }) =>
      request("/v1/relay/providers", {
        operation: "providers",
        write: true,
        body: {
          provider,
          api_key: apiKey,
          expected_revision: expectedRevision,
        },
      }),
    disconnectProvider: ({ provider, expectedRevision }) => {
      if (!/^[a-z]+$/.test(provider)) throw problem("invalid_request");
      return request("/v1/relay/providers/" + provider, {
        operation: "providers",
        write: true,
        method: "DELETE",
        body: { expected_revision: expectedRevision },
      });
    },
    profile: () => request("/v1/relay/profile", { timeoutMs: 4000 }),
    models: ({ refresh = false } = {}) =>
      request("/v1/relay/models" + (refresh ? "?refresh=1" : ""), {
        operation: "models",
        write: refresh,
      }),

    configuredSelection: async (capability = "text_analysis") => {
      const [profile, routing] = await Promise.all([
        request("/v1/relay/profile", { timeoutMs: 4000 }),
        request("/v1/relay/routing", { timeoutMs: 4000 }),
      ]);
      const choice = routing.overrides?.[capability] || routing.primary;
      if (
        profile.mode !== "dedicated" ||
        !profile.configured_selection ||
        typeof routing.revision !== "string" ||
        !routing.revision ||
        typeof choice?.engine !== "string" ||
        typeof choice?.model !== "string"
      )
        throw problem("configure_in_vaenyx", { unknown: false });
      const engine = profile.engines?.find((e) => e.engine === choice.engine);
      if (engine?.login_status !== "connected")
        throw problem("engine_not_connected", { unknown: false });
      return {
        ...choice,
        routing_revision: routing.revision,
        capability_probe_revision: profile.capability_probe_revision,
        may_charge: choice.engine.startsWith("api-"),
      };
    },
    runConfigured: async (body, options = {}) => {
      if (!body?.capability)
        throw problem("invalid_request", { unknown: false });
      const wire = {
        ...body,
        engine: undefined,
        model: undefined,
        effort: undefined,
        selection: "configured",
      };
      const result = await request("/v1/ai/run", {
        operation: "run",
        write: true,
        body: wire,
        run: true,
        timeoutMs: 125000,
        ...options,
      });
      if (
        !/^2\./.test(result.contract_revision || "") ||
        result.selection_source !== "app_profile" ||
        !result.routing_revision ||
        typeof result.text !== "string" ||
        !result.text.trim() ||
        typeof result.requested_model !== "string" ||
        !result.requested_model ||
        typeof result.model !== "string" ||
        !result.model ||
        typeof result.engine !== "string" ||
        !result.engine ||
        result.fallback_occurred !== false ||
        (body.routing_revision &&
          result.routing_revision !== body.routing_revision) ||
        !apiModelHonoured(
          result.engine.startsWith("api-") ? result.engine.slice(4) : "",
          result.requested_model,
          result.model,
        )
      )
        throw problem("response_binding_mismatch", { unknown: true });
      return result;
    },
    run: (body, options = {}) => {
      if (
        !body?.capability ||
        (body.selection !== "configured" && (!body.engine || !body.model))
      )
        throw problem("invalid_request");
      return request("/v1/ai/run", {
        operation: "run",
        write: true,
        body,
        run: true,
        timeoutMs: 125000,
        ...options,
      });
    },
  };
}
