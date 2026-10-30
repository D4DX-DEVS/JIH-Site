// Separates Malayalam and English in stored content (see scripts/migrate/split-languages.ts).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import { htmlToText, sanitizeRichText, truncateText } from "../../../src/lib/content/sanitize";
import type { Db } from "./context";
import { bilingualSearchText, scriptOf, separateField, separateHtml, separatePageColumns, separatePostColumns } from "./language";
import { CATEGORY_NAMES, LEADER_ROLES, NAV_LABELS, NAV_LABELS_EN, PAGE_TITLES, SETTINGS } from "./malayalam-labels";
import { liftLeadingBlocks, load, normalizeContentHtml } from "./parse";

/** A label's Malayalam when the record has none yet. */
const fill = (ml: string, known: string | undefined) => (ml.trim() || !known ? ml : known);

export interface LanguageChange {
  table: string;
  key: string;
  fields: string[];
}

const ARCHIVE = path.resolve("migration/archive/site");

/** Fields whose value differs, for the report. */
function changed<T extends Record<string, unknown>>(before: T, after: Partial<T>): string[] {
  return Object.keys(after).filter((k) => k !== "searchText" && after[k] !== before[k]);
}

/** Collects changes and writes them unless this is a dry run. */
class Changes {
  readonly list: LanguageChange[] = [];
  constructor(private readonly dryRun: boolean) {}
  async apply(table: string, key: string, fields: string[], write: () => Promise<unknown>) {
    if (!fields.length) return;
    this.list.push({ table, key, fields });
    if (!this.dryRun) await write();
  }
}

/**
 * The TranslatePress /ml/ copy of a page, when it holds a real Malayalam translation of an English body
 * (the history page does; most /ml/ copies only repeat the English).
 */
