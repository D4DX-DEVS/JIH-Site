// Imports categories, tags, posts and pages.
import { eq } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import { decodeEntities, htmlToText, sanitizeRichText, truncateText } from "../../../src/lib/content/sanitize";
import { decodeSegment, slugify } from "../../../src/lib/slug";
import { editedSinceImport, nowIso, readHtml, readJson, readSource, type Db, type ImportOptions, type Ledger } from "./context";
import { ensureMediaForUrl, type MediaIndex } from "./media";
import { liftLeadingBlocks, normalizeContentHtml, parseHubPage, parseSeo, SOURCE_ORIGIN, uploadsKey, type SeoMeta } from "./parse";

interface WpTerm { id: number; slug: string; name: string; description: string; parent?: number; link: string }
interface WpPost {
  id: number; slug: string; link: string; date_gmt: string; modified_gmt: string; status: string;
  title: { rendered: string }; content: { rendered: string }; excerpt?: { rendered: string };
  featured_media?: number; author?: number; sticky?: boolean; categories?: number[]; tags?: number[]; parent?: number;
}

const SITE_SUFFIX = / [-|–] Jamaat-e-Islami Hind Kerala$/;

export const pathOf = (link: string) => link.replace(SOURCE_ORIGIN, "") || "/";

/** SEO fields worth storing: only values that differ from what the new site generates by default. */
async function seoFor(db: Db, media: MediaIndex, kind: string, id: number, title: string) {
  const html = await readHtml(`${kind}/${id}.html`);
  const seo: SeoMeta | null = html ? parseSeo(html) : null;
  const seoTitle = seo?.title.replace(SITE_SUFFIX, "").trim() ?? "";
  return {
    seoTitle: seoTitle && seoTitle !== title ? seoTitle : "",
    seoDescription: seo?.description ?? "",
    ogImageId: seo?.ogImage ? await ensureMediaForUrl(db, media, seo.ogImage) : null,
  };
}

/** Sanitised body plus featured image, with the page-builder title/banner duplication removed. */
async function prepareBody(db: Db, media: MediaIndex, rawHtml: string, title: string, wpFeatured?: number, fallbackImage?: string) {
  const lifted = liftLeadingBlocks(sanitizeRichText(normalizeContentHtml(rawHtml)), title);
  const fromWp = wpFeatured ? media.byWpId.get(wpFeatured) ?? null : null;
  const leadId = lifted.leadImage ? await ensureMediaForUrl(db, media, lifted.leadImage, title) : null;
  const featuredMediaId = fromWp ?? leadId ?? (await ensureMediaForUrl(db, media, fallbackImage, title));
  // A banner that is not the featured image stays in the body.
  const keepLead = lifted.leadImage && leadId !== featuredMediaId;
  const contentHtml = keepLead ? `<img src="${lifted.leadImage}" alt="" loading="lazy" decoding="async" />
${lifted.html}` : lifted.html;
  return { contentHtml, featuredMediaId };
}

export async function importTaxonomies(db: Db, ledger: Ledger) {
  const categories = await readJson<WpTerm[]>("raw/categories.json");
  const catIds = new Map<number, number>();
  // Parents first so parent ids resolve.
  const ordered = [...categories].sort((a, b) => (a.parent ?? 0) - (b.parent ?? 0));
  for (const [i, c] of ordered.entries()) {
    const values = {
      wpId: c.id,
      slug: decodeSegment(c.slug),
      name: decodeEntities(c.name),
      description: htmlToText(c.description ?? ""),
      parentId: c.parent ? catIds.get(c.parent) ?? null : null,
      sortOrder: i,
      updatedAt: nowIso(),
    };
    const [row] = await db.insert(schema.categories).values(values).onConflictDoUpdate({ target: schema.categories.wpId, set: values }).returning({ id: schema.categories.id });
    catIds.set(c.id, row.id);
    await ledger.record({ sourceType: "category", sourceId: c.id, status: "imported", sourceUrl: c.link, targetTable: "categories", targetId: row.id });
  }

  const tags = await readJson<WpTerm[]>("raw/tags.json");
  const tagIds = new Map<number, number>();
  for (const t of tags) {
    const values = { wpId: t.id, slug: decodeSegment(t.slug), name: decodeEntities(t.name), updatedAt: nowIso() };
    const [row] = await db.insert(schema.tags).values(values).onConflictDoUpdate({ target: schema.tags.wpId, set: values }).returning({ id: schema.tags.id });
    tagIds.set(t.id, row.id);
    await ledger.record({ sourceType: "tag", sourceId: t.id, status: "imported", sourceUrl: t.link, targetTable: "tags", targetId: row.id });
  }
  return { catIds, tagIds };
}

