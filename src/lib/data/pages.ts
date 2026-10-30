import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { pages, type PageSection, type PageTemplate } from "@/db/schema";
import { sanitizeRichText } from "@/lib/content/sanitize";
import type { Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { contentLocale, decidingText, inLocale, localizeHtmlLinks, ownText } from "@/lib/i18n/content";
import { withMedia, type PublicMedia } from "./media";

export interface PageDetail {
  id: number;
  slug: string;
  /** Language the text below is in: the reader's, or the other one when the page has none in theirs. */
  lang: Locale;
  title: string;
  /** The English title as typed, or "" when the page has none. */
  titleEn: string;
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
  lang: Locale;
  title: string;
  summary: string;
  externalUrl: string;
  featuredMedia: PublicMedia | null;
}

export async function getPageBySlug(slug: string, locale: Locale): Promise<PageDetail | null> {
  "use cache";
  cacheTag("pages", `page:${slug}`);
  cacheLife("minutes");
  const db = await getDb();
  const [row] = await db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.status, "published"))).limit(1);
  if (!row) return null;
  const [withFeatured] = await withMedia(db, [row], "featuredMediaId", "featuredMedia");
  const [withOg] = await withMedia(db, [row], "ogImageId", "ogImage");
  const deciding = decidingText({ ml: row.contentHtml, en: row.contentHtmlEn }, { ml: row.title, en: row.titleEn });
  const lang = contentLocale(locale, deciding.ml, deciding.en);
  return {
    id: row.id,
    slug: row.slug,
    lang,
    title: inLocale(lang, row.title, row.titleEn),
    titleEn: row.titleEn,
    summary: ownText(lang, row.summary, row.summaryEn),
    contentHtml: localizeHtmlLinks(sanitizeRichText(inLocale(lang, row.contentHtml, row.contentHtmlEn)), locale),
    template: row.template,
    section: row.section,
    hubSection: row.hubSection,
    externalUrl: row.externalUrl,
    updatedAt: row.updatedAt,
    // SEO text belongs to one language; the other language's would not match the title shown.
    seoTitle: lang === "en" ? row.seoTitleEn : row.seoTitle,
    seoDescription: lang === "en" ? row.seoDescriptionEn : row.seoDescription,
    featuredMedia: withFeatured.featuredMedia,
    ogImage: withOg.ogImage,
  };
}

export async function listPagesInSection(section: PageSection, locale: Locale): Promise<PageCard[]> {
  "use cache";
  cacheTag("pages");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      titleEn: pages.titleEn,
      summary: pages.summary,
      summaryEn: pages.summaryEn,
      externalUrl: pages.externalUrl,
      featuredMediaId: pages.featuredMediaId,
    })
    .from(pages)
    .where(and(eq(pages.section, section), eq(pages.status, "published")))
    .orderBy(asc(pages.sortOrder), asc(pages.title));
  const withImages = await withMedia(db, rows, "featuredMediaId", "featuredMedia");
  return withImages.map((r) => {
    const lang = contentLocale(locale, r.title, r.titleEn);
    return {
      id: r.id,
      slug: r.slug,
      lang,
      title: section === "feeder" ? r.titleEn || r.title : inLocale(lang, r.title, r.titleEn),
      summary: ownText(lang, r.summary, r.summaryEn),
      externalUrl: r.externalUrl,
      featuredMedia: r.featuredMedia,
    };
  });
}

/**
 * A section hub's name. Section names (Feeder Organisation, Departments) stay in English in both
 * languages, matching the site menu: the page's English title, else the English dictionary name.
 * Only the content editors add switches with the language toggle.
 */
export function hubTitle(page: Pick<PageDetail, "title" | "titleEn" | "template" | "hubSection">): string {
  if (page.template === "hub" && page.hubSection) return page.titleEn || en.sections[page.hubSection];
  return page.title;
}
