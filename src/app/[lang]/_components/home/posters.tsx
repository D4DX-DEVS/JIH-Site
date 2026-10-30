/* eslint-disable @next/next/no-img-element -- R2 media with stored variants */
import { SectionHeading } from "@/components/site/section-heading";
import { localizePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { mediaUrl, pickVariant } from "@/lib/media-url";
import type { HomeData } from "@/lib/data/home";

/** Campaign posters drifting past in an endless row; hovering pauses it and lifts the poster. */
export async function PosterMarquee({ posters }: { posters: HomeData["posters"] }) {
  const items = posters.filter((p) => p.image);
  if (!items.length) return null;
  const { locale, t } = await getI18n();

  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 gap-5 pr-5 sm:gap-6 sm:pr-6" aria-hidden={hidden || undefined}>
      {items.map((p) => {
        const image = p.image!;
        const href = p.linkUrl ? localizePath(p.linkUrl, locale) : mediaUrl(image.r2Key);
        const label = p.title || image.altText || t.home.poster;
        return (
          <li key={p.id} className="w-56 shrink-0 sm:w-64 lg:w-72">
            <a
              href={href}
              target={p.linkUrl.startsWith("/") ? undefined : "_blank"}
              rel="noopener"
              tabIndex={hidden ? -1 : undefined}
              className="group card-lift block overflow-hidden rounded-2xl bg-white shadow-soft"
            >
              <span className="block aspect-[4/5] overflow-hidden">
                <img src={pickVariant(image, 480)} alt={hidden ? "" : label} loading="lazy" decoding="async" className="img-zoom size-full object-cover" />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section aria-labelledby="posters-title" className="overflow-hidden bg-mist py-[var(--section-gap)]">
      <div className="page-frame">
        <SectionHeading id="posters-title" title={t.home.postersTitle} lead={t.home.postersLead} />
      </div>
      <div className="mt-6 overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] motion-reduce:overflow-x-auto lg:mt-8">
        {items.length > 2 ? (
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none [--marquee-duration:55s] [--marquee-gap:0rem]">
            {row(false)}
            {row(true)}
          </div>
        ) : (
          <div className="page-frame flex">{row(false)}</div>
        )}
      </div>
    </section>
  );
}
