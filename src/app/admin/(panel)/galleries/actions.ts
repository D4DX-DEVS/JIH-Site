"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { galleries, galleryImages, media } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { slugOrTitle } from "@/lib/admin/slugs";
import { requireAdmin } from "@/lib/auth/session";
import { gallerySchema, type GalleryFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export type SaveResult = { ok: true; id: number; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// D1 caps bound parameters at 100 per statement.
const CHUNK = 90;

export async function saveGalleryAction(id: number | null, values: GalleryFormValues): Promise<SaveResult> {
  const session = await requireAdmin();
  const parsed = gallerySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const data = parsed.data;
  const db = await getDb();
  const slug = slugOrTitle(data.slug, data.title || data.titleEn);
  if (!slug) return { ok: false, error: "Slug is required", fieldErrors: { slug: "Slug is required" } };
  const [taken] = await db
    .select({ id: galleries.id })
    .from(galleries)
    .where(id ? and(eq(galleries.slug, slug), ne(galleries.id, id)) : eq(galleries.slug, slug))
    .limit(1);
  if (taken) return { ok: false, error: "Another gallery already uses this slug", fieldErrors: { slug: "Another gallery already uses this slug" } };

  // Keep the chosen order, drop duplicates, and only accept images that exist in the library.
  const imageIds = [...new Set(data.imageIds)];
  const known = new Set<number>();
  for (let i = 0; i < imageIds.length; i += CHUNK) {
    const rows = await db
      .select({ id: media.id })
      .from(media)
      .where(and(inArray(media.id, imageIds.slice(i, i + CHUNK)), eq(media.kind, "image")));
    for (const r of rows) known.add(r.id);
  }
  if (known.size !== imageIds.length) return { ok: false, error: "Some images are no longer in the media library. Remove them and save again.", fieldErrors: { imageIds: "Some images are missing" } };

  const now = new Date().toISOString();
  const publishedAt = data.publishedAt ? new Date(data.publishedAt).toISOString() : data.status === "published" ? now : null;
  const row = {
    title: data.title,
    titleEn: data.titleEn,
    slug,
    description: data.description,
    descriptionEn: data.descriptionEn,
    categoryId: data.categoryId,
    // Gallery cards on the public index show the cover only, so fall back to the first image.
    coverMediaId: data.coverMediaId ?? imageIds[0] ?? null,
    status: data.status,
    publishedAt,
    updatedAt: now,
  };

  let galleryId = id;
  let previousSlug: string | undefined;
  if (id) {
    const [existing] = await db.select({ slug: galleries.slug }).from(galleries).where(eq(galleries.id, id)).limit(1);
    if (!existing) return { ok: false, error: "This gallery no longer exists." };
    previousSlug = existing.slug;
    await db.update(galleries).set(row).where(eq(galleries.id, id));
  } else {
    const [created] = await db.insert(galleries).values(row).returning({ id: galleries.id });
    galleryId = created.id;
  }

  await db.delete(galleryImages).where(eq(galleryImages.galleryId, galleryId!));
  for (const [index, mediaId] of imageIds.entries()) {
    await db.insert(galleryImages).values({ galleryId: galleryId!, mediaId, sortOrder: index });
  }

  const title = data.title || data.titleEn;
  await logActivity(session.actor, id ? "update" : "create", "gallery", galleryId!, `${id ? "Updated" : "Created"} gallery “${title}” (${imageIds.length} images)`);
  refreshPublic("galleries", `gallery:${slug}`, ...(previousSlug && previousSlug !== slug ? [`gallery:${previousSlug}` as const] : []));
  return { ok: true, id: galleryId!, slug };
}

export async function deleteGalleryAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(galleries).where(eq(galleries.id, id)).returning({ title: galleries.title, titleEn: galleries.titleEn, slug: galleries.slug });
  if (!row) return { ok: false, error: "Gallery not found" };
  const title = row.title || row.titleEn;
  await logActivity(session.actor, "delete", "gallery", id, `Deleted gallery “${title}”`);
  refreshPublic("galleries", `gallery:${row.slug}`);
  return { ok: true, message: "Gallery deleted" };
}
