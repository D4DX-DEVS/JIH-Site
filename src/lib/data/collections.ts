import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import {
  downloads, galleries, galleryCategories, galleryImages, leaders, media, posters, videos, type LeaderGroup,
} from "@/db/schema";
import { sanitizeRichText } from "@/lib/content/sanitize";
import { paginate, type Paginated } from "@/lib/pagination";
import { getMediaByIds, withMedia, type PublicMedia } from "./media";

export interface LeaderCard {
  id: number;
  slug: string;
  name: string;
  roleTitle: string;
  groupKey: LeaderGroup;
  photo: PublicMedia | null;
}

export interface LeaderDetail extends LeaderCard {
  bioHtml: string;
}

export async function listLeaders(): Promise<LeaderCard[]> {
  "use cache";
  cacheTag("leaders");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ id: leaders.id, slug: leaders.slug, name: leaders.name, roleTitle: leaders.roleTitle, groupKey: leaders.groupKey, photoMediaId: leaders.photoMediaId })
    .from(leaders)
    .where(eq(leaders.status, "published"))
    .orderBy(asc(leaders.sortOrder), asc(leaders.name));
  return (await withMedia(db, rows, "photoMediaId", "photo")).map(({ photoMediaId: _id, ...r }) => r);
}

export async function getLeaderBySlug(slug: string): Promise<LeaderDetail | null> {
  "use cache";
  cacheTag("leaders");
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db.select().from(leaders).where(and(eq(leaders.slug, slug), eq(leaders.status, "published"))).limit(1);
  if (!row) return null;
  const [r] = await withMedia(db, [row], "photoMediaId", "photo");
  return { id: r.id, slug: r.slug, name: r.name, roleTitle: r.roleTitle, groupKey: r.groupKey, bioHtml: sanitizeRichText(r.bioHtml), photo: r.photo };
}

export interface GalleryCard {
  id: number;
  slug: string;
  title: string;
  publishedAt: string | null;
  imageCount: number;
  category: { slug: string; name: string } | null;
  cover: PublicMedia | null;
}

export async function listGalleryCategories(): Promise<Array<{ id: number; slug: string; name: string }>> {
  "use cache";
  cacheTag("galleries");
  cacheLife("minutes");
  const db = await getDb();
  return db.select({ id: galleryCategories.id, slug: galleryCategories.slug, name: galleryCategories.name }).from(galleryCategories).orderBy(asc(galleryCategories.sortOrder));
}

export async function listGalleries(opts: { page: number; pageSize: number; categorySlug?: string }): Promise<Paginated<GalleryCard>> {
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
        publishedAt: galleries.publishedAt,
        coverMediaId: galleries.coverMediaId,
        categorySlug: galleryCategories.slug,
        categoryName: galleryCategories.name,
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
    withCovers.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      publishedAt: r.publishedAt,
      imageCount: r.imageCount,
      category: r.categorySlug ? { slug: r.categorySlug, name: r.categoryName ?? r.categorySlug } : null,
      cover: r.cover,
    })),
    total,
    opts.page,
    opts.pageSize,
  );
}

export async function getGalleryBySlug(slug: string): Promise<(GalleryCard & { description: string; images: PublicMedia[] }) | null> {
  "use cache";
  cacheTag("galleries", `gallery:${slug}`);
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db
    .select({ gallery: galleries, categorySlug: galleryCategories.slug, categoryName: galleryCategories.name })
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
  return {
    id: row.gallery.id,
    slug: row.gallery.slug,
    title: row.gallery.title,
    description: row.gallery.description,
    publishedAt: row.gallery.publishedAt,
    imageCount: images.length,
    category: row.categorySlug ? { slug: row.categorySlug, name: row.categoryName ?? row.categorySlug } : null,
    cover: map.get(row.gallery.coverMediaId ?? -1) ?? images[0] ?? null,
    images,
  };
}

export interface VideoItem {
  id: number;
  slug: string;
  title: string;
  youtubeId: string;
  description: string;
  publishedAt: string | null;
}

/** YouTube titles arrive dressed with emoji (sparkles, microphones); the site shows the words only. */
function plainVideo<T extends { title: string }>(row: T): T {
  const title = row.title.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();
  return { ...row, title };
}

export async function listVideos(opts: { page: number; pageSize: number }): Promise<Paginated<VideoItem>> {
  "use cache";
  cacheTag("videos");
  cacheLife("minutes");
  const db = await getDb();
  const condition = eq(videos.status, "published");
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: videos.id, slug: videos.slug, title: videos.title, youtubeId: videos.youtubeId, description: videos.description, publishedAt: videos.publishedAt })
      .from(videos)
      .where(condition)
      .orderBy(desc(videos.publishedAt), desc(videos.id))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ total: sql<number>`count(*)` }).from(videos).where(condition),
  ]);
  return paginate(rows.map(plainVideo), total, opts.page, opts.pageSize);
}

export async function getVideoBySlug(slug: string): Promise<VideoItem | null> {
  "use cache";
  cacheTag("videos");
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db
    .select({ id: videos.id, slug: videos.slug, title: videos.title, youtubeId: videos.youtubeId, description: videos.description, publishedAt: videos.publishedAt })
    .from(videos)
    .where(and(eq(videos.slug, slug), eq(videos.status, "published")))
    .limit(1);
  return row ? plainVideo(row) : null;
}

export async function listPosters(): Promise<Array<{ id: number; title: string; linkUrl: string; image: PublicMedia | null }>> {
  "use cache";
  cacheTag("posters");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ id: posters.id, title: posters.title, linkUrl: posters.linkUrl, mediaId: posters.mediaId })
    .from(posters)
    .where(eq(posters.active, true))
    .orderBy(asc(posters.sortOrder));
  return (await withMedia(db, rows, "mediaId", "image")).map(({ mediaId: _id, ...r }) => r);
}

export interface DownloadItem {
  id: number;
  title: string;
  description: string;
  file: PublicMedia | null;
}

export async function listDownloads(): Promise<DownloadItem[]> {
  "use cache";
  cacheTag("downloads");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({ id: downloads.id, title: downloads.title, description: downloads.description, mediaId: downloads.mediaId })
    .from(downloads)
    .where(eq(downloads.active, true))
    .orderBy(asc(downloads.sortOrder));
  return (await withMedia(db, rows, "mediaId", "file")).map(({ mediaId: _id, ...r }) => r);
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
