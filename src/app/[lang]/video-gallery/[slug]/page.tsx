import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { getVideoBySlug } from "@/lib/data/collections";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { langAttr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { routes, youtubeThumb } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { PageHero } from "../../_components/article-chrome";

export const instant = false;

async function resolve(slug: string, locale: Locale) {
  await connection();
  return getVideoBySlug(decodeSegment(slug), locale);
}

export async function generateMetadata({ params }: PageProps<"/[lang]/video-gallery/[slug]">): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const video = await resolve((await params).slug, locale);
  if (!video) return { title: t.notFound.title, robots: { index: false } };
  const meta = buildMetadata({ title: video.title, description: video.description || video.title, path: routes.video(video.slug), locale });
  return { ...meta, openGraph: { ...meta.openGraph, type: "video.other", images: [{ url: youtubeThumb(video.youtubeId) }] } };
}

export default async function VideoPage({ params }: PageProps<"/[lang]/video-gallery/[slug]">) {
  const { locale, t } = await getI18n();
  const video = await resolve((await params).slug, locale);
  if (!video) notFound();
  return (
    <>
      <PageHero
        title={video.title}
        lang={langAttr(video.lang, locale)}
        crumbs={[
          { name: t.videos.title, url: "/video-gallery/" },
          { name: video.title, url: routes.video(video.slug) },
        ]}
        aside={
          video.publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-gold" aria-hidden="true" />
              <time dateTime={video.publishedAt}>{formatDate(video.publishedAt, "long", locale)}</time>
            </span>
          ) : null
        }
      />
      <div className="page-frame py-10 lg:py-16">
        <Reveal className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-ink shadow-lift ring-1 ring-border/60">
          <YouTubeEmbed id={video.youtubeId} title={video.title} />
        </Reveal>
        <div className="mx-auto mt-8 max-w-3xl">
          {video.description ? <p lang={langAttr(video.lang, locale)} className="text-lg leading-relaxed text-ink">{video.description}</p> : null}
          <ButtonLink href="/video-gallery/" variant="navy" className="mt-8">
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" /> {t.home.allVideos}
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
