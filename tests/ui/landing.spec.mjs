// WHERE A CONVERSATION OPENS (Oskar, 2026-08-16): read = the bottom, on the
// newest message; unread = the start of the earliest unread message. Chat
// and task views alike. This broke twice in one day — first the task view's
// staged rendering outran a one-shot scroll, then a missing seen watermark
// turned every new thread's landing into "jump to message #1" — so it is a
// real-browser regression test now.
import { expect, test } from "@playwright/test";

async function scrollReport(page) {
  return page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    fromBottom: Math.round(
      document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight,
    ),
  }));
}

test("conversations open at the bottom; an unread one opens at its first unread", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Create your Vaenyx." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Owner name").fill("Landing Owner");
  await page.locator('input[type="password"]').nth(0).fill("landing-pass-123");
  await page.locator('input[type="password"]').nth(1).fill("landing-pass-123");
  await page.getByRole("button", { name: "Create Vaenyx" }).click();

  const cont = page.locator(".acceptance-continue");
  await expect(cont).toBeVisible({ timeout: 15_000 });
  await page.locator(".acceptance-choices button").first().click();
  await cont.click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Start Using Vaenyx" }).click();
  await expect(page.locator(".sidebar-settings-button")).toBeVisible({
    timeout: 15_000,
  });

  // Two chats tall enough to scroll, built through the real composer (the
  // session cookie is SameSite=Strict, so only same-page requests carry it;
  // the model binary is dead, so sends fail fast and the rows remain).
  const long = "这一行是占位内容,用来把对话撑得比屏幕高很多。".repeat(10);
  for (const title of ["AAA-landing", "BBB-landing"]) {
    await page
      .getByRole("button", { name: "Start a new Vaenyx conversation" })
      .click();
    const composer = page.getByPlaceholder("Ask anything");
    await expect(composer).toBeVisible({ timeout: 10_000 });
    for (let index = 0; index < 5; index += 1) {
      await composer.fill(`${title} #${index + 1}\n${long}`);
      await composer.press("Shift+Enter");
      await page.waitForTimeout(1_200);
    }
  }

  // A task thread too — its view renders header, runs and messages on
  // separate clocks, which is where a one-shot landing scroll used to die.
  const login = await page.request.post("/v1/auth/login", {
    data: { password: "landing-pass-123" },
  });
  expect(login.ok()).toBeTruthy();
  const workspaceResponse = await page.request.get("/v1/workspace");
  const workspaceData = await workspaceResponse.json();
  const projectId = workspaceData.projects?.[0]?.id ?? "vaenyx";
  const taskLong = "任务结果占位行,把任务对话撑高。".repeat(10);
  const taskCreated = await page.request.post("/v1/tasks", {
    data: {
      request: `TASK-landing run\n${taskLong}`,
      title: "TASK-landing",
      projectId,
      executionMode: "research",
    },
  });
  expect(taskCreated.ok()).toBeTruthy();
  const task = await taskCreated.json();
  for (let index = 0; index < 4; index += 1) {
    await page.request.post(`/v1/tasks/${task.id}/messages`, {
      data: { content: `task follow-up #${index + 1}\n${taskLong}` },
    });
  }

  await page.reload();
  await expect(page.locator(".sidebar-settings-button")).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(1_000);

  // Read chats land at the bottom.
  for (const title of ["AAA-landing", "BBB-landing"]) {
    await page
      .getByRole("button", { name: new RegExp(title) })
      .first()
      .click();
    await page.waitForTimeout(2_000);
    const report = await scrollReport(page);
    expect(
      report.fromBottom,
      `${title} should land at the bottom`,
    ).toBeLessThan(150);
  }

  // The task accumulated activity since it was created, so its FIRST open is
  // the unread case: it lands high, at the earliest unread message, not at
  // the bottom.
  await page
    .getByRole("button", { name: /TASK-landing/ })
    .first()
    .click();
  await page.waitForTimeout(2_500);
  const unreadLanding = await scrollReport(page);
  expect(
    unreadLanding.fromBottom,
    "first (unread) open lands at the earliest unread, not the bottom",
  ).toBeGreaterThan(400);

  // That open marked it read: reopening lands at the bottom — the everyday
  // scheduled-task path.
  await page
    .getByRole("button", { name: /AAA-landing/ })
    .first()
    .click();
  await page.waitForTimeout(1_200);
  await page
    .getByRole("button", { name: /TASK-landing/ })
    .first()
    .click();
  await page.waitForTimeout(2_500);
  const readLanding = await scrollReport(page);
  expect(
    readLanding.fromBottom,
    "a read task reopens at the bottom",
  ).toBeLessThan(150);
});
