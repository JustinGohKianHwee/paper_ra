import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NoteAuthorship } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

/**
 * Provenance label for AI-produced content. Everything the model writes is
 * marked until the user edits it — never present AI text as human notes.
 */
export function AiBadge({
  authorship = "ai",
  className,
}: {
  authorship?: NoteAuthorship;
  className?: string;
}) {
  if (authorship === "human") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal text-[10px] border-violet-500/40 text-violet-700 dark:text-violet-400",
        className
      )}
    >
      <Sparkles className="size-2.5" aria-hidden />
      {authorship === "ai_edited" ? "AI, edited by you" : "AI-generated"}
    </Badge>
  );
}
