import "server-only";
import OpenAI from "openai";

/**
 * Server-only OpenAI access. The API key must never reach the browser: this
 * module imports "server-only" so any client-component import fails the build.
 *
 * Env:
 *  - OPENAI_API_KEY  (required for AI features; app works without it)
 *  - OPENAI_MODEL    (default below)
 *  - OPENAI_BASE_URL (optional; used by tests to point at a local mock)
 */

export const DEFAULT_MODEL = "gpt-5-mini";

/** Bump when prompts change materially — recorded on processing_runs. */
export const PROMPT_VERSION = "2026-07-11.1";

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function aiModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI features are not configured. Set OPENAI_API_KEY in .env.local (see .env.example) and restart the server."
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    maxRetries: 0, // the pipeline handles retries so attempts are auditable
  });
}

export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  calls: number;
}

export function addUsage(
  totals: UsageTotals,
  usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined
): UsageTotals {
  return {
    input_tokens: totals.input_tokens + (usage?.prompt_tokens ?? 0),
    output_tokens: totals.output_tokens + (usage?.completion_tokens ?? 0),
    calls: totals.calls + 1,
  };
}

export const EMPTY_USAGE: UsageTotals = { input_tokens: 0, output_tokens: 0, calls: 0 };

/**
 * Chat call with JSON-schema structured output, retry/backoff on transient
 * failures, and usage accounting. `schemaName`/`schema` follow OpenAI's
 * response_format json_schema contract.
 */
export async function structuredCompletion<T>(options: {
  client: OpenAI;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  usage: UsageTotals;
  maxOutputTokens?: number;
}): Promise<{ data: T; usage: UsageTotals }> {
  const { client, system, user, schemaName, schema, maxOutputTokens } = options;
  let usage = options.usage;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: aiModel(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema },
        },
        max_completion_tokens: maxOutputTokens ?? 8000,
      });
      usage = addUsage(usage, response.usage);
      const choice = response.choices[0];
      const content = choice?.message?.content;
      if (!content) {
        const finishReason = choice?.finish_reason ?? "unknown";
        if (finishReason === "length") {
          throw new Error(
            "The model ran out of response budget before returning an answer. Try a narrower question or increase QA_MAX_OUTPUT_TOKENS."
          );
        }
        throw new Error(`The model returned an empty response (finish_reason: ${finishReason}).`);
      }
      return { data: JSON.parse(content) as T, usage };
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const retryable = status === undefined || status === 429 || status >= 500;
      if (!retryable || attempt === 3) break;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
