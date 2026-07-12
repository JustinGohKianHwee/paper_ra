"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Badge wrapped in an accessible tooltip explaining what a status means.
 * Deliberately a client component taking plain props: passing a
 * server-rendered element into Radix's `asChild` Slot across the RSC boundary
 * intermittently fails to slot (Primitive.button error) — building the whole
 * trigger client-side avoids that entirely.
 */
export function ExplainedBadge({
  label,
  description,
  className,
  warnIcon = false,
}: {
  label: string;
  description: string;
  className?: string;
  warnIcon?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          tabIndex={0}
          className={cn("cursor-help font-normal gap-1", className)}
          aria-description={description}
        >
          {warnIcon ? <AlertTriangle className="size-3" aria-hidden /> : null}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-pretty">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
