// The Claude Agent SDK stopped being a dependency and became a component
// fetched on demand (2026-08-07): it is 253 MB, and only the people who
// connect a Claude subscription ever touch it. These tests hold the three
// things that make that safe rather than merely smaller.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { npmRunner } from "../src/modules/core/component-install.js";
import { bundledClaudeExecutable } from "../src/modules/models/claude-login.js";
import {
  CLAUDE_SDK_PACKAGE,
  ClaudeSdkNotInstalledError,
  claudeComponentRoots,
  isClaudeSdkInstalled,
  loadClaudeSdk,
  restoreClaudeSdkForConnectedInstance,
  setClaudeSdkToolsDirectory,
} from "../src/modules/models/claude-sdk.js";

const temporaries: string[] = [];

function scratchInstance(): { dataDirectory: string; toolsRoot: string } {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-sdk-"));
  temporaries.push(root);
  const dataDirectory = join(root, "db");
  mkdirSync(dataDirectory, { recursive: true });
  return { dataDirectory, toolsRoot: join(root, "tools") };
}

/** A stand-in for the installed component: a package.json and an entry point
 *  exporting the four things this codebase uses. */
function placeComponent(toolsRoot: string, entry = "sdk.mjs"): void {
  const target = join(toolsRoot, "node_modules", ...CLAUDE_SDK_PACKAGE.split("/"));
  mkdirSync(target, { recursive: true });
  writeFileSync(
    join(target, "package.json"),
    JSON.stringify({ name: CLAUDE_SDK_PACKAGE, main: entry, version: "0.0.0" }),
  );
  writeFileSync(
    join(target, entry),
    "export const query = () => ({});\n" +
      "export const tool = () => ({});\n" +
      "export const createSdkMcpServer = () => ({});\n",
  );
}

afterEach(() => {
  setClaudeSdkToolsDirectory(join(tmpdir(), "vaenyx-sdk-none"));
  while (temporaries.length) {
    rmSync(temporaries.pop() as string, { force: true, recursive: true });
  }
});

describe("the Claude subscription component", () => {
  it("is looked for where Vaenyx puts it, not in a Windows profile", () => {
    const { dataDirectory, toolsRoot } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    expect(claudeComponentRoots()).toContain(join(toolsRoot, "node_modules"));
  });

  it("finds the sign-in binary where npm actually puts it", () => {
    // Measured, not assumed: npm nests the platform package inside the SDK's
    // own node_modules rather than hoisting it. A lookup that only knew the
    // top level would report the component installed and then fail to sign in.
    const { dataDirectory, toolsRoot } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    const nested = join(
      toolsRoot,
      "node_modules",
      ...CLAUDE_SDK_PACKAGE.split("/"),
      "node_modules",
      "@anthropic-ai",
      `claude-agent-sdk-${process.platform}-${process.arch}`,
    );
    mkdirSync(nested, { recursive: true });
    const binary = join(
      nested,
      process.platform === "win32" ? "claude.exe" : "claude",
    );
    writeFileSync(binary, "");
    expect(bundledClaudeExecutable()).toBe(binary);
  });

  it("reports itself present or absent by whether the files are there", () => {
    const { dataDirectory, toolsRoot } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    // The question is never "is there a key": a userdata folder restored onto
    // a different computer carries the connection and not the component, and
    // answering from the key would claim a 253 MB package that is not there.
    expect(isClaudeSdkInstalled()).toBe(false);
    placeComponent(toolsRoot);
    expect(isClaudeSdkInstalled()).toBe(true);
  });

  it("refuses by name when it is missing, rather than throwing a module error", async () => {
    const { dataDirectory } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    await expect(loadClaudeSdk()).rejects.toBeInstanceOf(
      ClaudeSdkNotInstalledError,
    );
  });

  it("loads the installed copy", async () => {
    const { dataDirectory, toolsRoot } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    placeComponent(toolsRoot);
    const sdk = await loadClaudeSdk();
    expect(typeof sdk.query).toBe("function");
    expect(typeof sdk.tool).toBe("function");
    expect(typeof sdk.createSdkMcpServer).toBe("function");
  });

  it("downloads nothing for an instance that does not use Claude", () => {
    const { dataDirectory } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    let outcome: string | null = null;
    // Not connected: the upgrade must be free for everyone on Gemini, Groq or
    // ChatGPT — which is the entire point of the change.
    restoreClaudeSdkForConnectedInstance({
      connected: false,
      dataDirectory,
      onDone: (result) => (outcome = result),
    });
    expect(outcome).toBeNull();
    expect(isClaudeSdkInstalled()).toBe(false);
  });

  it("does not re-download for a connected instance that still has it", () => {
    const { dataDirectory, toolsRoot } = scratchInstance();
    setClaudeSdkToolsDirectory(dataDirectory);
    placeComponent(toolsRoot);
    let called = false;
    restoreClaudeSdkForConnectedInstance({
      connected: true,
      dataDirectory,
      onDone: () => (called = true),
    });
    expect(called).toBe(false);
  });
});

describe("how a component is fetched", () => {
  it("runs npm as a script through node, never through a shell", () => {
    // The one that shipped broken for weeks: node lives at
    // "C:\\Program Files\\nodejs", and npm.cmd through a shell makes cmd.exe
    // stop at the space. Every new PC was told the sign-in component could not
    // be installed; no machine that already had it ever ran the line.
    const runner = npmRunner();
    expect(runner.shell).toBe(false);
    expect(runner.command).toBe(process.execPath);
    expect(runner.args[0]).toBe(
      resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    );
  });
});
