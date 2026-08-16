// The picture prompt for a result, and the promises around drawing it: the
// Routine says WHAT to draw and the run's own headline words say which one it
// is tonight — while the result itself never waits on, or is lost to, an
// image provider.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/db/database.js";
import {
  resultImagePrompt,
  runRoutine,
} from "../src/modules/core/routine-run.js";
import { listGalleryItems } from "../src/modules/core/routine-storage.js";

describe("resultImagePrompt", () => {
  it("leads with the result's short strings, then the routine's brief", () => {
    const prompt = resultImagePrompt("the finished dish, plated", {
      dishTitle: "Buttery Cabbage Soup",
      tip: "Slice thinly",
    });
    expect(prompt.startsWith("Buttery Cabbage Soup, Slice thinly. ")).toBe(
      true,
    );
    expect(prompt).toContain("the finished dish, plated");
    expect(prompt).toContain("no text or labels");
  });

  it("borrows at most two short strings and never long prose", () => {
    const prompt = resultImagePrompt("a plate", {
      a: "One",
      b: "Two",
      c: "Three",
      long: "x".repeat(200),
    });
    expect(prompt).toContain("One, Two.");
    expect(prompt).not.toContain("Three");
    expect(prompt).not.toContain("xxxxx");
  });

  it("skips lists and non-strings entirely", () => {
    const prompt = resultImagePrompt("a plate", {
      steps: ["chop", "simmer"],
      servings: 4,
    });
    expect(prompt.startsWith("a plate.")).toBe(true);
  });

  it("survives a null or non-object result", () => {
    expect(resultImagePrompt("a plate", null).startsWith("a plate.")).toBe(
      true,
    );
    expect(resultImagePrompt("a plate", "text").startsWith("a plate.")).toBe(
      true,
    );
  });

  it("stays within a prompt's length budget", () => {
    const prompt = resultImagePrompt("y".repeat(400), {
      title: "z".repeat(70),
    });
    expect(prompt.length).toBeLessThanOrEqual(600);
  });
});

// ── Drawing is strictly an addition ────────────────────────────────────────

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    try {
      cleanup();
    } catch {
      // Best-effort temp cleanup (Windows holds open SQLite files).
    }
  }
});

function harness(resultImage: string | null) {
  const root = mkdtempSync(resolve(tmpdir(), "vaenyx-result-image-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  const routinesDirectory = join(root, "routines");
  const libraryDirectory = join(root, "methods");
  mkdirSync(join(libraryDirectory, "plan"), { recursive: true });
  writeFileSync(
    join(libraryDirectory, "plan", "method.json"),
    JSON.stringify({ name: "Plan", description: "", version: "1.0.0" }),
    "utf8",
  );
  writeFileSync(join(libraryDirectory, "plan", "recipe.md"), "Plan.", "utf8");
  writeFileSync(
    join(libraryDirectory, "plan", "schema.json"),
    JSON.stringify({
      input: { type: "object", properties: { text: { type: "string" } } },
      output: { type: "object", properties: { title: { type: "string" } } },
    }),
    "utf8",
  );
  mkdirSync(join(routinesDirectory, "dinner"), { recursive: true });
  writeFileSync(
    join(routinesDirectory, "dinner", "routine.json"),
    JSON.stringify({
      name: "Dinner",
      description: "",
      version: "1.0.0",
      origin: "self",
      storage: { journal: true, gallery: true },
      deps: [{ methodId: "plan", version: "1.0.0" }],
      flow: [{ id: "step1", methodId: "plan", from: "journal" }],
      ...(resultImage ? { resultImage } : {}),
    }),
    "utf8",
  );
  const database = createDatabase({
    dataDirectory: join(root, "db"),
    databasePath: join(root, "db", "vaenyx.db"),
    backupsDirectory: join(root, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  cleanups.push(() => {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  });
  return { database, routinesDirectory, libraryDirectory };
}

const okStep = async () => ({
  output: { title: "Soup" },
  outputValid: true,
  webSearchUsed: false,
});

describe("the result never waits on its picture", () => {
  it("stores the result BEFORE drawing, then attaches the picture", async () => {
    const h = harness("the finished dish");
    let galleryRowExistedDuringDraw = false;
    const result = await runRoutine(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner",
      { text: "cabbage" },
      new AbortController().signal,
      {
        runStep: okStep,
        drawResult: async () => {
          galleryRowExistedDuringDraw =
            listGalleryItems(h.database, "dinner").length === 1;
          return "drawn.png";
        },
      },
    );
    expect(galleryRowExistedDuringDraw).toBe(true);
    expect(result.galleryItem?.resultImageId).toBe("drawn.png");
    expect(listGalleryItems(h.database, "dinner")[0]?.resultImageId).toBe(
      "drawn.png",
    );
  });

  it("keeps the result when the picture fails", async () => {
    const h = harness("the finished dish");
    const result = await runRoutine(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner",
      { text: "cabbage" },
      new AbortController().signal,
      {
        runStep: okStep,
        drawResult: async () => {
          throw new Error("IMAGE_GENERATE_FAILED:503");
        },
      },
    );
    expect(result.outputValid).toBe(true);
    expect(listGalleryItems(h.database, "dinner")[0]?.resultImageId).toBe(null);
  });

  it("draws nothing once the run has been stopped", async () => {
    const h = harness("the finished dish");
    const controller = new AbortController();
    let drew = false;
    await runRoutine(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner",
      { text: "cabbage" },
      controller.signal,
      {
        runStep: async () => {
          controller.abort();
          return okStep();
        },
        drawResult: async () => {
          drew = true;
          return "drawn.png";
        },
      },
    );
    expect(drew).toBe(false);
  });

  it("does not draw for a Routine that declared no picture", async () => {
    const h = harness(null);
    let drew = false;
    await runRoutine(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner",
      { text: "cabbage" },
      new AbortController().signal,
      {
        runStep: okStep,
        drawResult: async () => {
          drew = true;
          return "drawn.png";
        },
      },
    );
    expect(drew).toBe(false);
  });

  it("does not draw for a stateless (token) run — nowhere to keep it", async () => {
    const h = harness("the finished dish");
    let drew = false;
    const result = await runRoutine(
      h.database,
      h.routinesDirectory,
      h.libraryDirectory,
      "dinner",
      { text: "cabbage" },
      new AbortController().signal,
      {
        stateless: true,
        runStep: okStep,
        drawResult: async () => {
          drew = true;
          return "drawn.png";
        },
      },
    );
    expect(drew).toBe(false);
    expect(result.galleryItem).toBe(null);
  });
});
