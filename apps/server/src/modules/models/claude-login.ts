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
// endpoint, nothing. Credentials land in a Vaenyx-owned CLAUDE_CONFIG_DIR,
// which the SDK chat child reads natively via the same env var.
//
// RELAY PROFILES (2026-08-02): every function here takes a profile key.
// "core" is Vaenyx's own login (userdata/claude-home, unchanged); an app
// profile id puts everything under userdata/profiles/<id>/claude-home. The
// same official binary, the same flow — only the directory is parameterised.
// Core and profiles never read each other's directories: Vaenyx changing its
// account cannot touch an app, and no app can touch Vaenyx or another app.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

import { loadConfig } from "../../config.js";
import { claudeComponentRoots } from "./claude-sdk.js";

const require = createRequire(import.meta.url);

export const CORE_PROFILE = "core";

// A profile key is either "core" or an app_profiles.id (a randomUUID). It
// becomes a directory name, so anything outside that shape is refused before
// it can reach the filesystem — an app key must be physically unable to point
// this module at a path of its choosing.
export function assertProfileKey(profileKey: string): void {
  if (profileKey === CORE_PROFILE) return;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileKey)) {
    return;
  }
  throw new Error("RELAY_PROFILE_INVALID");
}

// Vaenyx's own Claude config home: login state rides with userdata (survives
// service-account runs and machine moves), never mixed with any personal
// ~/.claude the machine might have. Not cached — VAENYX_CLAUDE_HOME must be
// honourable per call so tests stay hermetic.
export function getClaudeHomeDirectory(profileKey: string = CORE_PROFILE): string {
  assertProfileKey(profileKey);
  const home =
    profileKey === CORE_PROFILE
      ? process.env.VAENYX_CLAUDE_HOME
        ? resolve(process.env.VAENYX_CLAUDE_HOME)
        : resolve(loadConfig().dataDirectory, "..", "claude-home")
      : resolve(
          loadConfig().dataDirectory,
          "..",
          "profiles",
          profileKey,
          "claude-home",
        );
  try {
    mkdirSync(home, { recursive: true });
  } catch {
    // Best-effort: the CLI reports clearly when the home is unusable.
  }
  return home;
}

// Signed in? ONLY when the official CLI's credentials sit in the asked-for
// home, written by the in-app sign-in. A personal ~/.claude on the same
// machine deliberately does NOT count — and a PROFILE never counts as signed
// in because CORE is: each directory answers only for itself.
export function claudeMachineLogin(profileKey: string = CORE_PROFILE): boolean {
  return existsSync(
    join(getClaudeHomeDirectory(profileKey), ".credentials.json"),
  );
}

// THE OWNER'S ONE-CLICK GRANT (Oskar, 2026-08-30): copy the Owner's own
// machine login into an app profile's home — the profile is signed in from
// that moment, with its own independent copy (revoking the app never touches
// the Owner's file). Only the machine-login file can be granted; an Owner
// whose Claude rides a pasted setup token has no file to copy, and the
// button says so instead of pretending.
export function grantClaudeLoginToProfile(profileKey: string): void {
  if (profileKey === CORE_PROFILE) throw new Error("RELAY_PROFILE_INVALID");
  const coreCredentials = join(
    getClaudeHomeDirectory(CORE_PROFILE),
    ".credentials.json",
  );
  if (!existsSync(coreCredentials)) {
    throw new Error("RELAY_OWNER_NOT_SIGNED_IN:claude-cli");
  }
  // getClaudeHomeDirectory validates the profile key and creates the home.
  copyFileSync(
    coreCredentials,
    join(getClaudeHomeDirectory(profileKey), ".credentials.json"),
  );
}

// When this login landed — the credentials file's own timestamp, which is the
// honest answer and needs no bookkeeping. Null when not signed in.
export function claudeLoginConnectedAt(
  profileKey: string = CORE_PROFILE,
): string | null {
  try {
    return statSync(
      join(getClaudeHomeDirectory(profileKey), ".credentials.json"),
    ).mtime.toISOString();
  } catch {
    return null;
  }
}

