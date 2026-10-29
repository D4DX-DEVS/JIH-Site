import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { videos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { VideoForm } from "../video-form";

export const metadata: Metadata = { title: "Edit video" };
export const instant = false;

export default async function EditVideoPage({ params }: PageProps<"/admin/videos/[id]">) {
  await requireAdmin();
  const { id: raw } = await params;
  const db = await getDb();
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !(id && Number.isInteger(id))) notFound();

  const [video] = id ? await db.select().from(videos).where(eq(videos.id, id)).limit(1) : [null];
  if (id && !video) notFound();

  return (
    <>
      <div>
        <Link href="/admin/videos/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" /> Videos
        </Link>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{video ? "Edit video" : "Add video"}</h1>
      </div>
      <VideoForm
        id={id}
        initial={{
          title: video?.title ?? "",
          slug: video?.slug ?? "",
          youtube: video ? `https://www.youtube.com/watch?v=${video.youtubeId}` : "",
          description: video?.description ?? "",
          status: video?.status ?? "published",
          publishedAt: video?.publishedAt ?? "",
        }}
      />
    </>
  );
}
