// Boots the PRODUCTION build against a throwaway data directory for the
// Playwright UI smoke test (playwright.config.mjs webServer). Self-contained
// so the cleanup happens exactly once, in one process, regardless of how many
// worker processes import the Playwright config.
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dataDirectory = resolve(tmpdir(), "vaenyx-ui-smoke", "userdata");

rmSync(resolve(dataDirectory, ".."), { force: true, recursive: true });
mkdirSync(dataDirectory, { recursive: true });

const child = spawn(process.execPath, ["apps/server/dist/index.js"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VAENYX_DATA_DIR: dataDirectory,
    VAENYX_HOST: "127.0.0.1",
    VAENYX_LOG_LEVEL: "silent",
    VAENYX_PORT: process.env.VAENYX_PORT ?? "3198",
  },
  stdio: "inherit",
});

child.once("exit", (code) => process.exit(code ?? 0));
process.once("SIGTERM", () => child.kill("SIGTERM"));
process.once("SIGINT", () => child.kill("SIGINT"));
