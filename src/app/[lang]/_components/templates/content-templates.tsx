import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "@/components/i18n/link";
import { LanguageNotice } from "@/components/i18n/language-notice";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { hubTitle, listPagesInSection, type PageDetail } from "@/lib/data/pages";
import { langAttr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import type { PageSection } from "@/db/schema";
import type { PublicMedia } from "@/lib/data/media";
import { ArticleBody, BreadcrumbData, PageHero, type Crumb } from "../article-chrome";
import { SectionPagesNav, SectionPagesStrip } from "./section-pages";

export { PostArticle } from "./post-article";

/** The hub page each section's pages belong to; titles come from the dictionary (t.sections). */
const SECTION_HUBS: Partial<Record<PageSection, string>> = {
  department: "/departments/",
  feeder: "/feeder-organisation/",
  publication: "/media-and-publications/",
  about: "/about-us/",
};

export async function ContentPage({ page }: { page: PageDetail }) {
  const { locale, t } = await getI18n();
  const hubUrl = SECTION_HUBS[page.section];
  const hub = hubUrl && page.section !== "general" ? { title: t.sections[page.section], url: hubUrl } : null;
  const sectionPages = hub ? await listPagesInSection(page.section, locale) : [];
  const crumbs: Crumb[] = [...(hub && page.slug !== "about-us" ? [{ name: hub.title, url: hub.url }] : []), { name: page.title, url: routes.page(page.slug) }];
  return (
    <article>
      {/* No hero: the banner image and sidebar already name the page, so the text follows the header directly. */}
      <BreadcrumbData items={crumbs} />
      <h1 lang={langAttr(page.lang, locale)} className="sr-only">
        {page.title}
      </h1>
      <ArticleBody
        html={page.contentHtml}
        lang={langAttr(page.lang, locale)}
        image={page.featuredMedia}
        imageAlt={page.title}
        notice={page.contentHtml || page.summary ? <LanguageNotice lang={page.lang} /> : null}
        mobileNav={sectionPages.length > 1 ? <SectionPagesStrip title={hub!.title} pages={sectionPages} currentId={page.id} /> : null}
        aside={sectionPages.length > 1 ? <SectionPagesNav title={hub!.title} pages={sectionPages} currentId={page.id} /> : null}
      >
        {!page.contentHtml ? <p className="text-lg text-ink-soft">{page.summary}</p> : null}
        {page.externalUrl ? (
          <ButtonLink href={page.externalUrl} external className="mt-8 no-underline">
            {t.page.visitWebsite} <ArrowUpRight className="size-4" aria-hidden="true" />
            <span className="sr-only">{t.common.newTab}</span>
          </ButtonLink>
        ) : null}
      </ArticleBody>
    </article>
  );
}

const CARD_SIZES = "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw";

/**
 * Hub cards come from WordPress as wide banner strips or square logos as often as photographs.
 * Photo-shaped pictures fill the frame; a banner strip runs full width across a navy field and a
 * logo sits whole on white, so neither is cropped.
 */
function CardImage({ media }: { media: PublicMedia }) {
  const ratio = media.width && media.height ? media.width / media.height : 1.5;
  if (ratio >= 1.25 && ratio <= 2) return <ResponsiveImage media={media} fallbackAlt="" sizes={CARD_SIZES} className="img-zoom size-full" />;
  if (ratio > 2) {
    return (
      <div className="lattice flex size-full items-center bg-navy-deep [--lattice-mask:none] [--lattice-opacity:0.12]">
        <ResponsiveImage media={media} fallbackAlt="" sizes={CARD_SIZES} className="img-zoom w-full shadow-lift" />
      </div>
    );
  }
  return (
    <div className="flex size-full items-center justify-center bg-white">
      <ResponsiveImage media={media} fallbackAlt="" sizes="(min-width: 1024px) 20vw, 60vw" className="img-zoom h-full w-auto bg-white object-contain p-5" />
    </div>
  );
}

/** Departments, feeder organisations, publications: the bodies in this section as a card grid. */
export async function HubPage({ page }: { page: PageDetail }) {
  const { locale, t } = await getI18n();
  const items = page.hubSection ? await listPagesInSection(page.hubSection, locale) : [];
  const title = hubTitle(page);
  return (
    <>
      <PageHero
        title={title}
        lead={page.summary || undefined}
        crumbs={[{ name: title, url: routes.page(page.slug) }]}
        aside={items.length ? <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{t.hub.count(items.length)}</p> : null}
      />
      <section aria-label={title} className="lattice-ink bg-mist py-12 [--lattice-mask:linear-gradient(180deg,#000,transparent_50%)] lg:py-20">
        <ul className="page-frame grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.id} as="li" delay={(i % 3) * 0.08}>
              <article className="group card-lift relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
                <div className="relative aspect-[16/10] overflow-hidden border-b border-border/60 bg-white">
                  {item.featuredMedia ? (
                    <CardImage media={item.featuredMedia} />
                  ) : (
                    <div className="lattice flex size-full items-end bg-gradient-to-br from-navy to-navy-deep p-6 [--lattice-opacity:0.14]" aria-hidden="true">
                      <span className="font-heading text-6xl font-extrabold text-white/90">{item.title.charAt(0)}</span>
                    </div>
                  )}
                  {item.externalUrl ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-navy shadow-soft">
                      <ArrowUpRight className="size-3.5" aria-hidden="true" /> {t.hub.website}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                  <h2 lang={langAttr(item.lang, locale)} className="font-heading text-xl font-bold leading-snug text-ink transition-colors group-hover:text-navy">
                    <Link href={routes.page(item.slug)} className="after:absolute after:inset-0">
                      {item.title}
                    </Link>
                  </h2>
                  {item.summary ? <p lang={langAttr(item.lang, locale)} className="line-clamp-3 leading-relaxed text-ink-soft">{item.summary}</p> : null}
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-navy" aria-hidden="true">
                      {t.common.readMore} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    {item.externalUrl ? (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 inline-flex min-h-11 items-center gap-1 text-maroon underline-offset-4 hover:underline"
                      >
                        {t.hub.website} <ArrowUpRight className="size-4" aria-hidden="true" />
                        <span className="sr-only">{t.hub.websiteOf(item.title)}</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </section>
    </>
  );
}
