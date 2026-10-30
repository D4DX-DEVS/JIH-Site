"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { media, posters } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { fieldError, invalidResult, type FormResult } from "@/lib/admin/form-result";
import { requireAdmin } from "@/lib/auth/session";
import { posterSchema, type PosterFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export async function savePosterAction(id: number | null, values: PosterFormValues): Promise<FormResult> {
  const session = await requireAdmin();
  const parsed = posterSchema.safeParse(values);
  if (!parsed.success) return invalidResult(parsed.error);
  const data = parsed.data;
  const db = await getDb();
  const [image] = await db.select({ kind: media.kind }).from(media).where(eq(media.id, data.mediaId)).limit(1);
  if (image?.kind !== "image") return fieldError("mediaId", "Choose an image from the media library");

  const row = { ...data, updatedAt: new Date().toISOString() };
  let posterId = id;
  if (id) {
    const [updated] = await db.update(posters).set(row).where(eq(posters.id, id)).returning({ id: posters.id });
    if (!updated) return { ok: false, error: "This poster no longer exists." };
  } else {
    const [created] = await db.insert(posters).values(row).returning({ id: posters.id });
    posterId = created.id;
  }
  const title = data.title || data.titleEn;
  await logActivity(session.actor, id ? "update" : "create", "poster", posterId!, `${id ? "Updated" : "Added"} poster${title ? ` “${title}”` : ` #${posterId}`}`);
  refreshPublic("posters");
  return { ok: true, id: posterId!, message: id ? "Poster saved" : "Poster added" };
}

export async function deletePosterAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(posters).where(eq(posters.id, id)).returning({ title: posters.title, titleEn: posters.titleEn });
  if (!row) return { ok: false, error: "Poster not found" };
  const title = row.title || row.titleEn;
  await logActivity(session.actor, "delete", "poster", id, `Removed poster${title ? ` “${title}”` : ` #${id}`}`);
  refreshPublic("posters");
  return { ok: true, message: "Poster removed. The image stays in the media library." };
}
