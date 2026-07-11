"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/actions/papers";
import { createClient } from "@/lib/supabase/server";
import { misconceptionCreateSchema, misconceptionUpdateSchema } from "@/lib/validation/schemas";

export async function createMisconception(input: unknown): Promise<ActionResult> {
  const parsed = misconceptionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("misconception_corrections")
    .insert({ ...parsed.data, user_id: user.id });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/misconceptions");
  revalidatePath("/dashboard");
  redirect("/misconceptions");
}

export async function updateMisconception(input: unknown): Promise<ActionResult> {
  const parsed = misconceptionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const { id, ...fields } = parsed.data;

  const { error } = await supabase.from("misconception_corrections").update(fields).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/misconceptions");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteMisconception(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("misconception_corrections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/misconceptions");
  return { ok: true };
}
