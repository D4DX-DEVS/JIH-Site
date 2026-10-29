// Imports JetEngine CPTs (leaders, galleries, videos) and site structure (posters, downloads, nav, settings, redirects).
import { eq, and } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import { decodeEntities, sanitizeRichText } from "../../../src/lib/content/sanitize";
import { decodeSegment } from "../../../src/lib/slug";
import { nowIso, readHtml, readJson, tableCount, type Db, type Ledger } from "./context";
import { ensureMediaForUrl, type MediaIndex } from "./media";
import {
  load, parseGalleryPage, parseHeaderMenu, parseHomePosters, parseLeaderPage, parseLeadersIndex,
  parseSeo, parseVideoPage, SOURCE_ORIGIN, uploadsKey, type NavNode,
} from "./parse";
import { pathOf } from "./content";

interface WpItem { id: number; slug: string; link: string; date_gmt: string; status: string; title: { rendered: string }; featured_media?: number; "image-category"?: number[] }

export async function importLeaders(db: Db, ledger: Ledger, media: MediaIndex) {
  const leaders = await readJson<WpItem[]>("raw/leadership.json");
  const pages = await readJson<Array<{ id: number; content: { rendered: string } }>>("raw/pages.json");
  const index = parseLeadersIndex(pages.find((p) => p.id === 11379)?.content.rendered ?? "");
  const norm = (s: string) => s.replace(/[\s.‌‍]/g, "");

  for (const l of leaders) {
    const name = decodeEntities(l.title.rendered);
    const html = await readHtml(`leadership/${l.id}.html`);
    if (!html) {
      await ledger.record({ sourceType: "leader", sourceId: l.id, status: "failed", sourceUrl: l.link, message: "Profile page HTML not cached" });
      continue;
    }
    const details = parseLeaderPage(html);
    const position = index.find((i) => norm(i.name) === norm(name));
    const values = {
      wpId: l.id,
      slug: decodeSegment(l.slug),
      name,
      roleTitle: details.roleTitle,
      groupKey: (position?.group ?? "shoora") as schema.LeaderGroup,
      bioHtml: sanitizeRichText(details.bioHtml),
      photoMediaId: await ensureMediaForUrl(db, media, details.photoUrl, name),
      sortOrder: position?.order ?? 999,
      status: "published" as const,
      createdAt: `${l.date_gmt}Z`,
      updatedAt: nowIso(),
    };
    const [row] = await db.insert(schema.leaders).values(values).onConflictDoUpdate({ target: schema.leaders.wpId, set: values }).returning({ id: schema.leaders.id });
    await ledger.record({
      sourceType: "leader", sourceId: l.id, status: position ? "imported" : "unresolved", sourceUrl: l.link, targetTable: "leaders", targetId: row.id,
      message: position ? "" : "Not listed on /leaders/; group defaulted to shoora",
    });
  }
}

