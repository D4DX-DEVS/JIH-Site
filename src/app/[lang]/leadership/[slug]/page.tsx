import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, UserRound } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { getLeaderBySlug } from "@/lib/data/collections";
import { LanguageNotice } from "@/components/i18n/language-notice";
import { langAttr, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { htmlToText, truncateText } from "@/lib/content/sanitize";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { decodeSegment } from "@/lib/slug";
import { BreadcrumbData } from "../../_components/article-chrome";

export const instant = false;

async function resolve(slug: string, locale: Locale) {
  await connection();
  return getLeaderBySlug(decodeSegment(slug), locale);
}

export async function generateMetadata({ params }: PageProps<"/[lang]/leadership/[slug]">): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const leader = await resolve((await params).slug, locale);
  if (!leader) return { title: t.notFound.title, robots: { index: false } };
  return buildMetadata({
    title: `${leader.name}${leader.roleTitle ? `, ${leader.roleTitle}` : ""}`,
    description: truncateText(htmlToText(leader.bioHtml), 200),
    path: routes.leader(leader.slug),
    image: leader.photo,
    locale,
  });
}

export default async function LeaderPage({ params }: PageProps<"/[lang]/leadership/[slug]">) {
  const { locale, t } = await getI18n();
  const leader = await resolve((await params).slug, locale);
  if (!leader) notFound();
  return (
    <article>
      <header className="lattice relative overflow-hidden bg-navy-deep text-white [--lattice-mask:radial-gradient(ellipse_at_top_right,#000_10%,transparent_70%)] [--lattice-opacity:0.12]">
        <BreadcrumbData items={[{ name: t.nav.leaders, url: "/leaders/" }, { name: leader.name, url: routes.leader(leader.slug) }]} />
        <div className="page-frame pb-14 pt-12 lg:pb-20 lg:pt-16">
          <div className="grid items-center gap-10 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
            <Reveal className="relative mx-auto w-full max-w-xs sm:max-w-none">
              <div aria-hidden="true" className="absolute -inset-3 -z-10 rotate-3 rounded-[2rem] border border-white/15" />
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-navy shadow-lift ring-1 ring-white/10">
                {leader.photo ? (
                  <ResponsiveImage media={leader.photo} fallbackAlt={leader.name} sizes="(min-width: 1024px) 22rem, (min-width: 640px) 16rem, 80vw" priority className="size-full object-top" />
                ) : (
                  <span className="flex size-full items-center justify-center text-white/40" aria-hidden="true">
                    <UserRound className="size-20" />
                  </span>
                )}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">{t.leaders.groups[leader.groupKey]}</p>
              <h1 lang={langAttr(leader.lang, locale)} className="mt-4 font-heading text-[clamp(2.25rem,1.4rem+3vw,4.25rem)] font-extrabold leading-[1.05] tracking-tight">{leader.name}</h1>
              {leader.roleTitle ? <p lang={langAttr(leader.lang, locale)} className="mt-3 text-xl text-on-navy-soft">{leader.roleTitle}</p> : null}
            </Reveal>
          </div>
        </div>
      </header>
      <div className="page-frame py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <LanguageNotice lang={leader.lang} className="mb-8" />
          {leader.bioHtml ? <div lang={langAttr(leader.lang, locale)} className="prose-content" dangerouslySetInnerHTML={{ __html: leader.bioHtml }} /> : <p className="text-lg text-ink-soft">{t.leaders.noProfile}</p>}
          <ButtonLink href="/leaders/" variant="navy" className="mt-10">
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" /> {t.leaders.all}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
