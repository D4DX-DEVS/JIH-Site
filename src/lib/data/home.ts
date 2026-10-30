import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { listCategories, listPosts, type PostSummary } from "./posts";
import { getMastheadImages, listGalleries, listGalleryCategories, listLeaders, listPosters, listVideos } from "./collections";
import { getSettings } from "./settings";

/** Everything the homepage shows, in one round of cached reads. Mirrors the WordPress homepage blocks. */
export async function getHomeData(locale: Locale) {
  const categories = await listCategories(locale);
  const ameerCategory = categories.find((c) => c.slug === "ameer-updates");

  const [latest, ameerUpdates, masthead, posters, videos, galleries, galleryCategories, leaders, settings] =
    await Promise.all([
      listPosts({ page: 1, pageSize: 8 }, locale),
      ameerCategory ? listPosts({ page: 1, pageSize: 9, categoryIds: [ameerCategory.id] }, locale) : null,
      getMastheadImages(5),
      listPosters(locale),
      listVideos({ page: 1, pageSize: 4 }, locale),
      listGalleries({ page: 1, pageSize: 5 }, locale),
      listGalleryCategories(locale),
      listLeaders(locale),
      getSettings(locale),
    ]);

  // Latest Updates shows the first five; Ameer Updates skips those so no block repeats a story.
  const shownInLatest = new Set(latest.data.slice(0, 5).map((p) => p.id));
  return {
    latest: latest.data,
    ameerUpdates: (ameerUpdates?.data ?? ([] as PostSummary[])).filter((p) => !shownInLatest.has(p.id)).slice(0, 4),
    ameer: leaders.find((l) => l.groupKey === "ameer") ?? null,
    masthead,
    posters,
    videos: videos.data,
    galleries: galleries.data,
    galleryCategories,
    settings,
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