export async function importGalleries(db: Db, ledger: Ledger, media: MediaIndex) {
  const cats = await readJson<Array<{ id: number; slug: string; name: string; link: string }>>("raw/image-category.json");
  const catIds = new Map<number, number>();
  for (const [i, c] of cats.entries()) {
    const values = { wpId: c.id, slug: decodeSegment(c.slug), name: decodeEntities(c.name), sortOrder: i, updatedAt: nowIso() };
    const [row] = await db.insert(schema.galleryCategories).values(values).onConflictDoUpdate({ target: schema.galleryCategories.wpId, set: values }).returning({ id: schema.galleryCategories.id });
    catIds.set(c.id, row.id);
    await ledger.record({ sourceType: "gallery-category", sourceId: c.id, status: "imported", sourceUrl: c.link, targetTable: "gallery_categories", targetId: row.id });
  }

  for (const g of await readJson<WpItem[]>("raw/image-gallery.json")) {
    const html = await readHtml(`image-gallery/${g.id}.html`);
    const urls = html ? parseGalleryPage(html) : [];
    const title = decodeEntities(g.title.rendered);
    const values = {
      wpId: g.id,
      slug: decodeSegment(g.slug),
      title,
      categoryId: catIds.get(g["image-category"]?.[0] ?? -1) ?? null,
      coverMediaId: g.featured_media ? media.byWpId.get(g.featured_media) ?? null : null,
      status: "published" as const,
      publishedAt: `${g.date_gmt}Z`,
      updatedAt: nowIso(),
    };
    const [row] = await db.insert(schema.galleries).values(values).onConflictDoUpdate({ target: schema.galleries.wpId, set: values }).returning({ id: schema.galleries.id });
    await db.delete(schema.galleryImages).where(eq(schema.galleryImages.galleryId, row.id));
    const missing: string[] = [];
    for (const [order, url] of urls.entries()) {
      const mediaId = await ensureMediaForUrl(db, media, url, title);
      if (mediaId) await db.insert(schema.galleryImages).values({ galleryId: row.id, mediaId, sortOrder: order }).onConflictDoNothing();
      else missing.push(uploadsKey(url) ?? url);
    }
    if (!values.coverMediaId && urls[0]) {
      const cover = await ensureMediaForUrl(db, media, urls[0]);
      if (cover) await db.update(schema.galleries).set({ coverMediaId: cover }).where(eq(schema.galleries.id, row.id));
    }
    await ledger.record({
      sourceType: "gallery", sourceId: g.id, sourceUrl: g.link, targetTable: "galleries", targetId: row.id,
      status: urls.length && !missing.length ? "imported" : "unresolved",
      message: urls.length ? (missing.length ? `${urls.length - missing.length}/${urls.length} images; missing: ${missing.join(", ")}` : `${urls.length} images`) : "No gallery images found in page HTML",
    });
  }
}

export async function importVideos(db: Db, ledger: Ledger) {
  for (const v of await readJson<WpItem[]>("raw/video-gallery.json")) {
    const html = await readHtml(`video-gallery/${v.id}.html`);
    const youtubeId = html ? parseVideoPage(html) : null;
    if (!youtubeId) {
      await ledger.record({ sourceType: "video", sourceId: v.id, status: "failed", sourceUrl: v.link, message: "No YouTube URL found in page HTML" });
      continue;
    }
    const seo = html ? parseSeo(html) : null;
    const values = {
      wpId: v.id,
      slug: decodeSegment(v.slug),
      title: decodeEntities(v.title.rendered),
      youtubeId,
      description: seo?.description ?? "",
      status: "published" as const,
      publishedAt: `${v.date_gmt}Z`,
      updatedAt: nowIso(),
    };
    const [row] = await db.insert(schema.videos).values(values).onConflictDoUpdate({ target: schema.videos.wpId, set: values }).returning({ id: schema.videos.id });
    await ledger.record({ sourceType: "video", sourceId: v.id, status: "imported", sourceUrl: v.link, targetTable: "videos", targetId: row.id });
  }
}

