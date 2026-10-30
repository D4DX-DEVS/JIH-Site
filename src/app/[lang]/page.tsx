import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RequestTime } from "@/components/shared/request-time";
import { getHomeData } from "@/lib/data/home";
import { getSettings } from "@/lib/data/settings";
import { getI18n } from "@/lib/i18n/server";
import { languageAlternates } from "@/lib/seo";
import { pickVariant } from "@/lib/media-url";
import { absoluteUrl } from "@/lib/site-url";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { HeadlineTicker, Hero } from "./_components/home/hero";
import { HomeSkeleton } from "./_components/home/home-skeleton";
import { AmeerUpdates, LatestUpdates } from "./_components/home/latest";
import { GalleryBento, VideosBand } from "./_components/home/media-sections";
import { PosterMarquee } from "./_components/home/posters";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { locale } = await getI18n();
  const { seo, site, ogImage } = await getSettings(locale);
  return {
    title: { absolute: seo.homeTitle || `${site.name} | ${site.shortName}` },
    description: seo.defaultDescription || site.tagline,
    alternates: languageAlternates("/", locale),
    openGraph: {
      url: absoluteUrl("/"),
      title: seo.homeTitle || site.name,
      description: seo.defaultDescription || site.tagline,
      images: ogImage ? [{ url: absoluteUrl(pickVariant(ogImage, 1200)) }] : undefined,
    },
  };
}

/** Latest Updates, Ameer Updates, Posters, Videos, Image Gallery. */
async function Home() {
  const { locale } = await getI18n();
  const data = await getHomeData(locale);
  return (
    <>
      <OrganizationJsonLd settings={data.settings} />
      <Hero data={data} />
      <HeadlineTicker posts={data.latest} />
      <LatestUpdates posts={data.latest} />
      <AmeerUpdates ameer={data.ameer} posts={data.ameerUpdates} />
      <PosterMarquee posters={data.posters} />
      <VideosBand videos={data.videos} />
      <GalleryBento galleries={data.galleries} categories={data.galleryCategories} />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <RequestTime>
        <Home />
      </RequestTime>
    </Suspense>
  );
}
