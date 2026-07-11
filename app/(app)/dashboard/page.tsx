import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  Notebook,
  Plus,
} from "lucide-react";
import { ExperimentStatusBadge, ReadingStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKLY_READING_TARGET } from "@/lib/config";
import { hasRealContent } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";
import { periodStartFor } from "@/lib/templates/synthesis";

export const metadata: Metadata = { title: "Dashboard" };

function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" /> {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground italic">{children}</p>
);

export default async function DashboardPage() {
  const supabase = await createClient();

  const weekStart = periodStartFor("weekly", new Date());
  const monthStart = periodStartFor("monthly", new Date());

  const [
    continueReadingRes,
    recentlyEditedRes,
    queueRes,
    openQuestionsRes,
    misconceptionsRes,
    experimentsRes,
    unverifiedRes,
    gapTopicsRes,
    weekSessionsRes,
    weeklySynthRes,
    monthlySynthRes,
  ] = await Promise.all([
    supabase
      .from("papers")
      .select("title, slug, reading_status, last_read_at")
      .not("last_read_at", "is", null)
      .order("last_read_at", { ascending: false })
      .limit(3),
    supabase
      .from("papers")
      .select("title, slug, updated_at, reading_status")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("papers")
      .select("title, slug, priority, reading_status")
      .in("reading_status", ["to_read", "queued"])
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("paper_notes")
      .select("body_md, papers(title, slug)")
      .eq("section_type", "open_questions")
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("misconception_corrections")
      .select("id, initial_belief_md, corrected_understanding_md, corrected_on")
      .order("corrected_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("experiments")
      .select("title, slug, status")
      .in("status", ["implementing", "running", "analysing"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("papers")
      .select("title, slug, verification_status, priority")
      .in("verification_status", ["metadata_only", "secondary_summary_only"])
      .order("priority", { ascending: false })
      .limit(5),
    supabase.from("topics").select("name, slug, knowledge_gaps_md").order("name"),
    supabase.from("reading_sessions").select("id, paper_id").gte("occurred_on", weekStart),
    supabase
      .from("synthesis_notes")
      .select("id")
      .eq("kind", "weekly")
      .eq("period_start", weekStart)
      .maybeSingle(),
    supabase
      .from("synthesis_notes")
      .select("id")
      .eq("kind", "monthly")
      .eq("period_start", monthStart)
      .maybeSingle(),
  ]);

  const openQuestions = (openQuestionsRes.data ?? [])
    .filter((n) => hasRealContent(n.body_md))
    .slice(0, 5)
    .map((n) => ({
      paper: n.papers as unknown as { title: string; slug: string } | null,
      preview: n.body_md
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))[0]
        ?.replace(/^[-*]\s*/, "")
        .slice(0, 120),
    }))
    .filter((q) => q.paper);

  const gapTopics = (gapTopicsRes.data ?? []).filter((t) => hasRealContent(t.knowledge_gaps_md));
  const papersReadThisWeek = new Set((weekSessionsRes.data ?? []).map((s) => s.paper_id)).size;
  const sessionCount = (weekSessionsRes.data ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            What should you learn or continue working on next?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Quick capture: <kbd className="rounded border bg-muted px-1">Ctrl</kbd>+
            <kbd className="rounded border bg-muted px-1">K</kbd>
          </span>
          <Button asChild size="sm">
            <Link href="/papers/new">
              <Plus className="size-4" /> Add paper
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard title="Continue reading" icon={BookOpen}>
          {(continueReadingRes.data ?? []).length === 0 ? (
            <Empty>No reading sessions logged yet — open a paper and log one.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {(continueReadingRes.data ?? []).map((p) => (
                <li key={p.slug} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/papers/${p.slug}`}
                    className="min-w-0 truncate hover:underline underline-offset-4"
                  >
                    {p.title}
                  </Link>
                  <span className="ml-auto shrink-0">
                    <ReadingStatusBadge status={p.reading_status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Reading queue"
          icon={ArrowRight}
          action={
            <Link
              href="/papers?sort=priority"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          }
        >
          {(queueRes.data ?? []).length === 0 ? (
            <Empty>Queue is empty.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {(queueRes.data ?? []).map((p) => (
                <li key={p.slug} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-8 justify-center font-normal shrink-0">
                    P{p.priority}
                  </Badge>
                  <Link
                    href={`/papers/${p.slug}`}
                    className="min-w-0 truncate hover:underline underline-offset-4"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recently edited" icon={Notebook}>
          {(recentlyEditedRes.data ?? []).length === 0 ? (
            <Empty>Nothing edited yet.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {(recentlyEditedRes.data ?? []).map((p) => (
                <li key={p.slug} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/papers/${p.slug}`}
                    className="min-w-0 truncate hover:underline underline-offset-4"
                  >
                    {p.title}
                  </Link>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Unresolved questions"
          icon={HelpCircle}
          action={
            <Link
              href="/papers?open_questions=1"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          }
        >
          {openQuestions.length === 0 ? (
            <Empty>No open questions recorded.</Empty>
          ) : (
            <ul className="space-y-2">
              {openQuestions.map((q, i) => (
                <li key={i} className="text-sm">
                  <p className="text-muted-foreground line-clamp-2">{q.preview}</p>
                  <Link
                    href={`/papers/${q.paper!.slug}#section-open_questions`}
                    className="text-xs hover:underline underline-offset-4"
                  >
                    {q.paper!.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Recent misconceptions"
          icon={Lightbulb}
          action={
            <Link
              href="/misconceptions"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          }
        >
          {(misconceptionsRes.data ?? []).length === 0 ? (
            <Empty>None recorded — catch yourself being wrong and write it down.</Empty>
          ) : (
            <ul className="space-y-2">
              {(misconceptionsRes.data ?? []).map((m) => (
                <li key={m.id} className="text-sm">
                  <Link
                    href={`/misconceptions#${m.id}`}
                    className="hover:underline underline-offset-4"
                  >
                    <span className="line-clamp-2">
                      {m.initial_belief_md.replace(/[#*`>]/g, "").slice(0, 110)}
                    </span>
                  </Link>
                  <span className="text-xs text-muted-foreground">{m.corrected_on}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Experiments in progress"
          icon={FlaskConical}
          action={
            <Link
              href="/experiments"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          }
        >
          {(experimentsRes.data ?? []).length === 0 ? (
            <Empty>Nothing in flight.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {(experimentsRes.data ?? []).map((e) => (
                <li key={e.slug} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/experiments/${e.slug}`}
                    className="min-w-0 truncate hover:underline underline-offset-4"
                  >
                    {e.title}
                  </Link>
                  <span className="ml-auto shrink-0">
                    <ExperimentStatusBadge status={e.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Awaiting primary-source verification"
          icon={AlertTriangle}
          action={
            <Link
              href="/papers?verification=secondary_summary_only"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          }
        >
          {(unverifiedRes.data ?? []).length === 0 ? (
            <Empty>Everything verified. Impressive.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {(unverifiedRes.data ?? []).map((p) => (
                <li key={p.slug} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/papers/${p.slug}`}
                    className="min-w-0 truncate hover:underline underline-offset-4"
                  >
                    {p.title}
                  </Link>
                  <span className="ml-auto shrink-0 text-xs text-amber-700 dark:text-amber-400">
                    {p.verification_status === "metadata_only" ? "metadata only" : "secondary only"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Topic knowledge gaps" icon={HelpCircle}>
          {gapTopics.length === 0 ? (
            <Empty>No gaps written down — add them on topic pages.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {gapTopics.slice(0, 5).map((t) => (
                <li key={t.slug} className="text-sm">
                  <Link href={`/topics/${t.slug}`} className="hover:underline underline-offset-4">
                    {t.name}
                  </Link>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {(t.knowledge_gaps_md ?? "")
                      .replace(/[#*`>-]/g, "")
                      .trim()
                      .slice(0, 100)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="py-4">
          <CardContent className="flex items-center justify-between px-4">
            <div>
              <p className="text-sm font-medium">Weekly reading</p>
              <p className="text-xs text-muted-foreground">
                {papersReadThisWeek} paper{papersReadThisWeek === 1 ? "" : "s"} · {sessionCount}{" "}
                session{sessionCount === 1 ? "" : "s"} this week (target: {WEEKLY_READING_TARGET}{" "}
                serious paper/week)
              </p>
            </div>
            {papersReadThisWeek >= WEEKLY_READING_TARGET ? (
              <Badge
                variant="outline"
                className="font-normal border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
              >
                on track
              </Badge>
            ) : (
              <Badge variant="outline" className="font-normal">
                {WEEKLY_READING_TARGET - papersReadThisWeek} to go
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center justify-between px-4">
            <div>
              <p className="text-sm font-medium">Synthesis status</p>
              <p className="text-xs text-muted-foreground">
                weekly: {weeklySynthRes.data ? "written" : "not yet"} · monthly:{" "}
                {monthlySynthRes.data ? "written" : "not yet"}
              </p>
            </div>
            {!weeklySynthRes.data || !monthlySynthRes.data ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/synthesis/new">Write synthesis</Link>
              </Button>
            ) : (
              <Badge
                variant="outline"
                className="font-normal border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
              >
                up to date
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