/** Posters, downloads and navigation are seeded once; later runs leave admin changes alone. */
export async function seedStructure(db: Db, ledger: Ledger, media: MediaIndex) {
  const home = (await readHtml("home.html")) ?? "";

  if ((await tableCount(db, schema.posters)) === 0) {
    for (const [order, url] of parseHomePosters(home).entries()) {
      const mediaId = await ensureMediaForUrl(db, media, url, "Poster");
      if (mediaId) await db.insert(schema.posters).values({ mediaId, sortOrder: order });
      await ledger.record({ sourceType: "poster", sourceId: uploadsKey(url) ?? url, status: mediaId ? "imported" : "failed", sourceUrl: url, targetTable: "posters" });
    }
  }

  const menu = parseHeaderMenu(home);
  if ((await tableCount(db, schema.downloads)) === 0) {
    const downloadsNode = menu.find((m) => m.label.toLowerCase() === "downloads");
    for (const [order, item] of (downloadsNode?.children ?? []).entries()) {
      const mediaId = await ensureMediaForUrl(db, media, item.url, item.label);
      if (mediaId) await db.insert(schema.downloads).values({ title: item.label, mediaId, sortOrder: order });
      await ledger.record({ sourceType: "download", sourceId: item.url, status: mediaId ? "imported" : "failed", sourceUrl: item.url, targetTable: "downloads" });
    }
  }

  if ((await tableCount(db, schema.navItems)) === 0) {
    const toPath = (url: string) => (url.startsWith(SOURCE_ORIGIN) ? pathOf(url) : url).replace(/^\/wp-content\/uploads\//, "/media/uploads/");
    const insert = async (menuName: schema.NavMenu, node: NavNode, order: number, parentId: number | null) => {
      const [row] = await db
        .insert(schema.navItems)
        .values({ menu: menuName, label: node.label === "Ideolody" ? "Ideology" : node.label, url: node.url === "#" ? "" : toPath(node.url), parentId, sortOrder: order })
        .returning({ id: schema.navItems.id });
      for (const [i, child] of node.children.entries()) await insert(menuName, child, i, row.id);
    };
    let order = 0;
    for (const node of menu) {
      // TranslatePress language switcher: the new site has one language version.
      if (node.label === "LAN") {
        await ledger.record({ sourceType: "nav", sourceId: "LAN", status: "skipped", message: "TranslatePress language switcher removed; /ml/* redirects to the canonical page" });
        continue;
      }
      await insert("header", node, order++, null);
      // The WordPress header had no links to the news and gallery archives (they were only on the homepage).
      if (node.label === "Leaders") {
        await insert("header", { label: "News", url: "/news/", children: [] }, order++, null);
        await insert("header", { label: "Gallery", url: "/image-gallery/", children: [] }, order++, null);
      }
    }
    for (const [i, node] of [{ label: "Home", url: "/" }, { label: "About Us", url: "/about-us/" }, { label: "Contact", url: "/contact/" }].entries()) {
      await insert("footer", { ...node, children: [] }, i, null);
    }
    await ledger.record({ sourceType: "nav", sourceId: "header+footer", status: "imported", targetTable: "nav_items" });
  }
}

export async function seedSettings(db: Db, ledger: Ledger, media: MediaIndex) {
  const site = await readJson<{ name: string; description: string; site_logo: number; site_icon: number }>("raw/site.json");
  const home = (await readHtml("home.html")) ?? "";
  const contactHtml = (await readHtml("page/225.html")) ?? "";
  const seo = parseSeo(home);
  const $ = load(home);
  const footer = $('[data-elementor-type="footer"]');
  const social = (needle: string) => footer.find(`a[href*="${needle}"]`).first().attr("href") ?? "";
  const mapSrc = load(contactHtml)('[data-widget_type="google_maps.default"] iframe').attr("src") ?? "";
  const logoUrl = $('[data-elementor-type="header"] img').first().attr("src");
  // The homepage hero is a designed cover image (lazy-loaded, so its URL sits in data-src).
  const bannerImg = $('[data-elementor-type="wp-page"] [data-widget_type="image.default"] img').first();
  const bannerUrl = bannerImg.attr("data-src") || bannerImg.attr("src");
  const heroBannerMediaId = bannerUrl && !bannerUrl.startsWith("data:") ? await ensureMediaForUrl(db, media, bannerUrl, "Jamaat-e-Islami Hind Kerala") : null;

  const values: Record<string, unknown> = {
    site: {
      name: site.name,
      shortName: "JIH Kerala",
      tagline: decodeEntities(site.description),
      logoMediaId: media.byWpId.get(site.site_logo) ?? (await ensureMediaForUrl(db, media, logoUrl, "Logo")),
      iconMediaId: media.byWpId.get(site.site_icon) ?? null,
      heroBannerMediaId,
      copyright: "JIHKERALA",
    },
    seo: {
      homeTitle: seo.title,
      defaultDescription: seo.description,
      ogImageMediaId: seo.ogImage ? await ensureMediaForUrl(db, media, seo.ogImage) : null,
    },
    contact: {
      organisation: "Jamaat-Islami Hind, Kerala",
      postBox: "PB No: 833",
      address: "Hira Centre, Mavoor Road, Calicut - 673004",
      phone: "0495 2722709",
      // The source footer links an address on the staging hostname; the organisation's real mailbox replaces it.
      email: ((source) => (source.includes("cloudwaysapps.com") ? "hiracenter@jihkerala.org" : source))(
        (footer.find('a[href^="mailto:"]').first().attr("href") ?? "").replace(/^mailto:\s*(%20)?/i, ""),
      ),
      website: "http://www.jamaateislamihind.org/eng/",
      mapEmbedUrl: mapSrc,
    },
    social: {
      facebook: social("facebook.com"),
      twitter: social("x.com") || social("twitter.com"),
      youtube: social("youtube.com"),
      instagram: social("instagram.com"),
    },
  };
  for (const [key, value] of Object.entries(values)) {
    await db.insert(schema.settings).values({ key, value }).onConflictDoNothing();
    // Fields added after the first import are merged into an existing row without touching edited ones.
    const [row] = await db.select({ value: schema.settings.value }).from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
    const stored = (row?.value ?? {}) as Record<string, unknown>;
    const missing = Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([k]) => !(k in stored)));
    if (Object.keys(missing).length) await db.update(schema.settings).set({ value: { ...stored, ...missing } }).where(eq(schema.settings.key, key));
    await ledger.record({ sourceType: "settings", sourceId: key, status: "imported", targetTable: "settings", targetId: key });
  }
  const fb = (values.social as { facebook: string }).facebook;
  if (fb.includes("cloudwaysapps.com")) {
    await ledger.record({ sourceType: "settings-issue", sourceId: "social.facebook", status: "unresolved", message: `Facebook URL on the source site is broken (${fb}); correct it in Admin → Settings` });
  }
}

