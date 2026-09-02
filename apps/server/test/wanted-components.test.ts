// The installer's component page ticks boxes and downloads nothing; this is
// the half that acts on the answer. What is held here is everything that
// could quietly turn a component page into a broken first boot.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  parseWantedComponents,
  startWantedComponents,
  wantedComponentsFile,
  writeWantedComponents,
  type ComponentId,
} from "../src/modules/core/wanted-components.js";

const temporaries: string[] = [];

function scratchInstance(): string {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-components-"));
  temporaries.push(root);
  const dataDirectory = join(root, "db");
  mkdirSync(dataDirectory, { recursive: true });
  return dataDirectory;
}

const settled = () => new Promise((done) => setTimeout(done, 20));

afterEach(() => {
  while (temporaries.length) {
    rmSync(temporaries.pop() as string, { force: true, recursive: true });
  }
});

describe("reading what the installer asked for", () => {
  it("keeps the names it knows and drops everything else", () => {
    // The file lands on a real disk in a folder a person can open. Whatever
    // reads it should never have to trust it.
    expect(
      parseWantedComponents(
        '{"components":["codex","rm -rf /","voice-zh","codex",""]}',
      ),
    ).toEqual(["codex", "voice-zh"]);
  });

  it("survives a file that is not JSON at all", () => {
    expect(parseWantedComponents("half a fi")).toEqual([]);
    expect(parseWantedComponents("")).toEqual([]);
  });

  it("reads a bare list as well as the wrapped form", () => {
    expect(parseWantedComponents('["tailscale"]')).toEqual(["tailscale"]);
  });

  it("round-trips what the setup script writes", () => {
    const dataDirectory = scratchInstance();
    writeWantedComponents(dataDirectory, ["tailscale", "voice-en"]);
    expect(existsSync(wantedComponentsFile(dataDirectory))).toBe(true);
    const started = startWantedComponents({
      dataDirectory,
      install: async () => "installed",
    });
    expect(started).toEqual(["tailscale", "voice-en"]);
  });
});

describe("working through the list", () => {
  it("does nothing at all when there is no request", () => {
    const dataDirectory = scratchInstance();
    let called = 0;
    const started = startWantedComponents({
      dataDirectory,
      install: async () => {
        called += 1;
        return "installed";
      },
    });
    expect(started).toEqual([]);
    expect(called).toBe(0);
  });

  it("sets the request aside before it starts, so a bad component cannot loop", () => {
    // The file is renamed BEFORE the first download, not after. A component
    // that takes the process down with it must not be retried on every boot
    // for ever — every one of these has a button in Settings.
    const dataDirectory = scratchInstance();
    writeWantedComponents(dataDirectory, ["claude"]);
    startWantedComponents({ dataDirectory, install: async () => "installed" });
    expect(existsSync(wantedComponentsFile(dataDirectory))).toBe(false);
  });

  it("carries on after one component fails, and reports which", async () => {
    // The promise the component page makes: a tick is optional, and one that
    // will not arrive leaves everything else alone.
    const dataDirectory = scratchInstance();
    writeWantedComponents(dataDirectory, ["codex", "claude", "tailscale"]);
    const seen: ComponentId[] = [];
    let finished: { id: ComponentId; outcome: string }[] = [];
    startWantedComponents({
      dataDirectory,
      install: async (id) => {
        seen.push(id);
        if (id === "claude") throw new Error("no network");
        return "installed";
      },
      onDone: (results) => (finished = results.done),
    });
    await settled();
    expect(seen).toEqual(["codex", "claude", "tailscale"]);
    expect(finished.map(({ id, outcome }) => ({ id, outcome }))).toEqual([
      { id: "codex", outcome: "installed" },
      { id: "claude", outcome: "failed" },
      { id: "tailscale", outcome: "installed" },
    ]);
    expect(finished[1]).toHaveProperty(
      "ownerError.code",
      "VX-COMPONENT-INSTALL",
    );
    expect(finished[1]).toHaveProperty("ownerError.dataSafe", true);
  });

  it("ignores a request that names nothing we know", () => {
    const dataDirectory = scratchInstance();
    const file = wantedComponentsFile(dataDirectory);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, '{"components":["something-else"]}', "utf8");
    let called = 0;
    const started = startWantedComponents({
      dataDirectory,
      install: async () => {
        called += 1;
        return "installed";
      },
    });
    expect(started).toEqual([]);
    expect(called).toBe(0);
  });
});
