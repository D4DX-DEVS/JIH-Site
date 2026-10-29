"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { formSubmissions, SUBMISSION_STATUSES } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/components/admin/confirm-action";

const statusSchema = z.enum(SUBMISSION_STATUSES);

export async function setSubmissionStatusAction(id: number, status: (typeof SUBMISSION_STATUSES)[number], opts: { silent?: boolean } = {}): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Unknown status" };
  const db = await getDb();
  const [row] = await db
    .update(formSubmissions)
    .set({ status: parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(formSubmissions.id, id))
    .returning({ id: formSubmissions.id });
  if (!row) return { ok: false, error: "Message not found" };
  // Opening a message marks it read automatically; only deliberate changes are logged.
  if (!opts.silent) await logActivity(session.actor, "update", "submission", id, `Marked message #${id} as ${parsed.data}`);
  return { ok: true, message: `Marked as ${parsed.data}` };
}

export async function deleteSubmissionAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(formSubmissions).where(eq(formSubmissions.id, id)).returning({ id: formSubmissions.id });
  if (!row) return { ok: false, error: "Message not found" };
  await logActivity(session.actor, "delete", "submission", id, `Deleted message #${id}`);
  return { ok: true, message: "Message deleted" };
}
