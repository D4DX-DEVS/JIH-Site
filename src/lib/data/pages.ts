import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { pages, type PageSection, type PageTemplate } from "@/db/schema";
import { sanitizeRichText } from "@/lib/content/sanitize";
import { withMedia, type PublicMedia } from "./media";

export interface PageDetail {
  id: number;
  slug: string;
  title: string;
  summary: string;
  contentHtml: string;
  template: PageTemplate;
  section: PageSection;
  hubSection: PageSection | null;
  externalUrl: string;
  updatedAt: string;
  seoTitle: string;
  seoDescription: string;
  featuredMedia: PublicMedia | null;
  ogImage: PublicMedia | null;
}

export interface PageCard {
  id: number;
  slug: string;
  title: string;
  summary: string;
  externalUrl: string;
  featuredMedia: PublicMedia | null;
}

export async function getPageBySlug(slug: string): Promise<PageDetail | null> {
  "use cache";
  cacheTag("pages", `page:${slug}`);
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.status, "published"))).limit(1);
  if (!row) return null;
  const [withFeatured] = await withMedia(db, [row], "featuredMediaId", "featuredMedia");
  const [withOg] = await withMedia(db, [row], "ogImageId", "ogImage");
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    contentHtml: sanitizeRichText(row.contentHtml),
    template: row.template,
    section: row.section,
    hubSection: row.hubSection,
    externalUrl: row.externalUrl,
    updatedAt: row.updatedAt,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featuredMedia: withFeatured.featuredMedia,
    ogImage: withOg.ogImage,
  };
}

export async function listPagesInSection(section: PageSection): Promise<PageCard[]> {
  "use cache";
  cacheTag("pages");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      summary: pages.summary,
      externalUrl: pages.externalUrl,
      featuredMediaId: pages.featuredMediaId,
    })
    .from(pages)
    .where(and(eq(pages.section, section), eq(pages.status, "published")))
    .orderBy(asc(pages.sortOrder), asc(pages.title));
  const withImages = await withMedia(db, rows, "featuredMediaId", "featuredMedia");
  return withImages.map(({ featuredMediaId: _id, ...r }) => r);
}
