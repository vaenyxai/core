import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-production-smoke-"));
const port = "3199";
const child = spawn(process.execPath, ["apps/server/dist/index.js"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VAENYX_DATA_DIR: dataDirectory,
    VAENYX_HOST: "127.0.0.1",
    VAENYX_LOG_LEVEL: "silent",
    VAENYX_PORT: port,
  },
  stdio: "ignore",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error("Production server did not become healthy.");
}

try {
  await waitForServer();
  const html = await fetch(`http://127.0.0.1:${port}/`).then((response) =>
    response.text(),
  );
  const status = await fetch(`http://127.0.0.1:${port}/v1/system/status`).then(
    (response) => response.json(),
  );

  if (!html.includes("<title>Vaenyx</title>") || status.status !== "ready") {
    throw new Error("Production UI or API smoke test failed.");
  }

  console.log("Production smoke test passed.");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolveWait) => child.once("exit", resolveWait));
  rmSync(dataDirectory, { force: true, recursive: true });
}
