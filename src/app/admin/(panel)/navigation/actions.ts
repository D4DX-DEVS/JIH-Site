"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { navItems } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { fieldError, invalidResult, type FormResult } from "@/lib/admin/form-result";
import { requireAdmin } from "@/lib/auth/session";
import { navItemSchema, type NavItemFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

/** Menus are two levels deep: top-level links, each with an optional dropdown of children. */
export async function saveNavItemAction(id: number | null, values: NavItemFormValues): Promise<FormResult> {
  const session = await requireAdmin();
  const parsed = navItemSchema.safeParse(values);
  if (!parsed.success) return invalidResult(parsed.error);
  const data = parsed.data;
  const db = await getDb();

  if (data.parentId) {
    const [parent] = await db.select({ menu: navItems.menu, parentId: navItems.parentId }).from(navItems).where(eq(navItems.id, data.parentId)).limit(1);
    if (!parent || parent.menu !== data.menu) return fieldError("parentId", "Choose a top-level item from the same menu");
    if (parent.parentId) return fieldError("parentId", "Menus go two levels deep; choose a top-level item");
    if (data.parentId === id) return fieldError("parentId", "An item cannot sit under itself");
    if (id) {
      const [child] = await db.select({ id: navItems.id }).from(navItems).where(eq(navItems.parentId, id)).limit(1);
      if (child) return fieldError("parentId", "This item has its own sub-items, so it must stay at the top level");
    }
  }
  if (!data.url && data.parentId) return fieldError("url", "Sub-items need a link");

  let itemId = id;
  if (id) {
    const [updated] = await db
      .update(navItems)
      .set({ label: data.label, url: data.url, parentId: data.parentId, menu: data.menu, updatedAt: new Date().toISOString() })
      .where(eq(navItems.id, id))
      .returning({ id: navItems.id });
    if (!updated) return { ok: false, error: "This menu item no longer exists." };
  } else {
    const siblings = data.parentId ? eq(navItems.parentId, data.parentId) : isNull(navItems.parentId);
    const [{ max }] = await db.select({ max: sql<number | null>`max(${navItems.sortOrder})` }).from(navItems).where(and(eq(navItems.menu, data.menu), siblings));
    const [created] = await db
      .insert(navItems)
      .values({ menu: data.menu, label: data.label, url: data.url, parentId: data.parentId, sortOrder: (max ?? -1) + 1 })
      .returning({ id: navItems.id });
    itemId = created.id;
  }
  await logActivity(session.actor, id ? "update" : "create", "navigation", itemId!, `${id ? "Updated" : "Added"} ${data.menu} menu item “${data.label}”`);
  refreshPublic("navigation");
  return { ok: true, id: itemId!, message: id ? "Menu item saved" : "Menu item added" };
}

/** Swaps an item with its neighbour among siblings. Sort orders are renumbered first so gaps and ties cannot block a move. */
export async function moveNavItemAction(id: number, direction: "up" | "down"): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [item] = await db.select().from(navItems).where(eq(navItems.id, id)).limit(1);
  if (!item) return { ok: false, error: "Menu item not found" };
  const siblings = await db
    .select({ id: navItems.id })
    .from(navItems)
    .where(and(eq(navItems.menu, item.menu), item.parentId ? eq(navItems.parentId, item.parentId) : isNull(navItems.parentId)))
    .orderBy(asc(navItems.sortOrder), asc(navItems.id));
  const order = siblings.map((s) => s.id);
  const from = order.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= order.length) return { ok: false, error: `Already ${direction === "up" ? "first" : "last"}` };
  [order[from], order[to]] = [order[to], order[from]];
  const [first, ...rest] = order.map((itemId, index) => db.update(navItems).set({ sortOrder: index }).where(eq(navItems.id, itemId)));
  await db.batch([first, ...rest]);
  await logActivity(session.actor, "update", "navigation", id, `Moved “${item.label}” ${direction} in the ${item.menu} menu`);
  refreshPublic("navigation");
  return { ok: true, message: "Order saved" };
}

export async function deleteNavItemAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  // Sub-items cascade with their parent (FK ON DELETE CASCADE).
  const [row] = await db.delete(navItems).where(eq(navItems.id, id)).returning({ label: navItems.label, menu: navItems.menu });
  if (!row) return { ok: false, error: "Menu item not found" };
  await logActivity(session.actor, "delete", "navigation", id, `Removed “${row.label}” from the ${row.menu} menu`);
  refreshPublic("navigation");
  return { ok: true, message: "Menu item removed" };
}
