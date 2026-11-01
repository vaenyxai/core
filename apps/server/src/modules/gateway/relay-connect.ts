import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import {
  RelayConnectStartSchema,
  RelayConnectExchangeSchema,
  type RelayConnectStart,
  type RelayConnectExchange,
} from "@vaenyx/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";
import {
  appProfileKeyInfo,
  listAppProfiles,
  revealAppProfileToken,
} from "../core/app-profiles.js";
import {
  createRelayConnectStore,
  RelayConnectError,
} from "../core/relay-connect.js";
import { authenticateOwner } from "../guard/auth.js";
import { recordAudit } from "../guard/audit.js";

export function registerRelayConnectRoutes(
  app: FastifyInstance,
  context: { config: AppConfig; database: DatabaseHandle },
  outsideTailnet: (request: FastifyRequest) => boolean,
) {
  // Scoped parser: no changes to the application's existing JSON-only API routes.
  void app.register(async (scope) => {
    scope.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string", bodyLimit: 8192 },
      (_request, body, done) => done(null, body),
    );
    const store = createRelayConnectStore({
      profile(id) {
        const p = listAppProfiles(context.database).find(
          (profile) => profile.id === id,
        );
        return p
          ? {
              id: p.id,
              name: p.name,
              kind: p.kind,
              enabled: p.enabled,
              version: appProfileKeyInfo(context.database, id).version,
            }
          : null;
      },
      token(id) {
        return revealAppProfileToken(
          context.database,
          id,
          context.config.secretsDirectory,
        );
      },
    });
    scope.addHook("onClose", async () => {
      store.clear();
    });
    const safe = (reply: FastifyReply) =>
      reply
        .header("cache-control", "no-store")
        .header("referrer-policy", "no-referrer");
    const error = (reply: FastifyReply, caught: unknown) => {
      if (caught instanceof RelayConnectError)
        return reply.code(caught.status).send({ error: caught.code });
      return reply.code(409).send({ error: "RELAY_CONNECT_TOKEN_UNAVAILABLE" });
    };
    // CORS exists ONLY for exact Origins with an unexpired Owner-approved grant.
    // Start is a top-level form navigation, not a cross-origin API response.
    const approvedCors = (request: FastifyRequest, reply: FastifyReply) => {
      const origin = request.headers.origin;
      if (!origin || !store.permitsExchangeOrigin(origin)) return false;
      reply
        .header("access-control-allow-origin", origin)
        .header("vary", "Origin")
        .header("access-control-allow-headers", "content-type")
        .header("access-control-allow-methods", "POST,OPTIONS")
        .header("access-control-max-age", "0");
      return true;
    };
    scope.post<{ Body: string }>(
      "/v1/relay/connect/start",
      { bodyLimit: 8192, config: { cors: false } },
      async (request, reply) => {
        safe(reply);
        if (outsideTailnet(request))
          return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
        if (
          typeof request.body !== "string" ||
          !request.headers["content-type"]?.startsWith(
            "application/x-www-form-urlencoded",
          )
        )
          return reply
            .code(400)
            .send({ error: "RELAY_CONNECT_INVALID_REQUEST" });
        const fields = new URLSearchParams(request.body);
        if ([...fields.keys()].some((key) => fields.getAll(key).length !== 1))
          return reply
            .code(400)
            .send({ error: "RELAY_CONNECT_INVALID_REQUEST" });
        const input: Record<string, unknown> = Object.fromEntries(fields);
        if (input.version === "1") input.version = 1;
        if (!Value.Check(RelayConnectStartSchema, input))
          return reply
            .code(400)
            .send({ error: "RELAY_CONNECT_INVALID_REQUEST" });
        try {
          const result = store.start(
            input as RelayConnectStart,
            request.headers.origin ?? "",
          );
          return reply.code(303).redirect(result.authorization_path);
        } catch (caught) {
          return error(reply, caught);
        }
      },
    );
    scope.options(
      "/v1/relay/connect/exchange",
      { config: { cors: false } },
      async (request, reply) => {
        safe(reply);
        if (!approvedCors(request, reply))
          return reply
            .code(403)
            .send({ error: "RELAY_CONNECT_ORIGIN_MISMATCH" });
        return reply.code(204).send();
      },
    );
    scope.post<{ Body: RelayConnectExchange }>(
      "/v1/relay/connect/exchange",
      {
        attachValidation: true,
        schema: { body: RelayConnectExchangeSchema },
        bodyLimit: 8192,
        config: { cors: false },
      },
      async (request, reply) => {
        safe(reply);
        if (!approvedCors(request, reply))
          return reply
            .code(403)
            .send({ error: "RELAY_CONNECT_ORIGIN_MISMATCH" });
        if (outsideTailnet(request))
          return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
        if (request.headers.cookie || request.validationError)
          return reply
            .code(400)
            .send({ error: "RELAY_CONNECT_INVALID_REQUEST" });
        try {
          const result = store.exchange(request.body, request.headers.origin!);
          recordAudit(context.database, {
            actorType: "app",
            actorId: result.profile_id,
            actorName: result.profile_name,
            action: "relay.connect.exchanged",
            decision: "allowed",
            reason: "Owner-approved connection handed to the requesting app.",
            resourceType: "app_profile",
            resourceId: result.profile_id,
          });
          return result;
        } catch (caught) {
          return error(reply, caught);
        }
      },
    );
    const params = Type.Object(
      {
        id: Type.String({
          minLength: 43,
          maxLength: 43,
          pattern: "^[A-Za-z0-9_-]+$",
        }),
      },
      { additionalProperties: false },
    );
    const ownerGate = (request: FastifyRequest, reply: FastifyReply) => {
      safe(reply);
      const owner = authenticateOwner(context.database, request);
      if (!owner || owner.modeId) {
        reply
          .code(owner ? 403 : 401)
          .send({ error: "Owner User Mode login required." });
        return null;
      }
      if (request.headers["sec-fetch-site"] === "cross-site") {
        reply.code(403).send({ error: "RELAY_CONNECT_ORIGIN_MISMATCH" });
        return null;
      }
      return owner;
    };
    scope.get<{ Params: { id: string } }>(
      "/v1/app-profiles/connect/:id",
      { schema: { params }, config: { cors: false } },
      async (request, reply) => {
        if (!ownerGate(request, reply)) return;
        try {
          return store.inspect(request.params.id);
        } catch (caught) {
          return error(reply, caught);
        }
      },
    );
    scope.post<{
      Params: { id: string };
      Body: { profile_id: string; confirmed_origin: string };
    }>(
      "/v1/app-profiles/connect/:id/approve",
      {
        config: { cors: false },
        schema: {
          params,
          body: Type.Object(
            {
              profile_id: Type.String({ minLength: 1, maxLength: 128 }),
              confirmed_origin: Type.String({ maxLength: 2048 }),
            },
            { additionalProperties: false },
          ),
        },
      },
      async (request, reply) => {
        const owner = ownerGate(request, reply);
        if (!owner) return;
        try {
          const entry = store.inspect(request.params.id);
          if (entry.client_origin !== request.body.confirmed_origin)
            return reply
              .code(403)
              .send({ error: "RELAY_CONNECT_ORIGIN_MISMATCH" });
          const result = store.approve(
            request.params.id,
            request.body.profile_id,
          );
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
            action: "relay.connect.approved",
            decision: "allowed",
            reason:
              "Owner approved an existing App Profile connection handover.",
            resourceType: "app_profile",
            resourceId: request.body.profile_id,
          });
          return result;
        } catch (caught) {
          return error(reply, caught);
        }
      },
    );
    scope.post<{ Params: { id: string } }>(
      "/v1/app-profiles/connect/:id/deny",
      {
        config: { cors: false },
        schema: {
          params,
          body: Type.Object({}, { additionalProperties: false }),
        },
      },
      async (request, reply) => {
        if (!ownerGate(request, reply)) return;
        try {
          return store.deny(request.params.id);
        } catch (caught) {
          return error(reply, caught);
        }
      },
    );
  });
}
