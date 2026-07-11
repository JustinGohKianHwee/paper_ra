"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { LayoutList, Rows3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  READING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  readingStatusValues,
  verificationStatusValues,
} from "@/lib/validation/enums";
import type { PaperFilters } from "@/lib/papers/filters";

const ANY = "__any__";

interface Props {
  filters: PaperFilters;
  organisations: string[];
  years: number[];
  topics: { name: string; slug: string }[];
  resultCount: number;
}

export function FilterBar({ filters, organisations, years, topics, resultCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(filters.q);
  // Adjust-state-during-render pattern: resync when the URL-driven value changes.
  const [prevFilterQ, setPrevFilterQ] = useState(filters.q);
  if (filters.q !== prevFilterQ) {
    setPrevFilterQ(filters.q);
    setQ(filters.q);
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const onSearchChange = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParams({ q: value || null }), 300);
  };

  const hasActiveFilters =
    filters.q ||
    filters.topic ||
    filters.organisation ||
    filters.year !== null ||
    filters.reading.length > 0 ||
    filters.verification.length > 0 ||
    filters.minPriority !== null ||
    filters.minTiktokRelevance !== null ||
    filters.hasProductionEvidence ||
    filters.implemented !== null ||
    filters.hasOpenQuestions ||
    filters.hasExperiments ||
    filters.needsRevisit;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Filter by title, author, organisation…"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-full sm:w-64"
          aria-label="Filter papers"
        />

        <Select
          value={filters.topic ?? ANY}
          onValueChange={(v) => setParams({ topic: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-8 w-40" size="sm" aria-label="Topic">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All topics</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.reading[0] ?? ANY}
          onValueChange={(v) => setParams({ reading: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-8 w-44" size="sm" aria-label="Reading status">
            <SelectValue placeholder="Reading status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any reading status</SelectItem>
            {readingStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {READING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.verification[0] ?? ANY}
          onValueChange={(v) => setParams({ verification: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-8 w-48" size="sm" aria-label="Verification status">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any verification</SelectItem>
            {verificationStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {VERIFICATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.organisation ?? ANY}
          onValueChange={(v) => setParams({ org: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-8 w-40" size="sm" aria-label="Organisation">
            <SelectValue placeholder="Organisation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All organisations</SelectItem>
            {organisations.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.year?.toString() ?? ANY}
          onValueChange={(v) => setParams({ year: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-8 w-28" size="sm" aria-label="Year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any year</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.minPriority?.toString() ?? ANY}
          onValueChange={(v) => setParams({ min_priority: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-8 w-32" size="sm" aria-label="Minimum priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any priority</SelectItem>
            {[5, 4, 3, 2].map((p) => (
              <SelectItem key={p} value={p.toString()}>
                Priority ≥ {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {(
          [
            ["production", "Production evidence", filters.hasProductionEvidence],
            ["open_questions", "Open questions", filters.hasOpenQuestions],
            ["experiments", "Has experiments", filters.hasExperiments],
            ["revisit", "Needs revisit", filters.needsRevisit],
          ] as const
        ).map(([key, label, checked]) => (
          <Label key={key} className="flex items-center gap-1.5 font-normal text-muted-foreground">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setParams({ [key]: v ? "1" : null })}
            />
            {label}
          </Label>
        ))}

        <Select
          value={filters.implemented ?? ANY}
          onValueChange={(v) => setParams({ implemented: v === ANY ? null : v })}
        >
          <SelectTrigger className="h-7 w-40" size="sm" aria-label="Implemented">
            <SelectValue placeholder="Implemented?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Implemented or not</SelectItem>
            <SelectItem value="yes">Implemented</SelectItem>
            <SelectItem value="no">Not implemented</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {resultCount} paper{resultCount === 1 ? "" : "s"}
          </span>
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => router.replace(pathname)}
            >
              <X className="size-3" /> Clear
            </Button>
          ) : null}
          <Select value={filters.sort} onValueChange={(v) => setParams({ sort: v })}>
            <SelectTrigger className="h-7 w-36" size="sm" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Sort: priority</SelectItem>
              <SelectItem value="updated">Sort: recently edited</SelectItem>
              <SelectItem value="relevance">Sort: relevance</SelectItem>
              <SelectItem value="year">Sort: year</SelectItem>
              <SelectItem value="title">Sort: title</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            aria-label={filters.view === "compact" ? "Detailed view" : "Compact view"}
            onClick={() => setParams({ view: filters.view === "compact" ? null : "compact" })}
          >
            {filters.view === "compact" ? (
              <Rows3 className="size-3.5" />
            ) : (
              <LayoutList className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
