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
  const slug = slugOrTitle(data.slug, data.name || data.nameEn);
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

  const row = { name: data.name, nameEn: data.nameEn, slug, description: data.description, descriptionEn: data.descriptionEn, parentId: data.parentId, updatedAt: new Date().toISOString() };
  let categoryId = id;
  if (id) {
    const [updated] = await db.update(categories).set(row).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!updated) return { ok: false, error: "This category no longer exists." };
  } else {
    const [created] = await db.insert(categories).values(row).returning({ id: categories.id });
    categoryId = created.id;
  }
  const name = data.name || data.nameEn;
  await logActivity(session.actor, id ? "update" : "create", "category", categoryId!, `${id ? "Updated" : "Created"} category “${name}”`);
  refreshPublic("categories", "posts");
  return { ok: true, id: categoryId!, message: id ? "Category saved" : "Category created" };
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  // post_categories rows cascade; subcategories move to the top level (FK is ON DELETE SET NULL).
  const [row] = await db.delete(categories).where(eq(categories.id, id)).returning({ name: categories.name, nameEn: categories.nameEn });
  if (!row) return { ok: false, error: "Category not found" };
  const name = row.name || row.nameEn;
  await logActivity(session.actor, "delete", "category", id, `Deleted category “${name}”`);
  refreshPublic("categories", "posts");
  return { ok: true, message: "Category deleted" };
}
