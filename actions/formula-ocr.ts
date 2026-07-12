"use server";

import { z } from "zod";
import type { ActionResult } from "@/actions/papers";
import { aiEnabled, getOpenAI } from "@/lib/ai/client";

const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
const FORMULA_OCR_MODEL = process.env.FORMULA_OCR_MODEL || "gpt-5.4-nano";

const formulaOcrSchema = z.object({
  image_data_url: z
    .string()
    .trim()
    .min(128, "Add a screenshot or image first.")
    .max(MAX_IMAGE_DATA_URL_LENGTH, "Image is too large. Crop closer to the equation."),
});

const formulaOcrResultSchema = z.object({
  latex: z.string().trim().min(1).max(20000),
  display_md: z.string().trim().min(1).max(22000),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string().trim().max(300)).max(5),
});

export type FormulaOcrResult = z.infer<typeof formulaOcrResultSchema>;
export type FormulaOcrActionResult = ActionResult & { result?: FormulaOcrResult };

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["latex", "display_md", "confidence", "warnings"],
  properties: {
    latex: {
      type: "string",
      description:
        "KaTeX-compatible LaTeX only, without surrounding $ or $$ delimiters. Use aligned/array when needed.",
    },
    display_md: {
      type: "string",
      description: "Markdown display math using $$ delimiters around the LaTeX.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    warnings: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
  },
} as const;

function isSupportedImageDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);
}

/**
 * Converts a user-provided equation screenshot to KaTeX-friendly LaTeX.
 * The image is not stored by Research Atlas; it is sent once to OpenAI.
 */
export async function recognizeFormula(input: unknown): Promise<FormulaOcrActionResult> {
  const parsed = formulaOcrSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid image" };
  }
  if (!isSupportedImageDataUrl(parsed.data.image_data_url)) {
    return { ok: false, error: "Use a PNG, JPG, or WebP screenshot." };
  }
  if (!aiEnabled()) {
    return { ok: false, error: "Formula OCR is not configured (OPENAI_API_KEY missing)." };
  }

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: FORMULA_OCR_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous equation OCR tool for a research notebook. Transcribe the visible formula into KaTeX-compatible LaTeX. Do not solve, simplify, explain, or invent missing symbols. Preserve indices, superscripts, operators, Greek letters, brackets, alignment, and line breaks. Prefer standard KaTeX commands. If uncertain, include a short warning.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Return only the structured fields. The latex field must omit math delimiters. The display_md field must be exactly the same math wrapped for Markdown display math.",
            },
            {
              type: "image_url",
              image_url: {
                url: parsed.data.image_data_url,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "formula_ocr",
          strict: true,
          schema: responseSchema,
        },
      },
      max_completion_tokens: 900,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { ok: false, error: "The OCR model returned an empty response." };

    const result = formulaOcrResultSchema.parse(JSON.parse(content));
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Formula OCR failed",
    };
  }
}
