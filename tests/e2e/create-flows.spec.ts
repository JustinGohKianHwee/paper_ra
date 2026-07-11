import { expect, test } from "@playwright/test";

/**
 * Creation flows: add a paper manually (with topic), record a misconception,
 * create a synthesis note from the template.
 */

const email = process.env.SEED_EMAIL ?? "researcher@example.com";
const password = process.env.SEED_PASSWORD ?? "research-atlas-dev";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("create a paper manually with a topic link", async ({ page }) => {
  const title = `E2E Created Paper ${Date.now().toString(36)}`;

  await page.goto("/papers/new");
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Organisation").fill("Test Org");
  await page.getByLabel("Year").fill("2026");
  await page.getByRole("checkbox", { name: "Sequential Recommendation" }).check();
  await page.getByRole("button", { name: "Create paper" }).click();

  // Redirects to the new paper page with the full template.
  await expect(page).toHaveURL(/\/papers\/e2e-created-paper/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One-sentence thesis" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sequential Recommendation" })).toBeVisible();
  // New manual papers start honest: metadata only.
  await expect(page.getByText("Metadata only").first()).toBeVisible();
});

test("record a misconception and see it on the list and dashboard", async ({ page }) => {
  const marker = `e2e-belief-${Date.now().toString(36)}`;

  await page.goto("/misconceptions/new");
  await page.getByLabel("I initially thought… *").fill(`I thought ${marker} was true.`);
  await page
    .getByLabel("Corrected understanding *")
    .fill(`Actually ${marker} only holds for dense users.`);
  await page.getByRole("button", { name: "Save misconception" }).click();

  await expect(page).toHaveURL(/\/misconceptions$/);
  await expect(page.getByText(`I thought ${marker} was true.`)).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText(new RegExp(marker))).toBeVisible();
});

test("create a weekly synthesis note from the template", async ({ page }) => {
  await page.goto("/synthesis/new");
  const title = `E2E Synthesis ${Date.now().toString(36)}`;
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Create from template" }).click();

  // Either lands on the note, or the weekly note for this period already
  // exists (seeded runs) and shows a clear error.
  const created = await page
    .waitForURL(/\/synthesis\/[0-9a-f-]+/, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (created) {
    const editor = page.getByRole("textbox", { name: "Synthesis" });
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue(/What did I learn/);
    await expect(editor).toHaveValue(/What should stay classical\?/);
  } else {
    await expect(page.getByText(/already exists/)).toBeVisible();
  }
});
