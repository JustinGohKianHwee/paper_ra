"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SaveResult } from "@/actions/notes";

const EDITABLE_FIELDS = ["overview_md", "synthesis_md", "knowledge_gaps_md"] as const;
export type TopicField = (typeof EDITABLE_FIELDS)[number];

/** Autosave target for a topic Markdown field (bound per field on the page). */
export async function saveTopicField(
  topicId: string,
  field: TopicField,
  bodyMd: string
): Promise<SaveResult> {
  if (!EDITABLE_FIELDS.includes(field)) {
    return { ok: false, error: "Unknown field" };
  }
  if (bodyMd.length > 100000) {
    return { ok: false, error: "Content too long" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated — sign in again" };

  const { data, error } = await supabase
    .from("topics")
    .update({ [field]: bodyMd } as { [K in TopicField]?: string })
    .eq("id", topicId)
    .select("updated_at, slug")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/topics/${data.slug}`);
  revalidatePath("/dashboard");
  return { ok: true, savedAt: data.updated_at };
}
