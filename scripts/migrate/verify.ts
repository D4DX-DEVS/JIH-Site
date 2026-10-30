// Verifies the WordPress import against the source extract and writes docs/MIGRATION_REPORT.md.
// Read-only: it queries D1 and HEADs R2 objects, and never writes to either.
//   npm run migrate:verify             (local D1/R2 emulation)
//   npm run migrate:verify -- --remote --yes-i-have-approval
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { isNotNull, sql } from "drizzle-orm";
import * as schema from "../../src/db/schema";
import { connect, DATA, parseArgs, readJson, readSource, type Db } from "./lib/context";

const opts = parseArgs(process.argv.slice(2));
if (opts.remote && !process.argv.includes("--yes-i-have-approval")) {
  console.error("Refusing to read remote bindings without --yes-i-have-approval.");
  process.exit(1);
}

interface Source {
  id: number;
  status?: string;
  categories?: number[];
  featured_media?: number;
}

interface Row {
  type: string;
  discovered: number;
  imported: number;
  inDatabase: number;
  verified: number;
  failed: number;
  skipped: number;
  unresolved: number;
  notes: string[];
}

const { db, bucket, dispose } = await connect(opts);

async function ledgerCounts(type: string) {
  const rows = await db
    .select({ status: schema.migrationItems.status, n: sql<number>`count(*)` })
    .from(schema.migrationItems)
    .where(sql`${schema.migrationItems.sourceType} = ${type}`)
    .groupBy(schema.migrationItems.status);
  const c = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  return { imported: c.imported ?? 0, failed: c.failed ?? 0, skipped: c.skipped ?? 0, unresolved: c.unresolved ?? 0 };
}

async function wpIds(table: typeof schema.posts | typeof schema.pages | typeof schema.categories | typeof schema.tags | typeof schema.leaders | typeof schema.galleries | typeof schema.videos | typeof schema.galleryCategories | typeof schema.media): Promise<Set<number>> {
  const rows = await (db as Db).select({ id: table.wpId }).from(table).where(isNotNull(table.wpId));
  return new Set(rows.map((r) => r.id as number));
}

