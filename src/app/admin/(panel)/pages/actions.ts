"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pages } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { rootSlugError, slugOrTitle } from "@/lib/admin/slugs";
import { requireAdmin } from "@/lib/auth/session";
import { htmlToText, sanitizeRichText } from "@/lib/content/sanitize";
import { slugify } from "@/lib/slug";
import { pageSchema, type PageFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export type SaveResult = { ok: true; id: number; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function savePageAction(id: number | null, values: PageFormValues): Promise<SaveResult> {
  const session = await requireAdmin();
  const parsed = pageSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const data = parsed.data;
  const db = await getDb();
  const slug = slugOrTitle(data.slug, slugify(data.title));
  const slugError = await rootSlugError(db, slug, { table: "pages", id: id ?? undefined });
  if (slugError) return { ok: false, error: slugError, fieldErrors: { slug: slugError } };

  const contentHtml = sanitizeRichText(data.contentHtml);
  const text = htmlToText(contentHtml);
  const now = new Date().toISOString();
  const row = {
    title: data.title,
    slug,
    status: data.status,
    summary: data.summary,
    contentHtml,
    searchText: `${data.title} ${data.summary} ${text}`.toLowerCase(),
    featuredMediaId: data.featuredMediaId,
    template: data.template,
    section: data.section,
    hubSection: data.template === "hub" ? data.hubSection : null,
    externalUrl: data.externalUrl,
    sortOrder: data.sortOrder,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    updatedAt: now,
  };

  let pageId = id;
  let previousSlug: string | undefined;
  if (id) {
    const [existing] = await db.select({ slug: pages.slug, publishedAt: pages.publishedAt }).from(pages).where(eq(pages.id, id)).limit(1);
    if (!existing) return { ok: false, error: "This page no longer exists." };
    previousSlug = existing.slug;
    await db
      .update(pages)
      .set({ ...row, publishedAt: existing.publishedAt ?? (data.status === "published" ? now : null) })
      .where(eq(pages.id, id));
  } else {
    const [created] = await db
      .insert(pages)
      .values({ ...row, publishedAt: data.status === "published" ? now : null })
      .returning({ id: pages.id });
    pageId = created.id;
  }

  await logActivity(session.actor, id ? "update" : "create", "page", pageId!, `${id ? "Updated" : "Created"} page “${data.title}”`);
  refreshPublic("pages", `page:${slug}`, ...(previousSlug && previousSlug !== slug ? [`page:${previousSlug}` as const] : []));
  return { ok: true, id: pageId!, slug };
}

export async function deletePageAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [existing] = await db.select({ title: pages.title, slug: pages.slug, template: pages.template }).from(pages).where(eq(pages.id, id)).limit(1);
  if (!existing) return { ok: false, error: "Page not found" };
  if (existing.template !== "default") {
    return {
      ok: false,
      error: `“${existing.title}” uses the ${existing.template} template and drives a section of the site (news, leaders, contact or a hub). Set it to Draft instead of deleting it.`,
    };
  }
  await db.delete(pages).where(eq(pages.id, id));
  await logActivity(session.actor, "delete", "page", id, `Deleted page “${existing.title}”`);
  refreshPublic("pages", `page:${existing.slug}`);
  return { ok: true, message: "Page deleted" };
}
