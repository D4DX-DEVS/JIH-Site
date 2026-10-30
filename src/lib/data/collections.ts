import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import {
  downloads, galleries, galleryCategories, galleryImages, leaders, media, posters, videos, type LeaderGroup,
} from "@/db/schema";
import { sanitizeRichText } from "@/lib/content/sanitize";
import type { Locale } from "@/lib/i18n/config";
import { contentLocale, decidingText, inLocale, localizeHtmlLinks, ownText, pickText } from "@/lib/i18n/content";
import { paginate, type Paginated } from "@/lib/pagination";
import { getMediaByIds, withMedia, type PublicMedia } from "./media";

export interface LeaderCard {
  id: number;
  slug: string;
  /** Language of the name and role. */
  lang: Locale;
  name: string;
  roleTitle: string;
  groupKey: LeaderGroup;
  photo: PublicMedia | null;
}

export interface LeaderDetail extends LeaderCard {
  /** Here the language of the profile, decided by the biography. */
  lang: Locale;
  bioHtml: string;
}

export async function listLeaders(locale: Locale): Promise<LeaderCard[]> {
  "use cache";
  cacheTag("leaders");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({
      id: leaders.id, slug: leaders.slug, name: leaders.name, nameEn: leaders.nameEn, roleTitle: leaders.roleTitle, roleTitleEn: leaders.roleTitleEn,
      groupKey: leaders.groupKey, photoMediaId: leaders.photoMediaId,
    })
    .from(leaders)
    .where(eq(leaders.status, "published"))
    .orderBy(asc(leaders.sortOrder), asc(leaders.name));
  return (await withMedia(db, rows, "photoMediaId", "photo")).map((r) => {
    const lang = contentLocale(locale, r.name, r.nameEn);
    return { id: r.id, slug: r.slug, lang, name: inLocale(lang, r.name, r.nameEn), roleTitle: inLocale(lang, r.roleTitle, r.roleTitleEn), groupKey: r.groupKey, photo: r.photo };
  });
}

export async function getLeaderBySlug(slug: string, locale: Locale): Promise<LeaderDetail | null> {
  "use cache";
  cacheTag("leaders");
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db.select().from(leaders).where(and(eq(leaders.slug, slug), eq(leaders.status, "published"))).limit(1);
  if (!row) return null;
  const [r] = await withMedia(db, [row], "photoMediaId", "photo");
  const deciding = decidingText({ ml: r.bioHtml, en: r.bioHtmlEn }, { ml: r.name, en: r.nameEn });
  const lang = contentLocale(locale, deciding.ml, deciding.en);
  return {
    id: r.id,
    slug: r.slug,
    lang,
    name: inLocale(lang, r.name, r.nameEn),
    roleTitle: inLocale(lang, r.roleTitle, r.roleTitleEn),
    groupKey: r.groupKey,
    bioHtml: localizeHtmlLinks(sanitizeRichText(inLocale(lang, r.bioHtml, r.bioHtmlEn)), locale),
    photo: r.photo,
  };
}

export interface GalleryCard {
  id: number;
  slug: string;
  lang: Locale;
  title: string;
  publishedAt: string | null;
  imageCount: number;
  category: { slug: string; name: string } | null;
  cover: PublicMedia | null;
}

export async function listGalleryCategories(locale: Locale): Promise<Array<{ id: number; slug: string; name: string }>> {
  "use cache";
  cacheTag("galleries");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ id: galleryCategories.id, slug: galleryCategories.slug, name: galleryCategories.name, nameEn: galleryCategories.nameEn })
    .from(galleryCategories)
    .orderBy(asc(galleryCategories.sortOrder));
  return rows.map(({ name, nameEn, ...c }) => ({ ...c, name: pickText(locale, name, nameEn) }));
}

