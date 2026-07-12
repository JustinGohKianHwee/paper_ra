import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { saveTopicField } from "@/actions/topics";
import { PrivacyReminder } from "@/components/privacy-reminder";
import { SectionEditor } from "@/components/section-editor";
import { ConceptBadge, ReadingStatusBadge } from "@/components/status-badges";
import { DepthBar } from "@/components/topics/depth-bar";
import { Separator } from "@/components/ui/separator";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import { createClient } from "@/lib/supabase/server";
import { DEPTH_LABELS, depthBucket, summariseDepth, type DepthBucket } from "@/lib/topics/depth";
import type { ReadingStatus } from "@/lib/validation/enums";
import { cn } from "@/lib/utils";

const topicStyle = KNOWLEDGE_OBJECTS.topic;
const TopicIcon = topicStyle.icon;

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

interface TopicPaper {
  id: string;
  title: string;
  slug: string;
  reading_status: ReadingStatus;
  priority: number;
  year: number | null;
  deleted_at: string | null;
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
  if (!topic) notFound();

  const { data: paperLinks } = await supabase
    .from("paper_topics")
    .select("papers(id, title, slug, reading_status, priority, year, deleted_at)")
    .eq("topic_id", topic.id);

  const papers = (paperLinks ?? [])
    .map((l) => l.papers as unknown as TopicPaper | null)
    .filter((p): p is TopicPaper => p !== null && !p.deleted_at)
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

  const paperIds = papers.map((p) => p.id);
  const depth = summariseDepth(papers.map((p) => p.reading_status));

  const [misconceptions, openQuestionAnnotations, conceptLinks] = await Promise.all([
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
          .from("paper_annotations")
          .select("paper_id")
          .eq("kind", "question")
          .eq("resolved", false)
          .in("paper_id", paperIds)
      : Promise.resolve({ data: [] as never[] }),
    paperIds.length > 0
      ? supabase.from("paper_concepts").select("concepts(id, name, slug)").in("paper_id", paperIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

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
  ].sort((a, b) => a.name.localeCompare(b.name));

  const papersWithOpenQuestions = new Set(
    (openQuestionAnnotations.data ?? []).map((n) => (n as { paper_id: string }).paper_id)
  );

  const buckets: DepthBucket[] = ["deep", "surface", "unread"];
  const papersByBucket = new Map<DepthBucket, TopicPaper[]>(
    buckets.map((b) => [b, papers.filter((p) => depthBucket(p.reading_status) === b)])
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start gap-2.5">
          <TopicIcon className={cn("mt-1 size-5 shrink-0", topicStyle.textClass)} aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{topic.name}</h1>
            <p className="text-sm text-muted-foreground">
              Research area · {papers.length} paper{papers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {depth.total > 0 ? <DepthBar summary={depth} className="max-w-sm" /> : null}
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Papers by reading depth</h2>
        {papers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No papers linked yet.</p>
        ) : (
          buckets.map((bucket) => {
            const bucketPapers = papersByBucket.get(bucket) ?? [];
            if (bucketPapers.length === 0) return null;
            return (
              <div key={bucket}>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {DEPTH_LABELS[bucket]} ({bucketPapers.length})
                </h3>
                <ul className="mt-1 divide-y">
                  {bucketPapers.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <Link
                        href={`/papers/${p.slug}`}
                        className="min-w-0 truncate text-sm hover:underline underline-offset-4"
                      >
                        {p.title}
                      </Link>
                      {papersWithOpenQuestions.has(p.id) ? (
                        <span
                          className={cn("shrink-0 text-xs", KNOWLEDGE_OBJECTS.question.textClass)}
                        >
                          open questions
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0">
                        <ReadingStatusBadge status={p.reading_status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      {concepts.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Key concepts in this area</h2>
          <div className="flex flex-wrap gap-1.5">
            {concepts.map((c) => (
              <ConceptBadge key={c.id} name={c.name} slug={c.slug} />
            ))}
          </div>
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
