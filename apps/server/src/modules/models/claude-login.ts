// In-app Claude subscription sign-in ("帮用户搞定,点一下弹出网页", Oskar
// 2026-07-29). Users cannot be asked to install a CLI and read a terminal —
// so the server drives the OFFICIAL `setup-token` flow itself, under a
// pseudo-terminal, using the claude executable that already ships inside the
// Agent SDK's platform package (zero download, version-matched, no protocol
// re-implementation):
//
//   start  → spawn `claude setup-token` in a pty, capture the sign-in URL
//   (the Owner opens it on ANY device; claude.com shows a code after login)
//   code   → write the pasted code into the pty, capture the long-lived
//   token from the output, save it as the claude-sub connection
//
// One login session at a time; a new start replaces the old. The child env
// strips every Anthropic API-key path — this flow can only ever produce a
// subscription login.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { spawn, type IPty } from "node-pty";

import { connectModelProvider } from "./provider-settings.js";

const require = createRequire(import.meta.url);

// The Agent SDK ships the full claude executable in a per-platform package.
function bundledClaudeExecutable(): string | null {
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

function cleanEnvironment(): Record<string, string> {
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
  // Never try to open a browser on the server box — the URL goes to the UI.
  environment.BROWSER = "none";
  return environment;
}

// Strip ANSI/OSC terminal decoration so the URL and token can be matched.
// Built from char codes rather than literals, so no control characters live
// in the source (and no-control-regex stays honest).
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const OSC_RE = new RegExp(`${ESC}\\][^]*?(?:${BEL}|${ESC}\\\\)`, "g");
const CSI_RE = new RegExp(`${ESC}\\[[0-9;?]*[A-Za-z]`, "g");
const MODE_RE = new RegExp(`${ESC}[=>]`, "g");

function stripTerminalCodes(raw: string): string {
  return raw.replace(OSC_RE, "").replace(CSI_RE, "").replace(MODE_RE, "");
}

interface LoginSession {
  child: IPty;
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

// Spawn the flow and wait for the sign-in URL (the pty is 500 columns wide so
// the URL never line-wraps). Times out rather than hanging the request.
export function startClaudeLogin(): Promise<{ url: string }> {
  endSession();
  const executable = bundledClaudeExecutable();
  if (!executable) {
    return Promise.reject(new Error("CLAUDE_LOGIN_NO_EXECUTABLE"));
  }
  const child = spawn(executable, ["setup-token"], {
    name: "xterm-color",
    cols: 500,
    rows: 50,
    env: cleanEnvironment(),
  });
  const next: LoginSession = { child, buffer: "", done: false };
  session = next;

  return new Promise<{ url: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (session === next) endSession();
      reject(new Error("CLAUDE_LOGIN_URL_TIMEOUT"));
    }, 30_000);

    child.onData((data) => {
      next.buffer += data;
      const cleaned = stripTerminalCodes(next.buffer).replace(/[\r\n]/g, "");
      const match = cleaned.match(
        /https:\/\/claude\.com\/[^\s\\"'>\]]*oauth[^\s\\"'>\]]+/,
      );
      if (match) {
        clearTimeout(timeout);
        resolve({ url: match[0] });
      }
    });
    child.onExit(() => {
      clearTimeout(timeout);
      if (session === next) session = null;
      reject(new Error("CLAUDE_LOGIN_EXITED"));
    });
  });
}

// Feed the code the Owner pasted, wait for the long-lived token, save it as
// the claude-sub connection. The token itself never leaves this function
// except into the secrets file.
export function submitClaudeLoginCode(
  config: { secretsDirectory: string },
  code: string,
): Promise<void> {
  const active = session;
  if (!active || active.done) {
    return Promise.reject(new Error("CLAUDE_LOGIN_NOT_STARTED"));
  }
  const markStart = active.buffer.length;
  active.child.write(`${code.trim()}\r`);

  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      clearInterval(poll);
      endSession();
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => {
      finish(new Error("CLAUDE_LOGIN_CODE_TIMEOUT"));
    }, 60_000);
    // Poll the buffer: onData already appends, so a simple interval keeps this
    // handler-independent of the earlier subscription.
    const poll = setInterval(() => {
      const fresh = stripTerminalCodes(active.buffer.slice(markStart));
      const token = fresh.replace(/[\r\n\s]/g, "").match(
        /sk-ant-[A-Za-z0-9_-]{40,}/,
      );
      if (token) {
        try {
          connectModelProvider({ secretsDirectory: config.secretsDirectory }, "claude-sub", {
            apiKey: token[0],
          });
          finish();
        } catch (error) {
          finish(
            error instanceof Error
              ? error
              : new Error("CLAUDE_LOGIN_SAVE_FAILED"),
          );
        }
        return;
      }
      if (/invalid|error|expired|denied/i.test(fresh)) {
        finish(new Error("CLAUDE_LOGIN_CODE_REJECTED"));
      }
    }, 300);
  });
}
