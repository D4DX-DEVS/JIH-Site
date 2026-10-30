import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowRight, FileText, Newspaper, Search } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/shared/states";
import { LinkPagination } from "@/components/shared/link-pagination";
import Link from "@/components/i18n/link";
import { searchSite } from "@/lib/data/search";
import { formatDate } from "@/lib/format";
import { langAttr, localizePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { languageAlternates } from "@/lib/seo";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { PageHero } from "../_components/article-chrome";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: t.search.crumb,
    robots: { index: false, follow: true },
    alternates: languageAlternates("/search/", locale),
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/[lang]/search">) {
  await connection();
  const { locale, t } = await getI18n();
  const { page, q } = readListParams(await searchParams, { pageSize: 15 });
  const result = q.length >= 2 ? await searchSite(q, page, 15, locale) : null;

  const suggestions = [
    { label: t.home.latestNews, href: "/news/" },
    { label: t.nav.leaders, href: "/leaders/" },
    { label: t.nav.departments, href: "/departments/" },
    { label: t.nav.imageGallery, href: "/image-gallery/" },
  ];

  return (
    <>
      <PageHero title={q ? t.search.titleFor(q) : t.search.title} crumbs={[{ name: t.search.crumb, url: "/search/" }]} lead={t.search.lead} />
      <div className="lattice-ink bg-mist [--lattice-mask:linear-gradient(180deg,#000,transparent_40%)]">
        <div className="page-frame py-10 lg:py-14">
          <form action={localizePath("/search/", locale)} method="get" role="search" className="mx-auto max-w-3xl">
            <label htmlFor="search-q" className="sr-only">
              {t.search.inputLabel}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input
                id="search-q"
                name="q"
                type="search"
                defaultValue={q}
                required
                minLength={2}
                maxLength={100}
                placeholder={t.search.placeholder}
                className="min-h-14 w-full rounded-full border border-border/80 bg-white pl-14 pr-32 text-base shadow-soft outline-none transition-shadow focus-visible:border-navy focus-visible:shadow-lift"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center gap-2 rounded-full bg-navy px-5 font-semibold text-white transition-colors hover:bg-navy-deep"
              >
                {t.search.button}
              </button>
            </div>
          </form>

          <section aria-labelledby="results-title" className="mx-auto mt-10 max-w-3xl">
            <h2 id="results-title" className="sr-only">
              {t.search.results}
            </h2>
            {!result ? (
              <div className="text-center">
                <p className="text-ink-soft">{t.search.shortcuts}</p>
                <ul className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <li key={s.href}>
                      <Link href={s.href} className="inline-flex min-h-11 items-center rounded-full border border-border/80 bg-white px-5 text-sm font-semibold text-navy transition-all hover:-translate-y-0.5 hover:border-navy">
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : result.data.length ? (
              <>
                <p role="status" className="mb-5 text-ink-soft">
                  {t.search.resultsFor(result.total, q)}
                </p>
                <ul className="space-y-3">
                  {result.data.map((hit, i) => {
                    const isPost = hit.type === "post";
                    const Icon = isPost ? Newspaper : FileText;
                    return (
                      <Reveal key={`${hit.type}-${hit.slug}`} as="li" delay={Math.min(i, 5) * 0.04}>
                        <article className="group card-lift relative flex gap-4 rounded-2xl border border-border/70 bg-white p-5 shadow-soft sm:gap-5">
                          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/[0.06] text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                            <Icon className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                              {isPost ? t.search.news : t.search.page}
                              {isPost && hit.publishedAt ? <span className="font-normal normal-case tracking-normal"> · {formatDate(hit.publishedAt, "short", locale)}</span> : null}
                            </p>
                            <h3 lang={langAttr(hit.lang, locale)} className="mt-1 font-heading text-lg font-bold leading-snug text-ink transition-colors group-hover:text-navy">
                              <Link href={isPost ? routes.post(hit.slug) : routes.page(hit.slug)} className="after:absolute after:inset-0">
                                {hit.title}
                              </Link>
                            </h3>
                            {hit.excerpt ? <p lang={langAttr(hit.lang, locale)} className="mt-1 line-clamp-2 text-ink-soft">{hit.excerpt}</p> : null}
                          </div>
                          <ArrowRight className="mt-1 size-5 shrink-0 text-navy opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 max-sm:hidden" aria-hidden="true" />
                        </article>
                      </Reveal>
                    );
                  })}
                </ul>
                <div className="mt-10">
                  <LinkPagination basePath="/search/" page={result.page} totalPages={result.totalPages} total={result.total} params={{ q }} label={t.search.pages} />
                </div>
              </>
            ) : (
              <EmptyState title={t.search.nothingFound(q)} description={t.search.nothingFoundDescription} action={{ label: t.search.browseNews, href: "/news/" }} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
