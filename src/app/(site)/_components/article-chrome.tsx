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
      <div aria-hidden="true" className="absolute -right-40 -top-40 -z-10 size-[36rem] rounded-full bg-navy/70 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-48 -left-32 -z-10 size-[28rem] rounded-full bg-maroon/25 blur-3xl" />
      <div className={cn("page-frame grid gap-10 pb-14 pt-8 lg:pb-20 lg:pt-10", image && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14")}>
        <div className="min-w-0">
          <Breadcrumbs items={crumbs} />
          <Reveal y={20}>
            <h1
              className={cn(
                "mt-8 max-w-4xl font-heading font-extrabold leading-[1.15] tracking-tight [overflow-wrap:anywhere] lg:mt-12",
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

/** Reading column with an optional sidebar on the right (sticky on large screens). */
export function ArticleBody({ html, aside, children }: { html?: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className={cn("page-frame grid gap-12 py-12 lg:py-16", aside ? "lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_22rem]" : "")}>
      <div className={cn("min-w-0", !aside && "mx-auto w-full max-w-3xl")}>
        {html ? <div className="prose-content max-w-[72ch]" dangerouslySetInnerHTML={{ __html: html }} /> : null}
        {children}
      </div>
      {aside ? <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">{aside}</aside> : null}
    </div>
  );
}

/** Sidebar card used next to articles and pages. */
export function SideCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-mist p-5 sm:p-6", className)}>
      <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
