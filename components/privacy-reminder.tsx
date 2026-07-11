import { ShieldAlert } from "lucide-react";
import { PRIVACY_REMINDER } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Persistent but unobtrusive privacy reminder, rendered wherever notes are
 * written. Do not remove — see CLAUDE.md privacy rules.
 */
export function PrivacyReminder({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground",
        className
      )}
    >
      <ShieldAlert className="size-3.5 shrink-0 mt-px" aria-hidden />
      <span>{PRIVACY_REMINDER}</span>
    </p>
  );
}
