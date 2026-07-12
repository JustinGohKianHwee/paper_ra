import path from "node:path";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * The v2 experience end-to-end (mock OpenAI, offline PDF fixture):
 *   1. smart-add a paper by uploading a PDF → automatic processing populates
 *      passages, AI notes, and suggestions;
 *   2. review AI suggestions (accept a topic);
 *   3. study in reading mode: start a session, annotate a passage, ask a
 *      question, quick-create a misconception, end the session with a takeaway;
 *   4. review everything in view mode;
 *   5. generate an AI weekly synthesis draft, edit, and approve it.
 */

const email = process.env.SEED_EMAIL ?? "researcher@example.com";
const password = process.env.SEED_PASSWORD ?? "research-atlas-dev";
const FIXTURE_PDF = path.resolve(__dirname, "../fixtures/sample-paper.pdf");

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("smart add (PDF) → AI processing → reading session → view mode", async ({ page }) => {
  const runId = Date.now().toString(36);

  // --- 1. Smart add via PDF upload -------------------------------------------
  await page.goto("/papers/new");
  await expect(page.getByText("sent to OpenAI")).toBeVisible(); // disclosure

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload a PDF instead" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(FIXTURE_PDF);

  // Preview appears with a title derived from the filename — make it unique.
  const titleInput = page.getByLabel("Title *");
  await expect(titleInput).toBeVisible({ timeout: 15_000 });
  await titleInput.fill(`Fixture Attention ${runId}`);
  await page.getByRole("button", { name: /Add & process|Add to library/ }).click();

  // --- 2. Processing populates the paper --------------------------------------
  await expect(page).toHaveURL(/\/papers\/fixture-attention/, { timeout: 15_000 });
  // Wait for the mock pipeline to finish (banner disappears, content appears).
  await expect(page.getByText("AI paper breakdown")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("AI-generated").first()).toBeVisible();
  await expect(page.getByText("mock-notes-marker")).toBeVisible();
  // The breakdown is collapsed by default in view mode — expand to inspect.
  await page.getByText("AI paper breakdown").click();
  await expect(page.getByText("Mock Introduction")).toBeVisible();
  await expect(page.getByText("mock-passage-marker")).toBeVisible();

  // --- 3. Review AI suggestions ------------------------------------------------
  await expect(page.getByText("AI suggestions to review")).toBeVisible();
  // Accept the existing-topic suggestion.
  await page.getByRole("button", { name: "Accept Sequential Recommendation" }).click();
  await expect(page.getByRole("link", { name: "Sequential Recommendation" })).toBeVisible({
    timeout: 15_000,
  });

  // --- 4. Reading mode: session + annotations ----------------------------------
  await page.getByRole("link", { name: "Read", exact: true }).click();
  await expect(page).toHaveURL(/\/read$/);

  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByRole("button", { name: "End session" })).toBeVisible();

  // Annotate the first passage with a question.
  await page.getByRole("button", { name: "Add note / question / idea" }).first().click();
  await page.getByLabel("Annotation type").click();
  await page.getByRole("option", { name: "Question" }).click();
  await page
    .getByPlaceholder("What do you still not understand?")
    .fill(`Why does fixture attention converge? (${runId})`);
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page.getByText(`Why does fixture attention converge? (${runId})`)).toBeVisible({
    timeout: 15_000,
  });

  // Quick-create a misconception without leaving the flow.
  await page.getByRole("button", { name: "Record misconception" }).click();
  await page.getByLabel("I initially thought… *").fill(`Fixtures need retraining (${runId}).`);
  await page.getByLabel("Corrected understanding *").fill("They are deterministic by design.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Misconception recorded")).toBeVisible();

  // --- 5. End the session explicitly ---------------------------------------------
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByText(/unresolved question/)).toBeVisible(); // reminder in dialog
  await page
    .getByLabel("Main takeaway (optional)")
    .fill(`Fixture attention is deterministic (${runId}).`);
  await page
    .getByLabel("Continue next time (optional)")
    .fill(`Re-check §2 assumptions (${runId}).`);
  await page.getByRole("button", { name: "End session", exact: true }).last().click();
  await expect(page.getByText(/Session logged/)).toBeVisible({ timeout: 15_000 });

  // --- 6. View mode shows the accumulated record ----------------------------------
  await page.getByRole("link", { name: "Back to paper" }).click();
  await expect(page).toHaveURL(/\/papers\/fixture-attention[^/]*$/);
  await expect(page.getByText(`Why does fixture attention converge? (${runId})`)).toBeVisible();
  await expect(page.getByText(/Fixtures need retraining/)).toBeVisible();
  // Still no editing UI in view mode.
  await expect(page.getByRole("textbox")).toHaveCount(0);

  // Dashboard surfaces the unresolved question and the continue hint.
  await page.goto("/dashboard");
  await expect(page.getByText(`Why does fixture attention converge? (${runId})`)).toBeVisible();
  await expect(page.getByText(`Re-check §2 assumptions (${runId}).`)).toBeVisible();
});

test("AI weekly synthesis: draft → edit → approve", async ({ page }) => {
  const runId = Date.now().toString(36);

  // Cleanup: the weekly note for the current period is unique per user; remove
  // any note from a previous test run via the service client.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  test.skip(!url || !serviceKey, "service key required for cleanup");
  const admin = createClient(url!, serviceKey!);
  const monday = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
  })();
  await admin.from("synthesis_notes").delete().eq("kind", "weekly").eq("period_start", monday);

  await page.goto("/synthesis/new");
  // Current week (default) so the draft has this week's recorded activity.
  await page.getByLabel("Title").fill(`AI Synthesis ${runId}`);
  await page.getByRole("button", { name: "Draft with AI" }).click();

  await page.waitForURL(/\/synthesis\/[0-9a-f-]+/, { timeout: 30_000 });

  // AI draft path: banner, mock content, edit, approve, original preserved.
  await expect(page.getByText("drafted by AI from your recorded activity")).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Synthesis" });
  await expect(editor).toHaveValue(/mock-synthesis-marker/);

  await editor.click();
  await editor.press("End");
  await editor.pressSequentially(`\n\nMy own addition (${runId}).`);
  const section = page.locator("section", {
    has: page.getByRole("heading", { name: "Synthesis" }),
  });
  await expect(section.getByRole("status")).toHaveText("Saved", { timeout: 15_000 });
  await expect(page.getByText("Original AI draft (kept for reference)")).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/approved/).first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/synthesis");
  await expect(
    page
      .locator("li", { has: page.getByRole("link", { name: `AI Synthesis ${runId}` }) })
      .getByText("approved")
  ).toBeVisible();
});
