#!/usr/bin/env node
// Stage 1 of the WordPress migration: pull every public REST collection into
// migration/data/raw/*.json. Safe to rerun; files are overwritten atomically.
import { mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const SOURCE = process.env.WP_SOURCE_URL ?? "https://wordpress-1683093-6756662.cloudwaysapps.com";
const OUT = path.resolve(process.argv[2] ?? "migration/data/raw");

// Collections we migrate. `context=view` is all that is available without credentials.
const COLLECTIONS = [
  "posts",
  "pages",
  "media",
  "categories",
  "tags",
  "image-gallery",
  "video-gallery",
  "leadership",
  "image-category",
  "jet-popup",
  "users",
];

async function getJson(url, attempt = 1) {
  const res = await fetch(url, { headers: { "user-agent": "jih-migration/1.0" } });
  if (!res.ok) {
    if (attempt < 4 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return getJson(url, attempt + 1);
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return { body: await res.json(), headers: res.headers };
}

async function fetchCollection(name) {
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${SOURCE}/wp-json/wp/v2/${name}?per_page=100&page=${page}&orderby=id&order=asc`;
    const { body, headers } = await getJson(url);
    totalPages = Number(headers.get("x-wp-totalpages") ?? 1);
    items.push(...body);
    page++;
  } while (page <= totalPages);
  return items;
}

async function save(file, data) {
  const target = path.join(OUT, file);
  await writeFile(`${target}.tmp`, JSON.stringify(data, null, 2));
  await rename(`${target}.tmp`, target);
}

await mkdir(OUT, { recursive: true });
const summary = {};
for (const name of COLLECTIONS) {
  try {
    const items = await fetchCollection(name);
    await save(`${name}.json`, items);
    summary[name] = { count: items.length };
    console.log(`${name}: ${items.length}`);
  } catch (err) {
    summary[name] = { error: String(err) };
    console.error(`${name}: FAILED ${err}`);
  }
}

// Site-level metadata (name, description, front page ids).
try {
  const { body } = await getJson(`${SOURCE}/wp-json/`);
  await save("site.json", {
    name: body.name,
    description: body.description,
    url: body.url,
    page_on_front: body.page_on_front,
    page_for_posts: body.page_for_posts,
    site_logo: body.site_logo,
    site_icon: body.site_icon,
    site_icon_url: body.site_icon_url,
  });
} catch (err) {
  summary.site = { error: String(err) };
}

await save("_extract-summary.json", { source: SOURCE, at: new Date().toISOString(), summary });
