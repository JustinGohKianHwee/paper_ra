"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, FlaskConical, Lightbulb, Notebook, Plus, Tags } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchResultHref, type SearchResult } from "@/lib/search";

interface Props {
  topics: { name: string; slug: string }[];
}

export function CommandPalette({ topics }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results.slice(0, 8));
        }
      } catch {
        // aborted or offline — ignore
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search notes or jump to an action"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search papers, notes, concepts… (Ctrl+K)"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{loading ? "Searching…" : "No results."}</CommandEmpty>

          {results.length > 0 ? (
            <CommandGroup heading="Results">
              {results.map((r) => (
                <CommandItem
                  key={`${r.kind}-${r.id}-${r.title}`}
                  value={`${r.kind}-${r.id}-${r.title}`}
                  onSelect={() => go(searchResultHref(r))}
                >
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.kind}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go("/papers/new")}>
              <Plus /> Add paper
            </CommandItem>
            <CommandItem onSelect={() => go("/misconceptions/new")}>
              <Lightbulb /> Record misconception
            </CommandItem>
            <CommandItem onSelect={() => go("/experiments/new")}>
              <FlaskConical /> Record experiment
            </CommandItem>
            <CommandItem onSelect={() => go("/synthesis/new")}>
              <Notebook /> New synthesis note
            </CommandItem>
            <CommandItem onSelect={() => go("/papers")}>
              <BookOpen /> Browse papers
            </CommandItem>
          </CommandGroup>

          {topics.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Topics">
                {topics
                  .filter(
                    (t) =>
                      query.trim().length < 2 || t.name.toLowerCase().includes(query.toLowerCase())
                  )
                  .slice(0, 6)
                  .map((t) => (
                    <CommandItem key={t.slug} onSelect={() => go(`/topics/${t.slug}`)}>
                      <Tags /> {t.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
