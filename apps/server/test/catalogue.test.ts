import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  fetchCatalogue,
  fetchCatalogueInstallMetadata,
  installMethod,
  installRoutine,
} from "../src/modules/core/catalogue.js";
import { createMethod, loadMethod } from "../src/modules/core/methods.js";

const CDN = "https://cdn.test";

const methodMeta = {
  name: "Echo Test",
  description: "Echo.",
  version: "1.0.0",
  owner: "",
  tags: ["sample"],
};
const schemaObj = {
  input: { type: "object", properties: { text: { type: "string" } } },
  output: { type: "object", properties: { echoed: { type: "string" } } },
};
const manifestObj = { permissions: { network: false, readFiles: false } };
const routineObj = {
  name: "Echo Routine",
  description: "Echo it.",
  owner: "",
  version: "1.0.0",
  tags: ["sample"],
  mode: "one-shot",
  storage: { journal: true, gallery: true },
  deps: [{ methodId: "echo-test", version: "1.0.0" }],
  flow: [{ id: "step1", methodId: "echo-test", from: "journal" }],
};
const indexObj = {
  schemaVersion: 1,
  methods: [{ id: "echo-test", ...methodMeta }],
  routines: [
    {
      id: "echo-routine",
      name: "Echo Routine",
      description: "Echo it.",
      version: "1.0.0",
      owner: "",
      tags: ["sample"],
      mode: "one-shot",
      stepCount: 1,
    },
  ],
};

// A fake CDN: every published file keyed by its full URL; anything else is a 404.
const FILES: Record<string, string> = {
  [`${CDN}/index.json`]: JSON.stringify(indexObj, null, 2),
  [`${CDN}/routines/echo-routine/routine.json`]: JSON.stringify(
    routineObj,
    null,
    2,
  ),
  [`${CDN}/routines/echo-routine/manifest.json`]: JSON.stringify(
    manifestObj,
    null,
    2,
  ),
  [`${CDN}/methods/echo-test/method.json`]: JSON.stringify(methodMeta, null, 2),
  [`${CDN}/methods/echo-test/recipe.md`]: "Echo the input.\n",
  [`${CDN}/methods/echo-test/schema.json`]: JSON.stringify(schemaObj, null, 2),
  [`${CDN}/methods/echo-test/manifest.json`]: JSON.stringify(
    manifestObj,
    null,
    2,
  ),
};

function makeFetch(files: Record<string, string>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = files[url];
    if (body === undefined) return new Response("not found", { status: 404 });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
}

const fakeFetch = makeFetch(FILES);

const tempDirectories: string[] = [];

function freshDirs(): { libDir: string; rouDir: string } {
  const libDir = mkdtempSync(resolve(tmpdir(), "vaenyx-cat-lib-"));
  const rouDir = mkdtempSync(resolve(tmpdir(), "vaenyx-cat-rou-"));
  tempDirectories.push(libDir, rouDir);
  return { libDir, rouDir };
}

