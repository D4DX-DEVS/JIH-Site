import Link from "next/link";
import { ArrowRight, House, Search } from "lucide-react";

const SHORTCUTS = [
  { label: "Latest news", href: "/news/" },
  { label: "Leaders", href: "/leaders/" },
  { label: "Image gallery", href: "/image-gallery/" },
  { label: "Contact", href: "/contact/" },
];

/** Body of the 404 page: search box and shortcuts on the navy lattice field. */
export function NotFoundContent() {
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
          This page could not be found
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-on-navy-soft">
          The address may have changed when the site moved. Search for the statement or page, or start from the latest news.
        </p>
        <form action="/search/" method="get" role="search" className="relative mt-8 w-full max-w-xl">
          <label htmlFor="nf-q" className="sr-only">
            Search the site
          </label>
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input
            id="nf-q"
            name="q"
            type="search"
            required
            minLength={2}
            placeholder="Search the site"
            className="min-h-14 w-full rounded-full border-0 bg-white pl-14 pr-32 text-base text-ink shadow-lift outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center rounded-full bg-maroon px-5 font-semibold text-white transition-colors hover:bg-maroon-deep">
            Search
          </button>
        </form>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-navy transition-all hover:-translate-y-0.5">
            <House className="size-4" aria-hidden="true" /> Home
          </Link>
          {SHORTCUTS.map((s) => (
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
