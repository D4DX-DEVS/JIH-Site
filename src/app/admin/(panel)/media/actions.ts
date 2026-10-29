"use server";

import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, getMediaBucket } from "@/db/client";
import { downloads, galleries, galleryImages, leaders, media, pages, posters, posts } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/auth/session";
import { likePattern, paginate, type Paginated } from "@/lib/pagination";
import { mediaMetaSchema, type MediaMetaValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";
import type { MediaVariant } from "@/db/schema";

export interface PickerMedia {
  id: number;
  r2Key: string;
  title: string;
  altText: string;
  mimeType: string;
  kind: "image" | "document" | "other";
  width: number | null;
  height: number | null;
  sizeBytes: number;
  variants: MediaVariant[];
  createdAt: string;
}

export async function listMediaAction(input: { page: number; q?: string; kind?: "image" | "document" | "" }): Promise<Paginated<PickerMedia>> {
  await requireAdmin();
  const db = await getDb();
  const page = Math.max(1, Math.min(10_000, Math.floor(input.page) || 1));
  const pageSize = 24;
  const where: SQL[] = [];
  if (input.kind) where.push(eq(media.kind, input.kind));
  const q = (input.q ?? "").trim().slice(0, 100);
  if (q) where.push(sql`(lower(${media.title}) like ${likePattern(q)} escape '\\' or lower(${media.filename}) like ${likePattern(q)} escape '\\')`);
  const condition = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: media.id, r2Key: media.r2Key, title: media.title, altText: media.altText, mimeType: media.mimeType, kind: media.kind,
        width: media.width, height: media.height, sizeBytes: media.sizeBytes, variants: media.variants, createdAt: media.createdAt,
      })
      .from(media)
      .where(condition)
      .orderBy(desc(media.createdAt), desc(media.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)` }).from(media).where(condition),
  ]);
  return paginate(rows, total, page, pageSize);
}

export async function updateMediaMetaAction(id: number, values: MediaMetaValues): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = mediaMetaSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = await getDb();
  const [row] = await db.update(media).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(media.id, id)).returning({ id: media.id });
  if (!row) return { ok: false, error: "Media item not found" };
  await logActivity(session.actor, "update", "media", id, `Updated details of media #${id}`);
  refreshPublic("posts", "pages", "leaders", "galleries", "posters", "downloads", "settings");
  return { ok: true, message: "Saved" };
}

/** Where a media item is used; deletion is refused while anything references it. */
async function usageOf(id: number): Promise<string[]> {
  const db = await getDb();
  const checks = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(posts).where(sql`${posts.featuredMediaId} = ${id} or ${posts.ogImageId} = ${id}`),
    db.select({ n: sql<number>`count(*)` }).from(pages).where(sql`${pages.featuredMediaId} = ${id} or ${pages.ogImageId} = ${id}`),
    db.select({ n: sql<number>`count(*)` }).from(leaders).where(eq(leaders.photoMediaId, id)),
    db.select({ n: sql<number>`count(*)` }).from(galleryImages).where(eq(galleryImages.mediaId, id)),
    db.select({ n: sql<number>`count(*)` }).from(galleries).where(eq(galleries.coverMediaId, id)),
    db.select({ n: sql<number>`count(*)` }).from(posters).where(eq(posters.mediaId, id)),
    db.select({ n: sql<number>`count(*)` }).from(downloads).where(eq(downloads.mediaId, id)),
  ]);
  const labels = ["posts", "pages", "leaders", "galleries", "gallery covers", "posters", "downloads"];
  return checks.flatMap(([c], i) => (c.n ? [`${c.n} ${labels[i]}`] : []));
}

export async function deleteMediaAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!item) return { ok: false, error: "Media item not found" };
  const used = await usageOf(id);
  if (used.length) return { ok: false, error: `Still in use by ${used.join(", ")}. Remove it there first.` };
  // Body HTML may still link the file; legacy WordPress uploads are kept in R2 for that reason.
  const bucket = await getMediaBucket();
  if (!item.wpId) await Promise.allSettled([item.r2Key, ...item.variants.map((v) => v.key)].map((k) => bucket.delete(k)));
  await db.delete(media).where(eq(media.id, id));
  await logActivity(session.actor, "delete", "media", id, `Deleted ${item.filename}`);
  return { ok: true, message: "Deleted" };
}
