import { Type } from "@sinclair/typebox";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";
import { authenticateOwner } from "../guard/auth.js";
import {
  authenticateAppProfile,
  appProfileKeyInfo,
  listAppProfiles,
} from "../core/app-profiles.js";
import { recordAudit } from "../guard/audit.js";
import { readRelayConfig } from "../core/relay.js";
import { LocalFileGrants } from "../core/local-file-grants.js";
import {
  loadLocalFileAllowlist,
  publicLocalFileAllowlist,
} from "../core/local-file-allowlist.js";

export function registerLocalFileRoutes(
  app: FastifyInstance,
  context: { config: AppConfig; database: DatabaseHandle },
  outsideTailnet: (request: FastifyRequest) => boolean,
) {
  const approved = loadLocalFileAllowlist(
    context.config.localFileAllowlistPath,
  );
  const store = new LocalFileGrants((id) => {
    const p = listAppProfiles(context.database).find((p) => p.id === id);
    return p?.enabled && p.kind === "relay"
      ? appProfileKeyInfo(context.database, id).version
      : null;
  });
  app.addHook("onClose", async () => store.clear());
  const owner = (request: FastifyRequest, reply: FastifyReply) => {
    reply.header("cache-control", "no-store");
    const identity = authenticateOwner(context.database, request);
    if (
      !identity ||
      identity.modeId ||
      request.headers["sec-fetch-site"] === "cross-site"
    ) {
      reply.code(403).send({ error: "Owner User Mode required." });
      return null;
    }
    return identity;
  };
  const cors = (request: FastifyRequest, reply: FastifyReply) => {
    reply.header("cache-control", "no-store");
    const origin = request.headers.origin;
    if (!origin || !store.permitsOrigin(origin)) return false;
    reply
      .header("access-control-allow-origin", origin)
      .header("vary", "Origin")
      .header("access-control-allow-headers", "authorization,content-type")
      .header("access-control-allow-methods", "GET,OPTIONS")
      .header("access-control-max-age", "0");
    return true;
  };
  app.options(
    "/v1/ai/local-files",
    { config: { cors: false } },
    async (request, reply) => {
      if (!cors(request, reply))
        return reply
          .code(403)
          .send({ error: "RELAY_LOCAL_FILE_ORIGIN_DENIED" });
      return reply.code(204).send();
    },
  );
  app.get(
    "/v1/ai/local-files",
    { config: { cors: false } },
    async (request, reply) => {
      if (!cors(request, reply))
        return reply
          .code(403)
          .send({ error: "RELAY_LOCAL_FILE_ORIGIN_DENIED" });
      if (outsideTailnet(request))
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      const profile = authenticateAppProfile(context.database, request);
      if (!profile || profile.kind !== "relay")
        return reply.code(401).send({ error: "RELAY_LOCAL_FILE_APP_DENIED" });
      return {
        version: 1,
        grants: store.list(profile.id, request.headers.origin!),
      };
    },
  );
  app.get(
    "/v1/app-profiles/local-files",
    { config: { cors: false } },
    async (request, reply) => {
      if (!owner(request, reply)) return;
      return {
        version: 1,
        manifest: approved ? publicLocalFileAllowlist(approved) : null,
      };
    },
  );
  const id = Type.String({ minLength: 1, maxLength: 160 });
  app.post<{ Body: { batch_id: string; file_ids: string[] } }>(
    "/v1/app-profiles/local-files",
    {
      bodyLimit: 8192,
      config: { cors: false },
      schema: {
        body: Type.Object(
          {
            batch_id: id,
            file_ids: Type.Array(id, {
              minItems: 1,
              maxItems: 20,
              uniqueItems: true,
            }),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const identity = owner(request, reply);
      if (!identity) return;
      if (
        !approved ||
        approved.batch_id !== request.body.batch_id ||
        request.body.file_ids.some(
          (id) => !approved.files.some((f) => f.id === id),
        )
      )
        return reply.code(403).send({ error: "RELAY_LOCAL_FILE_NOT_APPROVED" });
      const profiles = listAppProfiles(context.database).filter(
        (p) =>
          p.name === approved.profile_name && p.kind === "relay" && p.enabled,
      );
      if (profiles.length !== 1)
        return reply
          .code(403)
          .send({ error: "RELAY_LOCAL_FILE_PROFILE_DENIED" });
      try {
        const limits = readRelayConfig(context.database);
        const grants = await store.register(
          identity.id,
          profiles[0]!.id,
          approved.client_origin,
          approved.task_id,
          approved.files.filter((f) => request.body.file_ids.includes(f.id)),
          Math.min(limits.maxFileBytes, limits.maxTotalBytes),
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: identity.id,
          actorName: identity.name,
          action: "relay.local_files.approved",
          decision: "allowed",
          reason: "Owner approved eligible temporary files.",
          resourceType: "app_profile",
          resourceId: profiles[0]!.id,
        });
        return { version: 1, grants };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        return reply.code(400).send({
          error: /^local_file_[a-z_]+$/.test(message)
            ? "RELAY_" + message.toUpperCase()
            : "RELAY_LOCAL_FILE_UNAVAILABLE",
        });
      }
    },
  );
  app.post<{ Body: { task_id: string } }>(
    "/v1/app-profiles/local-files/revoke",
    {
      config: { cors: false },
      schema: {
        body: Type.Object({ task_id: id }, { additionalProperties: false }),
      },
    },
    async (request, reply) => {
      const identity = owner(request, reply);
      if (!identity) return;
      const count = store.revoke(identity.id, request.body.task_id);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: identity.id,
        actorName: identity.name,
        action: "relay.local_files.revoked",
        decision: "allowed",
        reason: "Owner revoked temporary file grants.",
        resourceType: "local_file_grants",
      });
      return { revoked: count };
    },
  );
  return store;
}
