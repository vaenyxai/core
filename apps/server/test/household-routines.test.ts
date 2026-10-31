import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../src/config.js";
import { createDatabase } from "../src/db/database.js";
import {
  loadMethod,
  loadMethodExamples,
  validateAgainstSchema,
} from "../src/modules/core/methods.js";
import { loadRoutine } from "../src/modules/core/routines.js";
import { runRoutine } from "../src/modules/core/routine-run.js";
import {
  listGalleryItems,
  listJournalEntries,
} from "../src/modules/core/routine-storage.js";
import { seedHouseholdRoutines } from "../src/modules/core/library-seed-household.js";
import { parseHouseholdPhoto } from "../src/modules/gateway/household-sources.js";
const root = resolve("../.."),
  methods = resolve(root, "sample-library/methods"),
  routines = resolve(root, "sample-library/routines");
const dirs: string[] = [];
function fixture() {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-household-"));
  dirs.push(dataDirectory);
  return {
    repositoryRoot: root,
    dataDirectory,
    databasePath: resolve(dataDirectory, "test.db"),
    migrationsDirectory: resolve("migrations"),
    libraryDirectory: resolve(dataDirectory, "library/methods"),
    routinesDirectory: resolve(dataDirectory, "library/routines"),
  } as AppConfig;
}
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
describe("household Routine packages", () => {
  it.each(["vaenyx-family-notices", "vaenyx-warranty"])(
    "runs %s and restores the same frozen input and result",
    async (id) => {
      const cfg = fixture(),
        db = createDatabase(cfg),
        method = loadMethod(methods, id)!;
      expect(loadRoutine(routines, methods, id)?.resolved).toBe(true);
      const example = loadMethodExamples(methods, id)[0]!;
      expect(
        validateAgainstSchema(method.inputSchema, example.input).valid,
      ).toBe(true);
      expect(
        validateAgainstSchema(method.outputSchema, example.output).valid,
      ).toBe(true);
      try {
        const result = await runRoutine(
          db,
          routines,
          methods,
          id,
          example.input,
          new AbortController().signal,
          {
            runStep: async (_method, input) => {
              expect(input).toEqual(example.input);
              return {
                output: example.output,
                outputValid: true,
                raw: "",
                webSearchUsed: false,
              };
            },
          },
        );
        expect(result.outputValid).toBe(true);
        expect(listJournalEntries(db, id)[0]?.content).toEqual(example.input);
        expect(listGalleryItems(db, id)[0]).toMatchObject({
          output: example.output,
          journalEntryId: result.journalEntry?.id,
        });
      } finally {
        db.close();
      }
    },
  );
  it("installs once beside owner content and respects removal", () => {
    const cfg = fixture();
    mkdirSync(resolve(cfg.libraryDirectory, "owner"), { recursive: true });
    writeFileSync(resolve(cfg.libraryDirectory, "owner/keep.txt"), "keep");
    expect(seedHouseholdRoutines(cfg, methods, routines)).toBe(true);
    expect(
      readFileSync(resolve(cfg.libraryDirectory, "owner/keep.txt"), "utf8"),
    ).toBe("keep");
    rmSync(resolve(cfg.routinesDirectory, "vaenyx-warranty"), {
      recursive: true,
    });
    expect(seedHouseholdRoutines(cfg, methods, routines)).toBe(false);
    expect(existsSync(resolve(cfg.routinesDirectory, "vaenyx-warranty"))).toBe(
      false,
    );
  });
  it("preserves colliding edited Methods and recovers an interrupted pristine dependency install", () => {
    const cfg = fixture();
    mkdirSync(cfg.libraryDirectory, { recursive: true });
    cpSync(
      resolve(methods, "vaenyx-warranty"),
      resolve(cfg.libraryDirectory, "vaenyx-warranty"),
      { recursive: true },
    );
    cpSync(
      resolve(methods, "vaenyx-family-notices"),
      resolve(cfg.libraryDirectory, "vaenyx-family-notices"),
      { recursive: true },
    );
    writeFileSync(
      resolve(cfg.libraryDirectory, "vaenyx-family-notices/recipe.md"),
      "Owner edited recipe",
    );
    expect(seedHouseholdRoutines(cfg, methods, routines)).toBe(true);
    expect(
      loadRoutine(
        cfg.routinesDirectory,
        cfg.libraryDirectory,
        "vaenyx-warranty",
      )?.resolved,
    ).toBe(true);
    expect(
      existsSync(resolve(cfg.routinesDirectory, "vaenyx-family-notices")),
    ).toBe(false);
    expect(
      readFileSync(
        resolve(cfg.libraryDirectory, "vaenyx-family-notices/recipe.md"),
        "utf8",
      ),
    ).toBe("Owner edited recipe");
  });
  it("requires actual extracted words and drops invalid image coordinates", () => {
    expect(() => parseHouseholdPhoto('{"annotations":[]}')).toThrow();
    expect(
      parseHouseholdPhoto(
        JSON.stringify({
          text: "Serial AB-001",
          annotations: [
            { name: "Serial", x: 40, y: 50 },
            { name: "bad", x: 101, y: 20 },
          ],
        }),
      ),
    ).toEqual({
      text: "Serial AB-001",
      annotations: [{ name: "Serial", x: 40, y: 50 }],
    });
  });
});
