/* eslint-disable @next/next/no-img-element -- YouTube thumbnails */
import Link from "next/link";
import { ArrowRight, Camera, Mail, MapPin, Phone, Play } from "lucide-react";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { YouTubeEmbed } from "@/components/media/youtube-embed";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ButtonLink, SectionHeading } from "@/components/site/section-heading";
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
      <div aria-hidden="true" className="absolute -left-40 top-1/3 -z-10 size-[32rem] rounded-full bg-navy/80 blur-3xl" />
      <div className="page-frame">
        <SectionHeading id="videos-title" tone="dark" title="Videos" lead="Speeches, programmes and campaigns on video." link={{ href: "/video-gallery/", label: "All videos" }} />
        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <div className="overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/10">
              <YouTubeEmbed id={main.youtubeId} title={main.title} />
            </div>
            <h3 className="mt-5 font-heading text-xl font-bold leading-snug sm:text-2xl">
              <Link href={routes.video(main.slug)} className="link-draw">
                {main.title}
              </Link>
            </h3>
            {main.publishedAt ? <p className="mt-1 text-sm text-on-navy-soft">{formatDate(main.publishedAt)}</p> : null}
          </Reveal>
          <Stagger as="ul" className="grid content-start gap-4 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
            {rest.map((v) => (
              <StaggerItem as="li" key={v.id}>
                <Link href={routes.video(v.slug)} className="group flex gap-4 rounded-2xl p-2 transition-colors duration-300 hover:bg-white/[0.07] sm:flex-col lg:flex-row">
                  <span className="relative block aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-white/10 sm:w-full lg:w-40">
                    <img src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" decoding="async" className="img-zoom size-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-navy-deep/30 transition-colors duration-300 group-hover:bg-navy-deep/10">
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/90 text-maroon transition-transform duration-300 group-hover:scale-110">
                        <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 py-1">
                    <span className="line-clamp-3 font-medium leading-snug text-white/90 transition-colors group-hover:text-white">{v.title}</span>
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
        <Stagger as="ul" className="mt-10 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 lg:mt-14 lg:grid-cols-4">
          {items.map((g, i) => (
            <StaggerItem as="li" key={g.id} className={cn(i === 0 && "col-span-2 row-span-2", items.length === 2 && i === 1 && "col-span-2 row-span-2 lg:col-span-2")}>
              <Link href={routes.gallery(g.slug)} className="group relative block size-full overflow-hidden rounded-2xl bg-mist">
                <ResponsiveImage media={g.cover!} fallbackAlt="" sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} className="img-zoom absolute inset-0 size-full" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
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

/** Closing call to action: the state office, how to reach it, and a photograph of the movement. */
export function ContactBand({ settings, photo }: { settings: HomeData["settings"]; photo: HomeData["masthead"][number] | undefined }) {
  const { contact } = settings;
  return (
    <section aria-labelledby="contact-title" className="page-frame pb-[var(--section-gap)]">
      <Reveal>
        <div className="lattice relative grid overflow-hidden rounded-[2rem] bg-navy text-white shadow-lift [--lattice-mask:linear-gradient(90deg,#000,transparent_70%)] [--lattice-opacity:0.12] lg:grid-cols-12">
          <div aria-hidden="true" className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-maroon/40 blur-3xl" />
          <div className="p-8 sm:p-12 lg:col-span-7 lg:p-16">
            <h2 id="contact-title" className="font-heading text-step-3 font-extrabold leading-tight">
              Visit or write to the state office
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-on-navy-soft">Press, programmes and organisational enquiries are handled at the state headquarters in Kozhikode.</p>
            <ul className="mt-8 space-y-3">
              {contact.address ? (
                <li className="flex gap-3">
                  <MapPin className="mt-1 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <span className="whitespace-pre-line text-white/90">{contact.address}</span>
                </li>
              ) : null}
              {contact.phone ? (
                <li className="flex items-center gap-3">
                  <Phone className="size-5 shrink-0 text-gold" aria-hidden="true" />
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="link-draw text-white/90 hover:text-white">
                    {contact.phone}
                  </a>
                </li>
              ) : null}
              {contact.email ? (
                <li className="flex items-center gap-3">
                  <Mail className="size-5 shrink-0 text-gold" aria-hidden="true" />
                  <a href={`mailto:${contact.email}`} className="link-draw break-all text-white/90 hover:text-white">
                    {contact.email}
                  </a>
                </li>
              ) : null}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/contact/">
                Send a message <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </ButtonLink>
              {contact.phone ? (
                <ButtonLink href={`tel:${contact.phone.replace(/\s/g, "")}`} variant="ghost">
                  <Phone className="size-4" aria-hidden="true" /> Call the office
                </ButtonLink>
              ) : null}
            </div>
          </div>
          {photo ? (
            <div className="relative hidden lg:col-span-5 lg:block">
              <ResponsiveImage media={photo} fallbackAlt="" sizes="40vw" className="absolute inset-0 size-full" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy via-navy/30 to-transparent" />
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
