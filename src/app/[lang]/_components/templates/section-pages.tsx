import { ArrowRight, FileText } from "lucide-react";
import Link from "@/components/i18n/link";
import { ResponsiveImage } from "@/components/media/responsive-image";
import type { PageCard } from "@/lib/data/pages";
import { langAttr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { ScrollToCurrent } from "./scroll-to-current";

interface SectionPagesProps {
  /** The section's name, e.g. Feeder organisations. */
  title: string;
  pages: PageCard[];
  currentId: number;
}

/** The page's picture, or the lattice tile when it has none. Decorative: the title sits beside it. */
function Thumb({ page, current, className }: { page: PageCard; current: boolean; className: string }) {
  return (
    <span aria-hidden="true" className={cn("relative shrink-0 overflow-hidden rounded-xl", current ? "ring-2 ring-gold/80 ring-offset-2 ring-offset-navy" : "bg-mist", className)}>
      {page.featuredMedia ? (
        <ResponsiveImage media={page.featuredMedia} fallbackAlt="" sizes="64px" className="img-zoom size-full object-cover" />
      ) : (
        <span className="lattice flex size-full items-center justify-center bg-navy-deep text-white [--lattice-opacity:0.25]">
          <FileText className="size-5" />
        </span>
      )}
    </span>
  );
}

/** Large screens: the section's pages as a column of cards beside the text; the open page is the navy one. */
export async function SectionPagesNav({ title, pages, currentId }: SectionPagesProps) {
  const { locale, t } = await getI18n();
  return (
    <section>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-6 w-1 rounded-full bg-gold" />
        <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
        <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">{pages.length}</span>
      </div>
      <nav aria-label={t.page.sectionPages(title)} className="mt-4">
        {/* Long sections scroll inside the sticky column instead of running past the screen. */}
        <ScrollToCurrent className="-m-1 max-h-[calc(100dvh-11rem)] overflow-y-auto p-1 [scrollbar-width:thin]">
          <ul className="space-y-2.5">
            {pages.map((page) => {
              const current = page.id === currentId;
              return (
                <li key={page.id}>
                  <Link
                    href={routes.page(page.slug)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-2 pr-3 transition-[border-color,box-shadow] duration-300",
                      current
                        ? "lattice border-navy bg-navy text-white shadow-lift [--lattice-mask:linear-gradient(90deg,transparent_30%,#000)] [--lattice-opacity:0.14]"
                        : "border-white bg-white text-ink hover:border-navy/15 hover:shadow-[0_14px_30px_-20px_rgb(7_30_127/0.5)]",
                    )}
                  >
                    <Thumb page={page} current={current} className="size-14" />
                    <span lang={langAttr(page.lang, locale)} className={cn("line-clamp-2 min-w-0 flex-1 text-[0.95rem] leading-snug", current ? "font-semibold" : "font-medium group-hover:text-navy")}>
                      {page.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                        current ? "bg-white/10 text-gold" : "bg-mist text-navy group-hover:bg-navy group-hover:text-white",
                      )}
                    >
                      {/* The open page marks its place with a dot; the others point onward. */}
                      {current ? <span className="size-2 rounded-full bg-gold" /> : <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ScrollToCurrent>
      </nav>
    </section>
  );
}

/** Phones and tablets: the same cards in a row that scrolls sideways, above the text. */
export async function SectionPagesStrip({ title, pages, currentId }: SectionPagesProps) {
  const { locale, t } = await getI18n();
  return (
    <nav aria-label={t.page.sectionPages(title)} className="-mx-[var(--page-gutter)]">
      <ScrollToCurrent className="snap-x snap-mandatory overflow-x-auto scroll-px-[var(--page-gutter)] px-[var(--page-gutter)] pb-1 [scrollbar-width:none]">
        <ul className="flex gap-2.5">
          {pages.map((page) => {
            const current = page.id === currentId;
            return (
              <li key={page.id} className="shrink-0 snap-start">
                <Link
                  href={routes.page(page.slug)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex w-56 items-center gap-2.5 rounded-2xl border p-1.5 pr-3 transition-colors",
                    current ? "border-navy bg-navy text-white" : "border-white bg-white text-ink active:border-navy/20",
                  )}
                >
                  <Thumb page={page} current={current} className="size-11" />
                  <span lang={langAttr(page.lang, locale)} className={cn("line-clamp-2 min-w-0 text-sm leading-snug", current ? "font-semibold" : "font-medium")}>
                    {page.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollToCurrent>
    </nav>
  );
}
