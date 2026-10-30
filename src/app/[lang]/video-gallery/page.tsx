import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/shared/states";
import { LinkPagination } from "@/components/shared/link-pagination";
import Link from "@/components/i18n/link";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { listVideos } from "@/lib/data/collections";
import { formatDate } from "@/lib/format";
import { langAttr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "../_components/article-chrome";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return buildMetadata({ title: t.videos.title, description: t.videos.description, path: "/video-gallery/", locale });
}

export default async function VideosPage({ searchParams }: PageProps<"/[lang]/video-gallery">) {
  await connection();
  const { locale, t } = await getI18n();
  const { page } = readListParams(await searchParams);
  const result = await listVideos({ page, pageSize: 12 }, locale);
  if (page > result.totalPages && page > 1) notFound();
  return (
    <>
      <PageHero
        title={t.videos.title}
        lead={t.videos.lead}
        crumbs={[{ name: t.videos.title, url: "/video-gallery/" }]}
        aside={<p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{t.videos.count(result.total)}</p>}
      />
      <section aria-label={t.videos.title} className="lattice-ink bg-mist py-12 [--lattice-mask:linear-gradient(180deg,#000,transparent_50%)] lg:py-20">
        <div className="page-frame">
          {result.data.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((v, i) => (
                <Reveal key={v.id} as="li" delay={(i % 3) * 0.08}>
                  <article className="group card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
                    <YouTubeEmbed id={v.youtubeId} title={v.title} />
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      {v.publishedAt ? (
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          <time dateTime={v.publishedAt}>{formatDate(v.publishedAt, "short", locale)}</time>
                        </p>
                      ) : null}
                      <h2 lang={langAttr(v.lang, locale)} className="font-heading text-lg font-bold leading-snug text-ink">
                        <Link href={routes.video(v.slug)} className="transition-colors hover:text-navy">
                          {v.title}
                        </Link>
                      </h2>
                      <Link href={routes.video(v.slug)} className="mt-auto inline-flex min-h-10 items-center gap-1.5 self-start pt-1 text-sm font-semibold text-navy" tabIndex={-1} aria-hidden="true">
                        <span className="link-draw">{t.videos.details}</span>
                        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </ul>
          ) : (
            <EmptyState title={t.videos.empty} action={{ label: t.common.backHome, href: "/" }} />
          )}
          <div className="mt-12">
            <LinkPagination basePath="/video-gallery/" page={result.page} totalPages={result.totalPages} total={result.total} label={t.videos.pages} />
          </div>
        </div>
      </section>
    </>
  );
}
