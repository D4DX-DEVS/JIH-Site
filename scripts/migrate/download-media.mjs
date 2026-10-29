#!/usr/bin/env node
// Stage 3 of the WordPress migration: download media files into migration/data/media/uploads/…
// Downloads every media-library original, the proportional size variants we serve as srcset
// candidates, and every /wp-content/uploads/ URL referenced from crawled HTML.
// Safe to rerun: files already on disk are skipped.
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const SOURCE = process.env.WP_SOURCE_URL ?? "https://wordpress-1683093-6756662.cloudwaysapps.com";
const RAW = path.resolve("migration/data/raw");
const ADMIN = path.resolve("migration/data/admin"); // extract-admin.mjs output, when present
const HTML = path.resolve("migration/data/html");
const OUT = path.resolve("migration/data/media");
const CONCURRENCY = 8;
export const VARIANT_SIZES = ["medium", "medium_large", "large", "1536x1536"];

const uploadsPath = (url) => {
  const m = url.match(/\/wp-content\/uploads\/(.+?)(?:[?#].*)?$/);
  return m ? `uploads/${decodeURIComponent(m[1])}` : null;
};

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** raw/<file> plus admin/<file> (drafts, unlisted media) when the admin extract exists. */
async function readSource(file) {
  const items = JSON.parse(await readFile(path.join(RAW, file), "utf8"));
  const admin = await readFile(path.join(ADMIN, file), "utf8").catch(() => null);
  return admin ? [...items, ...JSON.parse(admin)] : items;
}

const media = await readSource("media.json");
const wanted = new Map(); // key -> { url, reason }
for (const m of media) {
  const key = uploadsPath(m.source_url);
  if (key) wanted.set(key, { url: m.source_url, reason: `media:${m.id}` });
  for (const size of VARIANT_SIZES) {
    const v = m.media_details?.sizes?.[size];
    const vk = v && uploadsPath(v.source_url);
    if (vk) wanted.set(vk, { url: v.source_url, reason: `variant:${m.id}:${size}` });
  }
}

// Upload URLs referenced from page/post HTML and REST content.
const htmlSources = [
  ...(await walk(HTML)).map((f) => readFile(f, "utf8")),
  ...["posts.json", "pages.json"].map((f) => readFile(path.join(RAW, f), "utf8")),
  ...["posts.json", "pages.json"].map((f) => readFile(path.join(ADMIN, f), "utf8").catch(() => "")),
];
const referenced = new Set();
for (const html of await Promise.all(htmlSources)) {
  const unescaped = html.replace(/\\\//g, "/");
  for (const m of unescaped.matchAll(/https?:\/\/[^"'\s)<>]+?\/wp-content\/uploads\/[^"'\s)<>,]+/g)) {
    const url = m[0].replace(/&amp;/g, "&");
    if (/\.(css|js|json|php)(\?|$)/.test(url)) continue;
    const key = uploadsPath(url);
    if (key && !wanted.has(key)) {
      wanted.set(key, { url: url.replace(/^https?:\/\/[^/]+/, SOURCE), reason: "referenced" });
      referenced.add(key);
    }
  }
}

console.log(`files wanted: ${wanted.size} (${referenced.size} referenced-only)`);

const results = [];
const queue = [...wanted.entries()];
let done = 0;
async function worker() {
  while (queue.length) {
    const [key, { url, reason }] = queue.shift();
    const file = path.join(OUT, key);
    try {
      const existing = await stat(file).catch(() => null);
      if (existing?.size) {
        results.push({ key, url, reason, status: "cached", bytes: existing.size });
      } else {
        const res = await fetch(url, { headers: { "user-agent": "jih-migration/1.0" } });
        if (!res.ok) {
          results.push({ key, url, reason, status: res.status });
        } else {
          const buf = Buffer.from(await res.arrayBuffer());
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, buf);
          results.push({
            key, url, reason, status: "downloaded", bytes: buf.length,
            sha256: createHash("sha256").update(buf).digest("hex"),
            contentType: res.headers.get("content-type"),
          });
        }
      }
    } catch (err) {
      results.push({ key, url, reason, status: "error", error: String(err) });
    }
    done++;
    if (done % 50 === 0) process.stdout.write(`\r${done}/${wanted.size}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const failed = results.filter((r) => typeof r.status === "number" || r.status === "error");
await writeFile(
  path.join(OUT, "_download-report.json"),
  JSON.stringify({ at: new Date().toISOString(), total: results.length, failed: failed.length, results }, null, 2),
);
console.log(`\ndone: ${results.length}, failed: ${failed.length}`);
for (const f of failed.slice(0, 40)) console.log(" ", f.status, f.reason, f.key);
