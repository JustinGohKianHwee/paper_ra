/**
 * Slug helpers. Slugs are generated once at creation time and are stable —
 * renaming an entity must not regenerate its slug (URLs are permanent).
 */

const MAX_SLUG_LENGTH = 80;

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || "untitled";
}

/**
 * Returns `base` if free, otherwise base-2, base-3, … against the set of
 * already-taken slugs.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}
