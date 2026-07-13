/**
 * PDF text extraction can emit NUL/control characters that PostgREST serializes
 * as unsupported JSON Unicode escapes. Keep readable whitespace, but strip the
 * characters Postgres cannot accept through the JSON API.
 */
export function sanitizeExtractedPageText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
}
