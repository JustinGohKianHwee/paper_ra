"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AiBadge } from "@/components/ai-badge";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { NoteAuthorship } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type SaveAction = (
  bodyMd: string
) => Promise<{ ok: boolean; error?: string; savedAt?: string }>;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

interface Props {
  heading: string;
  hint?: string;
  initialValue: string;
  lastEditedAt?: string | null;
  saveAction: SaveAction;
  /** Collapse empty sections behind a "add" affordance. */
  collapsible?: boolean;
  placeholder?: string;
  headingId?: string;
  /** AI provenance of the current content; editing AI content marks it edited. */
  authorship?: NoteAuthorship;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Independently editable Markdown section with Edit/Preview tabs, debounced
 * autosave, Ctrl/Cmd+S, an unsaved-changes guard, and a save-state indicator.
 */
export function SectionEditor({
  heading,
  hint,
  initialValue,
  lastEditedAt,
  saveAction,
  collapsible = false,
  placeholder,
  headingId,
  authorship = "human",
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [liveAuthorship, setLiveAuthorship] = useState<NoteAuthorship>(authorship);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(lastEditedAt ?? null);
  const [editing, setEditing] = useState(!collapsible || initialValue.trim().length > 0);
  const [tab, setTab] = useState<string>("edit");

  // Refs mirror state for use inside callbacks/listeners (never read in render).
  const valueRef = useRef(initialValue);
  const savedValueRef = useRef(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const doSave = useCallback(async () => {
    if (savingRef.current) return;
    const toSave = valueRef.current;
    if (toSave === savedValueRef.current) {
      setState((s) => (s === "dirty" ? "saved" : s));
      return;
    }
    savingRef.current = true;
    setState("saving");
    setError(null);
    try {
      const result = await saveAction(toSave);
      if (result.ok) {
        savedValueRef.current = toSave;
        setSavedValue(toSave);
        setSavedAt(result.savedAt ?? new Date().toISOString());
        // Mirror the server-side provenance transition (ai → ai_edited).
        if (toSave !== initialValue) {
          setLiveAuthorship((a) => (a === "ai" ? "ai_edited" : a));
        }
        // Content may have changed while saving.
        setState(valueRef.current === toSave ? "saved" : "dirty");
      } else {
        setState("error");
        setError(result.error ?? "Save failed");
      }
    } catch {
      setState("error");
      setError("Save failed — check your connection and try again.");
    } finally {
      savingRef.current = false;
    }
  }, [saveAction, initialValue]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void doSave(), AUTOSAVE_DELAY_MS);
  }, [doSave]);

  const onChange = useCallback(
    (next: string) => {
      valueRef.current = next;
      setValue(next);
      setState("dirty");
      scheduleSave();
    },
    [scheduleSave]
  );

  // Retry loop for failed saves; unsaved-changes guard.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (valueRef.current !== savedValueRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        void doSave();
      }
    },
    [doSave]
  );

  const dirty = value !== savedValue;

  const statusLabel =
    state === "saving"
      ? "Saving…"
      : state === "error"
        ? "Save failed"
        : dirty
          ? "Unsaved changes"
          : state === "saved"
            ? "Saved"
            : savedAt
              ? `Last edited ${formatTimestamp(savedAt)}`
              : null;

  if (!editing) {
    return (
      <section className="group">
        <div className="flex items-baseline gap-3">
          <h2 id={headingId} className="text-sm font-semibold tracking-tight">
            {heading}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            + Add
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-2">
          <h2 id={headingId} className="text-sm font-semibold tracking-tight">
            {heading}
          </h2>
          <AiBadge authorship={liveAuthorship} />
        </span>
        <span
          role="status"
          // Locale-formatted timestamp can differ between server and client.
          suppressHydrationWarning
          className={cn(
            "text-[11px]",
            state === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-1.5 gap-1.5">
        <TabsList className="h-7 p-0.5">
          <TabsTrigger value="edit" className="h-6 px-2.5 text-xs">
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="h-6 px-2.5 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              void doSave();
            }}
            placeholder={placeholder ?? hint}
            aria-label={heading}
            spellCheck={false}
            className="min-h-24 font-mono text-[13px] leading-relaxed field-sizing-content max-h-[36rem]"
          />
          {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
          {error ? (
            <div className="mt-1 flex items-center gap-2">
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => void doSave()}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="preview">
          {value.trim() ? (
            <MarkdownView markdown={value} className="rounded-md border px-3 py-2" />
          ) : (
            <p className="text-sm text-muted-foreground italic px-1 py-2">Nothing to preview.</p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
