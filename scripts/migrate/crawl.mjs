#!/usr/bin/env node
// Stage 2 of the WordPress migration: cache the rendered HTML of every public URL.
// Needed because JetEngine CPTs (leadership, galleries, videos) and Rank Math SEO
// metadata are not exposed through the REST API without admin credentials.
// Safe to rerun: existing cache files are skipped unless --refresh is passed.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const SOURCE = process.env.WP_SOURCE_URL ?? "https://wordpress-1683093-6756662.cloudwaysapps.com";
const RAW = path.resolve("migration/data/raw");
const OUT = path.resolve("migration/data/html");
const refresh = process.argv.includes("--refresh");

const load = async (f) => JSON.parse(await readFile(path.join(RAW, f), "utf8"));
const exists = (p) => access(p).then(() => true, () => false);

async function sitemapUrls() {
  const index = await (await fetch(`${SOURCE}/sitemap_index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const map of maps) {
    const xml = await (await fetch(map)).text();
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !/\.(jpe?g|png|webp|gif)$/i.test(u)));
  }
  return urls;
}

const targets = new Map(); // url -> { kind, id }
for (const [file, kind] of [
  ["pages.json", "page"],
  ["posts.json", "post"],
  ["leadership.json", "leadership"],
  ["image-gallery.json", "image-gallery"],
  ["video-gallery.json", "video-gallery"],
  ["categories.json", "category"],
]) {
  for (const item of await load(file)) targets.set(item.link, { kind, id: item.id });
}
const fromSitemap = await sitemapUrls();
for (const url of fromSitemap) if (!targets.has(url)) targets.set(url, { kind: "sitemap-only", id: null });
// Archive listings that exist outside the sitemaps.
for (const p of ["/leadership/", "/image-gallery/", "/video-gallery/"]) targets.set(`${SOURCE}${p}`, { kind: "archive", id: p.replaceAll("/", "") });

const report = [];
let i = 0;
for (const [url, { kind, id }] of targets) {
  const dir = path.join(OUT, kind);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id ?? Buffer.from(url).toString("base64url").slice(-40)}.html`);
  i++;
  if (!refresh && (await exists(file))) {
    report.push({ url, kind, id, file: path.relative(OUT, file), status: "cached" });
    continue;
  }
  try {
    const res = await fetch(url, { headers: { "user-agent": "jih-migration/1.0" }, redirect: "manual" });
    const body = res.status === 200 ? await res.text() : "";
    if (body) await writeFile(file, body);
    report.push({ url, kind, id, status: res.status, location: res.headers.get("location"), file: body ? path.relative(OUT, file) : null });
    process.stdout.write(`\r${i}/${targets.size} ${res.status}   `);
  } catch (err) {
    report.push({ url, kind, id, status: "error", error: String(err) });
  }
}
await writeFile(path.join(OUT, "_crawl-report.json"), JSON.stringify({ at: new Date().toISOString(), sitemapUrls: fromSitemap.length, report }, null, 2));
const failed = report.filter((r) => r.status !== 200 && r.status !== "cached");
console.log(`\ncrawled ${report.length}, non-200: ${failed.length}`);
for (const f of failed) console.log(" ", f.status, f.url);
