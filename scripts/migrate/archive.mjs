#!/usr/bin/env node
// Full archive of the public WordPress site, made before the source server goes offline.
// Read-only against the source. Saves into migration/archive/ (never touches migration/data/):
//   rest/   every public GET collection listed by /wp-json/ (comments, types, taxonomies, plugin routes …)
//   site/   every reachable HTML page, including the TranslatePress /ml/ mirror and attachment pages,
//           plus the CSS, JS, fonts and images they use, sitemaps, feeds and robots.txt
//   manifest.json  url → file, status, type, size (uploads already in migration/data/media are referenced, not re-downloaded)
// Resumable: rerun to fetch only what is missing or failed.
//   node scripts/migrate/archive.mjs
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const SOURCE = new URL(process.env.WP_SOURCE_URL ?? "https://wordpress-1683093-6756662.cloudwaysapps.com");
const OUT = path.resolve("migration/archive");
const MEDIA = path.resolve("migration/data/media"); // download-media.mjs output: uploads/YYYY/MM/file
const CONCURRENCY = 8;
const MAX_PAGES = 5000; // guard against crawler traps
const UA = { "user-agent": "jih-migration-archive/1.0" };

const exists = (p) => access(p).then(() => true, () => false);
const manifestPath = path.join(OUT, "manifest.json");
const manifest = new Map((await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, "utf8")).map((e) => [e.url, e]) : []);
const saveManifest = () => writeFile(manifestPath, JSON.stringify([...manifest.values()], null, 1));

async function get(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: UA, redirect: "manual", signal: AbortSignal.timeout(60_000) });
    const body = Buffer.from(await res.arrayBuffer());
    return { status: res.status, type: res.headers.get("content-type") ?? "", location: res.headers.get("location"), headers: res.headers, body };
  } catch (error) {
    if (attempt < 3) return get(url, attempt + 1);
    return { status: 0, type: "", location: null, headers: new Headers(), body: Buffer.alloc(0), error: String(error) };
  }
}

/** Readable, Windows-safe file path for a URL; long or odd segments get a short hash. */
function fileFor(url, kind) {
  const u = new URL(url);
  const segments = u.pathname.split("/").filter(Boolean).map((s) => {
    let d;
    try {
      d = decodeURIComponent(s);
    } catch {
      d = s;
    }
    d = d.replace(/[<>:"|?*\\\x00-\x1f]/g, "_").replace(/[. ]+$/, "_");
    return d.length > 60 ? `${d.slice(0, 50)}~${createHash("sha1").update(d).digest("hex").slice(0, 8)}` : d || "_";
  });
  // Extensionless paths become folder indexes so /ml and /ml/x/ cannot clash as file and folder.
  const isDir = segments.length === 0 || u.pathname.endsWith("/") || (kind !== "rest" && !path.extname(segments.at(-1)));
  if (kind === "rest") segments.push(isDir ? "index.json" : `${segments.pop()}.json`);
  else if (isDir) segments.push(kind === "page" ? "index.html" : "index");
  if (u.search) {
    const q = createHash("sha1").update(u.search).digest("hex").slice(0, 8);
    const last = segments.pop();
    const ext = path.extname(last);
    segments.push(`${last.slice(0, last.length - ext.length)}__q${q}${ext || (kind === "page" ? ".html" : "")}`);
  }
  return path.join(OUT, kind === "rest" ? "rest" : "site", ...segments);
}

async function store(url, kind, res, extra = {}) {
  const entry = { url, kind, status: res.status, type: res.type.split(";")[0], bytes: res.body.length, ...extra };
  if (res.location) entry.location = new URL(res.location, url).href;
  if (res.error) entry.error = res.error;
  if (res.status === 200 && res.body.length) {
    const file = fileFor(url, kind);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, res.body);
    entry.file = path.relative(OUT, file).replaceAll("\\", "/");
  }
  manifest.set(url, entry);
  return entry;
}

const done = (url) => {
  const e = manifest.get(url);
  return e && (e.status === 200 || (e.status >= 300 && e.status < 500 && e.status !== 429));
};

async function pool(items, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) await worker(items[i++]);
  }));
}

