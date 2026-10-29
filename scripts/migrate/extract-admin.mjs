#!/usr/bin/env node
// Stage 1b of the WordPress migration: what only a logged-in administrator can see.
// Signs in with WP_USERNAME / WP_PASSWORD (read-only: GET requests after login) and writes to
// migration/data/admin/:
//   media.json         attachments the public API does not list (attached to drafts or deleted posts)
//   posts.json         unpublished posts (draft/pending/private/future), imported as drafts
//   pages.json         unpublished pages, imported as drafts
//   form-entries.json  Fluent Forms submissions (personal data; migration/data/ is gitignored)
//   npm run migrate:extract-admin      (reads credentials from .env)
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";

const SOURCE = (process.env.WP_SOURCE_URL ?? "https://wordpress-1683093-6756662.cloudwaysapps.com").replace(/\/$/, "");
const RAW = path.resolve("migration/data/raw");
const OUT = path.resolve("migration/data/admin");
const UNPUBLISHED = "draft,pending,private,future";

if (!process.env.WP_USERNAME || !process.env.WP_PASSWORD) {
  console.error("WP_USERNAME and WP_PASSWORD must be set (see env.example).");
  process.exit(1);
}

const jar = new Map([["wordpress_test_cookie", "WP%20Cookie%20check"]]);
async function request(url, init = {}) {
  const res = await fetch(`${SOURCE}${url}`, {
    redirect: "manual",
    ...init,
    headers: { "user-agent": "jih-migration/1.0", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...init.headers },
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  return res;
}

await request("/wp-login.php");
await request("/wp-login.php", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ log: process.env.WP_USERNAME, pwd: process.env.WP_PASSWORD, "wp-submit": "Log In", redirect_to: `${SOURCE}/wp-admin/`, testcookie: "1" }),
});
if (![...jar.keys()].some((k) => k.startsWith("wordpress_logged_in_"))) {
  console.error("WordPress login failed (check the credentials, or a captcha/2FA plugin).");
  process.exit(1);
}
const nonce = (await (await request("/wp-admin/admin-ajax.php?action=rest-nonce")).text()).trim();

async function getJson(route, attempt = 1) {
  const res = await request(`/wp-json${route}`, { headers: { "x-wp-nonce": nonce } });
  if (!res.ok) {
    if (attempt < 4 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return getJson(route, attempt + 1);
    }
    throw new Error(`${res.status} ${res.statusText} for ${route}`);
  }
  return { body: await res.json(), headers: res.headers };
}

async function fetchAll(route) {
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { body, headers } = await getJson(`${route}${route.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
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

const readRaw = async (file) => JSON.parse(await readFile(path.join(RAW, file), "utf8"));

/** Drafts often have no slug or GMT date yet; give them stable, unique values. */
function normaliseDrafts(items, taken) {
  return items.map((p) => {
    let slug = p.slug || p.generated_slug || `draft-${p.id}`;
    if (taken.has(slug)) slug = `${slug}-${p.id}`;
    taken.add(slug);
    return { ...p, slug, date_gmt: p.date_gmt ?? p.modified_gmt ?? p.date };
  });
}

await mkdir(OUT, { recursive: true });
const summary = {};

const publicMedia = new Set((await readRaw("media.json")).map((m) => m.id));
const media = (await fetchAll("/wp/v2/media?context=edit&status=inherit,private&orderby=id&order=asc")).filter((m) => !publicMedia.has(m.id));
await save("media.json", media);
summary.media = { count: media.length };
console.log(`media not publicly listed: ${media.length}`);

for (const type of ["posts", "pages"]) {
  const taken = new Set((await readRaw(`${type}.json`)).map((p) => decodeURIComponent(p.slug)));
  const drafts = normaliseDrafts(await fetchAll(`/wp/v2/${type}?context=edit&status=${UNPUBLISHED}&orderby=id&order=asc`), taken);
  await save(`${type}.json`, drafts);
  summary[type] = { count: drafts.length, statuses: [...new Set(drafts.map((d) => d.status))] };
  console.log(`unpublished ${type}: ${drafts.length}`);
}

const { body: formList } = await getJson("/fluentform/v1/forms?per_page=100");
const forms = formList.data ?? [];
const entries = [];
for (const f of forms) {
  for (let page = 1; ; page++) {
    const { body } = await getJson(`/fluentform/v1/submissions?form_id=${f.id}&per_page=100&page=${page}`);
    for (const e of body.data ?? []) {
      entries.push({ id: e.id, formId: Number(f.id), formTitle: f.title, status: e.status, createdAt: e.created_at, response: JSON.parse(e.response ?? "{}") });
    }
    if ((body.data ?? []).length < 100 || page >= (body.last_page ?? Infinity)) break;
  }
}
await save("form-entries.json", entries);
summary.formEntries = Object.fromEntries(forms.map((f) => [f.title, entries.filter((e) => e.formId === Number(f.id)).length]));
console.log(`form entries: ${entries.length} ${JSON.stringify(summary.formEntries)}`);

await save("_admin-extract-summary.json", { at: new Date().toISOString(), summary });
