import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listGalleries, listGalleryCategories } from "@/lib/data/collections";
import { readListParams } from "@/lib/pagination";
import { buildMetadata } from "@/lib/seo";
import { GalleryIndex } from "../_components/templates/gallery-index";

export const instant = false;

export const metadata: Metadata = buildMetadata({
  title: "Image gallery",
  description: "Photographs from conferences, campaigns and gatherings of Jamaat-e-Islami Hind Kerala.",
  path: "/image-gallery/",
});

export default async function GalleriesPage({ searchParams }: PageProps<"/image-gallery">) {
  await connection();
  const { page } = readListParams(await searchParams);
  const [result, categories] = await Promise.all([listGalleries({ page, pageSize: 13 }), listGalleryCategories()]);
  if (page > result.totalPages && page > 1) notFound();
  return <GalleryIndex title="Image gallery" crumbs={[{ name: "Image gallery", url: "/image-gallery/" }]} basePath="/image-gallery/" result={result} categories={categories} />;
}
