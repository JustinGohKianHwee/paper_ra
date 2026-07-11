import { expect, test } from "@playwright/test";

/**
 * The core loop: sign in → open a seeded paper (view mode) → edit a
 * structured section (notes surface) → autosave → find the edited content
 * via full-text search.
 *
 * Prerequisites: `npx supabase start` and `npm run seed`.
 */

const email = process.env.SEED_EMAIL ?? "researcher@example.com";
const password = process.env.SEED_PASSWORD ?? "research-atlas-dev";

test("login → edit structured note → autosave → search finds it", async ({ page }) => {
  const marker = `e2e-marker-${Date.now().toString(36)}`;

  // --- Login ----------------------------------------------------------------
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // --- Open a seeded paper from the library (view mode) ----------------------
  await page.goto("/papers");
  await page
    .getByRole("link", { name: /LONGER: Long-sequence transformer/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/papers\/longer$/);
  // Verification warning for guide-derived notes must be visible in view mode.
  await expect(page.getByText("derived from a secondary source")).toBeVisible();
  // View mode is read-only: no section textareas.
  await expect(page.getByRole("textbox", { name: "Open questions" })).toHaveCount(0);

  // --- Edit a structured section on the notes surface -------------------------
  await page.getByRole("link", { name: "Structured notes" }).click();
  await expect(page).toHaveURL(/\/papers\/longer\/notes/);
  const textarea = page.getByRole("textbox", { name: "Open questions" });
  await textarea.scrollIntoViewIfNeeded();
  await textarea.click();
  await textarea.press("End");
  await textarea.pressSequentially(`\n- ${marker}: does compression hurt sparse users?`);

  const section = page.locator("section", {
    has: page.getByRole("heading", { name: "Open questions" }),
  });
  await expect(section.getByRole("status")).toHaveText("Saved", { timeout: 15_000 });

  // --- Reload: content persisted ----------------------------------------------
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Open questions" })).toHaveValue(
    new RegExp(marker),
    { timeout: 15_000 }
  );

  // --- Search finds the edited content ------------------------------------------
  await page.goto(`/search?q=${marker}`);
  const result = page.getByRole("link", { name: /LONGER.*open questions/i });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.click();
  await expect(page).toHaveURL(/\/papers\/longer/);
});
