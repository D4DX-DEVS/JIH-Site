import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { LinkPagination } from "@/components/shared/link-pagination";
import { listCategories, listPosts } from "@/lib/data/posts";
import type { PageDetail } from "@/lib/data/pages";
import { readListParams } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { PageHero } from "../article-chrome";
import { PostList } from "../post-list";

type SearchParams = Record<string, string | string[] | undefined>;

const chip =
  "inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5";
const chipIdle = "border-border/80 bg-white text-ink hover:border-navy hover:text-navy";
const chipActive = "border-navy bg-navy text-white shadow-[0_8px_20px_-10px_rgb(7_30_127/0.8)]";

/** /news/: every published post, filterable by category and searchable; all state in the URL. */
export async function NewsArchive({ page, searchParams }: { page: PageDetail; searchParams: SearchParams }) {
  const { page: pageNo, q } = readListParams(searchParams, { pageSize: 12 });
  const categorySlug = typeof searchParams.category === "string" ? searchParams.category : "";
  const categories = (await listCategories()).filter((c) => c.postCount > 0);
  const active = categories.find((c) => c.slug === categorySlug);
  const descendants = active ? [active.id, ...categories.filter((c) => c.parentId === active.id).map((c) => c.id)] : undefined;
  const result = await listPosts({ page: pageNo, pageSize: 12, q, categoryIds: descendants });
  if (pageNo > result.totalPages && pageNo > 1) notFound();
  const topLevel = categories.filter((c) => !c.parentId);
  const filtered = !!(q || active);
  const filterHref = (slug?: string) => {
    const qs = new URLSearchParams();
    if (slug) qs.set("category", slug);
    if (q) qs.set("q", q);
    const s = qs.toString();
    return s ? `/news/?${s}` : "/news/";
  };

  return (
    <>
      <PageHero
        title={page.title}
        lead={page.summary || "Statements, press releases and updates from Jamaat-e-Islami Hind Kerala."}
        crumbs={[{ name: page.title, url: "/news/" }]}
        aside={<p>{result.total} {result.total === 1 ? "article" : "articles"}{active ? ` in ${active.name}` : ""}</p>}
      />

      <div className="sticky top-16 z-30 border-b border-border/70 bg-white/90 backdrop-blur-xl lg:top-[4.75rem]">
        <div className="page-frame flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-6">
          <form action="/news/" method="get" role="search" className="relative w-full lg:w-80 lg:shrink-0">
            <label htmlFor="news-q" className="sr-only">
              Search news
            </label>
            {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input
              id="news-q"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={100}
              placeholder="Search news"
              className="min-h-11 w-full rounded-full border border-border bg-white pl-11 pr-24 text-base outline-none transition-colors focus-visible:border-navy focus-visible:ring-4 focus-visible:ring-navy/10"
            />
            <button type="submit" className="absolute right-1 top-1/2 inline-flex min-h-9 -translate-y-1/2 items-center rounded-full bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-deep">
              Search
            </button>
          </form>
          <nav aria-label="Categories" className="-mx-[var(--page-gutter)] min-w-0 flex-1 overflow-x-auto px-[var(--page-gutter)] [scrollbar-width:none] lg:mx-0 lg:px-0">
            <ul className="flex gap-2 py-1">
              <li>
                <Link href={filterHref()} aria-current={!active ? "page" : undefined} className={cn(chip, !active ? chipActive : chipIdle)}>
                  All news
                </Link>
              </li>
              {topLevel.map((c) => (
                <li key={c.id}>
                  <Link href={filterHref(c.slug)} aria-current={active?.id === c.id ? "page" : undefined} className={cn(chip, active?.id === c.id ? chipActive : chipIdle)}>
                    {c.name}
                    <span className={cn("rounded-full px-1.5 text-xs", active?.id === c.id ? "bg-white/20" : "bg-mist text-ink-soft")}>{c.postCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <section aria-labelledby="news-results" className="page-frame py-10 lg:py-14">
        <h2 id="news-results" className="sr-only">
          Results
        </h2>
        {filtered ? (
          <div className="mb-8 flex flex-wrap items-center gap-3" role="status">
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">{result.total}</span> {result.total === 1 ? "result" : "results"}
              {q ? <> for “{q}”</> : null}
              {active ? <> in {active.name}</> : null}
            </p>
            <Link href="/news/" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-mist px-4 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
              <X className="size-4" aria-hidden="true" /> Clear filters
            </Link>
            {active ? (
              <Link href={routes.category([active.slug])} className="group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-navy">
                <span className="link-draw">Open the {active.name} archive</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}
        {result.data.length ? (
          <PostList posts={result.data} featureFirst={!filtered && result.page === 1} />
        ) : (
          <EmptyState title="No news matches these filters" description="Try a different word or another category." action={{ label: "Clear filters", href: "/news/" }} />
        )}
        <div className="mt-12">
          <LinkPagination basePath="/news/" page={result.page} totalPages={result.totalPages} total={result.total} params={{ q, category: categorySlug }} label="News pages" />
        </div>
      </section>
    </>
  );
}
