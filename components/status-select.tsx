"use client";

import { CheckIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import {
  READING_STATUS_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  type StatusInfo,
} from "@/lib/statuses";

/**
 * Select options for the two status enums, each with its central explanation
 * (from `lib/statuses.ts`) underneath so the form teaches what the status
 * actually claims. Only the label goes into ItemText (and thus the trigger);
 * the description renders below it inside the dropdown.
 */
function StatusSelectItem({ info }: { info: StatusInfo }) {
  return (
    <SelectPrimitive.Item
      value={info.value}
      textValue={info.label}
      className="relative flex w-full cursor-default flex-col items-start gap-0.5 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
    >
      <span className="pointer-events-none absolute top-2 right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{info.label}</SelectPrimitive.ItemText>
      <span className="max-w-72 text-[11px] leading-snug whitespace-normal text-muted-foreground">
        {info.description}
      </span>
    </SelectPrimitive.Item>
  );
}

export function ReadingStatusItems() {
  return (
    <>
      {READING_STATUS_OPTIONS.map((s) => (
        <StatusSelectItem key={s.value} info={s} />
      ))}
    </>
  );
}

export function VerificationStatusItems() {
  return (
    <>
      {VERIFICATION_STATUS_OPTIONS.map((s) => (
        <StatusSelectItem key={s.value} info={s} />
      ))}
    </>
  );
}
