"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { media, settings } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { fieldError, invalidResult, type FormResult } from "@/lib/admin/form-result";
import { requireAdmin } from "@/lib/auth/session";
import { ADMIN_SETTINGS_SCHEMAS, type AdminSettingsKey } from "@/lib/validation/settings";

const LABELS: Record<AdminSettingsKey, string> = { site: "site details", seo: "search defaults", contact: "contact details", social: "social links" };

/** Saves one settings group. Keys the form does not edit (e.g. legacy logo ids) are kept. */
export async function saveSettingsAction(key: AdminSettingsKey, values: unknown): Promise<FormResult> {
  const session = await requireAdmin();
  const schema = ADMIN_SETTINGS_SCHEMAS[key];
  if (!schema) return { ok: false, error: "Unknown settings group" };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return invalidResult(parsed.error);
  const db = await getDb();

  for (const field of ["ogImageMediaId", "heroBannerMediaId"] as const) {
    const id = (parsed.data as Record<string, unknown>)[field];
    if (typeof id !== "number") continue;
    const [image] = await db.select({ kind: media.kind }).from(media).where(eq(media.id, id)).limit(1);
    if (image?.kind !== "image") return fieldError(field, "Choose an image from the media library");
  }

  const [existing] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1);
  const previous = existing && typeof existing.value === "object" && existing.value ? (existing.value as Record<string, unknown>) : {};
  const value = { ...previous, ...parsed.data };
  const updatedAt = new Date().toISOString();
  await db.insert(settings).values({ key, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } });

  await logActivity(session.actor, "update", "settings", key, `Updated ${LABELS[key]}`);
  refreshPublic("settings");
  return { ok: true, message: "Settings saved" };
}