afterAll(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("catalogue reader (④ distribution)", () => {
  it("parses the index from the CDN", async () => {
    const index = await fetchCatalogue(CDN, undefined, fakeFetch);
    expect(index.schemaVersion).toBe(1);
    expect(index.routines.map((r) => r.id)).toContain("echo-routine");
    expect(index.methods.map((m) => m.id)).toContain("echo-test");
  });

  it("degrades to an empty catalogue when the index is malformed", async () => {
    const index = await fetchCatalogue(
      CDN,
      undefined,
      makeFetch({ [`${CDN}/index.json`]: "not json" }),
    );
    expect(index.methods).toEqual([]);
    expect(index.routines).toEqual([]);
  });

  it("previews normalized Method capabilities and keeps unknown future names visible", async () => {
    const files = {
      ...FILES,
      [`${CDN}/methods/echo-test/manifest.json`]: JSON.stringify({
        capabilities: ["vision", "network", "future-sense"],
      }),
    };
    const preview = await fetchCatalogueInstallMetadata(
      CDN,
      "echo-test",
      "method",
      undefined,
      makeFetch(files),
    );

    expect(preview).toMatchObject({
      id: "echo-test",
      kind: "method",
      name: "Echo Test",
      version: "1.0.0",
    });
    expect(preview.capabilities).toEqual(["vision", "web", "future-sense"]);
  });

  it("previews a Routine's own and dependency capabilities without recipes", async () => {
    const requested: string[] = [];
    const files = {
      ...FILES,
      [`${CDN}/routines/echo-routine/routine.json`]: JSON.stringify({
        ...routineObj,
        capabilities: ["drawing", "future-routine"],
      }),
      [`${CDN}/methods/echo-test/manifest.json`]: JSON.stringify({
        capabilities: ["vision", "network", "future-sense"],
      }),
    };
    const recordingFetch = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      requested.push(url);
      const body = files[url as keyof typeof files];
      if (body === undefined) return new Response("not found", { status: 404 });
      return new Response(body, { status: 200 });
    }) as typeof fetch;

    const preview = await fetchCatalogueInstallMetadata(
      CDN,
      "echo-routine",
      "routine",
      undefined,
      recordingFetch,
    );

    expect(preview.capabilities).toEqual([
      "drawing",
      "future-routine",
      "vision",
      "web",
      "future-sense",
    ]);
    expect(requested.some((url) => url.endsWith("recipe.md"))).toBe(false);
    expect(requested.some((url) => url.endsWith("schema.json"))).toBe(false);
  });

  it("installs a Routine + its Method dependency, resolvable, marked community", async () => {
    const { libDir, rouDir } = freshDirs();

    const result = await installRoutine(
      CDN,
      rouDir,
      libDir,
      "echo-routine",
      undefined,
      fakeFetch,
    );

    expect(result.installedMethods).toEqual(["echo-test"]);
    expect(result.skippedMethods).toEqual([]);
    expect(result.routine.id).toBe("echo-routine");
    // The dep landed first, so the freshly loaded Routine resolves + hashes.
    expect(result.routine.resolved).toBe(true);
    expect(result.routine.contentHash).toMatch(/^[a-f0-9]{64}$/);
    // Files are really on disk and the local loaders accept them.
    expect(existsSync(join(rouDir, "echo-routine", "routine.json"))).toBe(true);
    expect(loadMethod(libDir, "echo-test")).not.toBeNull();
    // Installed items are stamped community-installed (origin is not hashed, so
    // stamping it did not shift the content hash asserted above).
    expect(result.routine.origin).toBe("community");
    expect(loadMethod(libDir, "echo-test")?.origin).toBe("community");
  });

  it("reuses a Method already installed locally instead of re-downloading", async () => {
    const { libDir, rouDir } = freshDirs();
    // Pre-seed the dependency at the pinned version.
    createMethod(libDir, {
      name: "Echo Test",
      description: "Echo.",
      recipe: "Echo the input.",
      inputSchema: schemaObj.input,
      outputSchema: schemaObj.output,
      tags: ["sample"],
    });
    // A locally created Method is marked self-made.
    expect(loadMethod(libDir, "echo-test")?.origin).toBe("self");

    const result = await installRoutine(
      CDN,
      rouDir,
      libDir,
      "echo-routine",
      undefined,
      fakeFetch,
    );

    expect(result.installedMethods).toEqual([]);
    expect(result.skippedMethods).toEqual(["echo-test"]);
  });

  it("refuses to overwrite a Routine that is already installed", async () => {
    const { libDir, rouDir } = freshDirs();
    await installRoutine(
      CDN,
      rouDir,
      libDir,
      "echo-routine",
      undefined,
      fakeFetch,
    );

    await expect(
      installRoutine(CDN, rouDir, libDir, "echo-routine", undefined, fakeFetch),
    ).rejects.toThrow(/ROUTINE_EXISTS/);
  });

  it("rejects an unsafe id before touching the network or disk", async () => {
    const { libDir, rouDir } = freshDirs();
    await expect(
      installRoutine(CDN, rouDir, libDir, "../evil", undefined, fakeFetch),
    ).rejects.toThrow(/BAD_ID/);
  });

  it("rejects a Method version changed after review before writing it", async () => {
    const { libDir } = freshDirs();
    await expect(
      installMethod(CDN, libDir, "echo-test", undefined, fakeFetch, "2.0.0"),
    ).rejects.toThrow(/CATALOGUE_VERSION_CHANGED/);
    expect(existsSync(join(libDir, "echo-test"))).toBe(false);
  });

  it("rejects a Routine version changed after review before writing it", async () => {
    const { libDir, rouDir } = freshDirs();
    await expect(
      installRoutine(
        CDN,
        rouDir,
        libDir,
        "echo-routine",
        undefined,
        fakeFetch,
        "2.0.0",
      ),
    ).rejects.toThrow(/CATALOGUE_VERSION_CHANGED/);
    expect(existsSync(join(rouDir, "echo-routine"))).toBe(false);
    expect(existsSync(join(libDir, "echo-test"))).toBe(false);
  });
});