export async function importPosts(db: Db, ledger: Ledger, media: MediaIndex, tax: Awaited<ReturnType<typeof importTaxonomies>>, opts: ImportOptions) {
  const posts = await readSource<WpPost>("posts.json");
  const users = await readJson<Array<{ id: number; name: string }>>("raw/users.json");
  const authors = new Map(users.map((u) => [u.id, u.name]));

  for (const p of posts) {
    try {
      const title = decodeEntities(p.title.rendered);
      const { contentHtml, featuredMediaId } = await prepareBody(db, media, p.content.rendered, title, p.featured_media);
      const excerptSource = htmlToText(p.excerpt?.rendered ?? "") || htmlToText(contentHtml);
      const values = {
        wpId: p.id,
        slug: decodeSegment(p.slug),
        title,
        excerpt: truncateText(excerptSource.replace(/\s*\[(…|&hellip;|\.\.\.)\]\s*$/, ""), 300),
        contentHtml,
        searchText: `${title} ${htmlToText(contentHtml)}`.toLowerCase(),
        featuredMediaId,
        authorName: authors.get(p.author ?? 0) ?? "",
        status: p.status === "publish" ? ("published" as const) : ("draft" as const),
        isFeatured: !!p.sticky,
        publishedAt: `${p.date_gmt}Z`,
        ...(await seoFor(db, media, "post", p.id, title)),
        createdAt: `${p.date_gmt}Z`,
        updatedAt: nowIso(),
      };
      const [existing] = await db.select({ id: schema.posts.id, updatedAt: schema.posts.updatedAt }).from(schema.posts).where(eq(schema.posts.wpId, p.id));
      if (existing && (await editedSinceImport(ledger, "post", p.id, existing.updatedAt, opts.force))) {
        await ledger.record({ sourceType: "post", sourceId: p.id, status: "skipped", sourceUrl: p.link, targetTable: "posts", targetId: existing.id, message: "Edited in admin after import" });
        continue;
      }
      const [row] = await db.insert(schema.posts).values(values).onConflictDoUpdate({ target: schema.posts.wpId, set: values }).returning({ id: schema.posts.id });
      await db.delete(schema.postCategories).where(eq(schema.postCategories.postId, row.id));
      await db.delete(schema.postTags).where(eq(schema.postTags.postId, row.id));
      for (const c of p.categories ?? []) {
        const categoryId = tax.catIds.get(c);
        if (categoryId) await db.insert(schema.postCategories).values({ postId: row.id, categoryId }).onConflictDoNothing();
      }
      for (const t of p.tags ?? []) {
        const tagId = tax.tagIds.get(t);
        if (tagId) await db.insert(schema.postTags).values({ postId: row.id, tagId }).onConflictDoNothing();
      }
      const missingFeatured = p.featured_media && !values.featuredMediaId;
      await ledger.record({
        sourceType: "post", sourceId: p.id, sourceUrl: p.link, targetTable: "posts", targetId: row.id,
        status: "imported",
        message: missingFeatured ? `Featured media ${p.featured_media} unavailable` : "",
      });
    } catch (err) {
      await ledger.record({ sourceType: "post", sourceId: p.id, status: "failed", sourceUrl: p.link, message: String(err) });
    }
  }
}

type PageConfig = Partial<Pick<typeof schema.pages.$inferInsert, "template" | "section" | "hubSection">> & { skip?: string };

const PAGE_CONFIG: Record<string, PageConfig> = {
  home: { skip: "Rebuilt as the dynamic homepage (sections are driven by posts, posters, videos and galleries)" },
  blog: { skip: "WordPress posts index; /blog/ now redirects to /news/" },
  news: { template: "news" },
  leaders: { template: "leaders" },
  departments: { template: "hub", hubSection: "department" },
  "media-and-publications": { template: "hub", hubSection: "publication" },
  "feeder-organisation": { template: "hub", hubSection: "feeder" },
  contact: { template: "contact" },
  "about-us": { section: "about" },
  history: { section: "about" },
  ideology: { section: "about" },
  objectives: { section: "about" },
  "jamaat-e-islami-hind-kerala-constitution": { section: "about" },
};

const HUB_PAGE_IDS: Record<number, schema.PageSection> = { 11913: "department", 11997: "publication", 12318: "feeder" };

