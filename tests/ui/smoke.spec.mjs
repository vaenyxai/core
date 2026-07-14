// First-run UI smoke: the whole happy path a brand-new user walks, in a real
// browser against the production build — owner setup, the install acceptance
// gate (forced flywheel choice), workspace, Library, Community. A guardrail so
// UI refactors cannot silently break the install experience.
import { expect, test } from "@playwright/test";

test("first run: owner setup → acceptance gate → Library and Community", async ({
  page,
}) => {
  await page.goto("/");

  // Fresh data directory ⇒ owner setup comes first.
  await expect(
    page.getByRole("heading", { name: "Create your Vaenyx." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Owner name").fill("Smoke Owner");
  await page.locator('input[type="password"]').nth(0).fill("smoke-pass-123");
  await page.locator('input[type="password"]').nth(1).fill("smoke-pass-123");
  await page.getByRole("button", { name: "Create Vaenyx" }).click();

  // The install acceptance gate (copy pack Part A) MUST show once after
  // sign-in on a fresh instance, and Continue MUST stay disabled until a
  // sharing choice is made — both are legal requirements, so the test fails
  // loudly if either regresses.
  const cont = page.locator(".acceptance-continue");
  await expect(cont).toBeVisible({ timeout: 15_000 });
  await expect(cont).toBeDisabled();
  await page.locator(".acceptance-choices button").first().click();
  await expect(cont).toBeEnabled();
  await cont.click();

  // Workspace loads into the chat portal; the sidebar Settings button opens
  // the admin area whose tab row holds Library and Community side by side.
  const settingsButton = page.locator(".sidebar-settings-button");
  await expect(settingsButton).toBeVisible({ timeout: 15_000 });
  await settingsButton.click();

  const tabs = page.locator(".admin-tabs");
  const libraryNav = tabs.getByRole("button", { name: "Library", exact: true });
  const communityNav = tabs.getByRole("button", {
    name: "Community",
    exact: true,
  });
  await expect(libraryNav).toBeVisible();
  await expect(communityNav).toBeVisible();

  await libraryNav.click();
  await expect(page.locator(".library-area").first()).toBeVisible();

  await communityNav.click();
  // The intro paragraph that states the Community-vs-Library difference.
  await expect(
    page.getByText("Community is the shared catalogue", { exact: false }),
  ).toBeVisible();
});
