import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import { navItems, type NavMenu } from "@/db/schema";

export interface NavLink {
  id: number;
  label: string;
  url: string;
  children: NavLink[];
}

export async function getNavigation(menu: NavMenu): Promise<NavLink[]> {
  "use cache";
  cacheTag("navigation");
  cacheLife("minutes");
  const db = await getDb();
  const rows = await db.select().from(navItems).where(eq(navItems.menu, menu)).orderBy(asc(navItems.sortOrder), asc(navItems.id));
  const byParent = new Map<number | null, typeof rows>();
  for (const row of rows) byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
  const build = (parentId: number | null): NavLink[] =>
    (byParent.get(parentId) ?? []).map((r) => ({ id: r.id, label: r.label, url: r.url, children: build(r.id) }));
  return build(null);
}
