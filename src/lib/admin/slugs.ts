import "server-only";
import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/db/client";
import { pages, posts } from "@/db/schema";
import { slugify } from "@/lib/slug";

/** Top-level paths owned by routes; a page or post may not take them. */
const RESERVED = new Set([
  "admin", "media", "category", "tag", "search", "feed", "leadership", "image-gallery", "image-category",
  "video-gallery", "downloads", "sitemap.xml", "robots.txt", "wp-content", "wp-admin", "ml", "blog", "_next",
]);

/**
 * Pages and posts share the root URL space (/<slug>/), as they did in WordPress, so a slug
 * must be unique across both tables.
 */
export async function rootSlugError(db: Db, slug: string, self: { table: "posts" | "pages"; id?: number }): Promise<string | null> {
  if (!slug) return "Slug is required";
  if (RESERVED.has(slug)) return `"${slug}" is used by the site itself; choose another slug`;
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(self.table === "posts" && self.id ? and(eq(posts.slug, slug), ne(posts.id, self.id)) : eq(posts.slug, slug))
    .limit(1);
  if (post) return "A post already uses this slug";
  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(self.table === "pages" && self.id ? and(eq(pages.slug, slug), ne(pages.id, self.id)) : eq(pages.slug, slug))
    .limit(1);
  if (page) return "A page already uses this slug";
  return null;
}

export function slugOrTitle(slug: string, title: string): string {
  return slug || slugify(title);
}
