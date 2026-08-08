// Forking somebody else's recipe. The tests here hold one rule:
//
//   Examples flow to the author of the recipe that produced them.
//
// Everything else falls out of it.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ForkIdTakenError,
  forkMethod,
  freeForkId,
  mayReturnCorrectionsUpstream,
  readDerivedFrom,
  suggestForkName,
  toFolderId,
} from "../src/modules/core/fork-method.js";

const temporaries: string[] = [];

function libraryWith(id: string, meta: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-fork-"));
  temporaries.push(root);
  const folder = join(root, id);
  mkdirSync(join(folder, "examples"), { recursive: true });
  writeFileSync(join(folder, "method.json"), JSON.stringify(meta), "utf8");
  writeFileSync(join(folder, "recipe.md"), "the recipe", "utf8");
  writeFileSync(join(folder, "examples", "0001.json"), '{"mine":true}', "utf8");
  return root;
}

afterEach(() => {
  while (temporaries.length) {
    rmSync(temporaries.pop() as string, { force: true, recursive: true });
  }
});

describe("making somebody else's recipe your own", () => {
  it("keeps the original and records who wrote it", () => {
    const library = libraryWith("drawing-takeoff", {
      id: "drawing-takeoff",
      name: "Drawing Takeoff",
      origin: "community",
      owner: "someone-else",
      version: "1.2.0",
    });

    forkMethod({
      forkId: "drawing-takeoff-mine",
      forkName: "Drawing Takeoff (mine)",
      libraryDirectory: library,
      originalId: "drawing-takeoff",
    });

    // The original is still there — the Owner keeps getting the author's
    // fixes for it, and any Routine still pointing at it keeps working.
    const original = JSON.parse(
      readFileSync(join(library, "drawing-takeoff", "method.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(original.origin).toBe("community");

    const fork = JSON.parse(
      readFileSync(join(library, "drawing-takeoff-mine", "method.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(fork.origin).toBe("self");
    expect(fork.name).toBe("Drawing Takeoff (mine)");
    // 🔴 Permanent attribution. Publishing a derivative is allowed BECAUSE
    // this is here — community content is CC BY 4.0, which requires credit.
    expect(fork.derivedFrom).toEqual({
      author: "someone-else",
      id: "drawing-takeoff",
      version: "1.2.0",
    });
  });

  it("brings the examples along, because they came from this recipe", () => {
    const library = libraryWith("m", { id: "m", origin: "community", owner: "a" });
    forkMethod({
      forkId: "m-mine",
      forkName: "Mine",
      libraryDirectory: library,
      originalId: "m",
    });
    expect(
      readFileSync(join(library, "m-mine", "examples", "0001.json"), "utf8"),
    ).toBe('{"mine":true}');
  });

  it("refuses to write over something already there", () => {
    const library = libraryWith("m", { id: "m", origin: "community" });
    mkdirSync(join(library, "taken"));
    expect(() =>
      forkMethod({
        forkId: "taken",
        forkName: "Taken",
        libraryDirectory: library,
        originalId: "m",
      }),
    ).toThrow(ForkIdTakenError);
  });
});

describe("editing the same one twice", () => {
  it("does not answer a second edit with an error", () => {
    // Trying something, then trying something else, is what people do. The
    // second copy stands beside the first rather than refusing to exist.
    const library = libraryWith("m", { id: "m", origin: "community", owner: "a" });
    forkMethod({
      forkId: freeForkId(library, "m-mine"),
      forkName: "Mine",
      libraryDirectory: library,
      originalId: "m",
    });
    const second = freeForkId(library, "m-mine");
    expect(second).toBe("m-mine-2");
    forkMethod({
      forkId: second,
      forkName: "Mine again",
      libraryDirectory: library,
      originalId: "m",
    });
    expect(readDerivedFrom(library, "m-mine-2")?.id).toBe("m");
  });
});

describe("where corrections are allowed to go", () => {
  it("lets an untouched community Method send them upstream", () => {
    const library = libraryWith("m", { id: "m", origin: "community", owner: "a" });
    expect(mayReturnCorrectionsUpstream(library, "m")).toBe(true);
  });

  it("🔴 never lets a fork send them upstream", () => {
    // Not a privacy rule. A correction from a changed recipe describes
    // something its original author never wrote, and they cannot tell — so
    // sending it would teach their general recipe this household's local
    // convention.
    const library = libraryWith("m", { id: "m", origin: "community", owner: "a" });
    forkMethod({
      forkId: "m-mine",
      forkName: "Mine",
      libraryDirectory: library,
      originalId: "m",
    });
    expect(mayReturnCorrectionsUpstream(library, "m-mine")).toBe(false);
  });

  it("does not send anything upstream for a Method written here", () => {
    const library = libraryWith("m", { id: "m", origin: "self" });
    expect(mayReturnCorrectionsUpstream(library, "m")).toBe(false);
  });
});

describe("naming the copy", () => {
  it("suggests something recognisable and obviously yours", () => {
    expect(suggestForkName("Drawing Takeoff", false)).toBe("Drawing Takeoff (mine)");
    expect(suggestForkName("图纸取量", true)).toBe("图纸取量(我的)");
  });

  it("turns a title into a folder name that a path can hold", () => {
    expect(toFolderId("Drawing Takeoff (mine)", "x")).toBe("drawing-takeoff-mine");
    expect(toFolderId("  ", "fallback-id")).toBe("fallback-id");
    // A Chinese title has no ascii to keep, so the fallback carries it.
    expect(toFolderId("图纸取量(我的)", "takeoff-mine")).toBe("takeoff-mine");
  });

  it("reads the attribution back for the card and the publish form", () => {
    const library = libraryWith("m", {
      id: "m",
      origin: "community",
      owner: "author-name",
      version: "2.0.0",
    });
    forkMethod({
      forkId: "m-mine",
      forkName: "Mine",
      libraryDirectory: library,
      originalId: "m",
    });
    expect(readDerivedFrom(library, "m-mine")).toEqual({
      author: "author-name",
      id: "m",
      version: "2.0.0",
    });
    expect(readDerivedFrom(library, "m")).toBeNull();
  });
});
