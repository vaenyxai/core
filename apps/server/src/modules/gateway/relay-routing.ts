import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import type { DatabaseHandle } from "../../db/database.js";
import {
  readAppRouting,
  saveAppRouting,
  type AppRouting,
} from "../core/relay-routing.js";
import {
  relayModelCatalogue,
  probeRelayModel,
  publicRelayError,
  relayModelProofs,
} from "../core/relay.js";
import {
  apiCatalogue,
  testApiModel,
  apiModelProofs,
} from "../core/relay-api.js";
import { isApiEngine } from "../core/relay-api-config.js";
import { ApiRelayError } from "../core/relay-api-wire.js";
import type { RelayModelTestRequest } from "@vaenyx/contracts";
import { recordAudit } from "../guard/audit.js";
interface Options {
  database: DatabaseHandle;
  secretsDirectory: string;
  authorize: (req: FastifyRequest, reply: FastifyReply) => string | null;
  authorizeOwner: Options["authorize"];
}
export function registerRelayRoutingRoutes(
  app: FastifyInstance,
  options: Options,
) {
  const { database: db, secretsDirectory: secrets } = options;
  app.options("/v1/relay/routing", async (req, reply) => {
    options.authorize(req, reply);
    return reply.code(204).send();
  });
  app.get("/v1/relay/routing", async (req, reply) => {
    const profile = options.authorize(req, reply);
    if (!profile) return;
    reply.header("Cache-Control", "no-store");
    return readAppRouting(db, profile);
  });
  app.get(
    "/v1/app-profiles/:profile/relay-model-proofs",
    async (req, reply) => {
      const profile = options.authorizeOwner(req, reply);
      if (!profile) return;
      reply.header("Cache-Control", "no-store");
      return {
        proofs: [
          ...relayModelProofs(db, profile),
          ...apiModelProofs(db, secrets, profile),
        ],
      };
    },
  );
  const base = "/v1/app-profiles/:profile/relay-routing";
  app.get(base, async (req, reply) => {
    const profile = options.authorizeOwner(req, reply);
    if (profile) return readAppRouting(db, profile);
  });
  const choice = Type.Object(
    {
      engine: Type.String({ maxLength: 40 }),
      model: Type.String({ minLength: 1, maxLength: 160 }),
      effort: Type.Optional(Type.String({ maxLength: 20 })),
    },
    { additionalProperties: false },
  );
  app.put<{ Body: AppRouting }>(
    base,
    {
      schema: {
        body: Type.Object(
          {
            revision: Type.Union([
              Type.Null(),
              Type.String({ minLength: 1, maxLength: 80 }),
            ]),
            primary: Type.Union([Type.Null(), choice]),
            overrides: Type.Record(Type.String(), choice),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (req, reply) => {
      const profile = options.authorizeOwner(req, reply);
      if (!profile) return;
      try {
        const value = await saveAppRouting(
          db,
          secrets,
          profile,
          req.body,
          () => options.authorizeOwner(req, reply) === profile,
        );
        if (options.authorizeOwner(req, reply) !== profile) return;
        recordAudit(db, {
          actorType: "owner",
          actorName: "Instance Owner",
          action: "relay.routing.save",
          decision: "allowed",
          reason: "The Owner selected tested models for this App profile.",
          resourceType: "relay_routing",
          resourceId: profile,
        });
        return value;
      } catch (error) {
        if (reply.sent) return;
        return reply
          .code(400)
          .send({
            error:
              error instanceof ApiRelayError
                ? error.message
                : "RELAY_ROUTING_SAVE_FAILED",
          });
      }
    },
  );
  app.get("/v1/app-profiles/:profile/relay-models", async (req, reply) => {
    const profile = options.authorizeOwner(req, reply);
    if (!profile) return;
    const sub = await relayModelCatalogue(db, secrets, profile, {
      force: true,
    });
    return {
      ...sub,
      engines: [
        ...sub.engines,
        ...(await apiCatalogue(db, secrets, profile, true)),
      ],
    };
  });
  app.post<{ Body: RelayModelTestRequest }>(
    "/v1/app-profiles/:profile/relay-models/test",
    {
      schema: {
        body: Type.Object(
          {
            engine: Type.String({ maxLength: 40 }),
            model: Type.String({ minLength: 1, maxLength: 160 }),
            effort: Type.Optional(Type.String({ maxLength: 20 })),
            capability: Type.Optional(
              Type.Union([
                Type.Literal("text_analysis"),
                Type.Literal("structured_output"),
                Type.Literal("vision_analysis"),
              ]),
            ),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (req, reply) => {
      const profile = options.authorizeOwner(req, reply);
      if (!profile) return;
      try {
        if (isApiEngine(req.body.engine))
          return await testApiModel(db, secrets, profile, req.body);
        if (
          req.body.engine !== "openai-cli" &&
          req.body.engine !== "claude-cli"
        )
          return reply.code(400).send({ error: "RELAY_ENGINE_INVALID" });
        return await probeRelayModel(db, secrets, profile, {
          ...req.body,
          engine: req.body.engine,
        });
      } catch (error) {
        return reply
          .code(400)
          .send({
            error: publicRelayError(
              error,
              req.body.engine as "openai-cli" | "claude-cli",
            ),
          });
      }
    },
  );
}
