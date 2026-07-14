import { describe, expect, it } from "vitest";

import { computeNextRun } from "../src/modules/core/tasks.js";

// computeNextRun works in the server's local time zone; assertions are relative
// (weekday / hour / "after from") so they hold regardless of the host zone.

describe("computeNextRun (real cron)", () => {
  it("hourly is exactly +1 hour", () => {
    const from = new Date(2026, 5, 22, 10, 30, 0).getTime();
    const next = new Date(
      computeNextRun(
        { cadence: "hourly", time: null, dayOfWeek: null, dayOfMonth: null },
        from,
      ),
    );
    expect(next.getTime() - from).toBe(60 * 60 * 1000);
  });

  it("daily rolls to tomorrow when the time already passed today", () => {
    const from = new Date(2026, 5, 22, 10, 0, 0).getTime(); // 10:00
    const next = new Date(
      computeNextRun(
        { cadence: "daily", time: "09:00", dayOfWeek: null, dayOfMonth: null },
        from,
      ),
    );
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(0);
    expect(next.getTime()).toBeGreaterThan(from);
    expect(next.getTime() - from).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it("daily stays today when the time is still ahead", () => {
    const from = new Date(2026, 5, 22, 8, 0, 0).getTime(); // 08:00
    const next = new Date(
      computeNextRun(
        { cadence: "daily", time: "09:00", dayOfWeek: null, dayOfMonth: null },
        from,
      ),
    );
    expect(next.getDate()).toBe(22);
    expect(next.getHours()).toBe(9);
  });

  it("weekly lands on the chosen weekday at the chosen time, in the future", () => {
    const from = new Date(2026, 5, 22, 10, 0, 0).getTime();
    const next = new Date(
      computeNextRun(
        { cadence: "weekly", time: "09:00", dayOfWeek: 5, dayOfMonth: null },
        from,
      ),
    );
    expect(next.getDay()).toBe(5); // Friday
    expect(next.getHours()).toBe(9);
    expect(next.getTime()).toBeGreaterThan(from);
    expect(next.getTime() - from).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });

  it("monthly lands on the chosen day-of-month, rolling to next month when past", () => {
    const from = new Date(2026, 5, 22, 10, 0, 0).getTime(); // Jun 22
    const next = new Date(
      computeNextRun(
        { cadence: "monthly", time: "08:00", dayOfWeek: null, dayOfMonth: 1 },
        from,
      ),
    );
    expect(next.getDate()).toBe(1);
    expect(next.getMonth()).toBe(6); // July (0-based)
    expect(next.getHours()).toBe(8);
  });

  it("monthly clamps an out-of-range day to the month's last day", () => {
    const from = new Date(2026, 0, 5, 10, 0, 0).getTime(); // Jan 5
    const next = new Date(
      computeNextRun(
        { cadence: "monthly", time: "08:00", dayOfWeek: null, dayOfMonth: 31 },
        from,
      ),
    );
    // Jan 31 is still ahead, so it stays in January on the 31st.
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(31);
  });
});
