import "server-only";
import { and, desc, eq, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb, type Db } from "@/db/client";
import { categories, postCategories, posts, postTags, tags } from "@/db/schema";
import { sanitizeRichText } from "@/lib/content/sanitize";
import type { Locale } from "@/lib/i18n/config";
import { contentLocale, decidingText, inLocale, localizeHtmlLinks, ownText, pickText } from "@/lib/i18n/content";
import { likePattern, paginate, type Paginated } from "@/lib/pagination";
import { withMedia, type PublicMedia } from "./media";

export interface CategoryRef {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
}

export interface PostSummary {
  id: number;
  slug: string;
  /** Language of the title and excerpt: the reader's, or the other one when the post has none in theirs. */
  lang: Locale;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  featuredMedia: PublicMedia | null;
  categories: CategoryRef[];
}

export interface PostDetail extends PostSummary {
  /** Here the language of the whole article, decided by its body. */
  lang: Locale;
  contentHtml: string;
  authorName: string;
  updatedAt: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: PublicMedia | null;
  tags: Array<{ slug: string; name: string }>;
}

const summaryColumns = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  titleEn: posts.titleEn,
  excerpt: posts.excerpt,
  excerptEn: posts.excerptEn,
  publishedAt: posts.publishedAt,
  featuredMediaId: posts.featuredMediaId,
};

const published = () => and(eq(posts.status, "published"), lte(posts.publishedAt, new Date().toISOString()));

async function categoriesFor(db: Db, postIds: number[], locale: Locale): Promise<Map<number, CategoryRef[]>> {
  const out = new Map<number, CategoryRef[]>();
  if (!postIds.length) return out;
  const rows = await db
    .select({ postId: postCategories.postId, id: categories.id, slug: categories.slug, name: categories.name, nameEn: categories.nameEn, parentId: categories.parentId })
    .from(postCategories)
    .innerJoin(categories, eq(categories.id, postCategories.categoryId))
    .where(inArray(postCategories.postId, postIds.slice(0, 90)));
  for (const { postId, name, nameEn, ...c } of rows) out.set(postId, [...(out.get(postId) ?? []), { ...c, name: pickText(locale, name, nameEn) }]);
  return out;
}

interface SummaryRow {
  id: number;
  slug: string;
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  publishedAt: string | null;
  featuredMediaId: number | null;
}

async function toSummaries(db: Db, rows: SummaryRow[], locale: Locale): Promise<PostSummary[]> {
  const [withImages, cats] = await Promise.all([withMedia(db, rows, "featuredMediaId", "featuredMedia"), categoriesFor(db, rows.map((r) => r.id), locale)]);
  return withImages.map((r) => {
    const lang = contentLocale(locale, r.title, r.titleEn);
    return {
      id: r.id,
      slug: r.slug,
      lang,
      title: inLocale(lang, r.title, r.titleEn),
      excerpt: ownText(lang, r.excerpt, r.excerptEn),
      publishedAt: r.publishedAt,
      featuredMedia: r.featuredMedia,
      categories: cats.get(r.id) ?? [],
    };
  });
}

export interface PostFilters {
  page: number;
  pageSize: number;
  q?: string;
  categoryIds?: number[];
  tagId?: number;
}

export async function listPosts(filters: PostFilters, locale: Locale): Promise<Paginated<PostSummary>> {
  "use cache";
  cacheTag("posts");
  cacheLife("minutes");
  const db = await getDb();
  const where: SQL[] = [published()!];
  if (filters.q) where.push(sql`${posts.searchText} LIKE ${likePattern(filters.q)} ESCAPE '\\'`);
  if (filters.categoryIds?.length) {
    where.push(inArray(posts.id, db.select({ id: postCategories.postId }).from(postCategories).where(inArray(postCategories.categoryId, filters.categoryIds))));
  }
  if (filters.tagId) {
    where.push(inArray(posts.id, db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, filters.tagId))));
  }
  const condition = and(...where);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(summaryColumns)
      .from(posts)
      .where(condition)
      .orderBy(desc(posts.publishedAt), desc(posts.id))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(posts).where(condition),
  ]);
  return paginate(await toSummaries(db, rows, locale), total, filters.page, filters.pageSize);
}

export async function getPostBySlug(slug: string, locale: Locale): Promise<PostDetail | null> {
  "use cache";
  cacheTag("posts", `post:${slug}`);
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db.select().from(posts).where(and(eq(posts.slug, slug), published())).limit(1);
  if (!row) return null;
  const [summary] = await toSummaries(db, [row], locale);
  const [og] = await withMedia(db, [row], "ogImageId", "ogImage");
  const postTagRows = await db
    .select({ slug: tags.slug, name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(tags.id, postTags.tagId))
    .where(eq(postTags.postId, row.id));
  // The article is read as a whole, so its language follows the body rather than the title.
  const deciding = decidingText({ ml: row.contentHtml, en: row.contentHtmlEn }, { ml: row.title, en: row.titleEn });
  const lang = contentLocale(locale, deciding.ml, deciding.en);
  return {
    ...summary,
    lang,
    title: inLocale(lang, row.title, row.titleEn),
    excerpt: ownText(lang, row.excerpt, row.excerptEn),
    contentHtml: localizeHtmlLinks(sanitizeRichText(inLocale(lang, row.contentHtml, row.contentHtmlEn)), locale),
    authorName: row.authorName,
    updatedAt: row.updatedAt,
    // SEO text belongs to one language; the other language's would not match the title shown.
    seoTitle: lang === "en" ? row.seoTitleEn : row.seoTitle,
    seoDescription: lang === "en" ? row.seoDescriptionEn : row.seoDescription,
    ogImage: og.ogImage,
    tags: postTagRows,
  };
}

/** Latest posts sharing a category with the given post. */
export async function getRelatedPosts(postId: number, categoryIds: number[], locale: Locale, limit = 3): Promise<PostSummary[]> {
  "use cache";
  cacheTag("posts");
  cacheLife("minutes");
  const db = await getDb();
  const where = [published()!, ne(posts.id, postId)];
  if (categoryIds.length) {
    where.push(inArray(posts.id, db.select({ id: postCategories.postId }).from(postCategories).where(inArray(postCategories.categoryId, categoryIds))));
  }
  const rows = await db.select(summaryColumns).from(posts).where(and(...where)).orderBy(desc(posts.publishedAt)).limit(limit);
  return toSummaries(db, rows, locale);
}

export async function listCategories(locale: Locale): Promise<Array<CategoryRef & { postCount: number }>> {
  "use cache";
  cacheTag("categories", "posts");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      nameEn: categories.nameEn,
      parentId: categories.parentId,
      // Qualified by hand: in a single-table select Drizzle renders ${categories.id} as a bare "id", which the subquery would bind to posts.id.
      postCount: sql<number>`(select count(*) from ${postCategories} pc join ${posts} p on p.id = pc.post_id where pc.category_id = "categories"."id" and p.status = 'published')`,
    })
    .from(categories)
    .orderBy(categories.sortOrder);
  return rows.map(({ name, nameEn, ...c }) => ({ ...c, name: pickText(locale, name, nameEn) }));
}

export async function getTagBySlug(slug: string): Promise<{ id: number; slug: string; name: string } | null> {
  "use cache";
  cacheTag("categories");
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db.select({ id: tags.id, slug: tags.slug, name: tags.name }).from(tags).where(eq(tags.slug, slug)).limit(1);
  return row ?? null;
}
