import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listGalleries, listGalleryCategories } from "@/lib/data/collections";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { GalleryIndex } from "../../_components/templates/gallery-index";

export const instant = false;

async function resolve(raw: string) {
  await connection();
  const slug = decodeSegment(raw);
  const categories = await listGalleryCategories();
  return { categories, category: categories.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: PageProps<"/image-category/[slug]">): Promise<Metadata> {
  const { category } = await resolve((await params).slug);
  if (!category) return { title: "Gallery category not found", robots: { index: false } };
  return buildMetadata({ title: category.name, description: `${category.name}: photographs of Jamaat-e-Islami Hind Kerala.`, path: routes.galleryCategory(category.slug) });
}

export default async function GalleryCategoryPage({ params, searchParams }: PageProps<"/image-category/[slug]">) {
  const { categories, category } = await resolve((await params).slug);
  if (!category) notFound();
  const { page } = readListParams(await searchParams);
  const result = await listGalleries({ page, pageSize: 13, categorySlug: category.slug });
  if (page > result.totalPages && page > 1) notFound();
  return (
    <GalleryIndex
      title={category.name}
      crumbs={[
        { name: "Image gallery", url: "/image-gallery/" },
        { name: category.name, url: routes.galleryCategory(category.slug) },
      ]}
      basePath={routes.galleryCategory(category.slug)}
      result={result}
      categories={categories}
      activeCategory={category.slug}
    />
  );
}