// ---------------------------------------------------------------- REST API
async function archiveRest() {
  const index = await get(new URL("/wp-json/", SOURCE).href);
  await store(new URL("/wp-json/", SOURCE).href, "rest", index);
  const routes = Object.entries(JSON.parse(index.body.toString("utf8")).routes)
    .filter(([route, def]) => !route.includes("(?P<") && def.methods.includes("GET") && route !== "/")
    .map(([route]) => route);
  console.log(`REST: ${routes.length} routes`);
  const links = new Set();
  await pool(routes, async (route) => {
    const base = new URL(`/wp-json${route}`, SOURCE).href;
    if (done(base)) {
      const saved = JSON.parse(await readFile(path.join(OUT, manifest.get(base).file ?? ""), "utf8").catch(() => "null"));
      if (route === "/wp/v2/media" && Array.isArray(saved)) for (const m of saved) if (m.link) attachmentPages.add(m.link);
      return collectLinks(saved, links);
    }
    let first = await get(`${base}?per_page=100&page=1`);
    let paged = first.status === 200;
    if (!paged) first = await get(base);
    if (first.status !== 200) return void (await store(base, "rest", first));
    let data = JSON.parse(first.body.toString("utf8"));
    const pages = Number(first.headers.get("x-wp-totalpages") ?? 1);
    if (paged && Array.isArray(data)) {
      for (let p = 2; p <= pages; p++) {
        const next = await get(`${base}?per_page=100&page=${p}`);
        if (next.status === 200) data = data.concat(JSON.parse(next.body.toString("utf8")));
      }
    }
    await store(base, "rest", { ...first, body: Buffer.from(JSON.stringify(data, null, 1)) }, { items: Array.isArray(data) ? data.length : undefined });
    collectLinks(data, links);
    if (route === "/wp/v2/media" && Array.isArray(data)) for (const m of data) if (m.link) attachmentPages.add(m.link);
  });
  await saveManifest();
  return links;
}

/** Public URLs mentioned by REST items (link, source_url, media sizes). */
function collectLinks(data, links) {
  const visit = (v) => {
    if (typeof v === "string") {
      if (v.startsWith(SOURCE.origin) && !v.includes("/wp-json/")) links.add(v.split("#")[0]);
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "_links") visit(x);
  };
  visit(data);
}

// ---------------------------------------------------------------- Site crawl
// ?p= / ?page_id= / ?attachment_id= are GUID redirects to pretty URLs that are crawled anyway.
const SKIP = /\/(wp-admin|wp-login\.php|wp-json|xmlrpc\.php|wp-cron\.php)|[?&](replytocom|s|share|ical|outlook-ical|p|page_id|attachment_id)=|\/(trackback|embed)\/?$/i;
const isHtmlPath = (u) => !/\.[a-z0-9]{2,5}$/i.test(new URL(u).pathname);
const isPageLike = (u) => isHtmlPath(u) || /\.xml$/i.test(new URL(u).pathname);
/** Attachment pages (one per upload): archived, but their /ml/ copies add nothing. */
const attachmentPages = new Set();

