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
    for (const key of [
      "legal.consent.flywheel.activate",
      "legal.notice.flywheel.item",
      "legal.notice.flywheel.remove",
    ]) {
      expect(isKeyRenderable(key)).toBe(false);
    }
  });

  it("renders Part L only while the interface it describes is reachable", () => {
    // Part L went live with its interface (2026-07-26). If this is ever
    // switched back off, its strings must go dark with it — a notice about a
    // feature nobody can reach describes software that does not exist.
    for (const key of [
      "legal.notice.skill.import",
      "legal.notice.skill.importedPublish",
      "legal.notice.skill.export",
    ]) {
      expect(isKeyRenderable(key)).toBe(CAPABILITIES.skillInterop);
    }
  });

  it("gates exactly the Part K and Part L keys", () => {
    expect(Object.keys(GATED_KEYS).sort()).toEqual([
      "flywheel.queue.held",
      "flywheel.queue.window",
      "legal.consent.flywheel.activate",
      "legal.consent.flywheel.receive",
      "legal.consent.flywheel.receive.label",
      "legal.consent.flywheel.sensitiveAsk",
      "legal.notice.flywheel.contributorId",
      "legal.notice.flywheel.item",
      "legal.notice.flywheel.remove",
      "legal.notice.skill.export",
      "legal.notice.skill.import",
      "legal.notice.skill.importedPublish",
    ]);
  });

  it("leaves ungated keys alone", () => {
    expect(isKeyRenderable("legal.notice.firstRun.terms")).toBe(true);
    expect(isKeyRenderable("anything.else")).toBe(true);
  });
});
