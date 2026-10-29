import "server-only";
import { and, eq, lte } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { categories, galleries, galleryCategories, leaders, pages, posts, videos } from "@/db/schema";
import { routes } from "@/lib/routes";

export interface SitemapEntry {
  path: string;
  lastModified?: string;
  priority?: number;
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  cacheTag("posts", "pages", "leaders", "galleries", "videos", "categories");
  cacheLife("hours");
  const db = await getDb();
  const now = new Date().toISOString();
  const [postRows, pageRows, leaderRows, galleryRows, videoRows, categoryRows, galleryCatRows] = await Promise.all([
    db.select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts).where(and(eq(posts.status, "published"), lte(posts.publishedAt, now))),
    db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.status, "published")),
    db.select({ slug: leaders.slug, updatedAt: leaders.updatedAt }).from(leaders).where(eq(leaders.status, "published")),
    db.select({ slug: galleries.slug, updatedAt: galleries.updatedAt }).from(galleries).where(eq(galleries.status, "published")),
    db.select({ slug: videos.slug, updatedAt: videos.updatedAt }).from(videos).where(eq(videos.status, "published")),
    db.select({ id: categories.id, slug: categories.slug, parentId: categories.parentId }).from(categories),
    db.select({ slug: galleryCategories.slug }).from(galleryCategories),
  ]);
  const catById = new Map(categoryRows.map((c) => [c.id, c]));
  return [
    { path: "/", priority: 1 },
    ...pageRows.map((p) => ({ path: routes.page(p.slug), lastModified: p.updatedAt, priority: 0.8 })),
    ...postRows.map((p) => ({ path: routes.post(p.slug), lastModified: p.updatedAt, priority: 0.7 })),
    ...categoryRows.map((c) => {
      const parent = c.parentId ? catById.get(c.parentId) : undefined;
      return { path: routes.category(parent ? [parent.slug, c.slug] : [c.slug]), priority: 0.4 };
    }),
    ...leaderRows.map((l) => ({ path: routes.leader(l.slug), lastModified: l.updatedAt, priority: 0.5 })),
    { path: "/image-gallery/", priority: 0.6 },
    ...galleryCatRows.map((g) => ({ path: routes.galleryCategory(g.slug), priority: 0.4 })),
    ...galleryRows.map((g) => ({ path: routes.gallery(g.slug), lastModified: g.updatedAt, priority: 0.5 })),
    { path: "/video-gallery/", priority: 0.6 },
    ...videoRows.map((v) => ({ path: routes.video(v.slug), lastModified: v.updatedAt, priority: 0.5 })),
    { path: "/downloads/", priority: 0.4 },
  ];
}
