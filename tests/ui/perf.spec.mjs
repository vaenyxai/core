// Boot-performance measurement (not a pass/fail guard): set up an owner, then
// reload with a cold browser cache and record what the open actually costs —
// every request in order, and the time to a usable sidebar. Written while
// chasing "打开时间变得很慢" (Oskar, 2026-07-28); kept because the next slow
// open should be measured, not guessed at.
import { env, stdout } from "node:process";

import { test } from "@playwright/test";

const printLine = (line) => stdout.write(`${line}\n`);

test("measure: cold open to usable workspace", async ({ page }) => {
  // A measuring tool, not a gate: it assumes a FRESH instance, which the smoke
  // spec consumes first in a combined run. Enable on demand:
  //   VAENYX_PERF=1 npx playwright test tests/ui/perf.spec.mjs
  test.skip(!env.VAENYX_PERF, "measurement tool — run with VAENYX_PERF=1");
  test.setTimeout(90_000);

  // First-run setup so the reload lands on the real workspace boot.
  await page.goto("/");
  await page.getByLabel("Owner name").fill("Perf Owner");
  await page.locator('input[type="password"]').nth(0).fill("perf-pass-123");
  await page.locator('input[type="password"]').nth(1).fill("perf-pass-123");
  await page.getByRole("button", { name: "Create Vaenyx" }).click();
  await page.locator(".acceptance-choices button").first().click();
  await page.locator(".acceptance-continue").click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Start Using Vaenyx" }).click();
  await page.getByRole("button", { name: "New" }).waitFor({ timeout: 15_000 });

  // The measured run: cold reload of the workspace.
  const requests = [];
  const t0 = [Date.now()];
  page.on("request", (request) => {
    if (request.url().includes("/v1/") || request.url().includes("/assets/")) {
      requests.push({ url: request.url(), at: Date.now() - t0[0] });
    }
  });
  const responses = new Map();
  page.on("response", (response) => {
    responses.set(response.url(), Date.now() - t0[0]);
  });

  t0[0] = Date.now();
  await page.reload();
  await page.getByRole("button", { name: "New" }).waitFor({ timeout: 30_000 });
  const usableAt = Date.now() - t0[0];

  test.info().annotations.push({ type: "perf", description: `usable after ${usableAt}ms` });
  printLine(`\n=== usable sidebar after ${usableAt}ms ===`);
  for (const request of requests) {
    const done = responses.get(request.url);
    const name = request.url.replace(/^https?:\/\/[^/]+/, "");
    printLine(
      `${String(request.at).padStart(5)}ms → ${done !== undefined ? `${String(done).padStart(5)}ms` : "  ⋯  "}  ${name.slice(0, 90)}`,
    );
  }
});
