import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTagBySlug, listPosts } from "@/lib/data/posts";
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

export async function generateMetadata({ params }: PageProps<"/tag/[slug]">): Promise<Metadata> {
  const tag = await resolve((await params).slug);
  if (!tag) return { title: "Topic not found", robots: { index: false } };
  return buildMetadata({ title: tag.name, description: `Articles on ${tag.name}.`, path: routes.tag(tag.slug), noindex: true });
}

export default async function TagPage({ params, searchParams }: PageProps<"/tag/[slug]">) {
  const tag = await resolve((await params).slug);
  if (!tag) notFound();
  const { page } = readListParams(await searchParams);
  const result = await listPosts({ page, pageSize: 12, tagId: tag.id });
  if (page > result.totalPages && page > 1) notFound();
  return <PostArchive title={tag.name} crumbs={[{ name: "News", url: "/news/" }, { name: tag.name, url: routes.tag(tag.slug) }]} basePath={routes.tag(tag.slug)} result={result} />;
}
