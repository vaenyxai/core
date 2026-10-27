import { describe, expect, it } from "vitest";
import { shouldReland } from "./chat-landing";

const landed = {
  height: 4000,
  viewportHeight: 800,
  scrollY: 3200,
  targetTop: 600,
};
describe("chat landing after a routine confirmation", () => {
  it("recovers when modal history restores an older position at the same page height", () => {
    expect(
      shouldReland(landed, { ...landed, scrollY: 2100, targetTop: 1700 }),
    ).toBe(true);
  });
  it("adjusts for a late photo or a mobile keyboard changing the viewport", () => {
    expect(
      shouldReland(landed, { ...landed, height: 4600, targetTop: 1200 }),
    ).toBe(true);
    expect(shouldReland(landed, { ...landed, viewportHeight: 420 })).toBe(true);
  });
  it("leaves a settled position alone, allowing subpixel rounding", () => {
    expect(shouldReland(null, landed)).toBe(true);
    expect(shouldReland(landed, landed)).toBe(false);
    expect(shouldReland(landed, { ...landed, targetTop: 600.5 })).toBe(false);
  });
});
