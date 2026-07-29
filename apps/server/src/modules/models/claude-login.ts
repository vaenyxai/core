// In-app Claude subscription sign-in — the CODEX-LOGIN PATTERN, nothing else
// ("调官方的,别重写官方的"). Vaenyx spawns the OFFICIAL claude binary that
// already ships inside the Agent SDK's platform package and drives its
// `auth login --claudeai` through plain pipes (probe-verified 2026-07-29: it
// prints the sign-in URL and waits on stdin for the pasted code — no TUI):
//
//   start → spawn the official login, relay its sign-in URL to the UI
//   (the Owner opens it on ANY device; claude.com shows a code after login)
//   code  → write the pasted code to the official process's stdin; IT does
//   the entire exchange and writes its own credentials
//
// No OAuth request is ever made by Vaenyx itself — no client id, no token
// endpoint, nothing. Credentials land in a Vaenyx-owned CLAUDE_CONFIG_DIR
// (userdata/claude-home — the same isolation codex-home uses), which the SDK
// chat child reads natively via the same env var.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

import { loadConfig } from "../../config.js";

const require = createRequire(import.meta.url);

// Vaenyx's own Claude config home: login state rides with userdata (survives
// service-account runs and machine moves), never mixed with any personal
// ~/.claude the machine might have. Not cached — VAENYX_CLAUDE_HOME must be
// honourable per call so tests stay hermetic.
export function getClaudeHomeDirectory(): string {
  const home = process.env.VAENYX_CLAUDE_HOME
    ? resolve(process.env.VAENYX_CLAUDE_HOME)
    : resolve(loadConfig().dataDirectory, "..", "claude-home");
  try {
    mkdirSync(home, { recursive: true });
  } catch {
    // Best-effort: the CLI reports clearly when the home is unusable.
  }
  return home;
}

// Signed in? ONLY when the official CLI's credentials sit in the VAENYX home,
// written by the in-app sign-in. A personal ~/.claude on the same machine
// deliberately does NOT count: the Owner never asked Vaenyx to use it, and
// silently borrowing someone's terminal login is not a connection they made.
export function claudeMachineLogin(): boolean {
  return existsSync(join(getClaudeHomeDirectory(), ".credentials.json"));
}

// The full claude executable ships in the Agent SDK's per-platform package —
// zero download, version-matched.
export function bundledClaudeExecutable(): string | null {
  const binary = process.platform === "win32" ? "claude.exe" : "claude";
  const candidates = [
    `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`,
    `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}-musl`,
  ];
  for (const packageName of candidates) {
    try {
      const path = join(
        dirname(require.resolve(`${packageName}/package.json`)),
        binary,
      );
      if (existsSync(path)) return path;
    } catch {
      // Platform package absent — try the next candidate.
    }
  }
  return null;
}

function loginEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (
      key === "ANTHROPIC_API_KEY" ||
      key === "ANTHROPIC_AUTH_TOKEN" ||
      key === "ANTHROPIC_BASE_URL"
    ) {
      continue;
    }
    environment[key] = value;
  }
  environment.CLAUDE_CONFIG_DIR = getClaudeHomeDirectory();
  // Never try to open a browser on the server box — the URL goes to the UI.
  environment.BROWSER = "none";
  environment.NO_COLOR = "1";
  return environment;
}

interface LoginSession {
  child: ChildProcessWithoutNullStreams;
  buffer: string;
  done: boolean;
}

let session: LoginSession | null = null;

function endSession(): void {
  if (session && !session.done) {
    session.done = true;
    try {
      session.child.kill();
    } catch {
      // Already gone.
    }
  }
  session = null;
}

export function cancelClaudeLogin(): void {
  endSession();
}

// Start the official login and wait for its sign-in URL.
export function startClaudeLogin(): Promise<{ url: string }> {
  endSession();
  const executable = bundledClaudeExecutable();
  if (!executable) {
    return Promise.reject(new Error("CLAUDE_LOGIN_NO_EXECUTABLE"));
  }
  const child = spawn(executable, ["auth", "login", "--claudeai"], {
    env: loginEnvironment(),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const next: LoginSession = { child, buffer: "", done: false };
  session = next;

  return new Promise<{ url: string }>((resolvePromise, rejectPromise) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (session === next) endSession();
      rejectPromise(new Error("CLAUDE_LOGIN_URL_TIMEOUT"));
    }, 30_000);

    const onData = (chunk: Buffer) => {
      next.buffer += chunk.toString();
      const match = next.buffer.match(
        /https:\/\/claude\.com\/[^\s"'>\]]*oauth[^\s"'>\]]+/,
      );
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise({ url: match[0] });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (session === next) session = null;
      rejectPromise(new Error("CLAUDE_LOGIN_EXITED"));
    });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (session === next) session = null;
      rejectPromise(new Error("CLAUDE_LOGIN_START_FAILED"));
    });
  });
}

// Feed the pasted code to the official process; IT completes the exchange and
// writes its credentials. Success = clean exit + credentials on disk.
export function submitClaudeLoginCode(code: string): Promise<void> {
  const active = session;
  if (!active || active.done) {
    return Promise.reject(new Error("CLAUDE_LOGIN_NOT_STARTED"));
  }
  active.child.stdin.write(`${code.trim()}\n`);

  return new Promise<void>((resolvePromise, rejectPromise) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      endSession();
      if (error) rejectPromise(error);
      else resolvePromise();
    };
    const timeout = setTimeout(() => {
      finish(new Error("CLAUDE_LOGIN_CODE_TIMEOUT"));
    }, 60_000);

    active.child.on("exit", (exitCode) => {
      if (exitCode === 0 && claudeMachineLogin()) {
        finish();
      } else {
        finish(new Error("CLAUDE_LOGIN_CODE_REJECTED"));
      }
    });
  });
}
