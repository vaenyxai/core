// FOUR SEGMENTS, NOT THREE (Oskar, 2026-08-09).
//
// The app version is w.x.y.z. The fourth is the build number: 0.4.0.8 is the
// eighth build of 0.4.0, and cutting a release bumps the THIRD and resets the
// fourth, so the one after 0.4.0.8 is 0.4.1.0.
//
// The comparator used to stop after three segments, which was correct when the
// build number lived in a "-dev.8" suffix and wrong the moment it moved into
// the number itself: every build of one release would have compared EQUAL, and
// "there is a newer version" would have answered no to all of them. That is a
// silent failure — nothing breaks, updates just stop being offered — so it gets
// a test.
import { describe, expect, it } from "vitest";

import { compareVersions } from "../src/modules/core/updates.js";

const newer = (left: string, right: string) => compareVersions(left, right) > 0;

describe("comparing app versions", () => {
  it("🔴 tells two builds of the same release apart", () => {
    expect(newer("0.4.0.9", "0.4.0.8")).toBe(true);
    expect(newer("0.4.0.8", "0.4.0.9")).toBe(false);
    expect(compareVersions("0.4.0.8", "0.4.0.8")).toBe(0);
  });

  it("counts the build number as dotted, not decimal", () => {
    // 0.4.0.10 is the tenth build and beats the ninth. Read as a decimal it
    // would be 0.1, which loses to 0.9 — the same trap the copy-pack version
    // hit, which is why that one skipped 2.10.
    expect(newer("0.4.0.10", "0.4.0.9")).toBe(true);
  });

  it("a release beats every build of the release before it", () => {
    expect(newer("0.4.1.0", "0.4.0.99")).toBe(true);
    expect(newer("0.5.0.0", "0.4.9.9")).toBe(true);
  });

  it("treats a missing fourth segment as build zero", () => {
    // Anything published before the scheme changed, and every git tag of the
    // old shape, still compares sensibly.
    expect(compareVersions("0.4.0", "0.4.0.0")).toBe(0);
    expect(newer("0.4.0.1", "0.4.0")).toBe(true);
  });

  it("a real release still beats a suffixed build of the same number", () => {
    expect(newer("0.4.0.8", "0.4.0.8-dev.1")).toBe(true);
    expect(newer("0.4.0", "0.4.0-dev.8")).toBe(true);
  });

  it("ignores a leading v, because tags carry one and config does not", () => {
    expect(compareVersions("v0.4.0.8", "0.4.0.8")).toBe(0);
  });
});
