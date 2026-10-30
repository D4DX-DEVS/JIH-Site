import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTagBySlug, listPosts } from "@/lib/data/posts";
import { getI18n } from "@/lib/i18n/server";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { PostArchive } from "../../_components/templates/post-archive";

export const instant = false;

async function resolve(slug: string) {
  await connection();
  return getTagBySlug(decodeSegment(slug));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/tag/[slug]">): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const tag = await resolve((await params).slug);
  if (!tag) return { title: t.notFound.title, robots: { index: false } };
  return buildMetadata({ title: tag.name, description: t.news.topicDescription(tag.name), path: routes.tag(tag.slug), noindex: true, locale });
}

export default async function TagPage({ params, searchParams }: PageProps<"/[lang]/tag/[slug]">) {
  const { locale, t } = await getI18n();
  const tag = await resolve((await params).slug);
  if (!tag) notFound();
  const { page } = readListParams(await searchParams);
  const result = await listPosts({ page, pageSize: 12, tagId: tag.id }, locale);
  if (page > result.totalPages && page > 1) notFound();
  return <PostArchive title={tag.name} crumbs={[{ name: t.nav.news, url: "/news/" }, { name: tag.name, url: routes.tag(tag.slug) }]} basePath={routes.tag(tag.slug)} result={result} />;
}
