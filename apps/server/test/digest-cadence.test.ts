// WHEN IS A MONTHLY SUMMARY DUE?
//
// Not every 30 days. A fixed interval drifts: twelve 30-day periods land five
// days short of a year, so a digest that started on the 1st walks backwards
// through the month until "monthly" stops meaning what the person reading it
// thinks it means. The other two cadences are honestly fixed lengths — a day
// is a day — so only this one needs calendar arithmetic, and only this one can
// get the arithmetic wrong.
import { describe, expect, it } from "vitest";

import { digestIsDue } from "../src/modules/core/modes.js";

const at = (iso: string) => new Date(iso).getTime();

describe("when the next digest is due", () => {
  it("waits a whole month, not thirty days", () => {
    const since = "2026-01-15T09:00:00.000Z";
    expect(digestIsDue("monthly", since, at("2026-02-14T09:00:00.000Z"))).toBe(
      false,
    );
    expect(digestIsDue("monthly", since, at("2026-02-15T09:00:00.000Z"))).toBe(
      true,
    );
  });

  it("🔴 does not skip February when the last one was the 31st", () => {
    // Naively adding a month to 31 January gives 3 March, so February would
    // pass with no digest and the one after would be six weeks late.
    const since = "2026-01-31T09:00:00.000Z";
    expect(digestIsDue("monthly", since, at("2026-02-27T09:00:00.000Z"))).toBe(
      false,
    );
    expect(digestIsDue("monthly", since, at("2026-02-28T09:00:00.000Z"))).toBe(
      true,
    );
  });

  it("does not drift across a short month either", () => {
    // 31 March + one month is 30 April, not 1 May.
    const since = "2026-03-31T09:00:00.000Z";
    expect(digestIsDue("monthly", since, at("2026-04-30T09:00:00.000Z"))).toBe(
      true,
    );
  });

  it("still handles the fixed-length cadences", () => {
    const since = "2026-01-15T09:00:00.000Z";
    expect(digestIsDue("daily", since, at("2026-01-16T08:59:00.000Z"))).toBe(
      false,
    );
    expect(digestIsDue("daily", since, at("2026-01-16T09:00:00.000Z"))).toBe(
      true,
    );
    expect(digestIsDue("weekly", since, at("2026-01-21T09:00:00.000Z"))).toBe(
      false,
    );
    expect(digestIsDue("weekly", since, at("2026-01-22T09:00:00.000Z"))).toBe(
      true,
    );
  });

  it("never fires for a Mode that reports nothing, or for junk", () => {
    const now = at("2030-01-01T00:00:00.000Z");
    expect(digestIsDue("off", "2026-01-15T09:00:00.000Z", now)).toBe(false);
    expect(digestIsDue("yearly", "2026-01-15T09:00:00.000Z", now)).toBe(false);
    expect(digestIsDue("monthly", "not a date", now)).toBe(false);
  });
});
