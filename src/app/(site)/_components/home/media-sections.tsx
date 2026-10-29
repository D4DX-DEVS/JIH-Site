/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import Link from "next/link";
import { Camera, Play } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { HomeData } from "@/lib/data/home";
import { cn } from "@/lib/utils";

/** The newest video ready to play, the next three as thumbnails. */
export function VideosBand({ videos }: { videos: HomeData["videos"] }) {
  if (!videos.length) return null;
  const [main, ...rest] = videos;
  return (
    <section aria-labelledby="videos-title" className="lattice relative overflow-hidden bg-navy-deep py-[var(--section-gap)] text-white [--lattice-mask:radial-gradient(ellipse_at_bottom_right,#000_0%,transparent_60%)]">
      <div className="page-frame">
        <SectionHeading id="videos-title" tone="dark" title="Videos" lead="Speeches, programmes and campaigns on video." link={{ href: "/video-gallery/", label: "All videos" }} />
        {/* Large screens: the player in the first row with its title beneath; the list sits beside the player
            only, so its first thumbnail starts at the player's top edge and its last ends at the bottom edge. */}
        <div className="mt-6 grid gap-x-8 gap-y-5 lg:mt-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-7 lg:row-start-1">
            <div className="overflow-hidden rounded-2xl">
              <YouTubeEmbed id={main.youtubeId} title={main.title} />
            </div>
          </Reveal>
          <div className="lg:col-span-7 lg:row-start-2">
            <h3 className="font-heading text-xl font-bold leading-snug sm:text-2xl">
              <Link href={routes.video(main.slug)} className="link-draw">
                {main.title}
              </Link>
            </h3>
            {main.publishedAt ? <p className="mt-1 text-sm text-on-navy-soft">{formatDate(main.publishedAt)}</p> : null}
          </div>
          <Stagger
            as="ul"
            className={cn(
              // h-0 + min-h-full: the list takes the player's height instead of adding its own to the row.
              "mt-3 grid gap-4 sm:grid-cols-3 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:h-0 lg:min-h-full lg:grid-cols-1",
              rest.length === 3 ? "lg:grid-rows-3" : rest.length === 2 ? "lg:grid-rows-2" : "lg:grid-rows-1",
            )}
          >
            {rest.map((v) => (
              <StaggerItem as="li" key={v.id} className="min-h-0">
                <Link href={routes.video(v.slug)} className="group flex h-full gap-4 sm:flex-col lg:flex-row lg:items-center">
                  <span className="relative block aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-white/10 sm:w-full lg:h-full lg:w-auto">
                    <img src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" decoding="async" className="img-zoom size-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-navy-deep/30 transition-colors duration-300 group-hover:bg-navy-deep/10">
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/90 text-maroon transition-transform duration-300 group-hover:scale-110">
                        <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-3 font-semibold leading-snug text-white/90 transition-colors group-hover:text-white">{v.title}</span>
                    {v.publishedAt ? <span className="mt-1 block text-xs text-on-navy-soft">{formatDate(v.publishedAt)}</span> : null}
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/** Newest galleries as a bento grid; the first one large. Archive categories sit beside the heading. */
export function GalleryBento({ galleries, categories }: { galleries: HomeData["galleries"]; categories: HomeData["galleryCategories"] }) {
  const items = galleries.filter((g) => g.cover).slice(0, 5);
  if (!items.length) return null;
  return (
    <section aria-labelledby="gallery-title" className="py-[var(--section-gap)]">
      <div className="page-frame">
        <SectionHeading id="gallery-title" title="Image Gallery" lead="Conferences, campaigns and gatherings of the movement." link={{ href: "/image-gallery/", label: "All galleries" }} />
        {categories.length ? (
          <Reveal delay={0.05}>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Gallery collections">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={routes.galleryCategory(c.slug)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-mist px-4 text-sm font-medium text-ink transition-colors duration-300 hover:bg-navy hover:text-white"
                  >
                    <Camera className="size-3.5" aria-hidden="true" /> {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
        <Stagger as="ul" className="mt-6 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 lg:mt-8 lg:grid-cols-4">
          {items.map((g, i) => (
            <StaggerItem as="li" key={g.id} className={cn(i === 0 && "col-span-2 row-span-2", items.length === 2 && i === 1 && "col-span-2 row-span-2 lg:col-span-2")}>
              <Link href={routes.gallery(g.slug)} className="group relative block size-full overflow-hidden rounded-2xl bg-mist">
                <ResponsiveImage media={g.cover!} fallbackAlt="" sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} className="img-zoom absolute inset-0 size-full" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs backdrop-blur-md">
                    <Camera className="size-3" aria-hidden="true" /> {g.imageCount} photos
                  </span>
                  <span className={cn("block font-heading font-bold leading-snug", i === 0 ? "text-xl sm:text-2xl" : "line-clamp-2 text-sm sm:text-base")}>{g.title}</span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
