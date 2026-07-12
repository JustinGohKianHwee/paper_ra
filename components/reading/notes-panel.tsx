"use client";

import { ChevronRight } from "lucide-react";
import { saveSection } from "@/actions/notes";
import { AiBadge } from "@/components/ai-badge";
import { SectionEditor } from "@/components/section-editor";
import type { PaperNoteRow } from "@/lib/supabase/database.types";
import { hasRealContent } from "@/lib/papers/queries";
import { PAPER_SECTIONS, SECTION_GROUPS, type PaperSectionType } from "@/lib/templates/paper";
import { cn } from "@/lib/utils";

/**
 * Structured notes, editable without leaving the paper. All 24 sections are
 * here, grouped and collapsed; filled sections show a dot so you can see at a
 * glance what you've already written. The standalone /notes page remains for
 * full-width deep work.
 */
export function NotesPanel({ paperId, notes }: { paperId: string; notes: PaperNoteRow[] }) {
  const byType = new Map(notes.map((n) => [n.section_type as PaperSectionType, n]));
  const defs = new Map(PAPER_SECTIONS.map((s) => [s.type, s]));

  return (
    <div className="reading-pane space-y-3 pb-8">
      {SECTION_GROUPS.map((group) => (
        <section key={group.label}>
          <h3 className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <div className="space-y-1">
            {group.types.map((type) => {
              const def = defs.get(type);
              if (!def) return null;
              const note = byType.get(type);
              const filled = hasRealContent(note?.body_md);
              return (
                <details key={type} className="group rounded-md border bg-card">
                  <summary
                    className={cn(
                      "flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px]",
                      "hover:bg-accent/50 [&::-webkit-details-marker]:hidden"
                    )}
                  >
                    <ChevronRight
                      className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                      aria-hidden
                    />
                    <span className={cn("min-w-0 truncate", !filled && "text-muted-foreground")}>
                      {def.heading}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {note && note.authorship !== "human" ? (
                        <AiBadge authorship={note.authorship} />
                      ) : null}
                      {filled ? (
                        <span
                          className="size-1.5 rounded-full bg-foreground/60"
                          title="Has content"
                          aria-label="Has content"
                        />
                      ) : null}
                    </span>
                  </summary>
                  <div className="border-t px-2 py-2">
                    <SectionEditor
                      heading=""
                      hint={def.hint}
                      initialValue={note?.body_md ?? ""}
                      lastEditedAt={note?.updated_at}
                      saveAction={(body) => saveSection(paperId, type, body)}
                      authorship={note?.authorship ?? "human"}
                      placeholder={def.hint}
                      dense
                    />
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