function sameSite(href, base) {
  try {
    const u = new URL(href, base);
    if (u.origin !== SOURCE.origin) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

function linksFromHtml(html, base) {
  const $ = cheerio.load(html);
  const pages = new Set();
  const assets = new Set();
  $("a[href]").each((_, el) => {
    const u = sameSite($(el).attr("href"), base);
    if (u) (isHtmlPath(u) ? pages : assets).add(u);
  });
  $("link[href]").each((_, el) => {
    const rel = ($(el).attr("rel") ?? "").toLowerCase();
    const u = sameSite($(el).attr("href"), base);
    if (!u) return;
    if (/alternate|canonical|next|prev/.test(rel) && isHtmlPath(u)) pages.add(u);
    else assets.add(u);
  });
  $("script[src], img[src], img[data-src], img[data-lazy-src], source[src], video[src], audio[src], video[poster], iframe[src], embed[src], object[data]").each((_, el) => {
    for (const attr of ["src", "data-src", "data-lazy-src", "poster", "data"]) {
      const u = sameSite($(el).attr(attr), base);
      if (u) (isHtmlPath(u) && el.tagName === "iframe" ? pages : assets).add(u);
    }
  });
  $("[srcset], [data-srcset]").each((_, el) => {
    for (const attr of ["srcset", "data-srcset"]) {
      for (const part of ($(el).attr(attr) ?? "").split(",")) {
        const u = sameSite(part.trim().split(/\s+/)[0], base);
        if (u) assets.add(u);
      }
    }
  });
  $("meta[content]").each((_, el) => {
    const c = $(el).attr("content") ?? "";
    if (/^https?:\/\//.test(c)) {
      const u = sameSite(c, base);
      if (u) (isHtmlPath(u) ? pages : assets).add(u);
    }
  });
  for (const u of cssUrls(html, base)) assets.add(u);
  return { pages, assets };
}

function cssUrls(css, base) {
  const out = [];
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) {
    const u = sameSite(m[1] ?? m[2], base);
    if (u && !u.startsWith("data:")) out.push(u);
  }
  return out;
}

/** Uploads already saved by download-media.mjs are recorded, not fetched again. */
async function existingUpload(url) {
  const m = new URL(url).pathname.match(/^\/wp-content\/(uploads\/.+)$/);
  if (!m) return null;
  let rel;
  try {
    rel = decodeURIComponent(m[1]);
  } catch {
    rel = m[1];
  }
  const file = path.join(MEDIA, ...rel.split("/"));
  return (await exists(file)) ? path.relative(OUT, file).replaceAll("\\", "/") : null;
}

async function crawl(seeds) {
  const queued = new Set();
  const pageQueue = [];
  const assetQueue = [];
  const enqueuePage = (u) => {
    if (!u || SKIP.test(u) || queued.has(u) || queued.size > MAX_PAGES * 4) return;
    queued.add(u);
    pageQueue.push(u);
  };
  const enqueueAsset = (u) => {
    if (!u || SKIP.test(u) || queued.has(u)) return;
    queued.add(u);
    assetQueue.push(u);
  };
  for (const s of seeds) (isPageLike(s) ? enqueuePage : enqueueAsset)(s);

  let pagesDone = 0;
  const visitPage = async (url) => {
    if (pagesDone >= MAX_PAGES) return;
    pagesDone++;
    const prior = manifest.get(url);
    let html = null;
    if (done(url) && prior.location) enqueuePage(sameSite(prior.location, url));
    if (done(url) && prior.file) html = await readFile(path.join(OUT, prior.file), "utf8").catch(() => null);
    if (html === null && !done(url)) {
      const res = await get(url);
      const entry = await store(url, "page", res);
      if (entry.location) enqueuePage(sameSite(entry.location, url));
      if (res.status === 200 && /html|xml/.test(entry.type)) html = res.body.toString("utf8");
    }
    if (!html) return;
    if (/<\/(urlset|sitemapindex|rss|feed)>/.test(html)) {
      for (const m of html.matchAll(/<(?:loc|link)>([^<]+)<\/(?:loc|link)>/g)) {
        const u = sameSite(m[1].trim(), url);
        if (u) (isHtmlPath(u) || /sitemap.*\.xml$/.test(u) ? enqueuePage : enqueueAsset)(u);
      }
      return;
    }
    const { pages, assets } = linksFromHtml(html, url);
    pages.forEach(enqueuePage);
    assets.forEach(enqueueAsset);
    // TranslatePress keeps its Malayalam interface strings only in the rendered /ml/ pages.
    const p = new URL(url);
    if (!p.pathname.startsWith("/ml/") && !p.search && !attachmentPages.has(url)) enqueuePage(new URL(`/ml${p.pathname}`, SOURCE).href);
  };

  const visitAsset = async (url) => {
    if (done(url)) {
      const e = manifest.get(url);
      if (e.type === "text/css" && e.file) for (const u of cssUrls(await readFile(path.join(OUT, e.file), "utf8").catch(() => ""), url)) enqueueAsset(u);
      return;
    }
    const existing = await existingUpload(url);
    if (existing) return void manifest.set(url, { url, kind: "asset", status: 200, file: existing, note: "saved earlier by download-media.mjs" });
    const res = await get(url);
    const entry = await store(url, "asset", res);
    if (entry.location) enqueueAsset(sameSite(entry.location, url));
    if (res.status === 200 && entry.type === "text/css") for (const u of cssUrls(res.body.toString("utf8"), url)) enqueueAsset(u);
  };

  // Pages first (they discover assets), then assets; repeat until nothing new turns up.
  let round = 0;
  while (pageQueue.length || assetQueue.length) {
    round++;
    const pages = pageQueue.splice(0);
    await pool(pages, visitPage);
    await saveManifest();
    const assets = assetQueue.splice(0);
    await pool(assets, visitAsset);
    await saveManifest();
    console.log(`round ${round}: ${pages.length} pages, ${assets.length} assets (manifest ${manifest.size})`);
  }
}

await mkdir(OUT, { recursive: true });
const restLinks = await archiveRest();
const seeds = new Set([
  SOURCE.href,
  new URL("/ml/", SOURCE).href,
  new URL("/robots.txt", SOURCE).href,
  new URL("/sitemap_index.xml", SOURCE).href,
  new URL("/feed/", SOURCE).href,
  new URL("/comments/feed/", SOURCE).href,
  ...restLinks,
]);
// Pages crawled earlier by crawl.mjs are fetched again here so the archive is self-contained.
await crawl([...seeds]);
await saveManifest();

const entries = [...manifest.values()];
const by = (f) => entries.reduce((acc, e) => ((acc[f(e)] = (acc[f(e)] ?? 0) + 1), acc), {});
const summary = { source: SOURCE.origin, at: new Date().toISOString(), total: entries.length, byKind: by((e) => e.kind), byStatus: by((e) => e.status) };
await writeFile(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
