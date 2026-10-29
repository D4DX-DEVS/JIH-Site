import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays, Images } from "lucide-react";
import { ButtonLink } from "@/components/site/section-heading";
import { getGalleryBySlug } from "@/lib/data/collections";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { PageHero } from "../../_components/article-chrome";
import { GalleryGrid } from "./lightbox";

export const instant = false;

async function resolve(slug: string) {
  await connection();
  return getGalleryBySlug(decodeSegment(slug));
}

export async function generateMetadata({ params }: PageProps<"/image-gallery/[slug]">): Promise<Metadata> {
  const gallery = await resolve((await params).slug);
  if (!gallery) return { title: "Gallery not found", robots: { index: false } };
  return buildMetadata({
    title: gallery.title,
    description: gallery.description || `${gallery.imageCount} photographs: ${gallery.title}.`,
    path: routes.gallery(gallery.slug),
    image: gallery.cover,
  });
}

export default async function GalleryPage({ params }: PageProps<"/image-gallery/[slug]">) {
  const gallery = await resolve((await params).slug);
  if (!gallery) notFound();
  return (
    <>
      <PageHero
        title={gallery.title}
        lead={gallery.description || undefined}
        crumbs={[
          { name: "Image gallery", url: "/image-gallery/" },
          ...(gallery.category ? [{ name: gallery.category.name, url: routes.galleryCategory(gallery.category.slug) }] : []),
          { name: gallery.title, url: routes.gallery(gallery.slug) },
        ]}
        aside={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Images className="size-4 text-gold" aria-hidden="true" /> {gallery.imageCount} photographs
            </span>
            {gallery.publishedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-gold" aria-hidden="true" />
                <time dateTime={gallery.publishedAt}>{formatDate(gallery.publishedAt)}</time>
              </span>
            ) : null}
          </>
        }
      />
      <section aria-label="Photographs" className="page-frame py-10 lg:py-14">
        <GalleryGrid images={gallery.images} title={gallery.title} />
        <div className="mt-12 flex justify-center">
          <ButtonLink href="/image-gallery/" variant="navy">
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" /> All galleries
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
