/**
 * Slugs are stored decoded (Unicode). WordPress used percent-encoded Malayalam slugs, which
 * decode to the same string, so legacy URLs keep resolving.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .trim()
    // Zero-width (non-)joiners shape Malayalam conjuncts; in a slug they would become mid-word hyphens.
    .replace(/[‌‍]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Decodes a URL segment; returns the input unchanged if it is not valid percent-encoding. */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).normalize("NFC");
  } catch {
    return segment;
  }
}

/** Builds a URL path from slugs, percent-encoding each segment and adding the trailing slash. */
export function pathFor(...segments: string[]): string {
  const parts = segments.filter(Boolean).map((s) => encodeURIComponent(s));
  return parts.length ? `/${parts.join("/")}/` : "/";
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 120 && slugify(slug) === slug;
}
