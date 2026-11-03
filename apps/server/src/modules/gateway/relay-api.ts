import { registerRelayRoutingRoutes } from "./relay-routing.js";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import type { DatabaseHandle } from "../../db/database.js";
import {
  API_PROVIDERS,
  apiProvider,
  readApiConnection,
  saveApiConnection,
  removeApiConnection,
} from "../core/relay-api-config.js";
import { apiModels, apiCapabilities } from "../core/relay-api-provider.js";
import { ApiRelayError } from "../core/relay-api-wire.js";
import { assertRelayRateLimit, readRelayConfig } from "../core/relay.js";
import { recordAudit } from "../guard/audit.js";
export function registerRelayApiRoutes(
  app: FastifyInstance,
  options: {
    database: DatabaseHandle;
    secretsDirectory: string;
    authorize: (request: FastifyRequest, reply: FastifyReply) => string | null;
    authorizeOwner: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => string | null;
  },
) {
  registerRelayRoutingRoutes(app, options);
  const { database: db, secretsDirectory: secrets } = options;
  const authorize = (request: FastifyRequest, reply: FastifyReply) =>
    request.url.startsWith("/v1/app-profiles/")
      ? options.authorizeOwner(request, reply)
      : options.authorize(request, reply);
  for (const base of [
    "/v1/relay/providers",
    "/v1/app-profiles/:profile/api-providers",
  ]) {
    for (const path of [base, base + "/:provider"]) {
      app.options(path, async (request, reply) => {
        authorize(request, reply);
        return reply.code(204).send();
      });
    }
    app.get(base, async (request, reply) => {
      const profile = authorize(request, reply);
      if (!profile) return;
      reply.header("Cache-Control", "no-store");
      return {
        contract_revision: "2.3",
        providers: API_PROVIDERS.map((p) => {
          const c = readApiConnection(db, secrets, profile, p.id);
          return {
            id: p.id,
            name: p.name,
            engine: "api-" + p.id,
            connected: !!c,
            revision: c?.revision ?? null,
            connected_at: c?.connectedAt ?? null,
            capabilities: apiCapabilities(p.id),
            billing: "provider_account",
            privacy: "provider_terms_not_verified",
          };
        }),
      };
    });
    app.post<{
      Body: {
        provider: string;
        api_key: string;
        expected_revision: string | null;
      };
    }>(
      base,
      {
        schema: {
          body: Type.Object(
            {
              provider: Type.String({ maxLength: 40 }),
              api_key: Type.String({ minLength: 1, maxLength: 10000 }),
              expected_revision: Type.Union([
                Type.Null(),
                Type.String({ minLength: 1, maxLength: 80 }),
              ]),
            },
            { additionalProperties: false },
          ),
        },
      },
      async (request, reply) => {
        const profile = authorize(request, reply);
        if (!profile) return;
        const p = apiProvider(request.body.provider);
        if (!p)
          return reply.code(400).send({ error: "RELAY_PROVIDER_INVALID" });
        const previous = readApiConnection(db, secrets, profile, p.id);
        if ((previous?.revision ?? null) !== request.body.expected_revision)
          return reply.code(409).send({ error: "RELAY_CONNECTION_CHANGED" });
        try {
          assertRelayRateLimit(profile, readRelayConfig(db).maxCallsPerMinute);
          const candidate = {
            apiKey: request.body.api_key.trim(),
            revision: "candidate",
            connectedAt: new Date().toISOString(),
          };
          await apiModels(p.id, candidate, AbortSignal.timeout(20000));
          if (
            (readApiConnection(db, secrets, profile, p.id)?.revision ??
              null) !== request.body.expected_revision
          )
            return reply.code(409).send({ error: "RELAY_CONNECTION_CHANGED" });
          if (authorize(request, reply) !== profile) return;
          const c = saveApiConnection(
            db,
            secrets,
            profile,
            p.id,
            candidate.apiKey,
          );
          recordAudit(db, {
            actorType: "app",
            actorId: profile,
            actorName: "Relay App",
            action: "relay.api.connect",
            decision: "allowed",
            reason:
              "The App connected its own provider credential after a catalogue check.",
            resourceType: "relay_api",
            resourceId: p.id,
          });
          return {
            connected: true,
            provider: p.id,
            revision: c.revision,
            connected_at: c.connectedAt,
          };
        } catch (error) {
          return reply
            .code(error instanceof ApiRelayError ? error.status : 502)
            .send({
              error:
                error instanceof ApiRelayError
                  ? error.message
                  : "RELAY_PROVIDER_CONNECT_FAILED",
            });
        }
      },
    );
    app.delete<{
      Params: { provider: string };
      Body: { expected_revision: string };
    }>(
      base + "/:provider",
      {
        schema: {
          body: Type.Object(
            { expected_revision: Type.String({ minLength: 1, maxLength: 80 }) },
            { additionalProperties: false },
          ),
        },
      },
      async (request, reply) => {
        const profile = authorize(request, reply);
        if (!profile) return;
        const p = apiProvider(request.params.provider);
        if (!p)
          return reply.code(400).send({ error: "RELAY_PROVIDER_INVALID" });
        const c = readApiConnection(db, secrets, profile, p.id);
        if (!c || c.revision !== request.body.expected_revision)
          return reply.code(409).send({ error: "RELAY_CONNECTION_CHANGED" });
        removeApiConnection(db, profile, p.id);
        recordAudit(db, {
          actorType: "app",
          actorId: profile,
          actorName: "Relay App",
          action: "relay.api.disconnect",
          decision: "allowed",
          reason: "The App disconnected its own API connection.",
          resourceType: "relay_api",
          resourceId: p.id,
        });
        return { connected: false, provider: p.id };
      },
    );
  }
}
