import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { listPagesInSection, type PageDetail } from "@/lib/data/pages";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PageSection } from "@/db/schema";
import type { PublicMedia } from "@/lib/data/media";
import { ArticleBody, PageHero, SideCard, type Crumb } from "../article-chrome";

export { PostArticle } from "./post-article";

const SECTION_HUBS: Partial<Record<PageSection, { title: string; url: string }>> = {
  department: { title: "Departments", url: "/departments/" },
  feeder: { title: "Feeder organisations", url: "/feeder-organisation/" },
  publication: { title: "Media and publications", url: "/media-and-publications/" },
  about: { title: "About", url: "/about-us/" },
};

export async function ContentPage({ page }: { page: PageDetail }) {
  const hub = SECTION_HUBS[page.section];
  const sectionPages = hub ? await listPagesInSection(page.section) : [];
  const crumbs: Crumb[] = [...(hub && page.slug !== "about-us" ? [{ name: hub.title, url: hub.url }] : []), { name: page.title, url: routes.page(page.slug) }];
  return (
    <article>
      <PageHero
        title={page.title}
        lead={page.section !== "general" && page.section !== "about" ? page.summary : undefined}
        crumbs={crumbs}
        aside={
          page.externalUrl ? (
            <ButtonLink href={page.externalUrl} variant="light" external className="no-underline">
              Visit website <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </ButtonLink>
          ) : null
        }
      />
      <ArticleBody
        html={page.contentHtml}
        image={page.featuredMedia}
        imageAlt={page.title}
        mobileNav={
          sectionPages.length > 1 ? (
            <nav aria-label={`${hub!.title} pages`} className="-mx-[var(--page-gutter)]">
              <ul className="flex gap-2 overflow-x-auto px-[var(--page-gutter)] pb-1 [scrollbar-width:none]">
                {sectionPages.map((s) => {
                  const current = s.id === page.id;
                  return (
                    <li key={s.id} className="shrink-0">
                      <Link
                        href={routes.page(s.slug)}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
                          current ? "bg-navy text-white" : "bg-white text-ink hover:text-navy",
                        )}
                      >
                        {s.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null
        }
        aside={
          sectionPages.length > 1 ? (
            <SideCard title={hub!.title}>
              <nav aria-label={`${hub!.title} pages`}>
                <ul className="-mx-2 space-y-0.5">
                  {sectionPages.map((s) => {
                    const current = s.id === page.id;
                    return (
                      <li key={s.id}>
                        <Link
                          href={routes.page(s.slug)}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "group flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors",
                            current ? "bg-navy font-semibold text-white" : "text-ink hover:bg-mist hover:text-navy",
                          )}
                        >
                          <span className="leading-snug">{s.title}</span>
                          {current ? null : (
                            <ArrowRight className="size-4 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </SideCard>
          ) : null
        }
      >
        {!page.contentHtml ? <p className="text-lg text-ink-soft">{page.summary}</p> : null}
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
  const items = page.hubSection ? await listPagesInSection(page.hubSection) : [];
  return (
    <>
      <PageHero
        title={page.title}
        lead={page.summary || undefined}
        crumbs={[{ name: page.title, url: routes.page(page.slug) }]}
        aside={items.length ? <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{items.length} organisations</p> : null}
      />
      <section aria-label={page.title} className="lattice-ink bg-mist py-12 [--lattice-mask:linear-gradient(180deg,#000,transparent_50%)] lg:py-20">
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
                      <ArrowUpRight className="size-3.5" aria-hidden="true" /> Website
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                  <h2 className="font-heading text-xl font-bold leading-snug text-ink transition-colors group-hover:text-navy">
                    <Link href={routes.page(item.slug)} className="after:absolute after:inset-0">
                      {item.title}
                    </Link>
                  </h2>
                  {item.summary ? <p className="line-clamp-3 leading-relaxed text-ink-soft">{item.summary}</p> : null}
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-navy" aria-hidden="true">
                      Read more <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    {item.externalUrl ? (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 inline-flex min-h-11 items-center gap-1 text-maroon underline-offset-4 hover:underline"
                      >
                        Website <ArrowUpRight className="size-4" aria-hidden="true" />
                        <span className="sr-only">of {item.title} (opens in a new tab)</span>
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
