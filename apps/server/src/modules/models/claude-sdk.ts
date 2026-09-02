// THE CLAUDE AGENT SDK, LOADED ONLY IF SOMEBODY USES IT.
//
// Its Windows platform package is 253 MB — over half of everything a new
// install downloads — and it is of use to exactly one group of people: those
// who connect a Claude subscription. Everyone on Gemini, Groq or ChatGPT was
// downloading a quarter of a gigabyte to never touch it (measured on the
// reference machine: node_modules 497 MB, of which
// @anthropic-ai/claude-agent-sdk-win32-x64 is 253 MB).
//
// So it is not a dependency any more. It is a component, installed the first
// time the Claude subscription is connected — the same shape as the ChatGPT
// sign-in component — into Vaenyx's own tools folder.
//
// 🔴 THAT MEANS THE PACKAGE IS ABSENT AT BUILD TIME, so nothing here may
// import its types. The shapes below are OURS: the narrow slice this codebase
// actually uses, hand-written and deliberately small, because every field
// declared here is a field that can drift from the real SDK. What we use is
// query(), tool(), createSdkMcpServer() and the user-message shape — nothing
// else. If a future change needs more of the SDK's surface, add it here, not
// by reaching for the package's own types.
import { createRequire } from "node:module";
import {
  installComponent,
  type ComponentEnsureResult,
} from "../core/component-install.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  captureOwnerSafeError,
  OwnerDiagnosticError,
} from "../../runtime/owner-safe-errors.js";

export const CLAUDE_SDK_PACKAGE = "@anthropic-ai/claude-agent-sdk";

export class ClaudeSdkNotInstalledError extends Error {
  constructor(cause?: unknown) {
    super(
      "CLAUDE_SDK_NOT_INSTALLED",
      cause === undefined ? undefined : { cause },
    );
    this.name = "ClaudeSdkNotInstalledError";
  }
}

/** One user turn as the SDK streams it in. Only the fields we send. */
export interface SdkUserMessage {
  type: "user";
  message: {
    role: "user";
    content: string | Record<string, unknown>[];
  };
  parent_tool_use_id: string | null;
}

/** An MCP server instance the SDK hands back from createSdkMcpServer. */
export type SdkMcpServer = Record<string, unknown>;

/** One piece of an assistant turn. Only the three kinds this codebase reads. */
export type SdkAssistantBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; name: string };

/**
 * What comes back down the stream. The SDK emits more kinds than these; the
 * ones not listed are the ones nothing here branches on, and an unlisted kind
 * arriving at runtime is simply a message no branch matches — which is what
 * already happened when they were typed in full.
 */
export type SdkMessage =
  | { type: "assistant"; message: { content: SdkAssistantBlock[] } }
  | { type: "result"; subtype: "success"; result: string }
  | { type: "result"; subtype: "error_during_execution" | "error_max_turns" }
  | { type: "stream_event" | "system" | "user" };

export interface ClaudeSdk {
  createSdkMcpServer: (config: {
    name: string;
    tools: unknown[];
    version?: string;
  }) => SdkMcpServer;
  query: (args: {
    prompt: string | AsyncIterable<SdkUserMessage>;
    options: Record<string, unknown>;
  }) => AsyncIterable<SdkMessage>;
  tool: (
    name: string,
    description: string,
    schema: Record<string, unknown>,
    handler: (args: never) => Promise<unknown> | unknown,
  ) => unknown;
}

// Where the component is installed, and where it is looked for first. Same
// folder the ChatGPT component uses, for the same reason: named by Vaenyx, so
// it does not depend on which Windows account runs the server.
export function claudeSdkRoot(dataDirectory: string): string {
  return resolve(dataDirectory, "..", "tools");
}

let toolsDirectory: string | null = null;
let cached: ClaudeSdk | null = null;

export function setClaudeSdkToolsDirectory(dataDirectory: string): void {
  toolsDirectory = claudeSdkRoot(dataDirectory);
  cached = null;
}

/**
 * node_modules folders a Claude component may sit in, nearest first.
 *
 * ⚠ The `claude` executable does NOT land beside the SDK. Measured on a real
 * install (2026-08-07): npm puts the platform package
 * @anthropic-ai/claude-agent-sdk-win32-x64 INSIDE the SDK's own node_modules,
 * not hoisted to the top — so a lookup that only knows the top level finds
 * the SDK, reports the component installed, and then cannot sign in. Both
 * folders are searched, because hoisting differs between npm versions and the
 * one that is wrong today may be the right one tomorrow.
 */
export function claudeComponentRoots(): string[] {
  if (!toolsDirectory) return [];
  const top = resolve(toolsDirectory, "node_modules");
  return [resolve(top, ...CLAUDE_SDK_PACKAGE.split("/"), "node_modules"), top];
}

/**
 * The FILE to import, or null. Returned as the entry rather than the package
 * folder because the two ways of finding it answer differently:
 *
 *   • the installed component is found by path, so its package.json is read
 *     off the disk to learn its entry point;
 *   • an ordinary node_modules copy is found by resolution, which hands back
 *     the entry file and REFUSES to hand back the manifest —
 *     require.resolve("<pkg>/package.json") raises
 *     ERR_PACKAGE_PATH_NOT_EXPORTED on this package (verified 2026-08-07).
 *     Asking for the manifest is the obvious-looking move and it never works.
 */
