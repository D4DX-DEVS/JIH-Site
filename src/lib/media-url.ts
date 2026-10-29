import type { MediaVariant } from "@/db/schema";

/**
 * Public URL for an R2 object key. Defaults to the /media route served by this app; set
 * NEXT_PUBLIC_MEDIA_BASE_URL to an R2 custom domain to serve media directly from R2.
 */
export function mediaUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "") ?? "/media";
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export interface MediaRef {
  r2Key: string;
  width: number | null;
  height: number | null;
  altText: string;
  variants: MediaVariant[];
}

/** `srcset` from stored size variants plus the original. */
export function srcSetFor(media: MediaRef): string | undefined {
  const candidates = [...media.variants];
  if (media.width) candidates.push({ width: media.width, height: media.height ?? 0, key: media.r2Key });
  const unique = new Map(candidates.map((c) => [c.width, c]));
  if (unique.size < 2) return undefined;
  return [...unique.values()]
    .sort((a, b) => a.width - b.width)
    .map((c) => `${mediaUrl(c.key)} ${c.width}w`)
    .join(", ");
}

/** Smallest variant at least `minWidth` wide (falls back to the original). */
export function pickVariant(media: MediaRef, minWidth: number): string {
  const fit = [...media.variants].sort((a, b) => a.width - b.width).find((v) => v.width >= minWidth);
  return mediaUrl(fit?.key ?? media.r2Key);
}
