/* eslint-disable @next/next/no-img-element -- R2 media with stored variants */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { mediaUrl, pickVariant, srcSetFor } from "@/lib/media-url";
import { routes } from "@/lib/routes";
import type { HomeData } from "@/lib/data/home";
import { HeroSlideshow } from "./hero-slideshow";

/**
 * The homepage banner shown whole: the designed cover (logo, name and handles are part of the
 * picture) at its own aspect ratio, nothing laid over it. Without a banner set in Settings,
 * event photographs rotate in a 2:1 frame instead. The introduction sits in a band below.
 */
function Banner({ data }: { data: HomeData }) {
  const banner = data.settings.banner;
  if (banner) {
    const ratio = banner.width && banner.height ? `${banner.width} / ${banner.height}` : "2 / 1";
    return (
      <div className="mx-auto max-w-[2560px] bg-navy-deep">
        <img
          src={mediaUrl(banner.r2Key)}
          srcSet={srcSetFor(banner)}
          sizes="100vw"
          width={banner.width ?? undefined}
          height={banner.height ?? undefined}
          alt={banner.altText || "Jamaat-e-Islami Hind Kerala, jihkerala.org"}
          fetchPriority="high"
          decoding="async"
          style={{ aspectRatio: ratio }}
          className="block h-auto w-full animate-in fade-in-0 duration-1000 motion-reduce:animate-none"
        />
      </div>
    );
  }
  const slides = data.masthead.map((m) => ({ src: pickVariant(m, 1600), srcSet: srcSetFor(m), width: m.width, height: m.height }));
  if (!slides.length) return null;
  return (
    <div className="relative mx-auto aspect-[2/1] max-w-[2560px] overflow-hidden bg-navy-deep">
      <HeroSlideshow slides={slides} controlsClassName="absolute bottom-2 left-1/2 -translate-x-1/2" />
    </div>
  );
}

export function Hero({ data }: { data: HomeData }) {
  return (
    <section aria-labelledby="home-title" className="bg-navy-deep text-white">
      <Banner data={data} />
      <div className="lattice relative overflow-hidden [--lattice-mask:linear-gradient(100deg,#000_0%,transparent_60%)] [--lattice-opacity:0.1]">
        <div className="page-frame py-8 lg:py-12">
          <Stagger className="grid gap-x-12 lg:grid-cols-12 lg:items-end">
            <StaggerItem className="lg:col-span-6">
              <h1 id="home-title" className="font-heading text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight">
                {data.settings.site.name || "Jamaat-e-Islami Hind Kerala"}
              </h1>
            </StaggerItem>
            <StaggerItem className="lg:col-span-6">
              {data.settings.site.tagline ? (
                <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-on-navy-soft lg:mt-0">{data.settings.site.tagline}</p>
              ) : null}
              {/* One row on phones too: tighter padding and text below `sm`, full size above. */}
              <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                <ButtonLink href="/news/" className="min-h-11 px-3.5 text-sm sm:min-h-12 sm:px-6 sm:text-base">
                  Latest news <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/about-us/" variant="ghost" className="min-h-11 px-3.5 text-sm sm:min-h-12 sm:px-6 sm:text-base">
                  About the movement
                </ButtonLink>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/** Headlines running across a maroon strip; pauses on hover, scrolls by hand with reduced motion. */
export function HeadlineTicker({ posts }: { posts: HomeData["latest"] }) {
  if (!posts.length) return null;
  const items = posts.slice(0, 8);
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map((p) => (
        <li key={p.id} className="flex shrink-0 items-center gap-10">
          <Link href={routes.post(p.slug)} tabIndex={hidden ? -1 : undefined} className="whitespace-nowrap font-medium text-white/90 transition-colors hover:text-white">
            {p.title}
          </Link>
          <span aria-hidden="true" className="size-1.5 rotate-45 bg-gold" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative z-10 flex items-stretch overflow-hidden bg-maroon text-sm text-white">
      <p className="relative z-10 flex shrink-0 items-center gap-2 bg-maroon-deep px-4 font-semibold sm:px-6">
        <span className="size-2 animate-pulse rounded-full bg-gold" aria-hidden="true" />
        Updates
      </p>
      <div className="min-w-0 flex-1 overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)] motion-reduce:overflow-x-auto">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none [--marquee-duration:70s] [--marquee-gap:0rem]">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