function installedEntryPoint(): string | null {
  if (toolsDirectory) {
    const root = resolve(
      toolsDirectory,
      "node_modules",
      ...CLAUDE_SDK_PACKAGE.split("/"),
    );
    const manifestPath = resolve(root, "package.json");
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
          main?: string;
          module?: string;
        };
        const entry = resolve(
          root,
          manifest.module ?? manifest.main ?? "index.js",
        );
        if (existsSync(entry)) return entry;
      } catch {
        // A half-written install: fall through and try resolution instead.
      }
    }
  }
  // A development checkout, or an instance from back when the SDK was an
  // ordinary dependency, must keep working without reinstalling anything.
  try {
    return createRequire(import.meta.url).resolve(CLAUDE_SDK_PACKAGE);
  } catch {
    return null;
  }
}

/** Is the component on this machine? The question is always "is it there",
 *  never "is there a key" — the two go out of step the moment somebody
 *  connects on one machine and restores userdata onto another. */
export function isClaudeSdkInstalled(): boolean {
  return installedEntryPoint() !== null;
}

/** The SDK, or a refusal that names itself. Never throws the loader's own
 *  error text at anybody: callers turn this one code into a sentence. */
export async function loadClaudeSdk(): Promise<ClaudeSdk> {
  if (cached) return cached;
  const entry = installedEntryPoint();
  if (!entry) throw new ClaudeSdkNotInstalledError();
  try {
    const loaded = (await import(
      pathToFileURL(entry).href
    )) as Partial<ClaudeSdk> & { default?: Partial<ClaudeSdk> };
    const sdk = (loaded.query ? loaded : loaded.default) as
      | ClaudeSdk
      | undefined;
    if (!sdk?.query) throw new ClaudeSdkNotInstalledError();
    cached = sdk;
    return sdk;
  } catch (error) {
    if (error instanceof ClaudeSdkNotInstalledError) throw error;
    // Present but unloadable — a truncated download, a half-written install.
    // The refusal stays one code; the reason rides along for the log.
    throw new ClaudeSdkNotInstalledError(error);
  }
}

/**
 * Fetch the component. Returns what happened in a form the connect card can
 * turn into a sentence — a failure here disables the Claude subscription and
 * nothing else.
 */
// ONE install at a time (sweep, 2026-08-16): the boot installer and the
// sign-in button share no lock, and two concurrent npm installs into the
// same prefix can corrupt the tree. A second caller awaits the first's.
let claudeInstallInFlight: Promise<ComponentEnsureResult> | null = null;

export function ensureClaudeSdkInstalled(
  dataDirectory: string,
): Promise<ComponentEnsureResult> {
  if (claudeInstallInFlight) return claudeInstallInFlight;
  claudeInstallInFlight = installClaudeSdkOnce(dataDirectory).finally(() => {
    claudeInstallInFlight = null;
  });
  return claudeInstallInFlight;
}

async function installClaudeSdkOnce(
  dataDirectory: string,
): Promise<ComponentEnsureResult> {
  if (isClaudeSdkInstalled()) return { status: "ready" };
  const result = await installComponent({
    dataDirectory,
    packageName: CLAUDE_SDK_PACKAGE,
  });
  if (!result.ok) {
    return { status: "install-failed", ownerError: result.ownerError };
  }
  // A fresh copy sits somewhere nothing has looked yet.
  cached = null;
  if (isClaudeSdkInstalled()) return { status: "installed" };
  return {
    status: "install-failed",
    ownerError: captureOwnerSafeError(
      new OwnerDiagnosticError("CLAUDE_COMPONENT_MISSING_AFTER_INSTALL"),
      "component-install",
    ),
  };
}

/**
 * UPGRADING FROM A BUILD THAT SHIPPED THE SDK. Until 2026-08-07 it was an
 * ordinary dependency, so every existing install has it in node_modules — and
 * the upgrade prunes it, because the dependency is gone. An Owner who was
 * using their Claude subscription would come back from an update to a channel
 * that no longer works, having done nothing and been told nothing.
 *
 * So: if this instance is CONNECTED to the Claude subscription and the
 * component is not here, fetch it once, quietly, in the background. Nobody who
 * is not connected downloads anything, the server does not wait for it, and a
 * failure is a log line — never a startup that does not finish.
 */
export function restoreClaudeSdkForConnectedInstance(options: {
  connected: boolean;
  dataDirectory: string;
  onDone?: (outcome: "installed" | "install-failed") => void;
}): void {
  if (!options.connected || isClaudeSdkInstalled()) return;
  void ensureClaudeSdkInstalled(options.dataDirectory).then(
    // "ready" cannot happen here — it was checked a line ago — and "installed"
    // is the good ending, not a problem to report. Both outcomes are passed on
    // and it is the caller that decides what deserves a log line.
    (result) => {
      if (result.status !== "ready") options.onDone?.(result.status);
    },
    () => options.onDone?.("install-failed"),
  );
}
