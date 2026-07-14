import "dotenv/config";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

process.title = "Vaenyx Server";

const config = loadConfig();
const app = await buildApp(config);
let closing = false;

async function closeGracefully(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, "Stopping Vaenyx gracefully.");
  await app.close();
}

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
}
