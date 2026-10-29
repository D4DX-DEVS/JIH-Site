"use server";

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { videos } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { slugOrTitle } from "@/lib/admin/slugs";
import { requireAdmin } from "@/lib/auth/session";
import { parseYoutubeId, videoSchema, type VideoFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export type SaveResult = { ok: true; id: number; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveVideoAction(id: number | null, values: VideoFormValues): Promise<SaveResult> {
  const session = await requireAdmin();
  const parsed = videoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const data = parsed.data;
  const youtubeId = parseYoutubeId(data.youtube);
  if (!youtubeId) return { ok: false, error: "Paste a YouTube link or 11-character video id", fieldErrors: { youtube: "Paste a YouTube link or 11-character video id" } };
  const db = await getDb();
  const slug = slugOrTitle(data.slug, data.title);
  if (!slug) return { ok: false, error: "Slug is required", fieldErrors: { slug: "Slug is required" } };
  const [taken] = await db
    .select({ id: videos.id })
    .from(videos)
    .where(id ? and(eq(videos.slug, slug), ne(videos.id, id)) : eq(videos.slug, slug))
    .limit(1);
  if (taken) return { ok: false, error: "Another video already uses this slug", fieldErrors: { slug: "Another video already uses this slug" } };

  const now = new Date().toISOString();
  const row = {
    title: data.title,
    slug,
    youtubeId,
    description: data.description,
    status: data.status,
    publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : data.status === "published" ? now : null,
    updatedAt: now,
  };

  let videoId = id;
  if (id) {
    const [updated] = await db.update(videos).set(row).where(eq(videos.id, id)).returning({ id: videos.id });
    if (!updated) return { ok: false, error: "This video no longer exists." };
  } else {
    const [created] = await db.insert(videos).values(row).returning({ id: videos.id });
    videoId = created.id;
  }

  await logActivity(session.actor, id ? "update" : "create", "video", videoId!, `${id ? "Updated" : "Added"} video “${data.title}”`);
  refreshPublic("videos");
  return { ok: true, id: videoId!, slug };
}

export async function deleteVideoAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(videos).where(eq(videos.id, id)).returning({ title: videos.title });
  if (!row) return { ok: false, error: "Video not found" };
  await logActivity(session.actor, "delete", "video", id, `Deleted video “${row.title}”`);
  refreshPublic("videos");
  return { ok: true, message: "Video deleted" };
}
