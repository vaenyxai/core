import "dotenv/config";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import {
  acquireInstanceLock,
  type InstanceLock,
} from "./runtime/instance-lock.js";

process.title = "Vaenyx Server";

const config = loadConfig();
let instanceLock: InstanceLock;
try {
  instanceLock = acquireInstanceLock(config.instanceLockPath, "server");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
process.env.VAENYX_INSTANCE_LOCK_TOKEN = instanceLock.token;
process.env.VAENYX_INSTANCE_LOCK_PATH = config.instanceLockPath;

const app = await buildApp(config).catch((error: unknown) => {
  instanceLock.release();
  throw error;
});
let closing = false;

async function closeGracefully(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, "Stopping Vaenyx gracefully.");
  await app.close();
  instanceLock.release();
}

process.on("exit", () => instanceLock.release());

process.on("SIGINT", () => {
  void closeGracefully("SIGINT");
});

process.on("SIGTERM", () => {
  void closeGracefully("SIGTERM");
});

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
  await app.close();
  instanceLock.release();
}