export async function importPages(db: Db, ledger: Ledger, media: MediaIndex, opts: ImportOptions, frontPageId: number) {
  const pages = await readSource<WpPost>("pages.json");

  // Hub cards give child pages their section, summary, card image, external site and order.
  const cardBySlug = new Map<string, { section: schema.PageSection; order: number; summary: string; imageUrl?: string; externalUrl?: string }>();
  const orphanCards: Array<{ section: schema.PageSection; order: number; title: string; summary: string; imageUrl?: string; externalUrl?: string; hubId: number }> = [];
  for (const [hubId, section] of Object.entries(HUB_PAGE_IDS)) {
    const hub = pages.find((p) => p.id === Number(hubId));
    if (!hub) continue;
    parseHubPage(hub.content.rendered).cards.forEach((card, order) => {
      const slug = card.internalPath?.replace(/^\/|\/$/g, "");
      if (slug) cardBySlug.set(decodeSegment(slug), { section, order, summary: card.summary, imageUrl: card.imageUrl, externalUrl: card.externalUrl });
      else orphanCards.push({ section, order, title: card.title, summary: card.summary, imageUrl: card.imageUrl, externalUrl: card.externalUrl, hubId: Number(hubId) });
    });
  }

  for (const p of pages) {
    const slug = p.id === frontPageId ? "home" : decodeSegment(p.slug);
    const config = PAGE_CONFIG[slug] ?? {};
    if (config.skip) {
      await ledger.record({ sourceType: "page", sourceId: p.id, status: "skipped", sourceUrl: p.link, message: config.skip });
      continue;
    }
    try {
      const title = decodeEntities(p.title.rendered);
      const card = cardBySlug.get(slug);
      const dynamic = config.template && config.template !== "default";
      const { contentHtml, featuredMediaId } = dynamic
        ? { contentHtml: "", featuredMediaId: await ensureMediaForUrl(db, media, card?.imageUrl, title) }
        : await prepareBody(db, media, p.content.rendered, title, p.featured_media, card?.imageUrl);
      const text = htmlToText(contentHtml);
      const values = {
        wpId: p.id,
        slug,
        title,
        summary: card?.summary ?? truncateText(text, 300),
        contentHtml,
        searchText: `${title} ${card?.summary ?? ""} ${text}`.toLowerCase(),
        featuredMediaId,
        template: config.template ?? "default",
        section: card?.section ?? config.section ?? "general",
        hubSection: config.hubSection ?? null,
        externalUrl: card?.externalUrl ?? "",
        sortOrder: card?.order ?? 0,
        status: p.status === "publish" ? ("published" as const) : ("draft" as const),
        publishedAt: `${p.date_gmt}Z`,
        ...(await seoFor(db, media, "page", p.id, title)),
        createdAt: `${p.date_gmt}Z`,
        updatedAt: nowIso(),
      };
      const [existing] = await db.select({ id: schema.pages.id, updatedAt: schema.pages.updatedAt }).from(schema.pages).where(eq(schema.pages.wpId, p.id));
      if (existing && (await editedSinceImport(ledger, "page", p.id, existing.updatedAt, opts.force))) {
        await ledger.record({ sourceType: "page", sourceId: p.id, status: "skipped", sourceUrl: p.link, targetTable: "pages", targetId: existing.id, message: "Edited in admin after import" });
        continue;
      }
      const [row] = await db.insert(schema.pages).values(values).onConflictDoUpdate({ target: schema.pages.wpId, set: values }).returning({ id: schema.pages.id });
      await ledger.record({
        sourceType: "page", sourceId: p.id, status: "imported", sourceUrl: p.link, targetTable: "pages", targetId: row.id,
        message: dynamic ? `Rendered by the "${values.template}" template from structured data` : "",
      });
    } catch (err) {
      await ledger.record({ sourceType: "page", sourceId: p.id, status: "failed", sourceUrl: p.link, message: String(err) });
    }
  }

  // Hub cards with no page of their own become short pages so their text is not lost.
  for (const card of orphanCards) {
    const slug = slugify(card.title);
    const sourceId = `${card.hubId}:${slug}`;
    const contentHtml = sanitizeRichText(`<p>${card.summary.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>`);
    const values = {
      slug,
      title: card.title,
      summary: card.summary,
      contentHtml,
      searchText: `${card.title} ${card.summary}`.toLowerCase(),
      featuredMediaId: await ensureMediaForUrl(db, media, card.imageUrl, card.title),
      section: card.section,
      externalUrl: card.externalUrl ?? "",
      sortOrder: card.order,
      status: "published" as const,
      publishedAt: nowIso(),
      updatedAt: nowIso(),
    };
    const [existing] = await db.select({ id: schema.pages.id, updatedAt: schema.pages.updatedAt }).from(schema.pages).where(eq(schema.pages.slug, slug));
    if (existing && (await editedSinceImport(ledger, "hub-card", sourceId, existing.updatedAt, opts.force))) {
      await ledger.record({ sourceType: "hub-card", sourceId, status: "skipped", targetTable: "pages", targetId: existing.id, message: "Edited in admin after import" });
      continue;
    }
    const [row] = await db.insert(schema.pages).values(values).onConflictDoUpdate({ target: schema.pages.slug, set: values }).returning({ id: schema.pages.id });
    await ledger.record({
      sourceType: "hub-card", sourceId, status: "imported", targetTable: "pages", targetId: row.id,
      message: "Card on a hub page had no page of its own; created a page from the card text",
    });
  }
}

export { uploadsKey };
