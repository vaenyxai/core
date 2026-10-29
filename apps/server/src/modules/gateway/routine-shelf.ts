import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";
import { listRoutineSummaries } from "../core/routines.js";
import { authenticateOwner } from "../guard/auth.js";
import { recordAudit } from "../guard/audit.js";

const prefix = "routine_shelf_removed:";
function removedIds(database: DatabaseHandle): string[] {
  return (
    database.sqlite
      .prepare(
        "SELECT key FROM instance_settings WHERE key LIKE 'routine_shelf_removed:%' AND value = 'true'",
      )
      .all() as { key: string }[]
  )
    .map((row) => row.key.slice(prefix.length))
    .sort();
}

// Shelf organisation only. Packages, grants and conversation history stay intact.
export function registerRoutineShelfRoutes(
  app: FastifyInstance,
  context: {
    config: AppConfig;
    database: DatabaseHandle;
  },
) {
  const path = "/v1/library/routine-shelf";
  app.get(path, async (request, reply) => {
    const owner = authenticateOwner(context.database, request);
    if (!owner) return reply.code(401).send({ error: "Owner login required." });
    if (owner.modeId)
      return reply
        .code(403)
        .send({ error: "Switch to User Mode to organise the Library." });
    return { removedIds: removedIds(context.database) };
  });
  app.post<{ Body: { ids: string[]; removed: boolean } }>(
    path,
    {
      schema: {
        body: Type.Object(
          {
            ids: Type.Array(Type.String({ minLength: 1, maxLength: 200 }), {
              minItems: 1,
              maxItems: 200,
              uniqueItems: true,
            }),
            removed: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const owner = authenticateOwner(context.database, request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      if (owner.modeId)
        return reply
          .code(403)
          .send({ error: "Switch to User Mode to organise the Library." });
      const known = new Set(
        listRoutineSummaries(context.config.routinesDirectory).map((r) => r.id),
      );
      if (request.body.ids.some((id) => !known.has(id))) {
        return reply
          .code(404)
          .send({
            error: "A selected Routine no longer exists. Refresh the Library.",
          });
      }
      context.database.sqlite.exec("BEGIN IMMEDIATE");
      try {
        const save = context.database.sqlite.prepare(
          "INSERT INTO instance_settings (key,value,updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",
        );
        for (const id of request.body.ids)
          save.run(prefix + id, String(request.body.removed));
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: request.body.removed
            ? "library.routine.remove"
            : "library.routine.restore",
          decision: "allowed",
          reason:
            "Owner changed the Routine shelf; packages and history retained.",
          resourceType: "routine",
          resourceId: request.body.ids.join(","),
        });
        context.database.sqlite.exec("COMMIT");
      } catch (error) {
        context.database.sqlite.exec("ROLLBACK");
        throw error;
      }
      return { removedIds: removedIds(context.database) };
    },
  );
}
