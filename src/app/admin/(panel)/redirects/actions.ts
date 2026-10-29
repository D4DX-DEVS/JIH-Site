"use server";

import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pages, posts, redirects } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { fieldError, invalidResult, type FormResult } from "@/lib/admin/form-result";
import { requireAdmin } from "@/lib/auth/session";
import { decodeSegment } from "@/lib/slug";
import { redirectSchema, type RedirectFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

/** Public routes resolve before the redirects table, so these prefixes can never redirect. */
const ROUTED_PREFIXES = ["/admin/", "/media/", "/category/", "/tag/", "/search/", "/feed/", "/leadership/", "/image-gallery/", "/image-category/", "/video-gallery/", "/downloads/", "/_next/"];

export async function saveRedirectAction(id: number | null, values: RedirectFormValues): Promise<FormResult> {
  const session = await requireAdmin();
  const parsed = redirectSchema.safeParse(values);
  if (!parsed.success) return invalidResult(parsed.error);
  // Stored decoded so a pasted, percent-encoded Malayalam address matches the router's decoded path.
  const fromPath = `/${parsed.data.fromPath.split("/").filter(Boolean).map(decodeSegment).join("/")}/`;
  const { toPath, statusCode } = parsed.data;
  if (fromPath === "//") return fieldError("fromPath", "The homepage cannot be redirected");
  if (ROUTED_PREFIXES.some((p) => fromPath.startsWith(p))) {
    return fieldError("fromPath", "This address belongs to a built-in section of the site, so a redirect from it would never run");
  }
  if (toPath.replace(/\/$/, "") === fromPath.replace(/\/$/, "")) return fieldError("toPath", "A redirect cannot point to itself");

  const db = await getDb();
  const single = fromPath.split("/").filter(Boolean);
  if (single.length === 1) {
    const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, single[0])).limit(1);
    const [page] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, single[0])).limit(1);
    if (post || page) return fieldError("fromPath", `A ${post ? "post" : "page"} lives at this address. Delete it or change its slug first, otherwise the redirect never runs.`);
  }
  const [clash] = await db
    .select({ id: redirects.id })
    .from(redirects)
    .where(id ? and(eq(redirects.fromPath, fromPath), ne(redirects.id, id)) : eq(redirects.fromPath, fromPath))
    .limit(1);
  if (clash) return fieldError("fromPath", "A redirect from this address already exists");

  const row = { fromPath, toPath, statusCode, updatedAt: new Date().toISOString() };
  let redirectId = id;
  if (id) {
    const [updated] = await db.update(redirects).set(row).where(eq(redirects.id, id)).returning({ id: redirects.id });
    if (!updated) return { ok: false, error: "This redirect no longer exists." };
  } else {
    const [created] = await db.insert(redirects).values({ ...row, source: "admin" }).returning({ id: redirects.id });
    redirectId = created.id;
  }
  await logActivity(session.actor, id ? "update" : "create", "redirect", redirectId!, `${fromPath} → ${toPath} (${statusCode})`);
  refreshPublic("redirects");
  return { ok: true, id: redirectId!, message: id ? "Redirect saved" : "Redirect added" };
}

export async function deleteRedirectAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(redirects).where(eq(redirects.id, id)).returning({ fromPath: redirects.fromPath });
  if (!row) return { ok: false, error: "Redirect not found" };
  await logActivity(session.actor, "delete", "redirect", id, `Deleted redirect from ${row.fromPath}`);
  refreshPublic("redirects");
  return { ok: true, message: "Redirect deleted" };
}
