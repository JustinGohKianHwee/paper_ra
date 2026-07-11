import { AlertTriangle } from "lucide-react";
import type { VerificationStatus } from "@/lib/validation/enums";

/**
 * Amber callout shown on paper pages whose claims have not been verified
 * against the primary paper. Deliberately hard to miss.
 */
export function VerificationCallout({
  status,
  noteSource,
}: {
  status: VerificationStatus;
  noteSource?: string | null;
}) {
  if (status === "primary_claims_verified") return null;

  const message =
    status === "metadata_only"
      ? "Metadata only — no verified notes exist for this paper yet."
      : status === "secondary_summary_only"
        ? "These notes are derived from a secondary source, not the original paper. Verify claims and numbers against the primary source before citing them."
        : "The primary paper has been opened, but its claims have not been fully verified yet.";

  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
    >
      <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
      <div>
        <p>{message}</p>
        {noteSource ? <p className="mt-0.5 text-xs opacity-80">Note source: {noteSource}</p> : null}
      </div>
    </div>
  );
}
