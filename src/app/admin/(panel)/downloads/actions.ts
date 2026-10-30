"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { downloads, media } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { fieldError, invalidResult, type FormResult } from "@/lib/admin/form-result";
import { requireAdmin } from "@/lib/auth/session";
import { downloadSchema, type DownloadFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export async function saveDownloadAction(id: number | null, values: DownloadFormValues): Promise<FormResult> {
  const session = await requireAdmin();
  const parsed = downloadSchema.safeParse(values);
  if (!parsed.success) return invalidResult(parsed.error);
  const data = parsed.data;
  const db = await getDb();
  const [file] = await db.select({ id: media.id }).from(media).where(eq(media.id, data.mediaId)).limit(1);
  if (!file) return fieldError("mediaId", "Choose a file from the media library");

  const row = { ...data, updatedAt: new Date().toISOString() };
  let downloadId = id;
  if (id) {
    const [updated] = await db.update(downloads).set(row).where(eq(downloads.id, id)).returning({ id: downloads.id });
    if (!updated) return { ok: false, error: "This download no longer exists." };
  } else {
    const [created] = await db.insert(downloads).values(row).returning({ id: downloads.id });
    downloadId = created.id;
  }
  const title = data.title || data.titleEn;
  await logActivity(session.actor, id ? "update" : "create", "download", downloadId!, `${id ? "Updated" : "Added"} download “${title}”`);
  refreshPublic("downloads");
  return { ok: true, id: downloadId!, message: id ? "Download saved" : "Download added" };
}

export async function deleteDownloadAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(downloads).where(eq(downloads.id, id)).returning({ title: downloads.title, titleEn: downloads.titleEn });
  if (!row) return { ok: false, error: "Download not found" };
  const title = row.title || row.titleEn;
  await logActivity(session.actor, "delete", "download", id, `Removed download “${title}”`);
  refreshPublic("downloads");
  return { ok: true, message: "Download removed. The file stays in the media library." };
}
