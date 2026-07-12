import type { Metadata } from "next";
import Link from "next/link";
import { DepthBar } from "@/components/topics/depth-bar";
import { Card, CardContent } from "@/components/ui/card";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import { hasRealContent } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";
import { summariseDepth } from "@/lib/topics/depth";
import type { ReadingStatus } from "@/lib/validation/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Topics" };

const topicStyle = KNOWLEDGE_OBJECTS.topic;
const TopicIcon = topicStyle.icon;

/**
 * The Topics landscape: broad research areas with reading-depth coverage and
 * recent activity, so the page answers "what do I study, and how well do I
 * know each area" rather than listing names.
 */
export default async function TopicsPage() {
  const supabase = await createClient();
  const [topicsRes, linksRes] = await Promise.all([
    supabase.from("topics").select("*").order("name"),
    supabase
      .from("paper_topics")
      .select("topic_id, papers!inner(reading_status, updated_at, deleted_at)"),
  ]);

  const papersByTopic = new Map<string, { reading_status: ReadingStatus; updated_at: string }[]>();
  for (const link of linksRes.data ?? []) {
    const paper = link.papers as unknown as {
      reading_status: ReadingStatus;
      updated_at: string;
      deleted_at: string | null;
    } | null;
    if (!paper || paper.deleted_at) continue;
    const list = papersByTopic.get(link.topic_id) ?? [];
    list.push(paper);
    papersByTopic.set(link.topic_id, list);
  }

  const monthAgo = new Date().getTime() - 30 * 24 * 3600_000;
  const topics = topicsRes.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5">
        <TopicIcon className={cn("mt-1 size-5", topicStyle.textClass)} aria-hidden />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Topics</h1>
          <p className="text-sm text-muted-foreground">
            The landscape of your library: broad research areas, how deeply you know each, and where
            the gaps are.
          </p>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No topics yet — run `npm run seed` to create the starter set.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => {
            const papers = papersByTopic.get(t.id) ?? [];
            const depth = summariseDepth(papers.map((p) => p.reading_status));
            const recentlyActive = papers.filter(
              (p) => new Date(p.updated_at).getTime() >= monthAgo
            ).length;
            return (
              <Link key={t.id} href={`/topics/${t.slug}`}>
                <Card
                  className={cn(
                    "h-full border-l-2 py-4 transition-colors hover:bg-accent/40",
                    "border-l-blue-600/40"
                  )}
                >
                  <CardContent className="space-y-2 px-4">
                    <div className="space-y-0.5">
                      <p className="font-medium leading-snug">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {depth.total} paper{depth.total === 1 ? "" : "s"}
                        {recentlyActive > 0 ? ` · ${recentlyActive} active this month` : ""}
                      </p>
                    </div>

                    <DepthBar summary={depth} />

                    {t.overview_md ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {t.overview_md.replace(/[#*`>]/g, "").slice(0, 160)}
                      </p>
                    ) : null}

                    <p className="text-[11px] text-muted-foreground">
                      {[
                        hasRealContent(t.synthesis_md) ? "synthesis written" : null,
                        hasRealContent(t.knowledge_gaps_md) ? "knowledge gaps noted" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "no synthesis yet"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
