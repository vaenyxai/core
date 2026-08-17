// WHICH FILE DID THEY MEAN. The old rule was "the message must contain the
// filename character for character", which meant Fetching answered from nothing
// unless the Owner typed `quote-march.txt` (Oskar, 2026-08-17). These pin the
// rule that replaced it — including the one case that must NOT be answered:
// a tie is asked about, never guessed.
import { describe, expect, it } from "vitest";

import { matchFetchName } from "../src/modules/core/fetching.js";

const FILES = [
  "quote-march.txt",
  "quote-april.txt",
  "notes.md",
  "budget-2025.txt",
  "报价单-三月.txt",
];

describe("matching a file the way a person says it", () => {
  it("matches the name said in words, not spelled with its extension", () => {
    expect(matchFetchName("what does the March quote say?", FILES).best).toBe(
      "quote-march.txt",
    );
    expect(matchFetchName("open quote-march.txt", FILES).best).toBe(
      "quote-march.txt",
    );
    // Word order is not the point; being mentioned is.
    expect(matchFetchName("march quote please", FILES).best).toBe(
      "quote-march.txt",
    );
  });

  it("works in Chinese, where there are no spaces to split on", () => {
    expect(matchFetchName("读一下三月的报价单", FILES).best).toBe(
      "报价单-三月.txt",
    );
  });

  it("needs EVERY word of the name, so a year alone opens nothing", () => {
    expect(matchFetchName("what happened in 2025?", FILES).best).toBeNull();
    expect(matchFetchName("show me the 2025 budget", FILES).best).toBe(
      "budget-2025.txt",
    );
  });

  it("does not match a name hiding inside a longer word", () => {
    // "notes" must not fire on "notebook".
    expect(
      matchFetchName("I bought a new notebook today", FILES).best,
    ).toBeNull();
    expect(matchFetchName("read my notes", FILES).best).toBe("notes.md");
  });

  // 🔴 The rule that matters most: an ambiguous ask is ASKED ABOUT. The real
  // case is one name saved twice — same words, different extension.
  it("never guesses between two files that fit equally well", () => {
    const both = matchFetchName("send the march quote", [
      "quote-march.txt",
      "quote-march.md",
    ]);
    expect(both.best).toBeNull();
    expect(both.tied.sort()).toEqual(["quote-march.md", "quote-march.txt"]);
  });

  // A half-named ask opens NOTHING rather than picking one of the candidates.
  // The model still gets the folder listing, so it can ask which month.
  it("opens nothing when the ask is only part of a name", () => {
    const partial = matchFetchName("open the quote", [
      "quote-march.txt",
      "quote-april.txt",
    ]);
    expect(partial.best).toBeNull();
    expect(partial.tied).toEqual([]);
  });

  it("prefers the more specific name over one contained in it", () => {
    const files = ["quote.txt", "quote-march-final.txt"];
    expect(matchFetchName("send the quote march final", files).best).toBe(
      "quote-march-final.txt",
    );
  });

  it("opens nothing when nothing was named", () => {
    const none = matchFetchName("what is the weather like?", FILES);
    expect(none.best).toBeNull();
    expect(none.tied).toEqual([]);
  });
});
