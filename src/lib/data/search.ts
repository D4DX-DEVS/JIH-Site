import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { pages, posts, redirects } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { contentLocale, inLocale, ownText } from "@/lib/i18n/content";
import { likePattern, paginate, type Paginated } from "@/lib/pagination";

export interface SearchHit {
  type: "post" | "page";
  slug: string;
  lang: Locale;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}

interface SearchRow {
  type: "post" | "page";
  slug: string;
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  publishedAt: string | null;
}

/** Searches published posts and pages together, newest first. search_text holds both languages. */
export async function searchSite(q: string, page: number, pageSize: number, locale: Locale): Promise<Paginated<SearchHit>> {
  "use cache";
  cacheTag("posts", "pages");
  cacheLife("minutes");
  const db = await getDb();
  const pattern = likePattern(q);
  const union = sql`
    select 'post' as type, slug, title, title_en as titleEn, excerpt, excerpt_en as excerptEn, published_at as publishedAt from ${posts}
      where status = 'published' and search_text like ${pattern} escape '\\'
    union all
    select 'page' as type, slug, title, title_en as titleEn, summary as excerpt, summary_en as excerptEn, published_at as publishedAt from ${pages}
      where status = 'published' and search_text like ${pattern} escape '\\'`;
  const [rows, [{ total }]] = await Promise.all([
    db.all<SearchRow>(sql`select * from (${union}) order by publishedAt desc limit ${pageSize} offset ${(page - 1) * pageSize}`),
    db.all<{ total: number }>(sql`select count(*) as total from (${union})`),
  ]);
  const hits = rows.map(({ titleEn, excerptEn, ...r }): SearchHit => {
    const lang = contentLocale(locale, r.title, titleEn);
    return { ...r, lang, title: inLocale(lang, r.title, titleEn), excerpt: ownText(lang, r.excerpt, excerptEn) };
  });
  return paginate(hits, total, page, pageSize);
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
