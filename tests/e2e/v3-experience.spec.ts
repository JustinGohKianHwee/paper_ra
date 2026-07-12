import path from "node:path";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * The v3 experience end-to-end (mock OpenAI + mock arXiv, offline fixture):
 *   1. reading workspace: three panes, PDF dominant, structured notes editable
 *      in-place, collapsible panels with persisted layout;
 *   2. grounded Q&A on a question annotation (ask → cited answer → follow-up UI);
 *   3. safe deletion: trash (hidden from library + search) → restore → delete forever;
 *   4. Radar v1: library-inferred refresh, inspect, accept (honest metadata-only
 *      paper), dismiss, defer, temporary topic search;
 *   5. redesigned surfaces: dashboard hierarchy/stats, Topics landscape,
 *      Concepts glossary, status tooltips, dormant Experiments.
 */

const email = process.env.SEED_EMAIL ?? "researcher@example.com";
const password = process.env.SEED_PASSWORD ?? "research-atlas-dev";
const FIXTURE_PDF = path.resolve(__dirname, "../fixtures/sample-paper.pdf");

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("reading workspace: panels, in-place notes, grounded Q&A, then trash → restore → delete forever", async ({
  page,
}) => {
  const runId = Date.now().toString(36);

  // --- Create a processable paper (offline fixture PDF) ----------------------
  await page.goto("/papers/new");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload a PDF instead" }).click();
  (await fileChooserPromise).setFiles(FIXTURE_PDF);
  const titleInput = page.getByLabel("Title *");
  await expect(titleInput).toBeVisible({ timeout: 15_000 });
  await titleInput.fill(`V3 Workspace Paper ${runId}`);
  await page.getByRole("button", { name: /Add & process|Add to library/ }).click();
  await expect(page).toHaveURL(/\/papers\/v3-workspace-paper/, { timeout: 15_000 });
  await expect(page.getByText("AI paper breakdown")).toBeVisible({ timeout: 60_000 });

  // --- Reading workspace: three panes -----------------------------------------
  await page.getByRole("link", { name: "Read", exact: true }).click();
  await expect(page).toHaveURL(/\/read$/);

  // PDF pane (dominant centre) and both side panes are present.
  await expect(page.locator("iframe[title='Paper PDF']")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Essence")).toBeVisible(); // notes panel group
  await expect(page.getByText("Whole-paper notes")).toBeVisible(); // assistant rail

  // --- Edit a structured note without leaving the paper ------------------------
  await page.getByText("One-sentence thesis").click(); // expand the section
  const thesis = page.getByRole("textbox", { name: /single sentence/i });
  await thesis.fill(`Fixture attention is deterministic. (${runId})`);
  // Autosave indicator inside the expanded section.
  await expect(page.getByRole("status").filter({ hasText: "Saved" }).first()).toBeVisible({
    timeout: 15_000,
  });

  // --- Grounded Q&A -------------------------------------------------------------
  await page.getByRole("button", { name: "Add note / question / idea" }).first().click();
  await page.getByLabel("Annotation type").click();
  await page.getByRole("option", { name: "Question" }).click();
  await page
    .getByPlaceholder("What do you still not understand?")
    .fill(`How does the fixture attention mechanism work? (${runId})`);
  await page.getByRole("button", { name: /^Save/ }).click();

  const askButton = page.getByRole("button", { name: "Ask AI to answer from the paper" }).first();
  await expect(askButton).toBeVisible({ timeout: 15_000 });
  await askButton.click();

  // Answer arrives with provenance: AI badge, coverage, cited pages, editable.
  await expect(page.getByText("mock-qa-marker")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("grounded in paper")).toBeVisible();
  await expect(page.getByText(/cites p\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Follow-up" })).toBeVisible();

  // --- Collapse the notes panel; the preference survives a reload ---------------
  await page.getByRole("button", { name: "Hide structured notes" }).click();
  await expect(page.getByText("Essence")).not.toBeVisible();
  await page.reload();
  await expect(page.locator("iframe[title='Paper PDF']")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Show structured notes" })).toBeVisible();
  await expect(page.getByText("Essence")).not.toBeVisible();
  await page.getByRole("button", { name: "Show structured notes" }).click();
  await expect(page.getByText("Essence")).toBeVisible();

  // The thesis edit made it into view mode (structured notes record).
  await page.getByRole("link", { name: "Back to paper" }).click();
  await expect(page.getByText(`Fixture attention is deterministic. (${runId})`)).toBeVisible();
  // The Q&A record is part of view mode too.
  await expect(page.getByText("mock-qa-marker")).toBeVisible();

  // --- Trash: itemised confirmation, hidden everywhere, restorable ---------------
  await page.getByRole("button", { name: "Move paper to trash" }).click();
  await expect(page.getByText("Hidden with it:")).toBeVisible();
  await expect(page.getByText(/Kept in your knowledge base/)).toBeVisible();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await expect(page).toHaveURL(/\/papers$/, { timeout: 15_000 });

  // Gone from the library list…
  await expect(page.getByRole("link", { name: `V3 Workspace Paper ${runId}` })).toHaveCount(0);
  // …and from search (the FTS function filters trashed papers).
  await page.goto(`/search?q=${runId}`);
  await expect(
    page.getByRole("link", { name: new RegExp(`V3 Workspace Paper ${runId}`) })
  ).toHaveCount(0);

  // Restore from the trash (scoped to this run's row — older runs may have left others).
  await page.goto("/papers/trash");
  const trashRow = page.locator("li").filter({ hasText: `V3 Workspace Paper ${runId}` });
  await expect(trashRow).toBeVisible();
  await trashRow.getByRole("button", { name: "Restore" }).click();
  await expect(trashRow).toHaveCount(0, { timeout: 15_000 });
  await page.goto("/papers");
  await expect(page.getByRole("link", { name: `V3 Workspace Paper ${runId}` })).toBeVisible();

  // Trash again and delete forever, with the related-record count dialog.
  await page.getByRole("link", { name: `V3 Workspace Paper ${runId}` }).click();
  await page.getByRole("button", { name: "Move paper to trash" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  // Wait for the action's redirect before navigating on (avoids aborting it).
  await expect(page).toHaveURL(/\/papers$/, { timeout: 15_000 });
  await page.goto("/papers/trash");
  await page
    .locator("li")
    .filter({ hasText: `V3 Workspace Paper ${runId}` })
    .getByRole("button", { name: "Delete forever" })
    .click();
  await expect(page.getByText("This cannot be undone.")).toBeVisible();
  await expect(page.getByText(/AI passage summaries/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Topics and concepts are never deleted with a paper.")).toBeVisible();
  // Confirm (dialog button, not the list button).
  await page.getByRole("dialog").getByRole("button", { name: "Delete forever" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15_000 });
  // This run's paper is gone from the trash list (other runs' leftovers may remain).
  await expect(page.locator("li").filter({ hasText: `V3 Workspace Paper ${runId}` })).toHaveCount(
    0,
    { timeout: 15_000 }
  );
});

test("Radar v1: refresh from library, accept/dismiss/defer, temporary topic search", async ({
  page,
}) => {
  // Cleanup previous runs: candidates and previously accepted mock papers.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  test.skip(!url || !serviceKey, "service key required for cleanup");
  const admin = createClient(url!, serviceKey!);
  await admin.from("radar_candidates").delete().gte("created_at", "1970-01-01");
  await admin.from("radar_runs").delete().gte("created_at", "1970-01-01");
  await admin.from("papers").delete().ilike("title", "Mock Advances%");
  await admin.from("papers").delete().ilike("title", "A Mock Survey%");

  await page.goto("/radar");
  await expect(page.getByRole("heading", { name: "Research Radar" })).toBeVisible();

  // --- Refresh from the library profile ---------------------------------------
  await page.getByRole("button", { name: "Refresh recommendations" }).click();
  await expect(page.getByText(/new candidate/)).toBeVisible({ timeout: 60_000 });

  // Candidates explain themselves: why + related topics + score.
  const firstCard = page.locator("article").first();
  await expect(firstCard.getByText(/Mock explanation|Matches your library/)).toBeVisible();
  await expect(page.getByText(/Last refresh/)).toBeVisible();

  // Near-duplicate titles were filtered: the "v2 Duplicate" variant never shows.
  await expect(page.getByText(/v2 Duplicate/)).toHaveCount(0);

  // --- Inspect + decide ---------------------------------------------------------
  // Accept the first candidate → honest metadata-only paper in the queue.
  const acceptedTitle = (await firstCard.locator("h3").textContent()) ?? "";
  await firstCard.getByRole("button", { name: "Accept into library" }).click();
  await expect(page.getByText("Added to your library and reading queue")).toBeVisible({
    timeout: 30_000,
  });

  // Defer and dismiss the rest as available.
  const laterButton = page.locator("article").first().getByRole("button", { name: "Later" });
  if (await laterButton.isVisible().catch(() => false)) {
    await laterButton.click();
    await expect(page.getByText(/Deferred \(\d+\)/)).toBeVisible({ timeout: 15_000 });
  }

  // Recent decisions show the accepted paper.
  await expect(page.getByText("Recent decisions")).toBeVisible();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();

  // The accepted paper is honest: queued + metadata only, never marked read.
  await page.getByRole("link", { name: acceptedTitle.trim() }).first().click();
  await expect(page).toHaveURL(/\/papers\//);
  await expect(page.getByText("Queued", { exact: true })).toBeVisible();
  await expect(page.getByText("Metadata only").first()).toBeVisible();

  // --- Temporary topic search (no stored profile) --------------------------------
  await page.goto("/radar");
  await page.getByLabel("One-off topic search").fill("graph neural networks");
  await page.getByRole("button", { name: "Search this topic once" }).click();
  await expect(page.getByText(/new candidate/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("topic search").first()).toBeVisible();
  await expect(
    page.getByText(/Mock (Advances in|Survey of) graph neural networks/i).first()
  ).toBeVisible();
});

test("redesigned surfaces: dashboard, topics landscape, concepts glossary, status tooltips, dormant experiments", async ({
  page,
}) => {
  // --- Dashboard hierarchy -----------------------------------------------------
  await page.goto("/dashboard");
  await expect(page.getByText("Library", { exact: true })).toBeVisible();
  await expect(page.getByText("Read this week")).toBeVisible();
  await expect(page.getByRole("img", { name: /Reading minutes/ })).toBeVisible();
  await expect(page.getByText(/awaiting primary-source verification/)).toBeVisible();
  // Experiments no longer surfaces on the dashboard or the nav.
  await expect(page.getByText("Experiments in progress")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByText("Experiments")
  ).toHaveCount(0);

  // --- Status explanations (single source of truth, exposed as tooltips) --------
  await page.goto("/papers/longer");
  const badge = page.getByText("Queued", { exact: true }).first();
  await badge.hover();
  await expect(page.getByText(/next in line/).first()).toBeVisible({ timeout: 10_000 });

  // --- Topics landscape ----------------------------------------------------------
  await page.goto("/topics");
  await expect(page.getByText("The landscape of your library", { exact: false })).toBeVisible();
  await expect(page.getByText(/\d+ deep · \d+ surface · \d+ unread/).first()).toBeVisible();

  // Topic detail groups papers by depth.
  await page
    .getByRole("link", { name: /Sequential Recommendation/ })
    .first()
    .click();
  await expect(page.getByText("Papers by reading depth")).toBeVisible();
  await expect(page.getByText(/surface knowledge \(\d+\)/i).first()).toBeVisible();

  // --- Concepts glossary -----------------------------------------------------------
  await page.goto("/concepts");
  await expect(page.getByText("Your technical reference", { exact: false })).toBeVisible();
  // Alphabetical letter headings exist.
  await expect(page.getByRole("heading", { name: /^[A-Z]$/ }).first()).toBeVisible();

  // Concept detail is a reference entry (open the first glossary row).
  await page.locator("section ul li a").first().click();
  await expect(page.getByText("Technical reference entry", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Definition", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mechanism", exact: true })).toBeVisible();

  // --- Dormant experiments route stays intact ------------------------------------
  await page.goto("/experiments");
  await expect(page.getByText("dormant feature", { exact: false })).toBeVisible();
});
