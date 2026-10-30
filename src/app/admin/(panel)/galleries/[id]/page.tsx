import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getDb } from "@/db/client";
import { galleries, galleryCategories, galleryImages, media } from "@/db/schema";
import { pickerMedia } from "@/lib/admin/lookups";
import { requireAdmin } from "@/lib/auth/session";
import { GalleryForm } from "../gallery-form";

export const metadata: Metadata = { title: "Edit gallery" };
export const instant = false;

export default async function EditGalleryPage({ params }: PageProps<"/admin/galleries/[id]">) {
  await requireAdmin();
  const { id: raw } = await params;
  const db = await getDb();
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !(id && Number.isInteger(id))) notFound();

  const [gallery] = id ? await db.select().from(galleries).where(eq(galleries.id, id)).limit(1) : [null];
  if (id && !gallery) notFound();
  const [categories, cover, images] = await Promise.all([
    db.select({ id: galleryCategories.id, name: galleryCategories.name }).from(galleryCategories).orderBy(asc(galleryCategories.sortOrder), asc(galleryCategories.name)),
    pickerMedia(db, gallery?.coverMediaId),
    id
      ? db
          .select({
            id: media.id, r2Key: media.r2Key, title: media.title, altText: media.altText, mimeType: media.mimeType, kind: media.kind,
            width: media.width, height: media.height, sizeBytes: media.sizeBytes, variants: media.variants, createdAt: media.createdAt,
          })
          .from(galleryImages)
          .innerJoin(media, eq(media.id, galleryImages.mediaId))
          .where(eq(galleryImages.galleryId, id))
          .orderBy(asc(galleryImages.sortOrder))
      : Promise.resolve([]),
  ]);

  return (
    <>
      <div>
        <Link href="/admin/galleries/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden="true" /> Galleries
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{gallery ? "Edit gallery" : "New gallery"}</h1>
      </div>
      <GalleryForm
        id={id}
        cover={cover}
        images={images}
        categories={categories}
        initial={{
          title: gallery?.title ?? "",
          titleEn: gallery?.titleEn ?? "",
          slug: gallery?.slug ?? "",
          description: gallery?.description ?? "",
          descriptionEn: gallery?.descriptionEn ?? "",
          categoryId: gallery?.categoryId ?? null,
          coverMediaId: gallery?.coverMediaId ?? null,
          imageIds: images.map((i) => i.id),
          status: gallery?.status ?? "published",
          publishedAt: gallery?.publishedAt ?? "",
        }}
      />
    </>
  );
}
