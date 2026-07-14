import { existsSync } from "node:fs";

import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import { type AppConfig, loadConfig } from "./config.js";
import { createDatabase } from "./db/database.js";
import { seedLibraryIfEmpty } from "./modules/core/library-seed.js";
import { initModelRegistry } from "./modules/models/registry.js";
import { reconcileInterruptedTasks, runDueTasks } from "./modules/core/tasks.js";
import { autoScanVaenyxMe } from "./modules/core/vaenyx-me.js";
import { registerGatewayRoutes } from "./modules/gateway/routes.js";
import { renewSessionOnUse } from "./modules/guard/auth.js";

export async function buildApp(
  config: AppConfig = loadConfig(),
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
      ],
    },
  });
  // Build the model-provider registry from config (Codex is the default; any
  // backend configured in the local model-providers.json secrets file is added)
  // before the server serves requests.
  initModelRegistry(config);

  const database = createDatabase(config);

  // Fresh install: copy the shipped demo seed into the runtime library so a new
  // user does not open an empty "Library". First-run only (marker-guarded);
  // a seed failure must never block boot.
  try {
    if (seedLibraryIfEmpty(config)) {
      app.log.info("Populated the library from the sample-library seed.");
    }
  } catch (error) {
    app.log.error(error, "Library seed on boot failed; continuing without it.");
  }

  // Any task left "running" from a previous run was interrupted by a restart or
  // crash; mark it failed so it is retriable instead of stuck forever.
  reconcileInterruptedTasks(database);

  // In-process scheduler: once a minute, run any task whose schedule is due.
  const schedulerTick = setInterval(() => {
    try {
      runDueTasks(database);
    } catch (error) {
      app.log.error(error);
    }
  }, 60_000);
  schedulerTick.unref();

  // Auto-learn: periodically infer Vaenyx Me traits from recent activity so the
  // Owner only approves/rejects (never fills forms). Throttled — model calls cost.
  const vaenyxMeScanTick = setInterval(
    () => {
      void autoScanVaenyxMe(database).catch((error) => app.log.error(error));
    },
    6 * 60 * 60_000,
  );
  vaenyxMeScanTick.unref();
  const vaenyxMeWarmup = setTimeout(
    () => {
      void autoScanVaenyxMe(database).catch((error) => app.log.error(error));
    },
    3 * 60_000,
  );
  vaenyxMeWarmup.unref();

  app.addHook("onClose", async () => {
    clearInterval(schedulerTick);
    clearInterval(vaenyxMeScanTick);
    clearTimeout(vaenyxMeWarmup);
    database.close();
  });

  app.addHook("onRequest", async (request, reply) => {
    renewSessionOnUse(database, request, reply);
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header(
      "content-security-policy",
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-Cc6SW17wUziVQgAlHEal9mloRMoe9l5ARVVylyZsQWA='; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'",
    );

    // The HTML shell references hash-named assets, so it must never be cached
    // or a device can get stuck on a stale build. Hashed assets stay cacheable.
    const contentType = reply.getHeader("content-type");
    if (typeof contentType === "string" && contentType.includes("text/html")) {
      reply.header("cache-control", "no-cache, must-revalidate");
    }
  });

  app.setErrorHandler(async (error: FastifyError, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        error: "Vaenyx could not understand that request.",
      });
    }

    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error(error);
      return reply.code(500).send({
        error: "Vaenyx could not complete that request. Check the local logs.",
      });
    }

    return reply.code(statusCode).send({
      error: error.message,
    });
  });

  if (config.corsOrigins.length > 0) {
    await app.register(cors, {
      origin: config.corsOrigins,
    });
  }

  await registerGatewayRoutes(app, {
    config,
    database,
  });

  if (existsSync(config.webDistDirectory)) {
    await app.register(fastifyStatic, {
      root: config.webDistDirectory,
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/v1/") || request.url === "/health") {
        return reply.code(404).send({
          error: "Not Found",
        });
      }

      return reply.sendFile("index.html");
    });
  }

  return app;
}
