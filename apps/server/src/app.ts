import { existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import { type AppConfig, loadConfig } from "./config.js";
import { createDatabase } from "./db/database.js";
import { setCodexToolsDirectory } from "./modules/harness/codex.js";
import { installWantedComponent } from "./modules/core/install-components.js";
import { startWantedComponents } from "./modules/core/wanted-components.js";
import { runFactExtractionPass } from "./modules/core/facts-runner.js";
import { getOwner } from "./modules/guard/auth.js";
import { claudeMachineLogin } from "./modules/models/claude-login.js";
import {
  restoreClaudeSdkForConnectedInstance,
  setClaudeSdkToolsDirectory,
} from "./modules/models/claude-sdk.js";
import { resolveClaudeSubscriptionAuth } from "./modules/models/claude-subscription-provider.js";
import { seedLibraryIfEmpty } from "./modules/core/library-seed.js";
import { initModelRegistry } from "./modules/models/registry.js";
import { normalizeEngineConnections } from "./modules/models/provider-settings.js";
import { initPushService } from "./modules/core/push.js";
import {
  reconcileInterruptedTasks,
  runDueTasks,
} from "./modules/core/tasks.js";
import { runScheduledBackupIfDue } from "./modules/core/backup-schedule.js";
import {
  autoScanVaenyxMe,
  mergePendingCandidates,
} from "./modules/core/vaenyx-me.js";
import { sweepOrphanDocuments } from "./modules/core/document-gc.js";
import { runDueModeDigests } from "./modules/core/modes.js";
import { bindUsageDatabase } from "./modules/core/relay-usage.js";
import { sweepFlywheel } from "./modules/core/flywheel-send.js";
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
  // before the server serves requests. Engine slots normalize first: keys an
  // older build stored inside voice/voiceOutput move to their provider
  // entries, and empty slots fill from capable connections.
  normalizeEngineConnections(config);
  // Where the ChatGPT sign-in component lives: userdata/tools, named by
  // Vaenyx rather than by whichever account runs the server.
  setCodexToolsDirectory(config.dataDirectory);
  // Same folder, same reason, for the Claude subscription component.
  setClaudeSdkToolsDirectory(config.dataDirectory);
  initModelRegistry(config);
  // WHAT THE INSTALLER WAS TICKED FOR. A fresh install may have been asked
  // for a subscription component, Tailscale, or an offline voice; the
  // installer wrote the list and did none of it, so it happens here, with the
  // code that already does each of these and with progress the first-run
  // screen can show. Failures are lines in the log, never a boot that stops.
  const asked = startWantedComponents({
    dataDirectory: config.dataDirectory,
    install: (id) => installWantedComponent(id, config.dataDirectory),
    onDone: (results) =>
      app.log.info({ results: results.done }, "installer components finished"),
  });
  if (asked.length) {
    app.log.info(
      { components: asked },
      "installing what the installer asked for",
    );
  }

  // An instance that was already using its Claude subscription keeps it: the
  // component used to be a dependency, and this upgrade prunes it.
  restoreClaudeSdkForConnectedInstance({
    connected: Boolean(
      resolveClaudeSubscriptionAuth(config.secretsDirectory).token ||
      claudeMachineLogin(),
    ),
    dataDirectory: config.dataDirectory,
    onDone: (outcome) =>
      outcome === "installed"
        ? app.log.info("claude subscription component restored after upgrade")
        : app.log.warn(
            "claude subscription component could not be restored; the Claude subscription will say so and everything else is unaffected",
          ),
  });
  // Web Push: point the push module at the secrets directory (VAPID keypair
  // lives there, generated on first use).
  initPushService(config);

  const database = createDatabase(config);
  // Usage bookkeeping (who spent what, by month): the model providers have no
  // database handle, so the sink is bound here once.
  bindUsageDatabase(database);

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

  // In-process scheduler: once a minute, run any task whose schedule is due,
  // and the automatic backup when its schedule says so.
  const schedulerTick = setInterval(() => {
    try {
      runDueTasks(database);
    } catch (error) {
      app.log.error(error);
    }
    try {
      runScheduledBackupIfDue(config, {
        info: (message) => app.log.info(message),
        error: (message) => app.log.error(message),
      });
    } catch (error) {
      app.log.error(error);
    }
    try {
      // Custom Mode supervision digests (spec §6): one summary per period
      // for any mode that asked for one.
      runDueModeDigests(database);
    } catch (error) {
      app.log.error(error);
    }
    // The flywheel's outbound sweep (Part K). Almost always a no-op: it needs
    // sharing switched on, an item past its 48-hour window, and a publisher who
    // asked to receive. A failed send stays queued for the next minute.
    void sweepFlywheel(database, config).catch((error: unknown) =>
      app.log.error(error),
    );
  }, 60_000);
  schedulerTick.unref();

  // Auto-learn: periodically infer Vaenyx Me traits from recent activity so the
  // Owner only approves/rejects (never fills forms). Once a day (Oskar,
  // 2026-08-09; was 6-hourly) — the queue only needs to be fresher than the
  // Owner's attention, and he looks at it daily at most. The startup warmup
  // below still gives an immediate pass after every update.
  const vaenyxMeScanTick = setInterval(
    () => {
      void autoScanVaenyxMe(database).catch((error) => app.log.error(error));
    },
    24 * 60 * 60_000,
  );
  vaenyxMeScanTick.unref();
  const vaenyxMeWarmup = setTimeout(() => {
    void autoScanVaenyxMe(database).catch((error) => app.log.error(error));
  }, 3 * 60_000);
  vaenyxMeWarmup.unref();

  // Document orphan sweep (document-gc.ts): the safety net behind the
  // delete-with-conversation cleanup. Once per boot, a few minutes in, so a
  // deleted Mode inbox or a never-attached upload cannot strand files
  // forever. Age-gated inside, so nothing recent is ever touched.
  const documentSweep = setTimeout(() => {
    try {
      const removed = sweepOrphanDocuments(database, config.dataDirectory);
      if (removed > 0) {
        app.log.info({ removed }, "orphaned document files removed");
      }
    } catch (error) {
      app.log.error(error);
    }
  }, 4 * 60_000);
  documentSweep.unref();

  // FACTS, distilled out of quiet conversations. Hourly, because the machine
  // is the household's own and idle most of the night — a cloud assistant pays
  // per token to consolidate memory and so does it rarely; this one does not,
  // and that is the one advantage self-hosting has that is not about privacy.
  //
  // It never touches a conversation that is still happening (30 minutes of
  // quiet first), reads only what the OWNER said, and proposes rather than
  // decides: everything lands in the review queue.
  const factsTick = setInterval(() => {
    const owner = getOwner(database);
    if (!owner) return;
    void runFactExtractionPass(database, owner.id)
      .then((result) => {
        if (result.queued > 0) {
          app.log.info(
            { conversations: result.conversations, queued: result.queued },
            "facts proposed for review",
          );
        }
        // The merge rides the same hourly train (Oskar, 2026-08-12: a fact
        // distilled at 23:02 sat beside its trait twin until the next DAILY
        // pass). Cheap when there is nothing to do — every stage inside
        // skips below two pending rows — and User Mode only, same as the
        // background scan.
        return mergePendingCandidates(database, owner.id, null);
      })
      .then((merge) => {
        if (merge.merged > 0) {
          app.log.info({ merged: merge.merged }, "vaenyx me proposals merged");
        }
      })
      .catch((error) => app.log.error(error));
  }, 60 * 60_000);
  factsTick.unref();

  // Event-loop stall detector. On 2026-08-06 the Owner's instance degraded
  // after about an hour into answering every second or third request 2.5-4
  // seconds late — while burning ZERO cpu, with no child process, no
  // outbound socket, a 1.3 MB database and a disk that read the same files
  // in 2 ms. A freshly started process on the SAME code and the SAME data
  // answered in 1-14 ms, so it was the running process that had degraded,
  // and every artefact that could have explained it (logs, database, memory,
  // paging, antivirus) had already been ruled out by measurement. What was
  // missing was a witness INSIDE the process.
  //
  // This is that witness: a 500 ms timer that reports how late it actually
  // fired. Late by more than a second means the loop was blocked (or the
  // process was not scheduled) for that long, and the line lands in the
  // ordinary log next to the requests it delayed. Costs two timestamps a
  // second and says nothing at all while the instance is healthy.
  const STALL_TICK_MS = 500;
  const STALL_REPORT_MS = 1_000;
  let lastTickAt = Date.now();
  const stallTick = setInterval(() => {
    const now = Date.now();
    const late = now - lastTickAt - STALL_TICK_MS;
    lastTickAt = now;
    if (late >= STALL_REPORT_MS) {
      app.log.warn(
        { stalledForMs: late },
        "Event loop stalled: something blocked this process. Requests during this window were late by about this long.",
      );
    }
  }, STALL_TICK_MS);
  stallTick.unref();

  // Restart flag: a deploy (or any local tool) touches
  // userdata/config/restart-requested.flag and Vaenyx exits cleanly; the
  // watchdog (Vaenyx-Service-Run.cmd) brings it back on the NEW build within
  // seconds — no elevated kill, no manual stop/start. Local-file trigger is
  // fine under the local-first threat model: whoever can write this file can
  // already read the database next to it.
  const restartFlag = resolve(
    config.dataDirectory,
    "..",
    "config",
    "restart-requested.flag",
  );
  const restartTick = setInterval(() => {
    if (config.mode === "test" || !existsSync(restartFlag)) return;
    try {
      rmSync(restartFlag, { force: true });
    } catch {
      return; // Try again next tick rather than boot-looping on a stuck file.
    }
    app.log.info("Restart flag detected; exiting for the watchdog to restart.");
    void app.close().finally(() => {
      process.exit(0);
    });
  }, 5_000);
  restartTick.unref();

  app.addHook("onClose", async () => {
    clearInterval(schedulerTick);
    clearInterval(vaenyxMeScanTick);
    clearTimeout(vaenyxMeWarmup);
    clearInterval(restartTick);
    clearInterval(stallTick);
    database.close();
  });

  app.addHook("onRequest", async (request, reply) => {
    renewSessionOnUse(database, request, reply);
  });

  // THE CSP SCRIPT HASH IS COMPUTED, NOT WRITTEN DOWN.
  //
  // It used to be a literal in this file — the sha256 of an inline script that
  // lives in a different package (apps/web/index.html). Editing that file
  // therefore broke the whole app, silently and completely: the browser
  // refuses the inline script, nothing boots, the page is blank, and NOTHING
  // in the build says a word. That is exactly what happened (2026-08-08, the
  // Owner got a white screen and a CSP error in the console).
  //
  // So the header is built at startup from the file actually being served. A
  // hash that is derived can never disagree with the thing it describes.
  const inlineScriptHashes = (() => {
    try {
      const html = readFileSync(
        resolve(config.webDistDirectory, "index.html"),
        "utf8",
      );
      const hashes: string[] = [];
      // Inline only: a <script> with a src is covered by 'self'.
      for (const match of html.matchAll(
        /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
      )) {
        const body = match[1] ?? "";
        if (!body.trim()) continue;
        hashes.push(
          `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`,
        );
      }
      return hashes;
    } catch {
      // No built web app (a server-only test run). No inline script to allow.
      return [];
    }
  })();

  const contentSecurityPolicy = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self'${inlineScriptHashes.length ? ` ${inlineScriptHashes.join(" ")}` : ""}`,
    "connect-src 'self'",
    // blob: in img-src carries the instant photo thumbnail (a local object
    // URL shown while the upload runs) — same-origin blobs only, no remote
    // fetch is opened up by it.
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ");

  app.addHook("onSend", async (_request, reply) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("content-security-policy", contentSecurityPolicy);

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
      // A MISSING ASSET IS A 404, NEVER THE HOME PAGE (Oskar, 2026-08-15:
      // the phone went white). Every deploy renames the hashed bundles, so a
      // page held over from an older build asks for JS files that no longer
      // exist — and this fallback used to answer those requests with
      // index.html, HTTP 200. The browser then parsed HTML as JavaScript and
      // painted nothing. Asset names are content-addressed: if the exact
      // file is not on disk, the only honest answer is "gone", which lets
      // the page fail loudly and the retry shell take over.
      if (request.url.startsWith("/assets/")) {
        return reply.code(404).send({ error: "Not Found" });
      }

      return reply.sendFile("index.html");
    });
  }

  return app;
}
