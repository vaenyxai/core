import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/config.js";
import { seedLibraryIfEmpty } from "../src/modules/core/library-seed.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

// A throwaway repo root shipping a sample-library seed (one method, one routine).
function makeSampleRepo(): string {
  const repo = mkdtempSync(resolve(tmpdir(), "vaenyx-seed-repo-"));
  temporaryDirectories.push(repo);
  const method = resolve(repo, "sample-library", "methods", "demo-method");
  mkdirSync(method, { recursive: true });
  writeFileSync(resolve(method, "method.json"), "{}");
  const routine = resolve(repo, "sample-library", "routines", "demo-routine");
  mkdirSync(routine, { recursive: true });
  writeFileSync(resolve(routine, "routine.json"), "{}");
  return repo;
}

function makeUserdata(): string {
  const userdata = mkdtempSync(resolve(tmpdir(), "vaenyx-seed-data-"));
  temporaryDirectories.push(userdata);
  return userdata;
}

// Only the three fields seedLibraryIfEmpty reads.
function config(repositoryRoot: string | undefined, userdata: string): AppConfig {
  return {
    repositoryRoot,
    libraryDirectory: resolve(userdata, "library", "methods"),
    routinesDirectory: resolve(userdata, "library", "routines"),
  } as unknown as AppConfig;
}

describe("seedLibraryIfEmpty", () => {
  it("seeds an empty runtime library from sample-library and marks it", () => {
    const repo = makeSampleRepo();
    const userdata = makeUserdata();
    const cfg = config(repo, userdata);

    expect(seedLibraryIfEmpty(cfg)).toBe(true);
    expect(
      existsSync(resolve(cfg.libraryDirectory, "demo-method", "method.json")),
    ).toBe(true);
    expect(
      existsSync(resolve(cfg.routinesDirectory, "demo-routine", "routine.json")),
    ).toBe(true);
    expect(existsSync(resolve(userdata, "library", ".seeded"))).toBe(true);
  });

  it("does not re-seed after the marker exists, even if the user emptied it", () => {
    const repo = makeSampleRepo();
    const userdata = makeUserdata();
    const cfg = config(repo, userdata);

    expect(seedLibraryIfEmpty(cfg)).toBe(true);
    rmSync(cfg.libraryDirectory, { force: true, recursive: true });
    rmSync(cfg.routinesDirectory, { force: true, recursive: true });

    expect(seedLibraryIfEmpty(cfg)).toBe(false);
    expect(existsSync(resolve(cfg.libraryDirectory, "demo-method"))).toBe(false);
  });

  it("marks but does not copy when the library already has content", () => {
    const repo = makeSampleRepo();
    const userdata = makeUserdata();
    const cfg = config(repo, userdata);
    mkdirSync(resolve(cfg.libraryDirectory, "my-own-method"), {
      recursive: true,
    });

    expect(seedLibraryIfEmpty(cfg)).toBe(false);
    expect(existsSync(resolve(cfg.libraryDirectory, "demo-method"))).toBe(false);
    expect(existsSync(resolve(userdata, "library", ".seeded"))).toBe(true);
  });

  it("skips cleanly when repositoryRoot is absent (no seed source)", () => {
    const userdata = makeUserdata();
    expect(seedLibraryIfEmpty(config(undefined, userdata))).toBe(false);
    expect(existsSync(resolve(userdata, "library", ".seeded"))).toBe(false);
  });

  it("never seeds the sample seed onto itself (no-env fallback)", () => {
    const repo = makeSampleRepo();
    const cfg = {
      repositoryRoot: repo,
      libraryDirectory: resolve(repo, "sample-library", "methods"),
      routinesDirectory: resolve(repo, "sample-library", "routines"),
    } as unknown as AppConfig;

    expect(seedLibraryIfEmpty(cfg)).toBe(false);
    expect(existsSync(resolve(repo, "sample-library", ".seeded"))).toBe(false);
  });
});
