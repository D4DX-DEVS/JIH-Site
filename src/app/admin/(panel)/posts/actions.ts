"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { postCategories, posts } from "@/db/schema";
import { logActivity, refreshPublic } from "@/lib/admin/activity";
import { rootSlugError, slugOrTitle } from "@/lib/admin/slugs";
import { requireAdmin } from "@/lib/auth/session";
import { htmlToText, sanitizeRichText, truncateText } from "@/lib/content/sanitize";
import { slugify } from "@/lib/slug";
import { postSchema, type PostFormValues } from "@/lib/validation/admin";
import type { ActionResult } from "@/components/admin/confirm-action";

export type SaveResult = { ok: true; id: number; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function savePostAction(id: number | null, values: PostFormValues): Promise<SaveResult> {
  const session = await requireAdmin();
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const data = parsed.data;
  const db = await getDb();
  const slug = slugOrTitle(data.slug, slugify(data.title));
  const slugError = await rootSlugError(db, slug, { table: "posts", id: id ?? undefined });
  if (slugError) return { ok: false, error: slugError, fieldErrors: { slug: slugError } };

  const contentHtml = sanitizeRichText(data.contentHtml);
  const text = htmlToText(contentHtml);
  const now = new Date().toISOString();
  const publishedAt = data.publishedAt ? new Date(data.publishedAt).toISOString() : data.status === "published" ? now : null;
  const values_ = {
    title: data.title,
    slug,
    status: data.status,
    publishedAt,
    excerpt: data.excerpt || truncateText(text, 300),
    contentHtml,
    searchText: `${data.title} ${text}`.toLowerCase(),
    featuredMediaId: data.featuredMediaId,
    isFeatured: data.isFeatured,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    updatedAt: now,
  };

  let postId = id;
  let previousSlug: string | undefined;
  if (id) {
    const [existing] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!existing) return { ok: false, error: "This post no longer exists." };
    previousSlug = existing.slug;
    await db.update(posts).set(values_).where(eq(posts.id, id));
  } else {
    const [row] = await db.insert(posts).values({ ...values_, authorName: session.actor }).returning({ id: posts.id });
    postId = row.id;
  }
  await db.delete(postCategories).where(eq(postCategories.postId, postId!));
  for (const categoryId of new Set(data.categoryIds)) await db.insert(postCategories).values({ postId: postId!, categoryId }).onConflictDoNothing();

  await logActivity(session.actor, id ? "update" : "create", "post", postId!, `${id ? "Updated" : "Created"} post “${data.title}”`);
  refreshPublic("posts", "categories", `post:${slug}`, ...(previousSlug && previousSlug !== slug ? [`post:${previousSlug}` as const] : []));
  return { ok: true, id: postId!, slug };
}

export async function deletePostAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = await getDb();
  const [row] = await db.delete(posts).where(eq(posts.id, id)).returning({ title: posts.title, slug: posts.slug });
  if (!row) return { ok: false, error: "Post not found" };
  await logActivity(session.actor, "delete", "post", id, `Deleted post “${row.title}”`);
  refreshPublic("posts", "categories", `post:${row.slug}`);
  return { ok: true, message: "Post deleted" };
}