export async function listGalleries(opts: { page: number; pageSize: number; categorySlug?: string }, locale: Locale): Promise<Paginated<GalleryCard>> {
  "use cache";
  cacheTag("galleries");
  cacheLife("minutes");
  const db = await getDb();
  const condition = and(eq(galleries.status, "published"), opts.categorySlug ? eq(galleryCategories.slug, opts.categorySlug) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: galleries.id,
        slug: galleries.slug,
        title: galleries.title,
        titleEn: galleries.titleEn,
        publishedAt: galleries.publishedAt,
        coverMediaId: galleries.coverMediaId,
        categorySlug: galleryCategories.slug,
        categoryName: galleryCategories.name,
        categoryNameEn: galleryCategories.nameEn,
        imageCount: sql<number>`(select count(*) from ${galleryImages} gi where gi.gallery_id = ${galleries.id})`,
      })
      .from(galleries)
      .leftJoin(galleryCategories, eq(galleryCategories.id, galleries.categoryId))
      .where(condition)
      .orderBy(desc(galleries.publishedAt), desc(galleries.id))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(galleries).leftJoin(galleryCategories, eq(galleryCategories.id, galleries.categoryId)).where(condition),
  ]);
  const withCovers = await withMedia(db, rows, "coverMediaId", "cover");
  return paginate(
    withCovers.map((r) => {
      const lang = contentLocale(locale, r.title, r.titleEn);
      return {
        id: r.id,
        slug: r.slug,
        lang,
        title: inLocale(lang, r.title, r.titleEn),
        publishedAt: r.publishedAt,
        imageCount: r.imageCount,
        category: r.categorySlug ? { slug: r.categorySlug, name: pickText(locale, r.categoryName, r.categoryNameEn) || r.categorySlug } : null,
        cover: r.cover,
      };
    }),
    total,
    opts.page,
    opts.pageSize,
  );
}

export async function getGalleryBySlug(slug: string, locale: Locale): Promise<(GalleryCard & { description: string; images: PublicMedia[] }) | null> {
  "use cache";
  cacheTag("galleries", `gallery:${slug}`);
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db
    .select({ gallery: galleries, categorySlug: galleryCategories.slug, categoryName: galleryCategories.name, categoryNameEn: galleryCategories.nameEn })
    .from(galleries)
    .leftJoin(galleryCategories, eq(galleryCategories.id, galleries.categoryId))
    .where(and(eq(galleries.slug, slug), eq(galleries.status, "published")))
    .limit(1);
  if (!row) return null;
  const imageRows = await db
    .select({ mediaId: galleryImages.mediaId })
    .from(galleryImages)
    .where(eq(galleryImages.galleryId, row.gallery.id))
    .orderBy(asc(galleryImages.sortOrder));
  const map = await getMediaByIds(db, [row.gallery.coverMediaId, ...imageRows.map((i) => i.mediaId)]);
  const images = imageRows.map((i) => map.get(i.mediaId)).filter((m): m is PublicMedia => !!m);
  const { gallery } = row;
  const lang = contentLocale(locale, gallery.title, gallery.titleEn);
  return {
    id: gallery.id,
    slug: gallery.slug,
    lang,
    title: inLocale(lang, gallery.title, gallery.titleEn),
    description: ownText(lang, gallery.description, gallery.descriptionEn),
    publishedAt: gallery.publishedAt,
    imageCount: images.length,
    category: row.categorySlug ? { slug: row.categorySlug, name: pickText(locale, row.categoryName, row.categoryNameEn) || row.categorySlug } : null,
    cover: map.get(gallery.coverMediaId ?? -1) ?? images[0] ?? null,
    images,
  };
}

export interface VideoItem {
  id: number;
  slug: string;
  lang: Locale;
  title: string;
  youtubeId: string;
  description: string;
  publishedAt: string | null;
}

const videoColumns = {
  id: videos.id, slug: videos.slug, title: videos.title, titleEn: videos.titleEn, youtubeId: videos.youtubeId,
  description: videos.description, descriptionEn: videos.descriptionEn, publishedAt: videos.publishedAt,
};

