"use server";

import { z } from "zod";
import { parsePaperInput, resolveMetadata, type ResolvedMetadata } from "@/lib/ai/resolve";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { newPaperSectionRows } from "@/lib/templates/paper";

export interface SmartResolveResult {
  ok: boolean;
  error?: string;
  inputKind?: string;
  metadata?: ResolvedMetadata | null;
}

/** Step 1 of smart add: classify the input and fetch public metadata. */
export async function resolveSmartInput(raw: string): Promise<SmartResolveResult> {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return { ok: false, error: "Enter a URL, DOI, arXiv ID, or title." };
  if (trimmed.length > 500) return { ok: false, error: "Input too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const input = parsePaperInput(trimmed);
  try {
    const metadata = await resolveMetadata(input);
    return { ok: true, inputKind: input.kind, metadata };
  } catch (error) {
    // Resolution failure is not fatal — the user can still add manually.
    return {
      ok: true,
      inputKind: input.kind,
      metadata: null,
      error: error instanceof Error ? error.message : "Lookup failed",
    };
  }
}

const smartCreateSchema = z.object({
  raw_input: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(300),
  authors: z.array(z.string().trim().min(1).max(200)).default([]),
  abstract: z.string().max(20000).optional().nullable(),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  venue: z.string().trim().max(200).optional().nullable(),
  arxiv_id: z.string().trim().max(50).optional().nullable(),
  doi: z.string().trim().max(100).optional().nullable(),
  canonical_url: z.string().trim().url().max(500).optional().nullable(),
  pdf_url: z.string().trim().url().max(500).optional().nullable(),
  /** storage path of an uploaded PDF ("<uid>/uploads/…"), if any */
  storage_path: z.string().trim().max(500).optional().nullable(),
});

export interface SmartCreateResult {
  ok: boolean;
  error?: string;
  paperId?: string;
  slug?: string;
}

/**
 * Step 2 of smart add: create the paper with the full structured template and
 * honest statuses. AI processing is kicked off separately from the paper page
 * so its progress is visible (and resumable) there.
 */
export async function createSmartPaper(input: unknown): Promise<SmartCreateResult> {
  const parsed = smartCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { raw_input, storage_path, ...fields } = parsed.data;

  if (storage_path && !storage_path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Invalid attachment path" };
  }

  const base = slugify(fields.title);
  const { data: existing } = await supabase.from("papers").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((existing ?? []).map((r) => r.slug)));

  const { data: paper, error } = await supabase
    .from("papers")
    .insert({
      ...fields,
      user_id: user.id,
      slug,
      reading_status: "to_read",
      verification_status: "metadata_only",
      priority: 3,
      source_input: storage_path ? `storage:${storage_path}` : raw_input,
      processing_status: "queued",
    })
    .select("id, slug")
    .single();
  if (error || !paper) return { ok: false, error: error?.message ?? "Failed to create paper" };

  const sections = newPaperSectionRows().map((s) => ({
    ...s,
    user_id: user.id,
    paper_id: paper.id,
  }));
  const { error: notesError } = await supabase.from("paper_notes").insert(sections);
  if (notesError) {
    return { ok: false, error: `Paper created but sections failed: ${notesError.message}` };
  }

  return { ok: true, paperId: paper.id, slug: paper.slug };
}
