import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listCategories, listPosts } from "@/lib/data/posts";
import type { Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { PostArchive } from "../../_components/templates/post-archive";

export const instant = false;

/** /category/<parent>/<child>/ as in WordPress; the last segment identifies the category. */
async function resolve(path: string[], locale: Locale) {
  await connection();
  const slugs = path.map(decodeSegment);
  const all = await listCategories(locale);
  const category = all.find((c) => c.slug === slugs[slugs.length - 1]);
  if (!category) return null;
  const parent = category.parentId ? all.find((c) => c.id === category.parentId) : undefined;
  const canonical = parent ? [parent.slug, category.slug] : [category.slug];
  const children = all.filter((c) => c.parentId === category.id).map((c) => c.id);
  return { category, parent, canonical, ids: [category.id, ...children] };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/category/[...path]">): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const found = await resolve((await params).path, locale);
  if (!found) return { title: t.notFound.title, robots: { index: false } };
  const { page } = readListParams(await searchParams);
  const path = routes.category(found.canonical) + (page > 1 ? `?page=${page}` : "");
  return buildMetadata({ title: page > 1 ? t.news.pageN(found.category.name, page) : found.category.name, description: t.news.categoryDescription(found.category.name), path, locale });
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[lang]/category/[...path]">) {
  const { locale, t } = await getI18n();
  const found = await resolve((await params).path, locale);
  if (!found) notFound();
  const { page } = readListParams(await searchParams);
  const result = await listPosts({ page, pageSize: 12, categoryIds: found.ids }, locale);
  if (page > result.totalPages && page > 1) notFound();
  const crumbs = [
    { name: t.nav.news, url: "/news/" },
    ...(found.parent ? [{ name: found.parent.name, url: routes.category([found.parent.slug]) }] : []),
    { name: found.category.name, url: routes.category(found.canonical) },
  ];
  return <PostArchive title={found.category.name} crumbs={crumbs} basePath={routes.category(found.canonical)} result={result} />;
}
