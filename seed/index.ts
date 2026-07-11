/**
 * Deterministic seed script — `npm run seed`.
 *
 * - Requires the local (or configured) Supabase stack and the service-role
 *   key in .env.local / .env.
 * - Idempotent and non-destructive: entities that already exist (matched by
 *   slug / unique fields) are skipped, never overwritten, so re-running the
 *   seed cannot clobber your edits.
 * - No LLM calls; all content is checked into seed/data/ with provenance.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "@/lib/supabase/database.types";
import { PAPER_SECTIONS } from "@/lib/templates/paper";
import { CONCEPT_SEEDS } from "@/seed/data/concepts";
import { MISCONCEPTION_SEEDS } from "@/seed/data/misconceptions";
import { PAPER_SEEDS, RELATION_SEEDS } from "@/seed/data/papers";
import { TOPIC_SEEDS } from "@/seed/data/topics";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedEmail = process.env.SEED_EMAIL ?? "researcher@example.com";
const seedPassword = process.env.SEED_PASSWORD ?? "research-atlas-dev";

if (!url || !serviceKey) {
  console.error(
    "Seed aborted: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
      "Run `npx supabase start` and copy the printed values into .env.local (see .env.example)."
  );
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
  });
  if (created?.user) {
    console.log(`Created user ${seedEmail}`);
    return created.user.id;
  }
  // Already exists → look it up.
  if (error) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw new Error(`Cannot list users: ${listError.message}`);
    const existing = list.users.find((u) => u.email === seedEmail);
    if (existing) {
      console.log(`Using existing user ${seedEmail}`);
      return existing.id;
    }
    throw new Error(`Cannot create or find seed user: ${error.message}`);
  }
  throw new Error("Unexpected auth state");
}

async function main() {
  console.log(`Seeding Research Atlas at ${url} for ${seedEmail}…`);
  const userId = await ensureUser();

  // --- Topics ---------------------------------------------------------------
  const topicIds = new Map<string, string>();
  for (const topic of TOPIC_SEEDS) {
    const { data: existing } = await admin
      .from("topics")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", topic.slug)
      .maybeSingle();
    if (existing) {
      topicIds.set(topic.slug, existing.id);
      continue;
    }
    const { data, error } = await admin
      .from("topics")
      .insert({ ...topic, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(`Topic ${topic.slug}: ${error.message}`);
    topicIds.set(topic.slug, data.id);
  }
  console.log(`Topics ready: ${topicIds.size}`);

  // --- Concepts ---------------------------------------------------------------
  const conceptIds = new Map<string, string>();
  for (const concept of CONCEPT_SEEDS) {
    const { data: existing } = await admin
      .from("concepts")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", concept.slug)
      .maybeSingle();
    if (existing) {
      conceptIds.set(concept.slug, existing.id);
      continue;
    }
    const { data, error } = await admin
      .from("concepts")
      .insert({ ...concept, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(`Concept ${concept.slug}: ${error.message}`);
    conceptIds.set(concept.slug, data.id);
  }
  console.log(`Concepts ready: ${conceptIds.size}`);

  // --- Papers -----------------------------------------------------------------
  const paperIds = new Map<string, string>();
  let insertedPapers = 0;
  for (const paper of PAPER_SEEDS) {
    const { data: existing } = await admin
      .from("papers")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", paper.slug)
      .maybeSingle();
    if (existing) {
      paperIds.set(paper.slug, existing.id);
      continue;
    }

    const { topics, concepts, sections, sources, ...fields } = paper;
    const { data, error } = await admin
      .from("papers")
      .insert({
        ...fields,
        canonical_url: paper.arxiv_id ? `https://arxiv.org/abs/${paper.arxiv_id}` : null,
        primary_source_verified: false,
        needs_revisit: paper.needs_revisit ?? false,
        user_id: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Paper ${paper.slug}: ${error.message}`);
    paperIds.set(paper.slug, data.id);
    insertedPapers++;

    // Full template section rows; seed content merged in where authored.
    const sectionRows = PAPER_SECTIONS.map((def, i) => ({
      user_id: userId,
      paper_id: data.id,
      section_type: def.type,
      body_md: sections[def.type] ?? def.scaffold ?? "",
      position: i,
    }));
    const { error: notesError } = await admin.from("paper_notes").insert(sectionRows);
    if (notesError) throw new Error(`Notes for ${paper.slug}: ${notesError.message}`);

    if (topics.length > 0) {
      const rows = topics
        .map((slug) => topicIds.get(slug))
        .filter((id): id is string => !!id)
        .map((topic_id) => ({ user_id: userId, paper_id: data.id, topic_id }));
      const missing = topics.filter((slug) => !topicIds.has(slug));
      if (missing.length > 0) throw new Error(`Paper ${paper.slug}: unknown topics ${missing}`);
      const { error: topicError } = await admin.from("paper_topics").insert(rows);
      if (topicError) throw new Error(`Topics for ${paper.slug}: ${topicError.message}`);
    }

    if (concepts.length > 0) {
      const missing = concepts.filter((slug) => !conceptIds.has(slug));
      if (missing.length > 0) throw new Error(`Paper ${paper.slug}: unknown concepts ${missing}`);
      const rows = concepts.map((slug) => ({
        user_id: userId,
        paper_id: data.id,
        concept_id: conceptIds.get(slug)!,
      }));
      const { error: conceptError } = await admin.from("paper_concepts").insert(rows);
      if (conceptError) throw new Error(`Concepts for ${paper.slug}: ${conceptError.message}`);
    }

    if (sources.length > 0) {
      const { error: sourceError } = await admin.from("sources").insert(
        sources.map((s) => ({
          user_id: userId,
          paper_id: data.id,
          source_name: s.source_name,
          locator: s.locator ?? null,
          url: s.url ?? null,
          quote_or_claim: s.quote_or_claim ?? null,
          needs_verification: s.needs_verification,
        }))
      );
      if (sourceError) throw new Error(`Sources for ${paper.slug}: ${sourceError.message}`);
    }
  }
  console.log(`Papers ready: ${paperIds.size} (${insertedPapers} inserted)`);

  // --- Relations ----------------------------------------------------------------
  let insertedRelations = 0;
  for (const relation of RELATION_SEEDS) {
    const fromId = paperIds.get(relation.from);
    const toId = paperIds.get(relation.to);
    if (!fromId || !toId)
      throw new Error(`Relation ${relation.from} → ${relation.to}: unknown slug`);
    const { error } = await admin.from("paper_relations").upsert(
      {
        user_id: userId,
        from_paper_id: fromId,
        to_paper_id: toId,
        relation_kind: relation.kind,
        note: relation.note ?? null,
      },
      { onConflict: "from_paper_id,to_paper_id,relation_kind", ignoreDuplicates: true }
    );
    if (error) throw new Error(`Relation ${relation.from} → ${relation.to}: ${error.message}`);
    insertedRelations++;
  }
  console.log(`Relations ready: ${insertedRelations}`);

  // --- Misconceptions -------------------------------------------------------------
  let insertedMisconceptions = 0;
  for (const m of MISCONCEPTION_SEEDS) {
    const { data: existing } = await admin
      .from("misconception_corrections")
      .select("id")
      .eq("user_id", userId)
      .eq("initial_belief_md", m.initial_belief_md)
      .maybeSingle();
    if (existing) continue;
    const { error } = await admin.from("misconception_corrections").insert({
      user_id: userId,
      initial_belief_md: m.initial_belief_md,
      why_i_believed_md: m.why_i_believed_md ?? null,
      corrected_understanding_md: m.corrected_understanding_md,
      evidence_md: m.evidence_md ?? null,
      paper_id: m.paper_slug ? (paperIds.get(m.paper_slug) ?? null) : null,
      concept_id: m.concept_slug ? (conceptIds.get(m.concept_slug) ?? null) : null,
      confidence: m.confidence,
      can_explain_without_notes: m.can_explain_without_notes,
    });
    if (error) throw new Error(`Misconception: ${error.message}`);
    insertedMisconceptions++;
  }
  console.log(`Misconceptions ready (+${insertedMisconceptions})`);

  console.log("\nSeed complete.");
  console.log(`Sign in at http://localhost:3000/login with ${seedEmail} / ${seedPassword}`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