// The full claude executable ships in the Agent SDK's per-platform package —
// zero download, version-matched. VAENYX_CLAUDE_LOGIN_COMMAND overrides it in
// tests only, mirroring VAENYX_CODEX_COMMAND: the login flow (URL out, code
// in, credentials written) is real behaviour worth testing without burning a
// real sign-in.
export function bundledClaudeExecutable(): string | null {
  if (process.env.VAENYX_CLAUDE_LOGIN_COMMAND) {
    return process.env.VAENYX_CLAUDE_LOGIN_COMMAND;
  }
  const binary = process.platform === "win32" ? "claude.exe" : "claude";
  const candidates = [
    `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`,
    `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}-musl`,
  ];
  for (const packageName of candidates) {
    // The on-demand component first: on a normal install the SDK is not in the
    // app's own node_modules at all, it is in userdata/tools.
    for (const root of claudeComponentRoots()) {
      const path = join(root, ...packageName.split("/"), binary);
      if (existsSync(path)) return path;
    }
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

function loginEnvironment(profileKey: string): Record<string, string> {
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
  environment.CLAUDE_CONFIG_DIR = getClaudeHomeDirectory(profileKey);
  // Never try to open a browser on the server box — the URL goes to the UI.
  environment.BROWSER = "none";
  environment.NO_COLOR = "1";
  return environment;
}

interface LoginSession {
  child: ChildProcessWithoutNullStreams;
  buffer: string;
  done: boolean;
  // Whatever happens, a session does not outlive this: an app that starts a
  // login and walks away must not leave a child process waiting on stdin
  // forever.
  maxAge: NodeJS.Timeout;
}

// One session PER PROFILE, never one for the module (the fix 2026-08-02).
// The old single `session` variable meant two apps signing in at once fought
// over it: the second start overwrote the first, whose complete-call then
// found somebody else's process — or nothing. Claude's flow is pipe-based, so
// concurrent sessions in different directories coexist happily.
const sessions = new Map<string, LoginSession>();

const SESSION_MAX_AGE_MS = 10 * 60_000;

function endSession(profileKey: string): void {
  const active = sessions.get(profileKey);
  if (!active) return;
  sessions.delete(profileKey);
  clearTimeout(active.maxAge);
  if (!active.done) {
    active.done = true;
    try {
      active.child.kill();
    } catch {
      // Already gone.
    }
  }
}

export function cancelClaudeLogin(profileKey: string = CORE_PROFILE): void {
  assertProfileKey(profileKey);
  endSession(profileKey);
}

// Wipe a profile's Claude login: any in-flight sign-in for it dies with it,
// and the whole home goes rather than the one file, so the CLI's session
// caches beside the credentials go too. Never for core — Vaenyx's own login
// is disconnected from Settings, not from an app.
export function disconnectClaudeProfile(profileKey: string): void {
  assertProfileKey(profileKey);
  if (profileKey === CORE_PROFILE) throw new Error("RELAY_PROFILE_INVALID");
  endSession(profileKey);
  rmSync(getClaudeHomeDirectory(profileKey), { force: true, recursive: true });
}

// Start the official login and wait for its sign-in URL.
export function startClaudeLogin(
  profileKey: string = CORE_PROFILE,
): Promise<{ url: string }> {
  assertProfileKey(profileKey);
  endSession(profileKey);
  const executable = bundledClaudeExecutable();
  if (!executable) {
    return Promise.reject(new Error("CLAUDE_LOGIN_NO_EXECUTABLE"));
  }
  const child = spawn(executable, ["auth", "login", "--claudeai"], {
    env: loginEnvironment(profileKey),
    // The test override is a wrapper script, and Windows will not spawn a
    // .cmd without a shell. The real bundled binary never takes this branch.
    shell: Boolean(process.env.VAENYX_CLAUDE_LOGIN_COMMAND),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const next: LoginSession = {
    child,
    buffer: "",
    done: false,
    maxAge: setTimeout(() => endSession(profileKey), SESSION_MAX_AGE_MS),
  };
  next.maxAge.unref?.();
  sessions.set(profileKey, next);

  return new Promise<{ url: string }>((resolvePromise, rejectPromise) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (sessions.get(profileKey) === next) endSession(profileKey);
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
      if (sessions.get(profileKey) === next) endSession(profileKey);
      rejectPromise(new Error("CLAUDE_LOGIN_EXITED"));
    });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (sessions.get(profileKey) === next) endSession(profileKey);
      rejectPromise(new Error("CLAUDE_LOGIN_START_FAILED"));
    });
  });
}

// Feed the pasted code to the official process; IT completes the exchange and
// writes its credentials. Success = clean exit + credentials on disk, in THIS
// profile's directory — completing a login can never mark a different profile
// connected, because the check reads the same directory the child wrote.
export function submitClaudeLoginCode(
  code: string,
  profileKey: string = CORE_PROFILE,
): Promise<void> {
  assertProfileKey(profileKey);
  const active = sessions.get(profileKey);
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
      endSession(profileKey);
      if (error) rejectPromise(error);
      else resolvePromise();
    };
    const timeout = setTimeout(() => {
      finish(new Error("CLAUDE_LOGIN_CODE_TIMEOUT"));
    }, 60_000);

    active.child.on("exit", (exitCode) => {
      if (exitCode === 0 && claudeMachineLogin(profileKey)) {
        finish();
      } else {
        finish(new Error("CLAUDE_LOGIN_CODE_REJECTED"));
      }
    });
  });
}
