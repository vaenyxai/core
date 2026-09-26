// H-014 addendum (Oskar, 2026-09-27): result footnotes are fixed legal copy,
// never model-written. An install holding the unchanged 1.0.0 first-party
// packages is upgraded once to 1.0.1; the Owner's own examples stay (minus
// the field the new schema rejects) and an edited package is never touched.
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/config.js";
import { seedLibraryIfEmpty } from "../src/modules/core/library-seed.js";
import { loadRoutine } from "../src/modules/core/routines.js";

const REPOSITORY_ROOT = resolve("..", "..");
const V1 = resolve("test", "fixtures", "first-party-v1");
const PACKAGES = {
  "vaenyx-receipt-record": {
    field: "disclaimer",
    footnote: "legal.disclaimer.tax",
  },
  "vaenyx-warranty-manual-record": {
    field: "disclaimer",
    footnote: "legal.disclaimer.legal",
  },
  "vaenyx-material-takeoff": {
    field: "humanCheckRequired",
    footnote: "legal.disclaimer.quantities",
  },
} as const;

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

// An existing install: the three 1.0.0 packages as shipped, already seeded.
function installV1(): AppConfig {
  const userdata = mkdtempSync(resolve(tmpdir(), "vaenyx-footnotes-"));
  temporaryDirectories.push(userdata);
  const config = {
    repositoryRoot: REPOSITORY_ROOT,
    libraryDirectory: resolve(userdata, "library", "methods"),
    routinesDirectory: resolve(userdata, "library", "routines"),
  } as unknown as AppConfig;
  cpSync(join(V1, "methods"), config.libraryDirectory, { recursive: true });
  cpSync(join(V1, "routines"), config.routinesDirectory, { recursive: true });
  writeFileSync(resolve(userdata, "library", ".seeded"), "earlier");
  writeFileSync(
    resolve(userdata, "library", ".first-party-result-views-v1"),
    "earlier",
  );
  return config;
}

describe("shipped first-party packages", () => {
  it("ask the model for no footnote and name fixed legal copy instead", () => {
    for (const [id, { field, footnote }] of Object.entries(PACKAGES)) {
      const methods = resolve(REPOSITORY_ROOT, "sample-library", "methods", id);
      const schema = json(join(methods, "schema.json")) as {
        output: { required: string[]; properties: Record<string, unknown> };
      };
      expect(schema.output.required).not.toContain(field);
      expect(schema.output.properties).not.toHaveProperty(field);
      expect(readFileSync(join(methods, "recipe.md"), "utf8")).not.toContain(
        field,
      );
      const routine = loadRoutine(
        resolve(REPOSITORY_ROOT, "sample-library", "routines"),
        resolve(REPOSITORY_ROOT, "sample-library", "methods"),
        id,
      );
      const view = routine?.view as {
        footnote?: string;
        fields: { key: string }[];
      };
      expect(view.footnote).toBe(footnote);
      expect(view.fields.map((entry) => entry.key)).not.toContain(field);
      expect(json(join(methods, "method.json")).version).toBe("1.0.1");
      expect(routine?.version).toBe("1.0.1");
    }
  });
});

describe("upgrading an unchanged 1.0.0 install", () => {
  it("replaces the shipped files, keeps the Owner's examples, and runs once", () => {
    const config = installV1();
    const ownerExample = join(
      config.libraryDirectory,
      "vaenyx-receipt-record",
      "examples",
      "0002.json",
    );
    writeFileSync(
      ownerExample,
      JSON.stringify({
        input: { sourceLabel: "Receipt photo", merchant: "Corner Grocer" },
        output: {
          title: "Corner Grocer",
          warnings: [],
          disclaimer: "Organisational record only.",
        },
        source: "correction",
      }),
    );

    seedLibraryIfEmpty(config);

    for (const [id, { field, footnote }] of Object.entries(PACKAGES)) {
      const method = join(config.libraryDirectory, id);
      expect(json(join(method, "method.json")).version).toBe("1.0.1");
      expect(readFileSync(join(method, "recipe.md"), "utf8")).not.toContain(
        field,
      );
      const routine = json(join(config.routinesDirectory, id, "routine.json"));
      expect((routine.view as { footnote: string }).footnote).toBe(footnote);
    }
    // The Owner's correction survives; only the rejected field is gone.
    const kept = json(ownerExample) as { output: Record<string, unknown> };
    expect(kept.output).toEqual({ title: "Corner Grocer", warnings: [] });

    // Once only: a later edit is never overwritten by a second pass.
    const recipe = join(
      config.libraryDirectory,
      "vaenyx-receipt-record",
      "recipe.md",
    );
    writeFileSync(recipe, "Owner's own recipe.");
    seedLibraryIfEmpty(config);
    expect(readFileSync(recipe, "utf8")).toBe("Owner's own recipe.");
  });

  it("leaves a package the Owner edited exactly as it is", () => {
    const config = installV1();
    const recipe = join(
      config.libraryDirectory,
      "vaenyx-warranty-manual-record",
      "recipe.md",
    );
    writeFileSync(recipe, `${readFileSync(recipe, "utf8")}\n- Owner rule.\n`);

    seedLibraryIfEmpty(config);

    const warranty = join(
      config.libraryDirectory,
      "vaenyx-warranty-manual-record",
    );
    expect(json(join(warranty, "method.json")).version).toBe("1.0.0");
    expect(readFileSync(recipe, "utf8")).toContain("- Owner rule.");
    // The untouched packages beside it still upgrade.
    expect(
      json(join(config.libraryDirectory, "vaenyx-receipt-record", "method.json"))
        .version,
    ).toBe("1.0.1");
  });

  it("treats a CRLF checkout of the same files as unchanged", () => {
    const config = installV1();
    const schema = join(
      config.libraryDirectory,
      "vaenyx-material-takeoff",
      "schema.json",
    );
    writeFileSync(schema, readFileSync(schema, "utf8").replace(/\n/g, "\r\n"));
    mkdirSync(join(config.libraryDirectory, "unrelated"), { recursive: true });

    seedLibraryIfEmpty(config);

    expect(
      json(
        join(config.libraryDirectory, "vaenyx-material-takeoff", "method.json"),
      ).version,
    ).toBe("1.0.1");
  });
});