async function archivedMalayalam(slug: string, title: string): Promise<string> {
  let html: string;
  try {
    html = await readFile(path.join(ARCHIVE, "ml", slug, "index.html"), "utf8");
  } catch {
    return "";
  }
  const $ = load(html);
  const content = $('[data-elementor-type="wp-page"]').first();
  if (!content.length) return "";
  const body = liftLeadingBlocks(sanitizeRichText(normalizeContentHtml($.html(content) ?? "")), title, false).html;
  const text = htmlToText(body);
  const ml = text.match(/[ഀ-ൿ]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  return ml > 200 && ml > latin * 4 ? body : "";
}

async function splitPages(db: Db, changes: Changes) {
  for (const row of await db.select().from(schema.pages)) {
    const next = separatePageColumns(row);
    next.title = fill(next.title, PAGE_TITLES[row.slug]);
    if (!next.contentHtml && next.contentHtmlEn) {
      const archived = await archivedMalayalam(row.slug, row.titleEn || row.title);
      if (archived) {
        next.contentHtml = archived;
        next.summary = next.summary || truncateText(htmlToText(archived), 300);
        next.searchText = bilingualSearchText({ ...next, html: next.contentHtml, htmlEn: next.contentHtmlEn });
      }
    }
    await changes.apply("pages", row.slug, changed(row, next), () => db.update(schema.pages).set(next).where(eq(schema.pages.id, row.id)));
  }
}

async function splitPosts(db: Db, changes: Changes) {
  for (const row of await db.select().from(schema.posts)) {
    const next = separatePostColumns(row);
    await changes.apply("posts", row.slug, changed(row, next), () => db.update(schema.posts).set(next).where(eq(schema.posts.id, row.id)));
  }
}

async function splitCollections(db: Db, changes: Changes) {
  for (const row of await db.select().from(schema.leaders)) {
    const [name, nameEn] = separateField(row.name, row.nameEn);
    const [roleTitleMl, roleTitleEn] = separateField(row.roleTitle, row.roleTitleEn);
    const roleTitle = fill(roleTitleMl, LEADER_ROLES[roleTitleEn]);
    const [bioHtml, bioHtmlEn] = separateHtml(row.bioHtml, row.bioHtmlEn);
    const next = { name, nameEn, roleTitle, roleTitleEn, bioHtml, bioHtmlEn };
    await changes.apply("leaders", row.slug, changed(row, next), () => db.update(schema.leaders).set(next).where(eq(schema.leaders.id, row.id)));
  }
  for (const row of await db.select().from(schema.categories)) {
    const [nameMl, nameEn] = separateField(row.name, row.nameEn);
    const name = fill(nameMl, CATEGORY_NAMES[row.slug]);
    const [description, descriptionEn] = separateField(row.description, row.descriptionEn);
    const next = { name, nameEn, description, descriptionEn };
    await changes.apply("categories", row.slug, changed(row, next), () => db.update(schema.categories).set(next).where(eq(schema.categories.id, row.id)));
  }
  for (const row of await db.select().from(schema.galleryCategories)) {
    const [nameMl, nameEn] = separateField(row.name, row.nameEn);
    const name = fill(nameMl, CATEGORY_NAMES[row.slug]);
    await changes.apply("gallery_categories", row.slug, changed(row, { name, nameEn }), () =>
      db.update(schema.galleryCategories).set({ name, nameEn }).where(eq(schema.galleryCategories.id, row.id)),
    );
  }
  for (const row of await db.select().from(schema.galleries)) {
    const [title, titleEn] = separateField(row.title, row.titleEn);
    const [description, descriptionEn] = separateField(row.description, row.descriptionEn);
    const next = { title, titleEn, description, descriptionEn };
    await changes.apply("galleries", row.slug, changed(row, next), () => db.update(schema.galleries).set(next).where(eq(schema.galleries.id, row.id)));
  }
  for (const row of await db.select().from(schema.videos)) {
    const [title, titleEn] = separateField(row.title, row.titleEn);
    const [description, descriptionEn] = separateField(row.description, row.descriptionEn);
    const next = { title, titleEn, description, descriptionEn };
    await changes.apply("videos", row.slug, changed(row, next), () => db.update(schema.videos).set(next).where(eq(schema.videos.id, row.id)));
  }
  for (const row of await db.select().from(schema.downloads)) {
    const [title, titleEn] = separateField(row.title, row.titleEn);
    const [description, descriptionEn] = separateField(row.description, row.descriptionEn);
    const next = { title, titleEn, description, descriptionEn };
    await changes.apply("downloads", String(row.id), changed(row, next), () => db.update(schema.downloads).set(next).where(eq(schema.downloads.id, row.id)));
  }
  for (const row of await db.select().from(schema.posters)) {
    const [title, titleEn] = separateField(row.title, row.titleEn);
    await changes.apply("posters", String(row.id), changed(row, { title, titleEn }), () => db.update(schema.posters).set({ title, titleEn }).where(eq(schema.posters.id, row.id)));
  }
  for (const row of await db.select().from(schema.navItems)) {
    const [labelMl, splitEn] = separateField(row.label, row.labelEn);
    const label = fill(labelMl, NAV_LABELS[splitEn]);
    const labelEn = fill(splitEn, NAV_LABELS_EN[label]);
    await changes.apply("nav_items", `${row.menu}:${row.url || row.id}`, changed(row, { label, labelEn }), () =>
      db.update(schema.navItems).set({ label, labelEn }).where(eq(schema.navItems.id, row.id)),
    );
  }
}

/** Text settings that come in Malayalam/English pairs (see src/lib/data/settings.ts). */
const SETTING_PAIRS: Record<string, string[]> = {
  site: ["name", "shortName", "tagline", "copyright"],
  seo: ["homeTitle", "defaultDescription"],
  contact: ["organisation", "postBox", "address"],
};

async function splitSettings(db: Db, changes: Changes) {
  for (const row of await db.select().from(schema.settings)) {
    const fields = SETTING_PAIRS[row.key];
    if (!fields || !row.value || typeof row.value !== "object") continue;
    const before = row.value as Record<string, unknown>;
    const value = { ...before };
    for (const field of fields) {
      const ml = typeof value[field] === "string" ? (value[field] as string) : "";
      const en = typeof value[`${field}En`] === "string" ? (value[`${field}En`] as string) : "";
      // Values without letters of either script stay where they are.
      if (scriptOf(ml)) [value[field], value[`${field}En`]] = separateField(ml, en);
      if (typeof value[`${field}En`] === "string" && (value[`${field}En`] as string).trim()) {
        value[field] = fill(value[field] as string, SETTINGS[row.key]?.[field]);
      }
    }
    await changes.apply("settings", row.key, changed(before, value), () => db.update(schema.settings).set({ value }).where(eq(schema.settings.key, row.key)));
  }
}

/**
 * Moves English out of the Malayalam columns of every table into the `…En` columns. Idempotent, and
 * English already in an `…En` column is kept. Returns what changed (or would change, on a dry run).
 */
export async function separateStoredLanguages(db: Db, opts: { dryRun?: boolean } = {}): Promise<LanguageChange[]> {
  const changes = new Changes(!!opts.dryRun);
  await splitPages(db, changes);
  await splitPosts(db, changes);
  await splitCollections(db, changes);
  await splitSettings(db, changes);
  return changes.list;
}
