// First-run UI smoke: the whole happy path a brand-new user walks, in a real
// browser against the production build — owner setup, the install acceptance
// gate (forced flywheel choice), the connect-a-model step, workspace, Library,
// Community. A guardrail so UI refactors cannot silently break the install
// experience.
import { expect, test } from "@playwright/test";

test("first run: owner setup → acceptance gate → model step → Library and Community", async ({
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

  // Connect-a-model step (onboarding spec section 4, step 3). It MUST appear
  // on an install with no working backend, and it MUST be skippable — the
  // spec is explicit that it never hard-locks the app.
  await expect(
    page.getByRole("heading", { name: "Connect your first model" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("button", { name: "Sign In With ChatGPT" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();

  // Completion page (spec section 4, step 4): what to try, and the phone
  // option. It must never be a dead end.
  await expect(
    page.getByRole("heading", { name: "You're set up" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Start Using Vaenyx" }).click();

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
    page.getByText("published by people everywhere", { exact: false }),
  ).toBeVisible();
  // And the community disclaimer, which must never again imply that a person
  // reviews "Verified" items (legal v2.4 corrected exactly that overclaim).
  await expect(
    page.getByText("automated checks passed", { exact: false }),
  ).toBeVisible();
});
