/**
 * Integration tests against the local Supabase stack.
 * Skipped (with a clear message) when the stack or service key is missing.
 *
 * Uses throwaway users created per run and cleans them up afterwards, so it
 * is safe to run against a seeded local database.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

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
  console.warn(
    "\n[integration] Skipped: local Supabase is not reachable. " +
      "Run `npx supabase start` and set .env.local (see .env.example).\n"
  );
}

describe.skipIf(!up)("CRUD, RLS, and search integration", () => {
  let admin: SupabaseClient<Database>;
  let alice: SupabaseClient<Database>;
  let bob: SupabaseClient<Database>;
  let aliceId: string;
  let bobId: string;
  const suffix = Date.now().toString(36);
  const aliceEmail = `it-alice-${suffix}@example.com`;
  const bobEmail = `it-bob-${suffix}@example.com`;
  const password = "integration-test-pw";

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const email of [aliceEmail, bobEmail]) {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
    }

    alice = createClient<Database>(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    bob = createClient<Database>(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const aliceSession = await alice.auth.signInWithPassword({ email: aliceEmail, password });
    const bobSession = await bob.auth.signInWithPassword({ email: bobEmail, password });
    if (aliceSession.error || bobSession.error) throw new Error("sign-in failed");
    aliceId = aliceSession.data.user!.id;
    bobId = bobSession.data.user!.id;
  });

  afterAll(async () => {
    if (!admin) return;
    for (const id of [aliceId, bobId].filter(Boolean)) {
      await admin.auth.admin.deleteUser(id); // cascades to content rows
    }
  });

  it("creates a paper with structured sections and reads it back", async () => {
    const { data: paper, error } = await alice
      .from("papers")
      .insert({
        user_id: aliceId,
        title: "Integration Test Paper",
        slug: `integration-test-paper-${suffix}`,
        reading_status: "queued",
        verification_status: "metadata_only",
        priority: 4,
      })
      .select("*")
      .single();
    expect(error).toBeNull();
    expect(paper!.visibility).toBe("private"); // private by default

    const { error: noteError } = await alice.from("paper_notes").insert({
      user_id: aliceId,
      paper_id: paper!.id,
      section_type: "thesis",
      body_md: "A single-sentence integration thesis about zebra-caching.",
      position: 1,
    });
    expect(noteError).toBeNull();

    const { data: fetched } = await alice
      .from("paper_notes")
      .select("body_md")
      .eq("paper_id", paper!.id)
      .eq("section_type", "thesis")
      .single();
    expect(fetched!.body_md).toContain("zebra-caching");
  });

  it("updates a note section (autosave path) and bumps updated_at", async () => {
    const { data: paper } = await alice
      .from("papers")
      .select("id")
      .eq("slug", `integration-test-paper-${suffix}`)
      .single();

    const { data: before } = await alice
      .from("paper_notes")
      .select("updated_at")
      .eq("paper_id", paper!.id)
      .eq("section_type", "thesis")
      .single();

    await new Promise((r) => setTimeout(r, 1100));

    const { error } = await alice.from("paper_notes").upsert(
      {
        user_id: aliceId,
        paper_id: paper!.id,
        section_type: "thesis",
        body_md: "Updated thesis with quokka-batching.",
        position: 1,
      },
      { onConflict: "paper_id,section_type" }
    );
    expect(error).toBeNull();

    const { data: after } = await alice
      .from("paper_notes")
      .select("body_md, updated_at")
      .eq("paper_id", paper!.id)
      .eq("section_type", "thesis")
      .single();
    expect(after!.body_md).toContain("quokka-batching");
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime()
    );
  });

  it("enforces RLS: Bob cannot read or modify Alice's rows", async () => {
    const { data: bobView } = await bob
      .from("papers")
      .select("id")
      .eq("slug", `integration-test-paper-${suffix}`);
    expect(bobView).toEqual([]);

    const { data: aliceRows } = await alice
      .from("papers")
      .select("id")
      .eq("slug", `integration-test-paper-${suffix}`);
    const paperId = aliceRows![0].id;

    // Update silently affects 0 rows under RLS.
    const { data: updated } = await bob
      .from("papers")
      .update({ title: "Hijacked" })
      .eq("id", paperId)
      .select("id");
    expect(updated).toEqual([]);

    // Insert into someone else's user_id is rejected by WITH CHECK.
    const { error: insertError } = await bob.from("papers").insert({
      user_id: aliceId,
      title: "Forged",
      slug: `forged-${suffix}`,
    });
    expect(insertError).not.toBeNull();
  });

  it("records experiments and misconceptions", async () => {
    const { data: paper } = await alice
      .from("papers")
      .select("id")
      .eq("slug", `integration-test-paper-${suffix}`)
      .single();

    const { data: experiment, error: expError } = await alice
      .from("experiments")
      .insert({
        user_id: aliceId,
        title: "Integration Experiment",
        slug: `integration-experiment-${suffix}`,
        status: "running",
        hypothesis: "Caching user vectors keeps NDCG stable.",
        metrics_json: { ndcg_at_10: 0.42 },
      })
      .select("id, metrics_json")
      .single();
    expect(expError).toBeNull();
    expect(experiment!.metrics_json).toEqual({ ndcg_at_10: 0.42 });

    const { error: linkError } = await alice.from("experiment_papers").insert({
      user_id: aliceId,
      experiment_id: experiment!.id,
      paper_id: paper!.id,
    });
    expect(linkError).toBeNull();

    const { error: miscError } = await alice.from("misconception_corrections").insert({
      user_id: aliceId,
      initial_belief_md: "I thought integration caching was free.",
      corrected_understanding_md: "Stale caches cost quality in fast sessions.",
      paper_id: paper!.id,
      confidence: 4,
    });
    expect(miscError).toBeNull();
  });

  it("search_all finds edited content, scoped to the owner", async () => {
    const { data: aliceResults, error } = await alice.rpc("search_all", {
      query: "quokka-batching",
    });
    expect(error).toBeNull();
    expect(aliceResults!.length).toBeGreaterThan(0);
    expect(aliceResults![0].kind).toBe("paper_note");
    expect(aliceResults![0].excerpt).toContain("<b>");

    const { data: bobResults } = await bob.rpc("search_all", { query: "quokka-batching" });
    expect(bobResults).toEqual([]);
  });

  it("rejects invalid enum values and constraint violations", async () => {
    const { error: enumError } = await alice.from("papers").insert({
      user_id: aliceId,
      title: "Bad Status",
      slug: `bad-status-${suffix}`,
      // @ts-expect-error deliberately invalid enum
      reading_status: "definitely_not_a_status",
    });
    expect(enumError).not.toBeNull();

    const { error: priorityError } = await alice.from("papers").insert({
      user_id: aliceId,
      title: "Bad Priority",
      slug: `bad-priority-${suffix}`,
      priority: 11,
    });
    expect(priorityError).not.toBeNull();
  });
});