/** YouTube titles arrive dressed with emoji (sparkles, microphones); the site shows the words only. */
function toVideo(row: { id: number; slug: string; title: string; titleEn: string; youtubeId: string; description: string; descriptionEn: string; publishedAt: string | null }, locale: Locale): VideoItem {
  const lang = contentLocale(locale, row.title, row.titleEn);
  const title = inLocale(lang, row.title, row.titleEn).replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();
  return { id: row.id, slug: row.slug, lang, title, youtubeId: row.youtubeId, description: ownText(lang, row.description, row.descriptionEn), publishedAt: row.publishedAt };
}

export async function listVideos(opts: { page: number; pageSize: number }, locale: Locale): Promise<Paginated<VideoItem>> {
  "use cache";
  cacheTag("videos");
  cacheLife("minutes");
  const db = await getDb();
  const condition = eq(videos.status, "published");
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(videoColumns)
      .from(videos)
      .where(condition)
      .orderBy(desc(videos.publishedAt), desc(videos.id))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(videos).where(condition),
  ]);
  return paginate(rows.map((r) => toVideo(r, locale)), total, opts.page, opts.pageSize);
}

export async function getVideoBySlug(slug: string, locale: Locale): Promise<VideoItem | null> {
  "use cache";
  cacheTag("videos");
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db
    .select(videoColumns)
    .from(videos)
    .where(and(eq(videos.slug, slug), eq(videos.status, "published")))
    .limit(1);
  return row ? toVideo(row, locale) : null;
}

export async function listPosters(locale: Locale): Promise<Array<{ id: number; title: string; linkUrl: string; image: PublicMedia | null }>> {
  "use cache";
  cacheTag("posters");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ id: posters.id, title: posters.title, titleEn: posters.titleEn, linkUrl: posters.linkUrl, mediaId: posters.mediaId })
    .from(posters)
    .where(eq(posters.active, true))
    .orderBy(asc(posters.sortOrder));
  return (await withMedia(db, rows, "mediaId", "image")).map((r) => ({ id: r.id, title: pickText(locale, r.title, r.titleEn), linkUrl: r.linkUrl, image: r.image }));
}

export interface DownloadItem {
  id: number;
  lang: Locale;
  title: string;
  description: string;
  file: PublicMedia | null;
}

export async function listDownloads(locale: Locale): Promise<DownloadItem[]> {
  "use cache";
  cacheTag("downloads");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ id: downloads.id, title: downloads.title, titleEn: downloads.titleEn, description: downloads.description, descriptionEn: downloads.descriptionEn, mediaId: downloads.mediaId })
    .from(downloads)
    .where(eq(downloads.active, true))
    .orderBy(asc(downloads.sortOrder));
  return (await withMedia(db, rows, "mediaId", "file")).map((r) => {
    const lang = contentLocale(locale, r.title, r.titleEn);
    return { id: r.id, lang, title: inLocale(lang, r.title, r.titleEn), description: ownText(lang, r.description, r.descriptionEn), file: r.file };
  });
}

/** Landscape photographs from the newest galleries, for the homepage masthead. */
export async function getMastheadImages(limit = 4): Promise<PublicMedia[]> {
  "use cache";
  cacheTag("galleries");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ mediaId: galleryImages.mediaId })
    .from(galleryImages)
    .innerJoin(galleries, eq(galleries.id, galleryImages.galleryId))
    .innerJoin(media, eq(media.id, galleryImages.mediaId))
    .where(and(eq(galleries.status, "published"), sql`${media.width} >= 1200 and ${media.width} > ${media.height} * 1.3`))
    .orderBy(desc(galleries.publishedAt), asc(galleryImages.sortOrder))
    .limit(40);
  // One picture per gallery where possible, so the crossfade shows different events.
  const map = await getMediaByIds(db, rows.map((r) => r.mediaId));
  const picked: PublicMedia[] = [];
  const step = Math.max(1, Math.floor(rows.length / limit));
  for (let i = 0; i < rows.length && picked.length < limit; i += step) {
    const m = map.get(rows[i].mediaId);
    if (m) picked.push(m);
  }
  return picked;
}
