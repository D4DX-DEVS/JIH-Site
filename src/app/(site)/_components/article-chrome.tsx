import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, House } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { PublicMedia } from "@/lib/data/media";
import { cn } from "@/lib/utils";

export interface Crumb {
  name: string;
  url: string;
}

export function Breadcrumbs({ items, tone = "dark" }: { items: Crumb[]; tone?: "dark" | "light" }) {
  const all = [{ name: "Home", url: "/" }, ...items];
  const dark = tone === "dark";
  return (
    <>
      <BreadcrumbJsonLd items={all} />
      <nav aria-label="Breadcrumb" className={cn("text-sm", dark ? "text-on-navy-soft" : "text-ink-soft")}>
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((c, i) => (
            <li key={c.url} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /> : null}
              {i === all.length - 1 ? (
                <span aria-current="page" className={cn("line-clamp-1", dark ? "text-white" : "text-ink")}>
                  {c.name}
                </span>
              ) : (
                <Link href={c.url} className={cn("inline-flex items-center gap-1.5 transition-colors", dark ? "hover:text-white" : "hover:text-navy")}>
                  {i === 0 ? <House className="size-3.5" aria-hidden="true" /> : null}
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

interface PageHeroProps {
  title: string;
  lead?: string;
  crumbs: Crumb[];
  /** Small facts under the title (date, category, counts …). */
  aside?: ReactNode;
  image?: PublicMedia | null;
  /** Kept for older call sites; every hero now sits on the navy field. */
  tone?: "paper" | "navy";
}

/** Navy hero with the lattice texture: breadcrumb, title, lead and facts; a framed picture on the right when there is one. */
export function PageHero({ title, lead, crumbs, aside, image }: PageHeroProps) {
  return (
    <header className="lattice relative overflow-hidden bg-navy-deep text-white [--lattice-mask:radial-gradient(ellipse_at_top_right,#000_10%,transparent_70%)] [--lattice-opacity:0.12]">
      <div className={cn("page-frame grid gap-10 pb-10 pt-8 lg:pb-14 lg:pt-10", image && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14")}>
        <div className="min-w-0">
          <Breadcrumbs items={crumbs} />
          <Reveal y={20}>
            <h1
              className={cn(
                "mt-6 max-w-4xl font-heading font-extrabold leading-[1.15] tracking-tight [overflow-wrap:anywhere] lg:mt-8",
                // Malayalam headlines run long; long ones step down so they stay within a few lines.
                title.length > 90 ? "text-[clamp(1.5rem,1.15rem+1.3vw,2.4rem)]" : title.length > 50 ? "text-[clamp(1.65rem,1.2rem+1.8vw,3rem)]" : "text-[clamp(1.85rem,1.3rem+2.6vw,3.75rem)]",
              )}
            >
              {title}
            </h1>
          </Reveal>
          {lead ? (
            <Reveal y={20} delay={0.08}>
              <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-on-navy-soft lg:text-xl">{lead}</p>
            </Reveal>
          ) : null}
          {aside ? (
            <Reveal y={16} delay={0.16}>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-on-navy-soft [&_a:hover]:text-white [&_a]:underline-offset-4">{aside}</div>
            </Reveal>
          ) : null}
        </div>
        {image ? (
          <Reveal x={24} y={0} delay={0.1} className="relative">
            <div aria-hidden="true" className="absolute -inset-3 -z-10 rotate-2 rounded-3xl border border-white/15" />
            <div className="overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/10">
              <ResponsiveImage media={image} fallbackAlt={title} sizes="(min-width: 1024px) 40vw, 100vw" priority className="aspect-[4/3] size-full" />
            </div>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}

interface ArticleBodyProps {
  html?: string;
  /** Shown whole across the top of the card, at its own shape: page banners carry lettering that a crop would cut. */
  image?: PublicMedia | null;
  imageAlt?: string;
  aside?: ReactNode;
  /** Replaces the sidebar below `lg`: shown above the card, where a phone reader finds it before the text. */
  mobileNav?: ReactNode;
  children?: ReactNode;
}

/** The text on a white card over a tinted band, with an optional sidebar on the right (sticky on large screens). */
export function ArticleBody({ html, image, imageAlt = "", aside, mobileNav, children }: ArticleBodyProps) {
  return (
    <div className="bg-mist">
      <div className={cn("page-frame grid gap-4 py-4 sm:gap-8 sm:py-12 lg:py-14", aside ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]" : "")}>
        {mobileNav ? <div className="min-w-0 lg:hidden">{mobileNav}</div> : null}
        <div
          className={cn(
            "min-w-0 rounded-3xl bg-white p-5 sm:p-10 lg:p-12 max-sm:-mx-[var(--page-gutter)] max-sm:rounded-none",
            !aside && "mx-auto w-full max-w-4xl",
          )}
        >
          {image ? (
            <ResponsiveImage
              media={image}
              fallbackAlt={imageAlt}
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
              className="mb-8 rounded-2xl object-contain sm:mb-10"
            />
          ) : null}
          <div className="mx-auto max-w-[75ch]">
            {html ? <div className="prose-content" dangerouslySetInnerHTML={{ __html: html }} /> : null}
            {children}
          </div>
        </div>
        {aside ? <aside className={cn("space-y-6 lg:sticky lg:top-28 lg:self-start", mobileNav && "max-lg:hidden")}>{aside}</aside> : null}
      </div>
    </div>
  );
}

/** Sidebar card used next to articles and pages. */
export function SideCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 sm:p-6", className)}>
      <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
