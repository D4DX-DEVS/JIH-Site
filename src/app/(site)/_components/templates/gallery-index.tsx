import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/shared/states";
import { LinkPagination } from "@/components/shared/link-pagination";
import type { GalleryCard } from "@/lib/data/collections";
import { formatDate } from "@/lib/format";
import type { Paginated } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { PageHero, type Crumb } from "../article-chrome";

interface GalleryIndexProps {
  title: string;
  crumbs: Crumb[];
  basePath: string;
  result: Paginated<GalleryCard>;
  categories: Array<{ slug: string; name: string }>;
  activeCategory?: string;
}

const chip = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5";
const chipIdle = "border-border/80 bg-white text-ink hover:border-navy hover:text-navy";
const chipActive = "border-navy bg-navy text-white";

/** Galleries as a bento grid of covers; the first on each page is large. Title and count sit over the picture. */
export function GalleryIndex({ title, crumbs, basePath, result, categories, activeCategory }: GalleryIndexProps) {
  // The large first card takes four cells. Widen a few later cards (two cells each) so the last row is never left part-empty.
  const n = result.data.length;
  const fill = n > 1 ? (4 - ((3 + n) % 4)) % 4 : 0;
  const wide = new Set(Array.from({ length: fill }, (_, k) => n - 1 - k * 3).filter((i) => i > 0));
  return (
    <>
      <PageHero
        title={title}
        lead="Photographs from conferences, campaigns and gatherings of the movement."
        crumbs={crumbs}
        aside={<p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white">{result.total} albums</p>}
      />
      <div className="border-b border-border/70 bg-white">
        <nav aria-label="Gallery categories" className="page-frame overflow-x-auto py-3 [scrollbar-width:none]">
          <ul className="flex gap-2 py-1">
            <li>
              <Link href="/image-gallery/" className={cn(chip, !activeCategory ? chipActive : chipIdle)} aria-current={!activeCategory ? "page" : undefined}>
                All galleries
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={routes.galleryCategory(c.slug)} className={cn(chip, activeCategory === c.slug ? chipActive : chipIdle)} aria-current={activeCategory === c.slug ? "page" : undefined}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <section aria-label="Albums" className="page-frame py-10 lg:py-14">
        {result.data.length ? (
          <ul className="grid grid-flow-row-dense auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 lg:auto-rows-[15rem] lg:grid-cols-4">
            {result.data.map((g, i) => {
              const big = i === 0;
              return (
                <Reveal key={g.id} as="li" delay={(i % 4) * 0.06} className={cn(big && "col-span-2 row-span-2", wide.has(i) && "col-span-2")}>
                  <Link href={routes.gallery(g.slug)} className="group card-lift relative isolate flex h-full flex-col justify-end overflow-hidden rounded-2xl bg-navy-deep text-white">
                    {g.cover ? (
                      <ResponsiveImage
                        media={g.cover}
                        fallbackAlt=""
                        sizes={big || wide.has(i) ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                        priority={i < 3}
                        className="img-zoom absolute inset-0 -z-10 size-full"
                      />
                    ) : (
                      <span className="lattice absolute inset-0 -z-10 bg-navy" aria-hidden="true" />
                    )}
                    <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep/95 via-navy-deep/30 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
                    <span className="absolute right-3 top-3 inline-flex size-9 translate-y-1 items-center justify-center rounded-full bg-white/95 text-navy opacity-0 shadow-soft transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true">
                      <ArrowUpRight className="size-4" />
                    </span>
                    <span className="block p-3 sm:p-5">
                      <span className={cn("block font-heading font-bold leading-snug", big ? "text-xl sm:text-3xl" : "line-clamp-2 text-sm sm:text-lg")}>{g.title}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-navy-soft sm:text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Images className="size-3.5" aria-hidden="true" /> {g.imageCount} photos
                        </span>
                        {g.publishedAt ? <span className="max-sm:hidden">{formatDate(g.publishedAt, "short")}</span> : null}
                      </span>
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No galleries here yet" action={{ label: "All galleries", href: "/image-gallery/" }} />
        )}
        <div className="mt-12">
          <LinkPagination basePath={basePath} page={result.page} totalPages={result.totalPages} total={result.total} label="Gallery pages" />
        </div>
      </section>
    </>
  );
}
