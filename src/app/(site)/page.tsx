import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RequestTime } from "@/components/shared/request-time";
import { getHomeData } from "@/lib/data/home";
import { getSettings } from "@/lib/data/settings";
import { pickVariant } from "@/lib/media-url";
import { absoluteUrl } from "@/lib/site-url";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { HeadlineTicker, Hero } from "./_components/home/hero";
import { HomeSkeleton } from "./_components/home/home-skeleton";
import { AmeerUpdates, LatestUpdates, NewsGrid } from "./_components/home/latest";
import { GalleryBento, VideosBand } from "./_components/home/media-sections";
import { PosterMarquee } from "./_components/home/posters";
import { routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { seo, site, ogImage } = await getSettings();
  return {
    title: { absolute: seo.homeTitle || `${site.name} | ${site.shortName}` },
    description: seo.defaultDescription || site.tagline,
    alternates: { canonical: "/" },
    openGraph: {
      url: absoluteUrl("/"),
      title: seo.homeTitle || site.name,
      description: seo.defaultDescription || site.tagline,
      images: ogImage ? [{ url: absoluteUrl(pickVariant(ogImage, 1200)) }] : undefined,
    },
  };
}

/** Mirrors the WordPress homepage (Latest Updates, Ameer Updates, Posters, News, Videos, Image Gallery). */
async function Home() {
  const data = await getHomeData();
  return (
    <>
      <OrganizationJsonLd settings={data.settings} />
      <Hero data={data} />
      <HeadlineTicker posts={data.latest} />
      <LatestUpdates posts={data.latest} />
      <AmeerUpdates ameer={data.ameer} posts={data.ameerUpdates} />
      <PosterMarquee posters={data.posters} />
      <NewsGrid posts={data.news} categoryHref={routes.category(["state-news"])} />
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
