import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Notebook,
  Plus,
  Timer,
} from "lucide-react";
import { ReadingStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKLY_READING_TARGET } from "@/lib/config";
import { KNOWLEDGE_OBJECTS } from "@/lib/knowledge-objects";
import { hasRealContent } from "@/lib/papers/queries";
import { createClient } from "@/lib/supabase/server";
import { periodStartFor } from "@/lib/templates/synthesis";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const DAY_MS = 24 * 3600_000;
const ACTIVITY_DAYS = 14;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 14-day reading-activity bars. Pure CSS, no chart library; heights animate
 * only for users without a reduced-motion preference, and every bar carries
 * a text label for screen readers and hover.
 */
function ActivityBars({ minutesByDay }: { minutesByDay: { day: string; minutes: number }[] }) {
  const max = Math.max(1, ...minutesByDay.map((d) => d.minutes));
  return (
    <div
      className="flex h-10 items-end gap-[3px]"
      role="img"
      aria-label={`Reading minutes over the last ${ACTIVITY_DAYS} days`}
    >
      {minutesByDay.map((d) => (
        <div
          key={d.day}
          title={`${new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}: ${d.minutes} min`}
          className="flex h-full w-2.5 items-end rounded-sm bg-muted/60"
        >
          <span
            aria-hidden
            className={cn(
              "w-full rounded-sm bg-primary/70 motion-safe:transition-[height] motion-safe:duration-500",
              d.minutes === 0 && "bg-transparent"
            )}
            style={{ height: `${Math.round((d.minutes / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "warn";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold tabular-nums tracking-tight",
          tone === "warn" && "text-amber-700 dark:text-amber-400"
        )}
      >
        {value}
      </p>
      {sub ? <p className="truncate text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground italic">{children}</p>
);

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const weekStart = periodStartFor("weekly", now);
  const monthStart = periodStartFor("monthly", now);
  const activityStart = isoDay(new Date(now.getTime() - (ACTIVITY_DAYS - 1) * DAY_MS));

  const [
    activeSessionRes,
    continueHintsRes,
    continueReadingRes,
    queueRes,
    recentlyEditedRes,
    openQuestionsRes,
    misconceptionsRes,
    unverifiedRes,
    gapTopicsRes,
    libraryCountRes,
    activityRes,
    weekSessionsRes,
    weeklySynthRes,
    monthlySynthRes,
  ] = await Promise.all([
    supabase
      .from("reading_sessions")
      .select("id, started_at, papers!inner(title, slug, deleted_at)")
      .is("ended_at", null)
      .is("papers.deleted_at", null)
      .maybeSingle(),
    supabase
      .from("reading_sessions")
      .select("continue_md, ended_at, papers!inner(title, slug, deleted_at)")
      .not("ended_at", "is", null)
      .not("continue_md", "is", null)
      .is("papers.deleted_at", null)
      .order("ended_at", { ascending: false })
      .limit(3),
    supabase
      .from("papers")
      .select("title, slug, reading_status, last_read_at")
      .is("deleted_at", null)
      .not("last_read_at", "is", null)
      .order("last_read_at", { ascending: false })
      .limit(3),
    supabase
      .from("papers")
      .select("title, slug, priority, reading_status")
      .is("deleted_at", null)
      .in("reading_status", ["to_read", "queued"])
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("papers")
      .select("title, slug, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("paper_annotations")
      .select("body_md, papers!inner(title, slug, deleted_at)")
      .eq("kind", "question")
      .eq("resolved", false)
      .is("papers.deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("misconception_corrections")
      .select("id, initial_belief_md, corrected_on")
      .order("corrected_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("papers")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .in("verification_status", ["metadata_only", "secondary_summary_only"]),
    supabase.from("topics").select("name, slug, knowledge_gaps_md").order("name"),
    supabase.from("papers").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("reading_sessions")
      .select("occurred_on, minutes")
      .gte("occurred_on", activityStart),
    supabase.from("reading_sessions").select("id, paper_id, minutes").gte("occurred_on", weekStart),
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

  const activeSession = activeSessionRes.data
    ? {
        startedAt: activeSessionRes.data.started_at,
        paper: activeSessionRes.data.papers as unknown as { title: string; slug: string } | null,
      }
    : null;

  const continueHints = (continueHintsRes.data ?? [])
    .map((s) => ({
      hint: (s.continue_md ?? "")
        .replace(/[#*`>]/g, "")
        .trim()
        .slice(0, 120),
      paper: s.papers as unknown as { title: string; slug: string } | null,
    }))
    .filter((h) => h.paper && h.hint);

  const openQuestions = (openQuestionsRes.data ?? [])
    .map((n) => ({
      paper: n.papers as unknown as { title: string; slug: string } | null,
      preview: n.body_md
        .replace(/[#*`>]/g, "")
        .trim()
        .slice(0, 120),
    }))
    .filter((q) => q.paper);

  const gapTopics = (gapTopicsRes.data ?? []).filter((t) => hasRealContent(t.knowledge_gaps_md));

  const papersReadThisWeek = new Set((weekSessionsRes.data ?? []).map((s) => s.paper_id)).size;
  const minutesThisWeek = (weekSessionsRes.data ?? []).reduce((a, s) => a + (s.minutes ?? 0), 0);

  const minutesByDay: { day: string; minutes: number }[] = [];
  for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
    minutesByDay.push({ day: isoDay(new Date(now.getTime() - i * DAY_MS)), minutes: 0 });
  }
  const dayIndex = new Map(minutesByDay.map((d, i) => [d.day, i]));
  for (const s of activityRes.data ?? []) {
    const i = dayIndex.get(s.occurred_on);
    if (i !== undefined) minutesByDay[i].minutes += s.minutes ?? 0;
  }

  const QuestionIcon = KNOWLEDGE_OBJECTS.question.icon;
  const MisconceptionIcon = KNOWLEDGE_OBJECTS.misconception.icon;

  return (
    <div className="space-y-5">
      {/* ---- header ---------------------------------------------------- */}
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

      {/* ---- hero: the single most actionable thing --------------------- */}
      {activeSession?.paper ? (
        <Card className="border-emerald-500/40 py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <Timer className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium">Reading session in progress</p>
              <p className="truncate text-xs text-muted-foreground">
                {activeSession.paper.title} — started{" "}
                {new Date(activeSession.startedAt ?? "").toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <Button asChild size="sm" className="ml-auto shrink-0">
              <Link href={`/papers/${activeSession.paper.slug}/read`}>Resume</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ---- stats strip ------------------------------------------------ */}
      <Card className="py-4">
        <CardContent className="flex flex-wrap items-end gap-x-8 gap-y-3 px-5">
          <Stat label="Library" value={libraryCountRes.count ?? 0} sub="papers" />
          <Stat
            label="Read this week"
            value={`${papersReadThisWeek}/${WEEKLY_READING_TARGET}`}
            sub={
              papersReadThisWeek >= WEEKLY_READING_TARGET
                ? "target met"
                : `target: ${WEEKLY_READING_TARGET} serious paper${WEEKLY_READING_TARGET === 1 ? "" : "s"}/week`
            }
          />
          <Stat
            label="Reading time"
            value={
              minutesThisWeek >= 60
                ? `${Math.floor(minutesThisWeek / 60)}h ${minutesThisWeek % 60}m`
                : `${minutesThisWeek}m`
            }
            sub="this week"
          />
          <Stat
            label="Open questions"
            value={openQuestions.length > 0 ? openQuestions.length : "0"}
            tone={openQuestions.length > 0 ? "warn" : undefined}
            sub={openQuestions.length > 0 ? "waiting on you" : "all resolved"}
          />
          <div className="ml-auto hidden sm:block">
            <p className="pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Last {ACTIVITY_DAYS} days
            </p>
            <ActivityBars minutesByDay={minutesByDay} />
          </div>
        </CardContent>
      </Card>

      {/* ---- primary: what to do next ------------------------------------ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-muted-foreground" /> Continue reading
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {continueHints.length === 0 && (continueReadingRes.data ?? []).length === 0 ? (
              <Empty>No reading sessions yet — open a paper and press Read.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {continueHints.map((h, i) => (
                  <li key={`hint-${i}`} className="text-sm">
                    <Link
                      href={`/papers/${h.paper!.slug}/read`}
                      className="font-medium hover:underline underline-offset-4"
                    >
                      {h.paper!.title}
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-1">next: {h.hint}</p>
                  </li>
                ))}
                {(continueReadingRes.data ?? [])
                  .filter((p) => !continueHints.some((h) => h.paper?.slug === p.slug))
                  .slice(0, Math.max(0, 3 - continueHints.length))
                  .map((p) => (
                    <li key={p.slug} className="flex items-center gap-2 text-sm">
                      <Link
                        href={`/papers/${p.slug}/read`}
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
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="size-4 text-muted-foreground" /> Reading queue
            </CardTitle>
            <Link
              href="/papers?sort=priority"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          </CardHeader>
          <CardContent className="px-4">
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
          </CardContent>
        </Card>
      </div>

      {/* ---- secondary: your thinking ------------------------------------ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <QuestionIcon
                className={cn("size-4", KNOWLEDGE_OBJECTS.question.textClass)}
                aria-hidden
              />
              Open questions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {openQuestions.length === 0 ? (
              <Empty>No open questions recorded.</Empty>
            ) : (
              <ul className="space-y-2">
                {openQuestions.map((q, i) => (
                  <li key={i} className="text-sm">
                    <p className="text-muted-foreground line-clamp-2">{q.preview}</p>
                    <Link
                      href={`/papers/${q.paper!.slug}/read`}
                      className="text-xs hover:underline underline-offset-4"
                    >
                      {q.paper!.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MisconceptionIcon
                className={cn("size-4", KNOWLEDGE_OBJECTS.misconception.textClass)}
                aria-hidden
              />
              Recent misconceptions
            </CardTitle>
            <Link
              href="/misconceptions"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          </CardHeader>
          <CardContent className="px-4">
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
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader className="flex flex-row items-center justify-between px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Notebook className="size-4 text-muted-foreground" /> Recently edited
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
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
          </CardContent>
        </Card>
      </div>

      {/* ---- background: debts and hygiene, deliberately quiet ----------- */}
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <Link
          href="/papers?verification=secondary_summary_only"
          className="group flex items-center gap-2 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent/40"
        >
          <AlertTriangle className="size-4 shrink-0 text-amber-600/70 dark:text-amber-400/70" />
          <span className="min-w-0 truncate text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {unverifiedRes.count ?? 0}
            </span>{" "}
            paper{(unverifiedRes.count ?? 0) === 1 ? "" : "s"} awaiting primary-source verification
          </span>
        </Link>

        <Link
          href="/topics"
          className="group flex items-center gap-2 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent/40"
        >
          <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{gapTopics.length}</span>{" "}
            topic{gapTopics.length === 1 ? "" : "s"} with noted knowledge gaps
          </span>
        </Link>

        <Link
          href={weeklySynthRes.data && monthlySynthRes.data ? "/synthesis" : "/synthesis/new"}
          className="group flex items-center gap-2 rounded-md border px-3 py-2.5 transition-colors hover:bg-accent/40"
        >
          <Lightbulb className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-muted-foreground">
            Synthesis — weekly: {weeklySynthRes.data ? "written" : "not yet"} · monthly:{" "}
            {monthlySynthRes.data ? "written" : "not yet"}
          </span>
        </Link>
      </div>
    </div>
  );
}
