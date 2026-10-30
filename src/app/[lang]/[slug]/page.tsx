import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { connection } from "next/server";
import { getPageBySlug, hubTitle } from "@/lib/data/pages";
import { getPostBySlug } from "@/lib/data/posts";
import { findRedirect } from "@/lib/data/search";
import { buildMetadata } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { localizePath, type Locale } from "@/lib/i18n/config";
import { routes } from "@/lib/routes";
import { decodeSegment } from "@/lib/slug";
import { ContactPage } from "../_components/templates/contact-page";
import { ContentPage, HubPage, PostArticle } from "../_components/templates/content-templates";
import { LeadersPage } from "../_components/templates/leaders-page";
import { NewsArchive } from "../_components/templates/news-archive";

// Resolved before anything streams, so missing pages return a real 404 and moved pages a real 301.
export const instant = false;

async function resolve(rawSlug: string, locale: Locale) {
  await connection();
  const slug = decodeSegment(rawSlug);
  const page = await getPageBySlug(slug, locale);
  if (page) return { kind: "page" as const, page };
  const post = await getPostBySlug(slug, locale);
  if (post) return { kind: "post" as const, post };
  return { kind: "missing" as const, slug };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[slug]">): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const found = await resolve((await params).slug, locale);
  if (found.kind === "page") {
    const { page } = found;
    return buildMetadata({
      title: page.seoTitle || hubTitle(page),
      description: page.seoDescription || page.summary,
      path: routes.page(page.slug),
      image: page.ogImage ?? page.featuredMedia,
      locale,
    });
  }
  if (found.kind === "post") {
    const { post } = found;
    return buildMetadata({
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      path: routes.post(post.slug),
      image: post.ogImage ?? post.featuredMedia,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      locale,
    });
  }
  return { title: t.notFound.title, robots: { index: false } };
}

export default async function SlugPage({ params, searchParams }: PageProps<"/[lang]/[slug]">) {
  const { locale } = await getI18n();
  const found = await resolve((await params).slug, locale);

  if (found.kind === "missing") {
    const target = await findRedirect(`/${found.slug}/`);
    if (target) {
      const localizedTarget = localizePath(target.toPath, locale);
      if (target.statusCode === 302 || target.statusCode === 307) redirect(localizedTarget);
      permanentRedirect(localizedTarget);
    }
    notFound();
  }

  if (found.kind === "post") return <PostArticle post={found.post} />;

  const { page } = found;
  switch (page.template) {
    case "news":
      return <NewsArchive page={page} searchParams={await searchParams} />;
    case "hub":
      return <HubPage page={page} />;
    case "leaders":
      return <LeadersPage page={page} />;
    case "contact":
      return <ContactPage page={page} />;
    default:
      return <ContentPage page={page} />;
  }
}
