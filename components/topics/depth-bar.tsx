import type { DepthSummary } from "@/lib/topics/depth";
import { cn } from "@/lib/utils";

/**
 * Stacked reading-depth bar for a topic. Colour is never the only signal —
 * the counts are spelled out next to it and in the accessible label.
 */
export function DepthBar({
  summary,
  showCounts = true,
  className,
}: {
  summary: DepthSummary;
  showCounts?: boolean;
  className?: string;
}) {
  const { deep, surface, unread, total } = summary;
  const label = `${deep} read deeply, ${surface} surface knowledge, ${unread} not read`;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        role="img"
        aria-label={label}
        title={label}
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {deep > 0 ? (
          <span className="bg-emerald-500/80" style={{ width: pct(deep) }} aria-hidden />
        ) : null}
        {surface > 0 ? (
          <span className="bg-amber-500/70" style={{ width: pct(surface) }} aria-hidden />
        ) : null}
      </div>
      {showCounts ? (
        <p className="text-[11px] text-muted-foreground">
          {deep} deep · {surface} surface · {unread} unread
        </p>
      ) : null}
    </div>
  );
}
