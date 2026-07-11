import type { SynthesisKind } from "@/lib/validation/enums";

/** Template bodies for weekly / monthly synthesis notes. */
export function synthesisTemplate(kind: SynthesisKind): string {
  const scope = kind === "weekly" ? "this week" : "this month";
  return [
    `# What did I learn ${scope}?`,
    "",
    "# Which ideas connect across papers?",
    "",
    "# What changed in my mental model?",
    "",
    "# What would I change in a real system based on this?",
    "",
    "# What should stay classical?",
    "",
    "# What can move offline or nearline?",
    "",
    "# What requires online validation?",
    "",
    "# What assumptions remain untested?",
    "",
    "# What should I read next?",
    "",
  ].join("\n");
}

/** Monday of the ISO week containing `d` (weekly) or first of month (monthly). */
export function periodStartFor(kind: SynthesisKind, d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  if (kind === "monthly") {
    date.setUTCDate(1);
  } else {
    const day = date.getUTCDay(); // 0 = Sunday
    const diff = day === 0 ? 6 : day - 1;
    date.setUTCDate(date.getUTCDate() - diff);
  }
  return date.toISOString().slice(0, 10);
}

export function defaultSynthesisTitle(kind: SynthesisKind, periodStart: string): string {
  return kind === "weekly"
    ? `Week of ${periodStart}`
    : `Monthly synthesis — ${periodStart.slice(0, 7)}`;
}
