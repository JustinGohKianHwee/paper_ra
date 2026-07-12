/**
 * v3 integration tests against the local Supabase stack + the mock
 * OpenAI/arXiv server. Covers: recoverable paper trash (search + library
 * exclusion, restore, permanent-delete cascades), grounded Q&A (retrieval,
 * provenance, usage auditing, failure path, follow-ups), and Radar v1
 * (library-inferred refresh, dedupe, decisions creating honest papers).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain-JS mock without type declarations
import { startMockOpenAI } from "@/tests/mocks/openai-server.mjs";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function stackIsUp(): Promise<boolean> {
  if (!url || !anonKey || !serviceKey) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const up = await stackIsUp();
if (!up) {
  console.warn("\n[integration] Skipped v3 tests: local Supabase not reachable.\n");
}

describe.skipIf(!up)("v3 integration (trash, grounded Q&A, Radar)", () => {
  let admin: SupabaseClient<Database>;
  let user: SupabaseClient<Database>;
  let userId: string;
  let mock: { url: string; port: number; close: () => Promise<unknown> };
  const suffix = Date.now().toString(36);
  const email = `it-v3-${suffix}@example.com`;
  const password = "integration-test-pw";

  beforeAll(async () => {
    mock = await startMockOpenAI();
    process.env.OPENAI_API_KEY = "sk-test-mock";
    process.env.OPENAI_BASE_URL = mock.url;
    process.env.ARXIV_BASE_URL = `http://127.0.0.1:${mock.port}`;
    process.env.AI_MAX_RUNS_PER_HOUR = "1000";

    admin = createClient<Database>(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);

    user = createClient<Database>(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const session = await user.auth.signInWithPassword({ email, password });
    if (session.error) throw new Error(session.error.message);
    userId = session.data.user!.id;
  }, 30000);

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
    await mock?.close();
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ARXIV_BASE_URL;
    delete process.env.AI_MAX_RUNS_PER_HOUR;
  });

  async function createPaper(title: string, extra: Record<string, unknown> = {}) {
    const { data, error } = await user
      .from("papers")
      .insert({
        user_id: userId,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${suffix}`,
        ...extra,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // -------------------------------------------------------------------------
  // Trash / soft delete
  // -------------------------------------------------------------------------

  it("hides trashed papers from search and the library, restores them intact, and cascades permanent deletion", async () => {
    const paper = await createPaper(`Trashable Fixture Zebra ${suffix}`, {
      abstract: "A zebra-flavoured abstract for search visibility tests.",
    });

    // Attach one of each related record type.
    await user.from("paper_annotations").insert({
      user_id: userId,
      paper_id: paper.id,
      kind: "question",
      body_md: "Why zebra?",
    });
    await user.from("paper_pages").insert({
      user_id: userId,
      paper_id: paper.id,
      page_no: 1,
      content: "zebra page text",
      char_count: 15,
    });
    const { data: misconception } = await user
      .from("misconception_corrections")
      .insert({
        user_id: userId,
        paper_id: paper.id,
        initial_belief_md: "Zebras are horses.",
        corrected_understanding_md: "They are not.",
        corrected_on: "2026-07-12",
      })
      .select("id")
      .single();

    // Visible before trash.
    const before = await user.rpc("search_all", { query: "zebra" });
    expect((before.data ?? []).some((r) => r.id === paper.id)).toBe(true);

    // Trash → hidden from search and from the library helper.
    await user.from("papers").update({ deleted_at: new Date().toISOString() }).eq("id", paper.id);
    const after = await user.rpc("search_all", { query: "zebra" });
    expect((after.data ?? []).some((r) => r.id === paper.id)).toBe(false);

    const { fetchPaperLibrary } = await import("@/lib/papers/queries");
    const library = await fetchPaperLibrary(user);
    expect(library.some((p) => p.id === paper.id)).toBe(false);

    // Restore → visible again with annotations intact.
    await user.from("papers").update({ deleted_at: null }).eq("id", paper.id);
    const restored = await fetchPaperLibrary(user);
    expect(restored.some((p) => p.id === paper.id)).toBe(true);
    const { count: annotationCount } = await user
      .from("paper_annotations")
      .select("id", { count: "exact", head: true })
      .eq("paper_id", paper.id);
    expect(annotationCount).toBe(1);

    // Permanent delete cascades attached records; misconception survives unlinked.
    await user.from("papers").update({ deleted_at: new Date().toISOString() }).eq("id", paper.id);
    const { error: deleteError } = await user.from("papers").delete().eq("id", paper.id);
    expect(deleteError).toBeNull();

    const { count: pagesLeft } = await user
      .from("paper_pages")
      .select("id", { count: "exact", head: true })
      .eq("paper_id", paper.id);
    expect(pagesLeft).toBe(0);
    const { data: survivor } = await user
      .from("misconception_corrections")
      .select("paper_id")
      .eq("id", misconception!.id)
      .single();
    expect(survivor!.paper_id).toBeNull();
  }, 30000);

  // -------------------------------------------------------------------------
  // Grounded Q&A
  // -------------------------------------------------------------------------

  it("answers a question from stored pages with provenance, grounding, and an audited run", async () => {
    const paper = await createPaper(`QA Fixture Paper ${suffix}`);
    await user.from("paper_pages").insert([
      {
        user_id: userId,
        paper_id: paper.id,
        page_no: 1,
        content: "Introduction to the mock attention mechanism for testing.",
        char_count: 50,
      },
      {
        user_id: userId,
        paper_id: paper.id,
        page_no: 2,
        content: "The attention mechanism computes weighted sums over history.",
        char_count: 60,
      },
    ]);
    const { data: annotation } = await user
      .from("paper_annotations")
      .insert({
        user_id: userId,
        paper_id: paper.id,
        kind: "question",
        body_md: "How does the attention mechanism work?",
      })
      .select("id")
      .single();

    const { answerQuestion } = await import("@/lib/ai/qa");
    const qa = await answerQuestion(user, userId, {
      paperId: paper.id,
      annotationId: annotation!.id,
      question: "How does the attention mechanism work?",
      position: 1,
    });

    expect(qa.status).toBe("answered");
    expect(qa.answer_md).toContain("mock-qa-marker");
    expect(qa.answer_authorship).toBe("ai");
    expect(qa.coverage).toBe("grounded");
    expect(qa.model).toBeTruthy();
    expect(qa.prompt_version).toBeTruthy();
    expect((qa.usage as { calls?: number })?.calls).toBeGreaterThan(0);
    const grounding = qa.grounding as { pages: number[]; retrieved_pages: number[] };
    expect(grounding.pages.length).toBeGreaterThan(0);
    expect(grounding.retrieved_pages).toContain(2);

    // Audit lives entirely on the paper_qa row — Q&A is not a processing_runs
    // job, so it must NOT create one (that would starve the ingestion budget).
    const { count: runCount } = await user
      .from("processing_runs")
      .select("id", { count: "exact", head: true })
      .eq("paper_id", paper.id);
    expect(runCount).toBe(0);

    // Follow-up lands at position 2 in the same thread.
    const followUp = await answerQuestion(user, userId, {
      paperId: paper.id,
      annotationId: annotation!.id,
      question: "And what does it attend over?",
      position: 2,
    });
    expect(followUp.status).toBe("answered");
    expect(followUp.position).toBe(2);
  }, 30000);

  it("records an honest failure when no extracted text exists to ground an answer", async () => {
    const paper = await createPaper(`QA No Source Paper ${suffix}`);
    const { data: annotation } = await user
      .from("paper_annotations")
      .insert({
        user_id: userId,
        paper_id: paper.id,
        kind: "question",
        body_md: "What dataset is used?",
      })
      .select("id")
      .single();

    const { answerQuestion } = await import("@/lib/ai/qa");
    const qa = await answerQuestion(user, userId, {
      paperId: paper.id,
      annotationId: annotation!.id,
      question: "What dataset is used?",
      position: 1,
    });
    expect(qa.status).toBe("failed");
    expect(qa.error).toMatch(/No extracted paper text/i);
  }, 30000);

  it("uses a selected passage as primary context, even when retrieval matches nothing", async () => {
    const paper = await createPaper(`Selection QA Paper ${suffix}`);
    // Page text deliberately shares no vocabulary with the question, so lexical
    // retrieval alone would find nothing — the selection must carry the answer.
    await user.from("paper_pages").insert([
      {
        user_id: userId,
        paper_id: paper.id,
        page_no: 1,
        content: "Preamble about apples.",
        char_count: 22,
      },
      {
        user_id: userId,
        paper_id: paper.id,
        page_no: 3,
        content: "Candidate-aware attention reweights the target item embedding.",
        char_count: 61,
      },
    ]);
    const { data: annotation } = await user
      .from("paper_annotations")
      .insert({
        user_id: userId,
        paper_id: paper.id,
        kind: "question",
        body_md: "Why is this different from ordinary self-attention?",
        selected_text: "Candidate-aware attention reweights the target item embedding.",
        page_number: 3,
        anchor: {
          page: 3,
          quote: { exact: "Candidate-aware attention reweights the target item" },
        },
      })
      .select("id, selected_text, page_number")
      .single();

    // Provenance persisted on the annotation.
    expect(annotation!.selected_text).toContain("Candidate-aware attention");
    expect(annotation!.page_number).toBe(3);

    const { answerQuestion } = await import("@/lib/ai/qa");
    const qa = await answerQuestion(user, userId, {
      paperId: paper.id,
      annotationId: annotation!.id,
      question: "Why is this different from ordinary self-attention?",
      position: 1,
      primarySelection: { text: annotation!.selected_text!, page: annotation!.page_number! },
    });

    // Answered (not the "didn't match any text" failure), and grounding records
    // the selection + always cites the selected page.
    expect(qa.status).toBe("answered");
    const grounding = qa.grounding as {
      pages: number[];
      selection?: { page: number };
    };
    expect(grounding.selection?.page).toBe(3);
    expect(grounding.pages).toContain(3);
  }, 30000);

  // -------------------------------------------------------------------------
  // Independent ingestion vs Q&A rate-limit budgets
  // -------------------------------------------------------------------------

  it("keeps ingestion and Q&A budgets independent — neither starves the other", async () => {
    const { assertIngestionWithinLimit, assertQaWithinLimit, RateLimitError } =
      await import("@/lib/ai/pipeline");

    const paper = await createPaper(`Rate Limit Paper ${suffix}`);
    const savedIngestion = process.env.AI_MAX_RUNS_PER_HOUR;
    const savedQa = process.env.QA_MAX_PER_HOUR;

    try {
      // --- Q&A history must not consume the ingestion allowance ---------------
      // Simulate a burst of questions by writing paper_qa rows directly.
      const { data: annotation } = await user
        .from("paper_annotations")
        .insert({ user_id: userId, paper_id: paper.id, kind: "question", body_md: "q?" })
        .select("id")
        .single();
      await user.from("paper_qa").insert(
        Array.from({ length: 5 }, (_, i) => ({
          user_id: userId,
          paper_id: paper.id,
          annotation_id: annotation!.id,
          position: i + 1,
          question_md: `burst ${i}`,
          status: "answered" as const,
        }))
      );

      // Ingestion budget is generous and counts only processing_runs (of which
      // this user has none), so it is unaffected by the Q&A burst.
      process.env.AI_MAX_RUNS_PER_HOUR = "10";
      await expect(assertIngestionWithinLimit(user)).resolves.toBeUndefined();

      // Q&A respects its OWN limit: 5 existing questions >= a limit of 5 -> blocked.
      process.env.QA_MAX_PER_HOUR = "5";
      await expect(assertQaWithinLimit(user)).rejects.toMatchObject({
        name: "RateLimitError",
        workload: "qa",
      });
      // And the error is a RateLimitError, not a generic failure.
      await assertQaWithinLimit(user).catch((e) => {
        expect(e).toBeInstanceOf(RateLimitError);
        expect(String(e.message)).toMatch(/question limit/i);
      });

      // --- Ingestion history must not consume the Q&A allowance ---------------
      // A real processing run exists...
      await user.from("processing_runs").insert({
        user_id: userId,
        paper_id: paper.id,
        status: "done" as const,
        stage: "passages",
      });
      // ...ingestion blocks at a limit of 1...
      process.env.AI_MAX_RUNS_PER_HOUR = "1";
      await expect(assertIngestionWithinLimit(user)).rejects.toMatchObject({
        workload: "ingestion",
      });
      // ...but Q&A (generous limit) is unaffected by the ingestion run.
      process.env.QA_MAX_PER_HOUR = "1000";
      await expect(assertQaWithinLimit(user)).resolves.toBeUndefined();
    } finally {
      if (savedIngestion === undefined) delete process.env.AI_MAX_RUNS_PER_HOUR;
      else process.env.AI_MAX_RUNS_PER_HOUR = savedIngestion;
      if (savedQa === undefined) delete process.env.QA_MAX_PER_HOUR;
      else process.env.QA_MAX_PER_HOUR = savedQa;
    }
  }, 30000);

  // -------------------------------------------------------------------------
  // Radar v1
  // -------------------------------------------------------------------------

  it("refreshes recommendations from the library, dedupes, records the run, and applies decisions honestly", async () => {
    // Library signal: one deep-read paper linked to a topic.
    const libPaper = await createPaper(`Sequential Recommendation Foundations ${suffix}`, {
      abstract: "Transformers for sequential recommendation.",
      reading_status: "deep_read",
    });
    const { data: topic } = await user
      .from("topics")
      .insert({
        user_id: userId,
        name: `Radar Fixture Topic ${suffix}`,
        slug: `radar-fixture-topic-${suffix}`,
      })
      .select("id, name")
      .single();
    await user
      .from("paper_topics")
      .insert({ user_id: userId, paper_id: libPaper.id, topic_id: topic!.id });

    const { refreshRadar } = await import("@/lib/radar/refresh");
    const result = await refreshRadar(user, userId);
    expect(result.error).toBeUndefined();
    expect(result.fetched).toBeGreaterThan(0);
    // Mock feed returns 3 entries; the near-duplicate title is filtered out.
    expect(result.added).toBe(2);

    const { data: run } = await user.from("radar_runs").select("*").eq("id", result.runId).single();
    expect(run!.status).toBe("done");
    expect(run!.queries).toContain(topic!.name);
    expect(run!.candidates_added).toBe(2);
    expect((run!.usage as { calls?: number })?.calls).toBeGreaterThan(0); // LLM explanations

    const { data: candidates } = await user
      .from("radar_candidates")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "scored")
      .order("score", { ascending: false });
    expect(candidates!.length).toBe(2);
    expect(candidates![0].why_it_matters).toBeTruthy();
    const related = candidates![0].related_json as { topics?: string[] };
    expect(related.topics).toContain(topic!.name);

    // A second refresh finds nothing new (dedupe against existing candidates).
    const again = await refreshRadar(user, userId);
    expect(again.added).toBe(0);

    // Dismiss one, accept the other.
    const [toAccept, toDismiss] = candidates!;
    await user
      .from("radar_candidates")
      .update({ status: "dismissed", decided_at: new Date().toISOString() })
      .eq("id", toDismiss.id);

    // Accept path mirrors actions/radar.ts semantics: honest metadata-only paper.
    const { data: accepted } = await user
      .from("papers")
      .insert({
        user_id: userId,
        title: toAccept.title,
        slug: `accepted-${suffix}`,
        authors: toAccept.authors,
        abstract: toAccept.abstract,
        arxiv_id: toAccept.arxiv_id,
        reading_status: "queued",
        verification_status: "metadata_only",
        source_input: `radar:${toAccept.id}`,
      })
      .select("id, reading_status, verification_status")
      .single();
    await user
      .from("radar_candidates")
      .update({
        status: "accepted",
        decided_at: new Date().toISOString(),
        accepted_paper_id: accepted!.id,
      })
      .eq("id", toAccept.id);

    expect(accepted!.reading_status).toBe("queued");
    expect(accepted!.verification_status).toBe("metadata_only");

    const { data: decided } = await user
      .from("radar_candidates")
      .select("status, decided_at, accepted_paper_id")
      .eq("id", toAccept.id)
      .single();
    expect(decided!.status).toBe("accepted");
    expect(decided!.decided_at).toBeTruthy();
    expect(decided!.accepted_paper_id).toBe(accepted!.id);
  }, 45000);
});
