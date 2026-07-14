import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  createMethod,
  listMethodSummaries,
  loadMethod,
  loadMethodExamples,
  methodContentHash,
  validateAgainstSchema,
} from "../src/modules/core/methods.js";

// The real seed library dir (repo root /sample-library/methods), so the test
// also confirms the shipped sample method is a valid, loadable method.
const libraryDirectory = fileURLToPath(
  new URL("../../../sample-library/methods", import.meta.url),
);

describe("library method loader", () => {
  it("lists the sample method via progressive disclosure", () => {
    const summaries = listMethodSummaries(libraryDirectory);
    const sample = summaries.find((method) => method.id === "sample-summary");

    expect(sample).toBeDefined();
    expect(sample?.name).toContain("Text Summary");
    expect(sample?.version).toBe("1.0.0");
  });

  it("loads the full method with a deterministic content hash", () => {
    const method = loadMethod(libraryDirectory, "sample-summary");

    expect(method).not.toBeNull();
    expect(method?.recipe).toContain("condense");
    expect(method?.exampleCount).toBe(2);
    expect(method?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    // Same files hash the same way, every time (the version lock).
    expect(method?.contentHash).toBe(
      methodContentHash(libraryDirectory, "sample-summary"),
    );
  });

  it("returns null for an unknown method", () => {
    expect(loadMethod(libraryDirectory, "does-not-exist")).toBeNull();
  });

  it("validates input against the method's input schema", () => {
    const method = loadMethod(libraryDirectory, "sample-summary");
    expect(method).not.toBeNull();
    if (!method) return;

    expect(validateAgainstSchema(method.inputSchema, { text: "hi" }).valid).toBe(
      true,
    );

    const missingText = validateAgainstSchema(method.inputSchema, {});
    expect(missingText.valid).toBe(false);
    expect(missingText.errors.length).toBeGreaterThan(0);
  });

  it("loads examples as few-shot input/output pairs", () => {
    const examples = loadMethodExamples(libraryDirectory, "sample-summary");

    expect(examples.length).toBe(2);
    expect(examples[0]).toHaveProperty("input");
    expect(examples[0]).toHaveProperty("output");
  });
});

describe("method creation (save path)", () => {
  const tempDirs: string[] = [];
  afterAll(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("writes a draft to disk as a loadable method with a slugged id", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-create-"));
    tempDirs.push(dir);

    const created = createMethod(dir, {
      name: "My Test Method",
      description: "A method made in a test.",
      recipe: "Read the input and do the thing.",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      tags: ["t1", "t2"],
    });

    expect(created.id).toBe("my-test-method");
    const loaded = loadMethod(dir, "my-test-method");
    expect(loaded?.recipe).toContain("do the thing");
    expect(loaded?.tags).toEqual(["t1", "t2"]);
    expect(loaded?.version).toBe("1.0.0");

    // Same name again → a unique id, not a clobber.
    const second = createMethod(dir, {
      name: "My Test Method",
      description: "",
      recipe: "Another one.",
      inputSchema: {},
      outputSchema: {},
      tags: [],
    });
    expect(second.id).toBe("my-test-method-2");
  });
});
