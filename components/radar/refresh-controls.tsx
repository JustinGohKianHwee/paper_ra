"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { refreshRecommendations } from "@/actions/radar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * User-triggered refresh: the default button infers interests from the
 * library; the optional search box explores a temporary topic without
 * creating any stored interest profile.
 */
export function RadarRefreshControls() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  function refresh(topicQuery?: string) {
    startTransition(async () => {
      const result = await refreshRecommendations(topicQuery ? { query: topicQuery } : {});
      if (result.ok) {
        toast.success(
          result.added && result.added > 0
            ? `${result.added} new candidate${result.added === 1 ? "" : "s"} found`
            : "No new candidates — everything recent is already known or queued."
        );
        setQuery("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Refresh failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => refresh()} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {pending ? "Scanning…" : "Refresh recommendations"}
      </Button>

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) refresh(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Explore a temporary topic…"
          aria-label="One-off topic search"
          className="h-8 w-56 text-sm"
          disabled={pending}
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending || !query.trim()}
          aria-label="Search this topic once"
        >
          <Search className="size-4" />
        </Button>
      </form>
    </div>
  );
}
