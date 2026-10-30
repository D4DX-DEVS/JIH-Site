import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listGalleries, listGalleryCategories } from "@/lib/data/collections";
import { getI18n } from "@/lib/i18n/server";
import { readListParams } from "@/lib/pagination";
import { buildMetadata } from "@/lib/seo";
import { GalleryIndex } from "../_components/templates/gallery-index";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({
    title: t.gallery.title,
    description: t.gallery.description,
    path: "/image-gallery/",
    locale,
  });
}

export default async function GalleriesPage({ searchParams }: PageProps<"/[lang]/image-gallery">) {
  await connection();
  const { locale, t } = await getI18n();
  const { page } = readListParams(await searchParams);
  const [result, categories] = await Promise.all([listGalleries({ page, pageSize: 13 }, locale), listGalleryCategories(locale)]);
  if (page > result.totalPages && page > 1) notFound();
  return <GalleryIndex title={t.gallery.title} crumbs={[{ name: t.gallery.title, url: "/image-gallery/" }]} basePath="/image-gallery/" result={result} categories={categories} />;
}
