import { describe, expect, it } from "vitest";

import { diffRecipeLines } from "../src/modules/core/methods.js";

// The Owner approves a recipe edit by reading it, so the diff has to show the
// lines that actually changed. A diff that marks the whole file as replaced is
// the same as showing nothing: there is no way to check what was asked for.
describe("diffRecipeLines", () => {
  it("marks only the line that changed", () => {
    const before = "Step 1: read the quote.\nStep 2: total the items.\nStep 3: reply.";
    const after =
      "Step 1: read the quote.\nStep 2: total the items and add GST.\nStep 3: reply.";
    const diff = diffRecipeLines(before, after);

    expect(diff.filter((line) => line.kind === "removed")).toEqual([
      { kind: "removed", text: "Step 2: total the items." },
    ]);
    expect(diff.filter((line) => line.kind === "added")).toEqual([
      { kind: "added", text: "Step 2: total the items and add GST." },
    ]);
    expect(diff.filter((line) => line.kind === "same")).toHaveLength(2);
  });

  it("reports no change when nothing changed", () => {
    const text = "Do the thing.\nThen stop.";
    expect(
      diffRecipeLines(text, text).every((line) => line.kind === "same"),
    ).toBe(true);
  });

  it("keeps surrounding lines untouched when one is inserted", () => {
    const diff = diffRecipeLines("a\nb", "a\nnew\nb");
    expect(diff).toEqual([
      { kind: "same", text: "a" },
      { kind: "added", text: "new" },
      { kind: "same", text: "b" },
    ]);
  });

  it("reports a deletion as removed, not as a rewrite", () => {
    const diff = diffRecipeLines("a\nb\nc", "a\nc");
    expect(diff).toEqual([
      { kind: "same", text: "a" },
      { kind: "removed", text: "b" },
      { kind: "same", text: "c" },
    ]);
  });

  it("handles an empty original", () => {
    expect(diffRecipeLines("", "hello")).toEqual([
      { kind: "removed", text: "" },
      { kind: "added", text: "hello" },
    ]);
  });

  it("treats CRLF and LF as the same text", () => {
    const diff = diffRecipeLines("a\r\nb", "a\nb");
    expect(diff.every((line) => line.kind === "same")).toBe(true);
  });
});
