import {
  existsSync,
  cpSync,
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
import { saveImage } from "../src/modules/core/vision.js";
import { createDatabase } from "../src/db/database.js";
import { upgradeDinnerDish } from "../src/modules/core/library-seed-dinner.js";
import { seedLibraryIfEmpty } from "../src/modules/core/library-seed.js";
import {
  loadMethod,
  loadMethodExamples,
  validateAgainstSchema,
} from "../src/modules/core/methods.js";
import {
  describeRoutineInputFields,
  runRoutine,
} from "../src/modules/core/routine-run.js";
import { loadRoutine } from "../src/modules/core/routines.js";
import {
  listGalleryItems,
  listJournalEntries,
} from "../src/modules/core/routine-storage.js";

const id = "vaenyx-dinner-planner";
const root = resolve("../..");
const methods = resolve(root, "sample-library/methods");
const routines = resolve(root, "sample-library/routines");
const dirs: string[] = [];
function fixture() {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-dinner-test-"));
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
describe("Dinner Planner", () => {
  it("ships a resolved package and valid examples, with private references excluded from the generic form", () => {
    const routine = loadRoutine(routines, methods, id)!;
    const method = loadMethod(methods, "vaenyx-dinner-dish")!;
    expect(routine.resolved).toBe(true);
    expect(routine.view).toMatchObject({
      version: 1,
      layout: "dinner-planner-v1",
    });
    for (const example of loadMethodExamples(methods, "vaenyx-dinner-dish")) {
      expect(
        validateAgainstSchema(method.inputSchema, example.input),
      ).toMatchObject({ valid: true });
      expect(
        validateAgainstSchema(method.outputSchema, example.output),
      ).toMatchObject({ valid: true });
      expect(
        validateAgainstSchema(method.inputSchema, {
          ...(example.input as object),
          servings: 0,
        }).valid,
      ).toBe(false);
      expect(
        validateAgainstSchema(method.inputSchema, {
          ...(example.input as object),
          minutes: 9,
        }).valid,
      ).toBe(false);
      expect(
        validateAgainstSchema(method.outputSchema, {
          ...(example.output as object),
          steps: [],
        }).valid,
      ).toBe(false);
    }
    const fields = describeRoutineInputFields(routines, methods, id)!;
    expect(fields.fields.map((field) => field.key)).not.toContain(
      "attachments",
    );
    expect(fields.fields.map((field) => field.key)).not.toContain("language");
  });
  it("stores the reviewed input, source references and matching result snapshot without calling a model", async () => {
    const config = fixture();
    const database = createDatabase(config);
    const example = loadMethodExamples(methods, "vaenyx-dinner-dish")[0]!;
    const imageId = saveImage(
      config.dataDirectory,
      Buffer.from("synthetic fixture"),
      "image/jpeg",
    );
    const input = {
      ...(example.input as object),
      attachments: [
        {
          assetId: imageId,
          name: "ingredients.png",
          role: "ingredients",
        },
      ],
    };
    try {
      const result = await runRoutine(
        database,
        routines,
        methods,
        id,
        input,
        new AbortController().signal,
        {
          imageId,
          runStep: async (_method, received) => {
            expect(received).toEqual(input);
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
      expect(listJournalEntries(database, id)[0]?.content).toEqual(input);
      const stored = listGalleryItems(database, id)[0]!;
      expect(stored.output).toEqual(example.output);
      expect(stored.journalEntryId).toBe(result.journalEntry?.id);
      expect(stored.viewSnapshot).toMatchObject({
        layout: "dinner-planner-v1",
      });
      expect(stored.imageId).toBe(imageId);
    } finally {
      database.close();
    }
  });
  it("adds dinner once to an existing library and respects deletion", () => {
    const config = fixture();
    mkdirSync(resolve(config.libraryDirectory, "owner-method"), {
      recursive: true,
    });
    writeFileSync(
      resolve(config.libraryDirectory, "owner-method/method.json"),
      '{"name":"Owner"}',
    );
    expect(seedLibraryIfEmpty(config)).toBe(true);
    expect(
      loadRoutine(config.routinesDirectory, config.libraryDirectory, id)
        ?.resolved,
    ).toBe(true);
    expect(
      readFileSync(
        resolve(config.libraryDirectory, "owner-method/method.json"),
        "utf8",
      ),
    ).toBe('{"name":"Owner"}');
    rmSync(resolve(config.routinesDirectory, id), { recursive: true });
    expect(seedLibraryIfEmpty(config)).toBe(false);
    expect(existsSync(resolve(config.routinesDirectory, id))).toBe(false);
  });
  it.each(["method", "routine"])(
    "does not overwrite or bind a colliding Owner %s",
    (side) => {
      const config = fixture();
      const occupied = resolve(
        side === "method" ? config.libraryDirectory : config.routinesDirectory,
        id,
      );
      mkdirSync(occupied, { recursive: true });
      writeFileSync(resolve(occupied, "owner.txt"), "keep");
      seedLibraryIfEmpty(config);
      expect(readFileSync(resolve(occupied, "owner.txt"), "utf8")).toBe("keep");
      expect(
        existsSync(
          resolve(
            side === "method"
              ? config.routinesDirectory
              : config.libraryDirectory,
            id,
          ),
        ),
      ).toBe(false);
    },
  );
});

describe("Dinner photo review capability boundary", () => {
  it("reports disabled Vision without reading a photo or creating a meal", async () => {
    const { buildApp } = await import("../src/app.js");
    const { getModelRegistry } =
      await import("../src/modules/models/registry.js");
    const config = fixture();
    Object.assign(config, {
      host: "127.0.0.1",
      port: 3197,
      mode: "test",
      updateProbe: true,
      logLevel: "silent",
      corsOrigins: [],
      version: "test",
      publish: null,
      googleOAuth: null,
      secretsDirectory: resolve(config.dataDirectory, "secrets"),
      webDistDirectory: resolve(config.dataDirectory, "missing-web"),
      docsDirectory: resolve(root, "docs"),
      backupsDirectory: resolve(config.dataDirectory, "backups"),
    });
    const app = await buildApp(config);
    getModelRegistry().register(
      {
        id: "codex",
        name: "Synthetic parser",
        healthCheck: () => ({ ok: true, detail: "test" }),
        sendChat: async () => ({ answer: "{}", webSearchUsed: false }),
      },
      true,
    );
    try {
      const setup = await app.inject({
        method: "POST",
        url: "/v1/setup",
        payload: { name: "Dinner test", password: "test-password-only" },
      });
      const headers = {
        cookie: String(setup.headers["set-cookie"]).split(";")[0]!,
      };
      const switched = await app.inject({
        method: "PUT",
        url: "/v1/capabilities",
        headers,
        payload: { vision: false },
      });
      expect(switched.statusCode).toBe(200);
      const conversation = await app.inject({
        method: "POST",
        url: "/v1/ask-vaenyx/conversations",
        headers,
        payload: { title: "Dinner test", routineId: id },
      });
      expect(conversation.statusCode).toBe(200);
      const conversationId = conversation.json().id as string;
      const result = await app.inject({
        method: "POST",
        url: "/v1/ask-vaenyx/conversations/" + conversationId + "/routine-run",
        headers,
        payload: {
          content: "(Photo)",
          imageId: "not-a-real-photo",
          language: "en",
        },
      });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toMatchObject({
        needsInput: true,
        photoError: "Vision is switched off. Enter the ingredients manually.",
      });
      const history = await app.inject({
        url: "/v1/ask-vaenyx/conversations/" + conversationId + "/routine-data",
        headers,
      });
      expect(history.json()).toMatchObject({ journal: [], gallery: [] });
    } finally {
      await app.close();
    }
  });
});

describe("Dinner dish upgrade", () => {
  function oldInstall() {
    const config = fixture();
    cpSync(resolve(methods, id), resolve(config.libraryDirectory, id), {
      recursive: true,
    });
    cpSync(resolve(routines, id), resolve(config.routinesDirectory, id), {
      recursive: true,
    });
    const path = resolve(config.routinesDirectory, id, "routine.json");
    const routine = JSON.parse(readFileSync(path, "utf8"));
    routine.name = "My Dinner";
    routine.version = "1.0.2";
    routine.flow = [{ from: "journal", methodId: id, id: "plan-dinner" }];
    routine.deps = [{ version: "1.0.0", methodId: id }];
    writeFileSync(path, JSON.stringify(routine));
    return { config, path, routine };
  }
  it("switches only the shipped Dinner flow, preserving the old Method, name, view and examples", () => {
    const { config, path, routine } = oldInstall();
    const recipePath = resolve(config.libraryDirectory, id, "recipe.md");
    const original = readFileSync(recipePath, "utf8");
    writeFileSync(
      resolve(config.routinesDirectory, id, "examples/owner.json"),
      "keep",
    );
    expect(upgradeDinnerDish(config, methods)).toBe(true);
    const next = JSON.parse(readFileSync(path, "utf8"));
    expect(next.name).toBe("My Dinner");
    expect(next.view).toEqual(routine.view);
    expect(next.deps).toEqual([
      { methodId: "vaenyx-dinner-dish", version: "1.0.0" },
    ]);
    expect(readFileSync(recipePath, "utf8")).toBe(original);
    expect(
      readFileSync(
        resolve(config.routinesDirectory, id, "examples/owner.json"),
        "utf8",
      ),
    ).toBe("keep");
    expect(
      loadRoutine(config.routinesDirectory, config.libraryDirectory, id)
        ?.resolved,
    ).toBe(true);
    expect(upgradeDinnerDish(config, methods)).toBe(false);
  });
  it.each(["recipe", "flow", "collision", "invalid"])(
    "preserves Owner changes: %s",
    (kind) => {
      const { config, path, routine } = oldInstall();
      if (kind === "recipe")
        writeFileSync(
          resolve(config.libraryDirectory, id, "recipe.md"),
          "Owner recipe",
        );
      if (kind === "flow") {
        routine.flow[0].id = "custom";
        writeFileSync(path, JSON.stringify(routine));
      }
      if (kind === "collision") {
        const dir = resolve(config.libraryDirectory, "vaenyx-dinner-dish");
        mkdirSync(dir);
        writeFileSync(resolve(dir, "recipe.md"), "keep");
      }
      if (kind === "invalid") writeFileSync(path, "broken JSON");
      const before = readFileSync(path, "utf8");
      expect(upgradeDinnerDish(config, methods)).toBe(false);
      expect(readFileSync(path, "utf8")).toBe(before);
    },
  );
  it("accepts ingredients alone and labelled photo references, without a hidden portion or time target", async () => {
    const method = loadMethod(methods, "vaenyx-dinner-dish")!;
    const input = {
      ingredients: "tomatoes and eggs",
      attachments: [
        {
          assetId: "test.jpg",
          name: "photo.jpg",
          role: "ingredients",
          annotations: [{ name: "Tomato", x: 20, y: 40 }],
        },
      ],
    };
    expect(validateAgainstSchema(method.inputSchema, input).valid).toBe(true);
    const config = fixture();
    const database = createDatabase(config);
    try {
      await runRoutine(
        database,
        routines,
        methods,
        id,
        input,
        new AbortController().signal,
        {
          runStep: async (_, received) => {
            expect(received).toEqual(input);
            expect(received).not.toHaveProperty("servings");
            expect(received).not.toHaveProperty("minutes");
            return {
              output: loadMethodExamples(methods, "vaenyx-dinner-dish")[0]!
                .output,
              outputValid: true,
              raw: "",
              webSearchUsed: false,
            };
          },
        },
      );
      expect(listJournalEntries(database, id)[0]?.content).toEqual(input);
    } finally {
      database.close();
    }
  });
});