const exists = new Map<string, boolean>();
async function inR2(key: string): Promise<boolean> {
  // Remote R2 through the platform proxy returns occasional HTTP 500s; retry before judging.
  for (let attempt = 1; !exists.has(key); attempt++) {
    try {
      exists.set(key, (await bucket.head(key)) !== null);
    } catch (err) {
      if (attempt >= 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  return exists.get(key)!;
}

const rows: Row[] = [];
const problems: string[] = [];

/** Compares one WordPress collection with its D1 table by wpId. */
async function compare(type: string, file: string, table: Parameters<typeof wpIds>[0], extra?: (present: Set<number>, source: Source[]) => Promise<{ verified: number; notes: string[] }>) {
  // Public items plus admin-only drafts (imported as drafts); trashed items are not migrated.
  const source = (await readSource<Source>(`${file}.json`)).filter((s) => s.status !== "trash");
  const present = await wpIds(table);
  const missing = source.filter((s) => !present.has(s.id)).map((s) => s.id);
  const ledger = await ledgerCounts(type);
  const check = extra ? await extra(present, source) : { verified: source.length - missing.length, notes: [] };
  const notes = [...check.notes];
  if (missing.length) notes.push(`not in D1: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? " …" : ""}`);
  rows.push({ type, discovered: source.length, inDatabase: source.length - missing.length, ...ledger, verified: check.verified, notes });
}

// Posts: present, category links and featured images intact.
await compare("post", "posts", schema.posts, async (present, source) => {
  const cats = new Map((await db.select({ id: schema.categories.id, wpId: schema.categories.wpId }).from(schema.categories)).map((c) => [c.wpId, c.id]));
  const posts = new Map((await db.select({ id: schema.posts.id, wpId: schema.posts.wpId, featured: schema.posts.featuredMediaId }).from(schema.posts)).map((p) => [p.wpId, p]));
  const links = await db.select({ postId: schema.postCategories.postId, categoryId: schema.postCategories.categoryId }).from(schema.postCategories);
  const linked = new Set(links.map((l) => `${l.postId}:${l.categoryId}`));
  const failedMedia = new Set((await db.select({ id: schema.migrationItems.sourceId }).from(schema.migrationItems).where(sql`${schema.migrationItems.sourceType} = 'media' and ${schema.migrationItems.status} = 'failed'`)).map((m) => Number(m.id)));
  let verified = 0;
  let missingLinks = 0;
  let missingImages = 0;
  for (const s of source) {
    const p = posts.get(s.id);
    if (!p || !present.has(s.id)) continue;
    const linksOk = (s.categories ?? []).every((c) => !cats.has(c) || linked.has(`${p.id}:${cats.get(c)}`));
    const imageOk = !s.featured_media || !!p.featured || failedMedia.has(s.featured_media);
    if (!linksOk) missingLinks++;
    if (!imageOk) missingImages++;
    if (linksOk && imageOk) verified++;
  }
  const notes: string[] = [];
  if (missingLinks) notes.push(`${missingLinks} posts lost a category link`);
  if (missingImages) notes.push(`${missingImages} posts lost their featured image`);
  return { verified, notes };
});
await compare("page", "pages", schema.pages);
await compare("category", "categories", schema.categories);
await compare("tag", "tags", schema.tags);
await compare("leader", "leadership", schema.leaders);
await compare("gallery-category", "image-category", schema.galleryCategories);
await compare("video", "video-gallery", schema.videos);
await compare("gallery", "image-gallery", schema.galleries, async (present, source) => {
  const counts = await db
    .select({ wpId: schema.galleries.wpId, n: sql<number>`(select count(*) from ${schema.galleryImages} gi where gi.gallery_id = ${schema.galleries.id})` })
    .from(schema.galleries);
  const empty = counts.filter((c) => c.wpId && c.n === 0).map((c) => c.wpId);
  return { verified: source.filter((s) => present.has(s.id) && !empty.includes(s.id)).length, notes: empty.length ? [`galleries without images: ${empty.join(", ")}`] : [] };
});

// Media: every row's original and size variants must exist in R2.
{
  const source = await readSource<Source>("media.json");
  const media = await db.select({ id: schema.media.id, wpId: schema.media.wpId, key: schema.media.r2Key, variants: schema.media.variants }).from(schema.media);
  const ledger = await ledgerCounts("media");
  let verified = 0;
  const missingObjects: string[] = [];
  for (const m of media) {
    const keys = [m.key, ...m.variants.map((v) => v.key)];
    const ok = (await Promise.all(keys.map(inR2))).every(Boolean);
    if (ok) verified++;
    else missingObjects.push(m.key);
  }
  const notes = [`${media.length} media rows (${media.length - media.filter((m) => m.wpId).length} added for files referenced only in content or settings)`];
  if (missingObjects.length) {
    notes.push(`${missingObjects.length} rows missing an R2 object`);
    problems.push(...missingObjects.map((k) => `R2 object missing for media row: ${k}`));
  }
  rows.push({ type: "media", discovered: source.length, inDatabase: media.filter((m) => m.wpId).length, ...ledger, verified, notes });
}

// Content: every /media/uploads/ reference resolves in R2; no links left on the old hosts. Both languages.
const contentRows = [
  ...(await db.select({ kind: sql<string>`'post'`, slug: schema.posts.slug, html: sql<string>`${schema.posts.contentHtml} || ' ' || ${schema.posts.contentHtmlEn}` }).from(schema.posts)),
  ...(await db.select({ kind: sql<string>`'page'`, slug: schema.pages.slug, html: sql<string>`${schema.pages.contentHtml} || ' ' || ${schema.pages.contentHtmlEn}` }).from(schema.pages)),
  ...(await db.select({ kind: sql<string>`'leader'`, slug: schema.leaders.slug, html: sql<string>`${schema.leaders.bioHtml} || ' ' || ${schema.leaders.bioHtmlEn}` }).from(schema.leaders)),
];
let references = 0;
const brokenRefs = new Set<string>();
const oldHost: string[] = [];
for (const r of contentRows) {
  for (const m of r.html.matchAll(/\/media\/(uploads\/[^"'\s)<>?#]+)/g)) {
    references++;
    const key = decodeURIComponent(m[1]);
    if (!(await inR2(key))) brokenRefs.add(`${r.kind} /${r.slug}/ → ${key}`);
  }
  if (/cloudwaysapps\.com|jihkerala\.org\/wp-content/.test(r.html)) oldHost.push(`${r.kind} /${r.slug}/`);
}
problems.push(...[...brokenRefs].map((b) => `Content image missing in R2: ${b}`));
problems.push(...oldHost.map((o) => `The old staging hostname (cloudwaysapps.com) still appears in the text of ${o}; an editor must correct it (it is in the source content)`));

// Redirects to media files must point at objects that exist.
const redirects = await db.select({ from: schema.redirects.fromPath, to: schema.redirects.toPath, source: schema.redirects.source }).from(schema.redirects);
let brokenRedirects = 0;
for (const r of redirects) {
  if (!r.to.startsWith("/media/")) continue;
  if (!(await inR2(decodeURIComponent(r.to.replace(/^\/media\//, ""))))) {
    brokenRedirects++;
    problems.push(`Redirect ${r.from} → ${r.to} points at a missing file`);
  }
}

// Ledger items that need a person.
const followUps = await db
  .select({ type: schema.migrationItems.sourceType, id: schema.migrationItems.sourceId, status: schema.migrationItems.status, url: schema.migrationItems.sourceUrl, message: schema.migrationItems.message })
  .from(schema.migrationItems)
  .where(sql`${schema.migrationItems.status} in ('failed', 'unresolved', 'skipped')`)
  .orderBy(schema.migrationItems.status, schema.migrationItems.sourceType, schema.migrationItems.sourceId);

await dispose();

// ---- Report ----
const totals = {
  references,
  brokenReferences: brokenRefs.size,
  oldHostLinks: oldHost.length,
  redirects: redirects.length,
  brokenRedirects,
  r2ObjectsChecked: exists.size,
};
const table = [
  "| Item | Discovered | Imported | In D1 | Verified | Failed | Skipped | Unresolved | Notes |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---|",
  ...rows.map((r) => `| ${r.type} | ${r.discovered} | ${r.imported} | ${r.inDatabase} | ${r.verified} | ${r.failed} | ${r.skipped} | ${r.unresolved} | ${r.notes.join("; ") || "—"} |`),
];
const esc = (s: string) => s.replace(/\|/g, "\\|");
const report = `# Migration report

Generated by \`npm run migrate:verify\` on ${new Date().toISOString()} against the ${opts.remote ? "**production**" : "local (emulated)"} D1 database and R2 bucket.
Source: the WordPress REST API and public pages of https://wordpress-1683093-6756662.cloudwaysapps.com, extracted to \`migration/data/\`.

**Discovered** is what the public WordPress API listed. **Imported** and **Failed / Skipped / Unresolved** come from the import ledger (\`migration_items\`, also visible in Admin → Activity log → WordPress import). **In D1** is the number of source items found in the database by WordPress id. **Verified** means the item is in D1 and its checks passed (posts: category links and featured image; galleries: at least one image; media: original and every size variant present in R2).

## Summary

${table.join("\n")}

## Content checks

- ${references} image and file references inside posts, pages and leader biographies; ${brokenRefs.size} do not resolve in R2.
- ${oldHost.length} items still mention the old staging hostname in their text.
- ${redirects.length} redirects; ${brokenRedirects} point at a missing media file.
- ${exists.size} distinct R2 objects checked.

${problems.length ? `### Problems found\n\n${problems.map((p) => `- ${p}`).join("\n")}\n` : "No problems found in these checks.\n"}
## Items that were not imported or need a decision

| Type | Id | Outcome | Reason |
|---|---|---|---|
${followUps.map((f) => `| ${f.type} | ${f.id} | ${f.status} | ${esc(f.message)} |`).join("\n")}

## What these mean and what to do

- **media failed (HTTP 404):** the WordPress media library lists these files but the server returns "not found" for them, so there was nothing to copy. Content that pointed at them was already broken on the old site. Re-upload them in Admin → Media library if the originals are found.
- **media-private (unresolved):** the REST API reports more media than it lists publicly. Exporting them needs a WordPress administrator login or a full export (Tools → Export, or the uploads folder). Re-run \`npm run migrate:extract\` and \`npm run migrate:import\` with that access to bring them in.
- **translatepress (unresolved):** the /ml/ language prefix only translated interface strings; every /ml/… address now redirects to the canonical page. A TranslatePress export is needed only if those strings must be kept.
- **settings issues (unresolved):** the contact email and Facebook link on the old site contain the staging hostname. Correct them in Admin → Settings & SEO.
- **skipped items** were left out on purpose: spam comments, the Elementor popup template, WordPress user accounts, the WordPress posts index page and the language switcher.
`;

await mkdir("docs", { recursive: true });
await writeFile(path.resolve("docs/MIGRATION_REPORT.md"), report);
await writeFile(path.join(DATA, "_verify-report.json"), JSON.stringify({ at: new Date().toISOString(), remote: opts.remote, rows, totals, problems }, null, 2));

console.log(table.join("\n"));
console.log(`\nreferences=${references} broken=${brokenRefs.size} oldHost=${oldHost.length} redirects=${redirects.length} brokenRedirects=${brokenRedirects} r2Checked=${exists.size}`);
console.log(`problems: ${problems.length}. Report written to docs/MIGRATION_REPORT.md`);
const hardFailures = rows.some((r) => r.inDatabase < r.discovered - r.failed - r.skipped - r.unresolved) || brokenRefs.size > 0 || brokenRedirects > 0;
process.exit(hardFailures ? 1 : 0);
