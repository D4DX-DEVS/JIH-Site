"use server";

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { leaders } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { slugOrTitle } from "@/lib/admin/slugs";
import { requireAdmin } from "@/lib/auth/session";
import { sanitizeRichText } from "@/lib/content/sanitize";
import { leaderSchema, type LeaderFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export type SaveResult = { ok: true; id: number; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveLeaderAction(id: number | null, values: LeaderFormValues): Promise<SaveResult> {
  const session = await requireAdmin();
  const parsed = leaderSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const data = parsed.data;
  const db = await getDb();
  const slug = slugOrTitle(data.slug, data.name);
  if (!slug) return { ok: false, error: "Slug is required", fieldErrors: { slug: "Slug is required" } };
  const [taken] = await db
    .select({ id: leaders.id })
    .from(leaders)
    .where(id ? and(eq(leaders.slug, slug), ne(leaders.id, id)) : eq(leaders.slug, slug))
    .limit(1);
  if (taken) return { ok: false, error: "Another leader already uses this slug", fieldErrors: { slug: "Another leader already uses this slug" } };

  const row = {
    name: data.name,
    slug,
    roleTitle: data.roleTitle,
    groupKey: data.groupKey,
    bioHtml: sanitizeRichText(data.bioHtml),
    photoMediaId: data.photoMediaId,
    sortOrder: data.sortOrder,
    status: data.status,
    updatedAt: new Date().toISOString(),
  };

  let leaderId = id;
  if (id) {
    const [updated] = await db.update(leaders).set(row).where(eq(leaders.id, id)).returning({ id: leaders.id });
    if (!updated) return { ok: false, error: "This leader no longer exists." };
  } else {
    const [created] = await db.insert(leaders).values(row).returning({ id: leaders.id });
    leaderId = created.id;
  }

  await logActivity(session.actor, id ? "update" : "create", "leader", leaderId!, `${id ? "Updated" : "Added"} leader “${data.name}”`);
  refreshPublic("leaders");
  return { ok: true, id: leaderId!, slug };
}

export async function deleteLeaderAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(leaders).where(eq(leaders.id, id)).returning({ name: leaders.name });
  if (!row) return { ok: false, error: "Leader not found" };
  await logActivity(session.actor, "delete", "leader", id, `Removed leader “${row.name}”`);
  refreshPublic("leaders");
  return { ok: true, message: "Leader removed" };
}
