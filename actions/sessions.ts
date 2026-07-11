"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/actions/papers";
import type { ReadingStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export interface SessionInfo {
  id: string;
  paper_id: string;
  started_at: string;
}

/**
 * Starts a reading session for a paper, or returns the already-active one.
 * The DB enforces a single active session per user; if one is open for a
 * different paper it is auto-ended first (its time still counts).
 */
export async function startSession(
  paperId: string
): Promise<ActionResult & { session?: SessionInfo }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: active } = await supabase
    .from("reading_sessions")
    .select("id, paper_id, started_at")
    .is("ended_at", null)
    .maybeSingle();

  if (active) {
    if (active.paper_id === paperId) {
      return { ok: true, session: active as SessionInfo };
    }
    // Close the stale session on the other paper before starting a new one.
    await endSessionRecord(supabase, active.id, active.started_at, {});
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("reading_sessions")
    .insert({ user_id: user.id, paper_id: paperId, started_at: now })
    .select("id, paper_id, started_at")
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("papers").update({ last_read_at: now }).eq("id", paperId);
  revalidatePath("/dashboard");
  return { ok: true, session: data as SessionInfo };
}

const endSessionSchema = z.object({
  session_id: z.string().uuid(),
  takeaway_md: z.string().trim().max(20000).optional().nullable(),
  continue_md: z.string().trim().max(20000).optional().nullable(),
  reading_status: z
    .enum([
      "to_read",
      "queued",
      "skimmed",
      "studied_through_guide",
      "deep_read",
      "implemented",
      "revisit",
    ])
    .optional()
    .nullable(),
});

export async function endSession(input: unknown): Promise<ActionResult & { minutes?: number }> {
  const parsed = endSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: session, error } = await supabase
    .from("reading_sessions")
    .select("id, paper_id, started_at, ended_at")
    .eq("id", parsed.data.session_id)
    .maybeSingle();
  if (error || !session) return { ok: false, error: error?.message ?? "Session not found" };
  if (session.ended_at) return { ok: false, error: "Session already ended" };

  const minutes = await endSessionRecord(supabase, session.id, session.started_at, {
    takeaway_md: parsed.data.takeaway_md ?? null,
    continue_md: parsed.data.continue_md ?? null,
  });

  if (parsed.data.reading_status) {
    await supabase
      .from("papers")
      .update({
        reading_status: parsed.data.reading_status as ReadingStatus,
        last_read_at: new Date().toISOString(),
      })
      .eq("id", session.paper_id);
  }

  revalidatePath("/dashboard");
  return { ok: true, minutes };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function endSessionRecord(
  supabase: SupabaseServer,
  sessionId: string,
  startedAt: string | null,
  extra: { takeaway_md?: string | null; continue_md?: string | null }
): Promise<number> {
  const now = new Date();
  const started = startedAt ? new Date(startedAt) : now;
  const minutes = Math.max(1, Math.round((now.getTime() - started.getTime()) / 60000));
  await supabase
    .from("reading_sessions")
    .update({
      ended_at: now.toISOString(),
      minutes,
      occurred_on: now.toISOString().slice(0, 10),
      ...extra,
    })
    .eq("id", sessionId);
  return minutes;
}

/** The caller's active session, if any (for dashboard + reading mode). */
export async function getActiveSession(): Promise<SessionInfo | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reading_sessions")
    .select("id, paper_id, started_at")
    .is("ended_at", null)
    .maybeSingle();
  return (data as SessionInfo | null) ?? null;
}
