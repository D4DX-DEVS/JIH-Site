/* eslint-disable @next/next/no-img-element -- R2 media with stored variants */
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/site/section-heading";
import { formatDate } from "@/lib/format";
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
  const updates = data.latest.slice(0, 3);
  return (
    <section aria-labelledby="home-title" className="bg-navy-deep text-white">
      <Banner data={data} />
      <div className="lattice relative overflow-hidden [--lattice-mask:linear-gradient(100deg,#000_0%,transparent_60%)] [--lattice-opacity:0.1]">
        <div aria-hidden="true" className="absolute -right-40 -top-32 -z-10 size-[34rem] rounded-full bg-navy/70 blur-3xl" />
        <div className="page-frame grid gap-10 py-12 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-16">
          <Stagger className="lg:col-span-6 xl:col-span-7">
            <StaggerItem>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-gold" />
                </span>
                jihkerala.org
              </p>
            </StaggerItem>
            <StaggerItem>
              <h1 id="home-title" className="mt-5 font-heading text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight">
                {data.settings.site.name || "Jamaat-e-Islami Hind Kerala"}
              </h1>
            </StaggerItem>
            {data.settings.site.tagline ? (
              <StaggerItem>
                <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-on-navy-soft lg:text-xl">{data.settings.site.tagline}</p>
              </StaggerItem>
            ) : null}
            <StaggerItem className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/news/">
                Latest news <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/about-us/" variant="ghost">
                About the movement
              </ButtonLink>
            </StaggerItem>
          </Stagger>

          {updates.length ? (
            <Reveal x={32} y={0} delay={0.2} className="min-w-0 lg:col-span-6 xl:col-span-5">
              <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-3 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)]">
                <p className="flex items-center justify-between px-3 pb-2 pt-2 text-sm font-semibold">
                  Latest updates
                  <Link href="/news/" className="inline-flex min-h-9 items-center gap-1 text-on-navy-soft transition-colors hover:text-white">
                    All <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </p>
                <ul>
                  {updates.map((post) => (
                    <li key={post.id}>
                      <Link href={routes.post(post.slug)} className="group flex gap-4 rounded-2xl p-3 transition-colors duration-300 hover:bg-white/10">
                        <span className="relative block aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl bg-white/10 sm:w-24">
                          {post.featuredMedia ? <img src={pickVariant(post.featuredMedia, 300)} alt="" loading="lazy" className="img-zoom size-full object-cover" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-heading font-bold leading-snug">{post.title}</span>
                          {post.publishedAt ? (
                            <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-on-navy-soft">
                              <Clock className="size-3" aria-hidden="true" /> {formatDate(post.publishedAt)}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ) : null}
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
