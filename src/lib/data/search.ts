import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { pages, posts, redirects } from "@/db/schema";
import { likePattern, paginate, type Paginated } from "@/lib/pagination";

export interface SearchHit {
  type: "post" | "page";
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}

/** Searches published posts and pages together, newest first. */
export async function searchSite(q: string, page: number, pageSize: number): Promise<Paginated<SearchHit>> {
  "use cache";
  cacheTag("posts", "pages");
  cacheLife("minutes");
  const db = await getDb();
  const pattern = likePattern(q);
  const union = sql`
    select 'post' as type, slug, title, excerpt, published_at as publishedAt from ${posts}
      where status = 'published' and search_text like ${pattern} escape '\\'
    union all
    select 'page' as type, slug, title, summary as excerpt, published_at as publishedAt from ${pages}
      where status = 'published' and search_text like ${pattern} escape '\\'`;
  const [rows, [{ total }]] = await Promise.all([
    db.all<SearchHit>(sql`select * from (${union}) order by publishedAt desc limit ${pageSize} offset ${(page - 1) * pageSize}`),
    db.all<{ total: number }>(sql`select count(*) as total from (${union})`),
  ]);
  return paginate(rows, total, page, pageSize);
}

/** Admin-managed or migration redirects for paths that no longer exist. */
export async function findRedirect(path: string): Promise<{ toPath: string; statusCode: number } | null> {
  "use cache";
  cacheTag("redirects");
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db
    .select({ toPath: redirects.toPath, statusCode: redirects.statusCode })
    .from(redirects)
    .where(and(eq(redirects.fromPath, path)))
    .limit(1);
  return row ?? null;
}
