// HTML parsers for the WordPress/Elementor markup. All functions are pure.
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { decodeEntities } from "../../../src/lib/content/sanitize";

export const SOURCE_ORIGIN = process.env.WP_SOURCE_URL ?? "https://wordpress-1683093-6756662.cloudwaysapps.com";

/** Loads markup with <noscript> parsed as elements, so lazy-loaded images are visible. */
export function load(html: string): CheerioAPI {
  return cheerio.load(html, { scriptingEnabled: false } as cheerio.CheerioOptions);
}

const text = (s: string | undefined) => decodeEntities((s ?? "").replace(/\s+/g, " ").trim());

/** Path under /wp-content/uploads/ ("uploads/2024/11/pm.jpg") or null. */
export function uploadsKey(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.replace(/\\\//g, "/").match(/\/(?:wp-content|media)\/uploads\/(.+?)(?:[?#].*)?$/);
  if (!m) return null;
  try {
    return `uploads/${decodeURIComponent(m[1])}`;
  } catch {
    return `uploads/${m[1]}`;
  }
}

/** Real image URL for an <img>, looking past lazy-load placeholders. */
function imageSrc($: CheerioAPI, img: Parameters<CheerioAPI>[0]): string | undefined {
  const el = $(img);
  const candidates = [el.attr("data-lazy-src"), el.attr("data-src"), el.attr("src")];
  return candidates.find((c) => c && !c.startsWith("data:"));
}

/** Converts Elementor/WordPress content markup into simple HTML ready for the sanitiser. */
export function normalizeContentHtml(html: string): string {
  const $ = load(html);
  $("script, style, svg, form, .elementor-button-wrapper, .elementor-divider, .screen-reader-text").remove();
  // Icon fonts and the desktop tab strip of tab widgets (their titles reappear per panel below).
  $('i[class*="fa"], .elementor-accordion-icon, .tab-icon-wrap, .plus-tabs-nav-wrapper, .elementor-tabs-wrapper').remove();
  // Tab/accordion panel titles become sub-headings so every panel reads in sequence.
  $(".elementor-tab-mobile-title, .plus-accordion-header, .elementor-tab-title").each((_, el) => {
    const title = $(el).text().replace(/\s+/g, " ").trim();
    $(el).replaceWith(title ? `<h3>${$("<i>").text(title).html()}</h3>` : "");
  });
  // Lazy-loaded images are followed by a <noscript> copy; keep one.
  $("noscript").each((_, el) => {
    if ($(el).prev("img").length && $(el).find("img").length) $(el).remove();
  });
  $("img").each((_, img) => {
    const src = imageSrc($, img);
    if (src) $(img).attr("src", src);
    else $(img).remove();
  });
  // Elementor video widgets keep the URL in data-settings.
  $('[data-widget_type^="video"]').each((_, el) => {
    const id = youtubeIdFrom($(el).attr("data-settings") ?? "");
    if (id) $(el).replaceWith(`<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" allowfullscreen></iframe>`);
  });
  $("noscript").each((_, el) => {
    $(el).replaceWith($(el).html() ?? "");
  });
  return rewriteUrls($("body").html() ?? "");
}

/** Points upload URLs at R2 (/media/uploads/…) and internal links at relative paths. */
export function rewriteUrls(html: string): string {
  const origin = SOURCE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html
    .replace(new RegExp(`${origin}/wp-content/uploads/`, "g"), "/media/uploads/")
    .replace(new RegExp(`${origin}(?=/|")`, "g"), "")
    .replace(/(href|src)="\/media\/uploads\/([^"]+)"/g, (_, attr: string, p: string) => {
      // Keep keys consistent with the decoded object names stored in R2.
      let decoded = p;
      try {
        decoded = decodeURIComponent(p);
      } catch {
        /* keep as is */
      }
      return `${attr}="/media/uploads/${decoded.split("/").map(encodeURIComponent).join("/")}"`;
    });
}

/**
 * Page builders put the page title and a banner image at the top of the content. The new
 * templates render both (h1 + hero), so a leading heading/paragraph equal to the title is
 * dropped and a leading image is returned separately to become the featured image.
 */
export function liftLeadingBlocks(html: string, title: string, liftImage = true): { html: string; leadImage?: string } {
  const $ = load(html);
  const body = $("body");
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  let leadImage: string | undefined;
  for (let i = 0; i < 3; i++) {
    const first = body.children().first();
    if (!first.length) break;
    if (liftImage && first.is("img") && !leadImage) {
      leadImage = first.attr("src");
      first.remove();
    } else if (first.is("h2, h3, p") && norm(first.text()) === norm(title)) {
      first.remove();
    } else break;
  }
  return { html: body.html() ?? "", leadImage };
}

