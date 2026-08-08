// HOW SURE IS "0.9"?
//
// The extraction template showed {"confidence":0} and never said what range to
// use, so the model answered the way anybody answers "how sure are you" — as a
// probability. 0.9 was then rounded and stored on a 0-100 scale as 1, which
// reads as "almost no idea". Every fact proposal in the live queue sat at
// exactly 1: not six unsure guesses, six confident ones wearing the wrong
// label.
//
// It cost twice. The inbox folds anything under 60, so the surest proposals
// were the ones hidden; and approving a fact divides the stored number by 100,
// so a sure thing entered memory at 0.01 and would look like noise to anything
// that later ranks or prunes by confidence.
import { describe, expect, it } from "vitest";

import {
  extractionPrompt,
  parseProposedFacts,
} from "../src/modules/core/facts-extract.js";

const answer = (confidence: unknown) =>
  JSON.stringify({
    facts: [
      {
        slot: "home.address",
        value: "12 Example St",
        event_time: "",
        evidence: "we moved in March",
        confidence,
      },
    ],
  });

describe("the confidence the extractor comes back with", () => {
  it("🔴 tells the model what the number means", () => {
    // The whole defect was an unlabelled scale. If this line goes, the model
    // goes back to answering probabilities and nothing else notices.
    const prompt = extractionPrompt(["home.address"], []);
    expect(prompt).toContain("0 to 100");
  });

  it("reads a probability as a percentage rather than as near-zero", () => {
    expect(parseProposedFacts(answer(0.9))[0]?.confidence).toBe(90);
    expect(parseProposedFacts(answer(1))[0]?.confidence).toBe(100);
  });

  it("leaves an answer already on the right scale alone", () => {
    expect(parseProposedFacts(answer(85))[0]?.confidence).toBe(85);
    expect(parseProposedFacts(answer(45))[0]?.confidence).toBe(45);
  });

  it("keeps zero meaning zero", () => {
    // 0 is the one value that is the same on both scales, and multiplying it
    // would still be 0 — but it must not be treated as "no answer" either.
    expect(parseProposedFacts(answer(0))[0]?.confidence).toBe(0);
  });

  it("falls back to the middle when the model says nothing useful", () => {
    expect(parseProposedFacts(answer("very sure"))[0]?.confidence).toBe(50);
  });
});
