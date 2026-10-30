"use client";

import { ArrowRight, House, Search } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { localizePath } from "@/lib/i18n/config";

/** Body of the 404 page: search box and shortcuts on the navy lattice field. */
export function NotFoundContent() {
  const { locale, t } = useI18n();

  const shortcuts = [
    { label: t.notFound.shortcuts.latestNews, href: "/news/" },
    { label: t.notFound.shortcuts.leaders, href: "/leaders/" },
    { label: t.notFound.shortcuts.imageGallery, href: "/image-gallery/" },
    { label: t.notFound.shortcuts.contact, href: "/contact/" },
  ];

  return (
    <section
      aria-labelledby="nf-title"
      className="lattice relative overflow-hidden bg-navy-deep text-white [--lattice-mask:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)] [--lattice-opacity:0.12]"
    >
      <div className="page-frame flex flex-col items-center py-20 text-center lg:py-28">
        <p className="font-heading text-[clamp(6rem,18vw,12rem)] font-extrabold leading-none text-white/15 motion-safe:animate-float" aria-hidden="true">
          404
        </p>
        <h1 id="nf-title" className="-mt-6 font-heading text-step-3 font-extrabold leading-tight sm:-mt-10">
          {t.notFound.title}
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-on-navy-soft">{t.notFound.description}</p>
        <form action={localizePath("/search/", locale)} method="get" role="search" className="relative mt-8 w-full max-w-xl">
          <label htmlFor="nf-q" className="sr-only">
            {t.notFound.searchPlaceholder}
          </label>
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input
            id="nf-q"
            name="q"
            type="search"
            required
            minLength={2}
            placeholder={t.notFound.searchPlaceholder}
            className="min-h-14 w-full rounded-full border-0 bg-white pl-14 pr-32 text-base text-ink shadow-lift outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center rounded-full bg-maroon px-5 font-semibold text-white transition-colors hover:bg-maroon-deep"
          >
            {t.notFound.searchButton}
          </button>
        </form>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-navy transition-all hover:-translate-y-0.5">
            <House className="size-4" aria-hidden="true" /> {t.notFound.homeButton}
          </Link>
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 px-5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
            >
              {s.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
