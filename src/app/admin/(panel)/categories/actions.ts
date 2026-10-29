"use server";

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { fieldError, invalidResult, type FormResult } from "@/lib/admin/form-result";
import { slugOrTitle } from "@/lib/admin/slugs";
import { requireAdmin } from "@/lib/auth/session";
import { categorySchema, type CategoryFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export async function saveCategoryAction(id: number | null, values: CategoryFormValues): Promise<FormResult> {
  const session = await requireAdmin();
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return invalidResult(parsed.error);
  const data = parsed.data;
  const db = await getDb();
  const slug = slugOrTitle(data.slug, data.name);
  if (!slug) return fieldError("slug", "Slug is required");

  const [clash] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(id ? and(eq(categories.slug, slug), ne(categories.id, id)) : eq(categories.slug, slug))
    .limit(1);
  if (clash) return fieldError("slug", "Another category already uses this slug");

  if (data.parentId) {
    // Walk up from the chosen parent; reaching this category would create a loop.
    const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
    const parentOf = new Map(all.map((c) => [c.id, c.parentId]));
    if (!parentOf.has(data.parentId)) return fieldError("parentId", "The chosen parent no longer exists");
    for (let cursor: number | null | undefined = data.parentId, steps = 0; cursor && steps < 50; cursor = parentOf.get(cursor), steps++) {
      if (cursor === id) return fieldError("parentId", "A category cannot sit inside itself or one of its subcategories");
    }
  }

  const row = { name: data.name, slug, description: data.description, parentId: data.parentId, updatedAt: new Date().toISOString() };
  let categoryId = id;
  if (id) {
    const [updated] = await db.update(categories).set(row).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!updated) return { ok: false, error: "This category no longer exists." };
  } else {
    const [created] = await db.insert(categories).values(row).returning({ id: categories.id });
    categoryId = created.id;
  }
  await logActivity(session.actor, id ? "update" : "create", "category", categoryId!, `${id ? "Updated" : "Created"} category “${data.name}”`);
  refreshPublic("categories", "posts");
  return { ok: true, id: categoryId!, message: id ? "Category saved" : "Category created" };
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  // post_categories rows cascade; subcategories move to the top level (FK is ON DELETE SET NULL).
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning({ name: categories.name });
  if (!row) return { ok: false, error: "Category not found" };
  await logActivity(session.actor, "delete", "category", id, `Deleted category “${row.name}”`);
  refreshPublic("categories", "posts");
  return { ok: true, message: "Category deleted" };
}
