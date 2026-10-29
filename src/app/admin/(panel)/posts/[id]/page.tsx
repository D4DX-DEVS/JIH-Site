import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { postCategories, posts } from "@/db/schema";
import { categoryOptions, pickerMedia } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "Edit post" };
export const instant = false;

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  await requireAdmin();
  const { id: raw } = await params;
  const db = await getDb();
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !(id && Number.isInteger(id))) notFound();

  const [post] = id ? await db.select().from(posts).where(eq(posts.id, id)).limit(1) : [null];
  if (id && !post) notFound();
  const [cats, featured, selected] = await Promise.all([
    categoryOptions(db),
    pickerMedia(db, post?.featuredMediaId),
    id ? db.select({ id: postCategories.categoryId }).from(postCategories).where(eq(postCategories.postId, id)) : Promise.resolve([]),
  ]);

  return (
    <>
      <div>
        <Link href="/admin/posts/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" /> Posts
        </Link>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{post ? "Edit post" : "New post"}</h1>
      </div>
      <PostForm
        id={id}
        featured={featured}
        categories={cats}
        initial={{
          title: post?.title ?? "",
          slug: post?.slug ?? "",
          status: post?.status ?? "draft",
          publishedAt: post?.publishedAt ?? "",
          excerpt: post?.excerpt ?? "",
          contentHtml: post?.contentHtml ?? "",
          featuredMediaId: post?.featuredMediaId ?? null,
          categoryIds: selected.map((s) => s.id),
          isFeatured: post?.isFeatured ?? false,
          seoTitle: post?.seoTitle ?? "",
          seoDescription: post?.seoDescription ?? "",
        }}
      />
    </>
  );
}