/** Legacy URLs whose new location differs: WordPress attachment pages and CPT leftovers. */
export async function seedRedirects(db: Db, ledger: Ledger, media: MediaIndex) {
  const mediaItems = await readJson<Array<{ id: number; link: string; source_url: string }>>("raw/media.json");
  const reserved = new Set<string>();
  for (const f of ["raw/posts.json", "raw/pages.json"]) {
    for (const item of await readJson<Array<{ link: string }>>(f)) reserved.add(decodeSegment(pathOf(item.link)));
  }
  const rows: Array<{ fromPath: string; toPath: string }> = [{ fromPath: "/jet-popup/leader/", toPath: "/leaders/" }];
  let dropped = 0;
  for (const m of mediaItems) {
    const from = decodeSegment(pathOf(m.link));
    const key = uploadsKey(m.source_url);
    if (!key || reserved.has(from) || from === "/") continue;
    // An attachment page whose file is missing on the source has nothing to point at: it stays a 404.
    if (!media.uploaded.has(key)) {
      const removed = await db
        .delete(schema.redirects)
        .where(and(eq(schema.redirects.fromPath, from), eq(schema.redirects.source, "migration")))
        .returning({ id: schema.redirects.id });
      dropped += removed.length;
      continue;
    }
    rows.push({ fromPath: from, toPath: `/media/${key.split("/").map(encodeURIComponent).join("/")}` });
  }
  let n = 0;
  for (const r of rows) {
    const [existing] = await db.select({ source: schema.redirects.source }).from(schema.redirects).where(eq(schema.redirects.fromPath, r.fromPath));
    if (existing && existing.source !== "migration") continue;
    await db
      .insert(schema.redirects)
      .values({ ...r, statusCode: 301, source: "migration" })
      .onConflictDoUpdate({ target: schema.redirects.fromPath, set: { toPath: r.toPath, updatedAt: nowIso() }, where: and(eq(schema.redirects.source, "migration")) });
    n++;
  }
  await ledger.record({ sourceType: "redirects", sourceId: "legacy", status: "imported", targetTable: "redirects", message: `${n} redirects (attachment pages and retired URLs)${dropped ? `; removed ${dropped} that pointed at files missing on the source` : ""}` });
}
