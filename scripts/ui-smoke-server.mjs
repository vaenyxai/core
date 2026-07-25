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
// The secrets directory must be throwaway too: without this the smoke run
// picks up the developer's REAL model keys, which both spends their tokens
// and makes the "fresh install" test lie (a connected model hides the
// first-run connect step).
const secretsDirectory = resolve(tmpdir(), "vaenyx-ui-smoke", "secrets");

rmSync(resolve(dataDirectory, ".."), { force: true, recursive: true });
mkdirSync(dataDirectory, { recursive: true });
mkdirSync(secretsDirectory, { recursive: true });

const child = spawn(process.execPath, ["apps/server/dist/index.js"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VAENYX_DATA_DIR: dataDirectory,
    VAENYX_SECRETS_DIR: secretsDirectory,
    // Point the Codex backend at a binary that cannot exist, so the smoke
    // run behaves like a virgin machine no matter what the developer has
    // installed and signed into locally.
    VAENYX_CODEX_COMMAND: "vaenyx-smoke-no-codex",
    VAENYX_HOST: "127.0.0.1",
    VAENYX_LOG_LEVEL: "silent",
    VAENYX_PORT: process.env.VAENYX_PORT ?? "3198",
  },
  stdio: "inherit",
});

child.once("exit", (code) => process.exit(code ?? 0));
process.once("SIGTERM", () => child.kill("SIGTERM"));
process.once("SIGINT", () => child.kill("SIGINT"));
