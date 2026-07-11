import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { hasRealContent } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const supabase = await createClient();
  const [topicsRes, linksRes] = await Promise.all([
    supabase.from("topics").select("*").order("name"),
    supabase.from("paper_topics").select("topic_id"),
  ]);

  const counts = new Map<string, number>();
  for (const link of linksRes.data ?? []) {
    counts.set(link.topic_id, (counts.get(link.topic_id) ?? 0) + 1);
  }

  const topics = topicsRes.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Topics</h1>
        <p className="text-sm text-muted-foreground">
          Research areas organising the library. Each topic tracks your synthesis and knowledge
          gaps.
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No topics yet — run `npm run seed` to create the starter set.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <Link key={t.id} href={`/topics/${t.slug}`}>
              <Card className="h-full py-4 transition-colors hover:bg-accent/40">
                <CardContent className="space-y-1 px-4">
                  <p className="font-medium leading-snug">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {counts.get(t.id) ?? 0} paper{(counts.get(t.id) ?? 0) === 1 ? "" : "s"}
                    {hasRealContent(t.knowledge_gaps_md) ? " · has knowledge gaps" : ""}
                    {hasRealContent(t.synthesis_md) ? " · has synthesis" : ""}
                  </p>
                  {t.overview_md ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {t.overview_md.replace(/[#*`>]/g, "").slice(0, 160)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
