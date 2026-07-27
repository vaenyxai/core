import { describe, expect, it } from "vitest";

import { CAPABILITIES, GATED_KEYS, isKeyRenderable } from "./capabilities.js";

// Copy pack Part K describes sending examples to a Method's publisher. None of
// it may reach a user before the Schedule marks that capability active: a
// notice describing a mechanism that does not exist tells the user something
// untrue about the software they are running.
describe("capability gate", () => {
  it("renders Part K only while the Schedule marks the upload engine available", () => {
    // ON since 2026-07-27: Schedule entry feature.community-sharing.
    // upload-engine = available-off (shipped, off by default), Legal Set v3.1.
    // If this is ever switched back off, every Part K string must go dark with
    // it — and switching it ON again requires the Schedule to move first.
    for (const key of [
      "legal.consent.flywheel.activate",
      "legal.notice.flywheel.item",
      "legal.notice.flywheel.remove",
      "flywheel.queue.window",
      "flywheel.queue.held",
      "legal.consent.flywheel.receive.label",
      "legal.notice.flywheel.contributorId",
    ]) {
      expect(isKeyRenderable(key)).toBe(CAPABILITIES.flywheelUpload);
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
