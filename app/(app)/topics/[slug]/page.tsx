import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveTopicField } from "@/actions/topics";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
import { ExperimentStatusBadge, ReadingStatusBadge } from "@/components/status-badges";
import { Separator } from "@/components/ui/separator";
import { hasRealContent } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("name").eq("slug", slug).maybeSingle();
  return { title: data?.name ?? "Topic" };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
  if (!topic) notFound();

  const { data: paperLinks } = await supabase
    .from("paper_topics")
    .select("papers(id, title, slug, reading_status, priority, year)")
    .eq("topic_id", topic.id);

  const papers = (paperLinks ?? [])
    .map(
      (l) =>
        l.papers as unknown as {
          id: string;
          title: string;
          slug: string;
          reading_status: string;
          priority: number;
          year: number | null;
        } | null
    )
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

  const paperIds = papers.map((p) => p.id);

  const [experimentLinks, misconceptions, openQuestionNotes, conceptLinks] = await Promise.all([
    paperIds.length > 0
      ? supabase
          .from("experiment_papers")
          .select("experiments(id, title, slug, status)")
          .in("paper_id", paperIds)
      : Promise.resolve({ data: [] as never[] }),
    paperIds.length > 0
      ? supabase
          .from("misconception_corrections")
          .select("id, initial_belief_md, corrected_understanding_md, corrected_on")
          .in("paper_id", paperIds)
          .order("corrected_on", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as never[] }),
    paperIds.length > 0
      ? supabase
          .from("paper_notes")
          .select("paper_id, body_md")
          .eq("section_type", "open_questions")
          .in("paper_id", paperIds)
      : Promise.resolve({ data: [] as never[] }),
    paperIds.length > 0
      ? supabase.from("paper_concepts").select("concepts(id, name, slug)").in("paper_id", paperIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const experiments = [
    ...new Map(
      (experimentLinks.data ?? [])
        .map(
          (l) =>
            (l as { experiments: unknown }).experiments as {
              id: string;
              title: string;
              slug: string;
              status: string;
            } | null
        )
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .map((e) => [e.id, e])
    ).values(),
  ];

  const concepts = [
    ...new Map(
      (conceptLinks.data ?? [])
        .map(
          (l) =>
            (l as { concepts: unknown }).concepts as {
              id: string;
              name: string;
              slug: string;
            } | null
        )
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c.id, c])
    ).values(),
  ];

  const papersWithOpenQuestions = new Set(
    (openQuestionNotes.data ?? [])
      .filter((n) => hasRealContent((n as { body_md: string }).body_md))
      .map((n) => (n as { paper_id: string }).paper_id)
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{topic.name}</h1>
        <p className="text-sm text-muted-foreground">
          {papers.length} paper{papers.length === 1 ? "" : "s"} · {experiments.length} experiment
          {experiments.length === 1 ? "" : "s"}
        </p>
        <PrivacyReminder />
      </header>

      <SectionEditor
        heading="Topic overview"
        hint="What this area covers and why it matters for your work."
        initialValue={topic.overview_md ?? ""}
        lastEditedAt={topic.updated_at}
        saveAction={saveTopicField.bind(null, topic.id, "overview_md")}
      />

      <SectionEditor
        heading="My current synthesis"
        hint="Your current mental model of this area — update as it changes."
        initialValue={topic.synthesis_md ?? ""}
        lastEditedAt={topic.updated_at}
        saveAction={saveTopicField.bind(null, topic.id, "synthesis_md")}
      />

      <SectionEditor
        heading="Knowledge gaps"
        hint="What you cannot yet explain or have not verified. Surfaces on the dashboard."
        initialValue={topic.knowledge_gaps_md ?? ""}
        lastEditedAt={topic.updated_at}
        saveAction={saveTopicField.bind(null, topic.id, "knowledge_gaps_md")}
      />

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">Papers</h2>
        {papers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No papers linked yet.</p>
        ) : (
          <ul className="divide-y">
            {papers.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <Link
                  href={`/papers/${p.slug}`}
                  className="min-w-0 truncate text-sm hover:underline underline-offset-4"
                >
                  {p.title}
                </Link>
                {papersWithOpenQuestions.has(p.id) ? (
                  <span className="text-xs text-muted-foreground shrink-0">open questions</span>
                ) : null}
                <span className="ml-auto shrink-0">
                  <ReadingStatusBadge
                    status={p.reading_status as Parameters<typeof ReadingStatusBadge>[0]["status"]}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {concepts.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Key concepts</h2>
          <ul className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/concepts/${c.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {experiments.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Experiments</h2>
          <ul className="space-y-1">
            {experiments.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/experiments/${e.slug}`}
                  className="hover:underline underline-offset-4"
                >
                  {e.title}
                </Link>
                <ExperimentStatusBadge
                  status={e.status as Parameters<typeof ExperimentStatusBadge>[0]["status"]}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(misconceptions.data ?? []).length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Recent misconceptions in this topic
          </h2>
          <ul className="space-y-2">
            {(misconceptions.data ?? []).map((m) => {
              const record = m as {
                id: string;
                initial_belief_md: string;
                corrected_on: string;
              };
              return (
                <li key={record.id} className="text-sm">
                  <Link
                    href={`/misconceptions#${record.id}`}
                    className="hover:underline underline-offset-4"
                  >
                    {record.initial_belief_md.replace(/[#*`>]/g, "").slice(0, 110)}
                    {record.initial_belief_md.length > 110 ? "…" : ""}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{record.corrected_on}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
