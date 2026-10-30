import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listGalleries, listGalleryCategories } from "@/lib/data/collections";
import type { Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { GalleryIndex } from "../../_components/templates/gallery-index";

export const instant = false;

async function resolve(raw: string, locale: Locale) {
  await connection();
  const slug = decodeSegment(raw);
  const categories = await listGalleryCategories(locale);
  return { categories, category: categories.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/image-category/[slug]">): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const { category } = await resolve((await params).slug, locale);
  if (!category) return { title: t.notFound.title, robots: { index: false } };
  return buildMetadata({ title: category.name, description: t.gallery.categoryDescription(category.name), path: routes.galleryCategory(category.slug), locale });
}

export default async function GalleryCategoryPage({ params, searchParams }: PageProps<"/[lang]/image-category/[slug]">) {
  const { locale, t } = await getI18n();
  const { categories, category } = await resolve((await params).slug, locale);
  if (!category) notFound();
  const { page } = readListParams(await searchParams);
  const result = await listGalleries({ page, pageSize: 13, categorySlug: category.slug }, locale);
  if (page > result.totalPages && page > 1) notFound();
  return (
    <GalleryIndex
      title={category.name}
      crumbs={[
        { name: t.gallery.title, url: "/image-gallery/" },
        { name: category.name, url: routes.galleryCategory(category.slug) },
      ]}
      basePath={routes.galleryCategory(category.slug)}
      result={result}
      categories={categories}
      activeCategory={category.slug}
    />
  );
}
