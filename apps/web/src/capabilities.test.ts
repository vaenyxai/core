import { describe, expect, it } from "vitest";

import { CAPABILITIES, GATED_KEYS, isKeyRenderable } from "./capabilities.js";

// Copy pack Part K describes sending examples to a Method's publisher. None of
// it may reach a user before the Schedule marks that capability active: a
// notice describing a mechanism that does not exist tells the user something
// untrue about the software they are running.
describe("capability gate", () => {
  it("keeps every Part K string unrenderable while the upload half is not built", () => {
    // If this fails because the capability was switched on, the Schedule entry
    // and the Part A data-flow entry have to move at the same time.
    expect(CAPABILITIES.flywheelUpload).toBe(false);
    for (const key of Object.keys(GATED_KEYS)) {
      expect(isKeyRenderable(key)).toBe(false);
    }
  });

  it("gates the three Part K keys and nothing else", () => {
    expect(Object.keys(GATED_KEYS).sort()).toEqual([
      "legal.consent.flywheel.activate",
      "legal.notice.flywheel.item",
      "legal.notice.flywheel.remove",
    ]);
  });

  it("leaves ungated keys alone", () => {
    expect(isKeyRenderable("legal.notice.firstRun.terms")).toBe(true);
    expect(isKeyRenderable("anything.else")).toBe(true);
  });
});
