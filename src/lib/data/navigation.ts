import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { navItems, type NavMenu } from "@/db/schema";
import type { Locale } from "@/lib/i18n/config";
import { contentLocale, inLocale } from "@/lib/i18n/content";

export interface NavLink {
  id: number;
  label: string;
  /** The label's language: the requested one unless only the other was filled in. */
  lang: Locale;
  /** Stored without a language; the site's Link adds /en/ on the English site. */
  url: string;
  children: NavLink[];
}

export async function getNavigation(menu: NavMenu, locale: Locale): Promise<NavLink[]> {
  "use cache";
  cacheTag("navigation");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db.select().from(navItems).where(eq(navItems.menu, menu)).orderBy(asc(navItems.sortOrder), asc(navItems.id));
  const byParent = new Map<number | null, typeof rows>();
  for (const row of rows) byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
  const build = (parentId: number | null): NavLink[] =>
    (byParent.get(parentId) ?? []).map((r) => {
      const lang = contentLocale(locale, r.label, r.labelEn);
      return { id: r.id, label: inLocale(lang, r.label, r.labelEn), lang, url: r.url, children: build(r.id) };
    });
  return build(null);
}
