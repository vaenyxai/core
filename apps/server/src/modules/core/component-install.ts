// INSTALLING A COMPONENT ON DEMAND — the one way Vaenyx fetches an optional
// piece of itself, shared by the ChatGPT sign-in component and the Claude
// Agent SDK.
//
// Two things are settled here because both were got wrong separately before:
//
// 1. HOW npm IS RUN. Not as a command name and not through a shell: node is
//    installed at "C:\Program Files\nodejs", and spawning npm.cmd with
//    shell: true makes cmd.exe stop at the space — 'C:\Program' is not
//    recognized. That shipped for weeks and broke the sign-in on every new PC
//    while being invisible on any machine that already had the component
//    (2026-08-07). Measured alternatives on that exact path: shell:false on a
//    .cmd raises spawn EINVAL; cmd /c with double-quote wrapping answered
//    "The network path was not found"; node running npm's own npm-cli.js
//    exited 0, including an install into a prefix that itself has a space in
//    it. So: node, npm's script, no shell, nothing to quote.
//
// 2. WHERE IT LANDS. In Vaenyx's own userdata/tools, never a user profile.
//    `npm install -g` writes into the profile of whoever runs it, and the
//    server usually runs as SYSTEM, whose profile is somewhere the next
//    lookup may not reach.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { OwnerSafeError } from "@vaenyx/contracts";

import {
  appendBoundedDiagnostic,
  captureOwnerSafeError,
  OwnerDiagnosticError,
} from "../../runtime/owner-safe-errors.js";

export interface NpmRunner {
  args: string[];
  command: string;
  shell: boolean;
}

export function npmRunner(): NpmRunner {
  const cli = resolve(
    dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  if (existsSync(cli)) {
    return { args: [cli], command: process.execPath, shell: false };
  }
  // Unusual layout (npm somewhere else entirely): fall back rather than
  // refuse. This path is the one that cannot handle a space, so it is last.
  const beside = resolve(
    dirname(process.execPath),
    process.platform === "win32" ? "npm.cmd" : "npm",
  );
  return {
    args: [],
    command: existsSync(beside) ? beside : "npm",
    shell: process.platform === "win32",
  };
}

/** Vaenyx's own component folder: one path, whichever account runs the
 *  server, removed when the instance is. */
export function componentsRoot(dataDirectory: string): string {
  return resolve(dataDirectory, "..", "tools");
}

export type InstallResult =
  | { detail: string; ok: true; ownerError?: never }
  | {
      /** Stable code only. Raw output is retained in the redacted local log. */
      detail: string;
      ok: false;
      ownerError: OwnerSafeError;
    };

export type ComponentEnsureResult =
  | { status: "installed" | "ready"; ownerError?: never }
  | { status: "install-failed"; ownerError: OwnerSafeError };

/**
 * Install one package into the components folder. Resolves with ok:false
 * rather than throwing: a component that will not install must never be able
 * to stop the rest of Vaenyx.
 */
export function installComponent(options: {
  dataDirectory: string;
  environment?: NodeJS.ProcessEnv;
  packageName: string;
  prefix?: string;
  timeoutMs?: number;
}): Promise<InstallResult> {
  const prefix = options.prefix ?? componentsRoot(options.dataDirectory);
  try {
    mkdirSync(prefix, { recursive: true });
  } catch (error) {
    const ownerError = captureOwnerSafeError(
      new OwnerDiagnosticError("COMPONENT_DIRECTORY_FAILED", error),
      "component-install",
    );
    return Promise.resolve({
      ok: false,
      detail: ownerError.code,
      ownerError,
    });
  }
  const npm = npmRunner();
  return new Promise<InstallResult>((done) => {
    let output = "";
    let settled = false;
    const finish = (ok: boolean, diagnostic?: unknown) => {
      if (settled) return;
      settled = true;
      if (ok) {
        done({ ok: true, detail: "installed" });
        return;
      }
      const ownerError = captureOwnerSafeError(
        new OwnerDiagnosticError("COMPONENT_INSTALL_FAILED", diagnostic),
        "component-install",
      );
      done({ ok: false, detail: ownerError.code, ownerError });
    };
    const child = spawn(
      npm.command,
      [
        ...npm.args,
        "install",
        "-g",
        options.packageName,
        "--prefix",
        prefix,
        "--no-audit",
        "--no-fund",
      ],
      {
        env: options.environment ?? process.env,
        shell: npm.shell,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    child.stdout?.on("data", (chunk) => {
      output = appendBoundedDiagnostic(output, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      output = appendBoundedDiagnostic(output, chunk);
    });
    const timer = setTimeout(
      () => {
        try {
          child.kill();
        } catch {
          // Already gone.
        }
        finish(false, `${output}\nCOMPONENT_INSTALL_TIMEOUT`);
      },
      options.timeoutMs ?? 15 * 60_000,
    );
    timer.unref?.();
    child.once("error", (error) => {
      clearTimeout(timer);
      finish(false, `${output}\n${String(error)}`);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      finish(code === 0, `${output}\nexit=${code ?? "UNKNOWN"}`);
    });
  });
}