export function youtubeIdFrom(value: string): string | null {
  const s = value.replace(/\\\//g, "/");
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function singleBody($: CheerioAPI) {
  return $('[data-elementor-type="single-post"]').first();
}

export interface LeaderDetails {
  photoUrl?: string;
  roleTitle: string;
  bioHtml: string;
}

/** Leadership single page: image, title, role (first text widget), bio (second). */
export function parseLeaderPage(html: string): LeaderDetails {
  const $ = load(html);
  const body = singleBody($);
  const img = body.find('[data-widget_type="image.default"] img').toArray().map((i) => imageSrc($, i)).find(Boolean);
  const texts = body.find('[data-widget_type="text-editor.default"] .elementor-widget-container').toArray();
  const roleTitle = texts.length > 1 ? text($(texts[0]).text()) : "";
  const bioEl = texts.length > 1 ? texts[texts.length - 1] : texts[0];
  return { photoUrl: img, roleTitle, bioHtml: bioEl ? normalizeContentHtml($(bioEl).html() ?? "") : "" };
}

/** Gallery single page: full-size image links in order. */
export function parseGalleryPage(html: string): string[] {
  const $ = load(html);
  const urls = singleBody($)
    .find("a.e-gallery-item, a.elementor-gallery-item, .gallery-item a")
    .toArray()
    .map((a) => $(a).attr("href"))
    .filter((u): u is string => !!u && u.includes("/wp-content/uploads/"));
  return [...new Set(urls)];
}

export function parseVideoPage(html: string): string | null {
  const $ = load(html);
  return youtubeIdFrom(singleBody($).html() ?? "");
}

export const LEADER_GROUP_LABELS: Record<string, string> = {
  ameer: "ameer",
  "general secretary": "general-secretary",
  "assistant ameer": "assistant-ameer",
  secretaries: "secretary",
  secretary: "secretary",
  "shoora member": "shoora",
  "shoora members": "shoora",
};

/** /leaders/ page: ordered list of { name, group } read from section headings. */
export function parseLeadersIndex(html: string): Array<{ name: string; group: string; order: number }> {
  const $ = load(html);
  const out: Array<{ name: string; group: string; order: number }> = [];
  let group = "shoora";
  $('[data-widget_type="heading.default"]').each((_, el) => {
    const label = text($(el).text());
    const g = LEADER_GROUP_LABELS[label.toLowerCase()];
    if (g) group = g;
    else if (label) out.push({ name: label, group, order: out.length });
  });
  return out;
}

export interface HubCard {
  title: string;
  summary: string;
  imageUrl?: string;
  internalPath?: string;
  externalUrl?: string;
}

/** Departments / publications / feeder pages: one card per Elementor top-level section. */
export function parseHubPage(html: string): { intro: string; cards: HubCard[] } {
  const $ = load(html);
  const cards: HubCard[] = [];
  let intro = "";
  $(".elementor-top-section, .e-con.e-parent").each((_, section) => {
    const s = $(section);
    const title = text(s.find('[data-widget_type="heading.default"]').first().text());
    const summary = text(s.find('[data-widget_type="text-editor.default"]').first().text()).replace(/(\.\.\.|…)\s*$/, "");
    const img = s.find('[data-widget_type="image.default"] img').toArray().map((i) => imageSrc($, i)).find(Boolean);
    const links = s
      .find('[data-widget_type="button.default"] a')
      .toArray()
      .map((a) => $(a).attr("href") ?? "");
    const internal = links.find((l) => l.startsWith(SOURCE_ORIGIN) || l.startsWith("/"));
    const external = links.find((l) => /^https?:\/\//.test(l) && !l.startsWith(SOURCE_ORIGIN));
    if (!title) return;
    if (!summary && !img && !links.length) {
      intro ||= title;
      return;
    }
    cards.push({
      title,
      summary,
      imageUrl: img,
      internalPath: internal?.replace(SOURCE_ORIGIN, ""),
      externalUrl: external,
    });
  });
  return { intro, cards };
}

export interface SeoMeta {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  robots?: string;
}

export function parseSeo(html: string): SeoMeta {
  const $ = load(html);
  return {
    title: text($("title").first().text()),
    description: text($('meta[name="description"]').attr("content")),
    ogImage: $('meta[property="og:image"]').attr("content"),
    canonical: $('link[rel="canonical"]').attr("href"),
    robots: $('meta[name="robots"]').attr("content"),
  };
}

/** Homepage "Posters" section image URLs. */
export function parseHomePosters(html: string): string[] {
  const $ = load(html);
  const heading = $("h2")
    .toArray()
    .find((h) => text($(h).text()).toLowerCase() === "posters");
  if (!heading) return [];
  const section = $(heading).closest(".elementor-top-section, .e-con.e-parent");
  const urls = section
    .find("img")
    .toArray()
    .map((i) => imageSrc($, i))
    .filter((u): u is string => !!u && u.includes("/wp-content/uploads/"));
  return [...new Set(urls)];
}

export interface NavNode {
  label: string;
  url: string;
  children: NavNode[];
}

/** Header menu from the rendered homepage. */
export function parseHeaderMenu(html: string): NavNode[] {
  const $ = load(html);
  const root = $('[data-elementor-type="header"] nav ul').first();
  const walk = (ul: ReturnType<CheerioAPI>): NavNode[] =>
    ul
      .children("li")
      .toArray()
      .map((li) => {
        const a = $(li).children("a").first();
        const sub = $(li).children("ul").first();
        return { label: text(a.text()), url: a.attr("href") ?? "", children: sub.length ? walk(sub) : [] };
      });
  return walk(root);
}
