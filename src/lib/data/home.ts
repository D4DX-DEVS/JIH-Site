import "server-only";
import { listCategories, listPosts, type PostSummary } from "./posts";
import { getMastheadImages, listGalleries, listGalleryCategories, listLeaders, listPosters, listVideos } from "./collections";
import { getSettings } from "./settings";

/** Everything the homepage shows, in one round of cached reads. Mirrors the WordPress homepage blocks. */
export async function getHomeData() {
  const categories = await listCategories();
  const ameerCategory = categories.find((c) => c.slug === "ameer-updates");
  const newsCategory = categories.find((c) => c.slug === "state-news");

  const [latest, ameerUpdates, news, masthead, posters, videos, galleries, galleryCategories, leaders, settings] =
    await Promise.all([
      listPosts({ page: 1, pageSize: 8 }),
      ameerCategory ? listPosts({ page: 1, pageSize: 9, categoryIds: [ameerCategory.id] }) : null,
      newsCategory ? listPosts({ page: 1, pageSize: 8, categoryIds: [newsCategory.id] }) : null,
      getMastheadImages(5),
      listPosters(),
      listVideos({ page: 1, pageSize: 4 }),
      listGalleries({ page: 1, pageSize: 5 }),
      listGalleryCategories(),
      listLeaders(),
      getSettings(),
    ]);

  // Latest Updates shows the first five; Ameer Updates and News skip those so no block repeats a story.
  const shownInLatest = new Set(latest.data.slice(0, 5).map((p) => p.id));
  return {
    latest: latest.data,
    ameerUpdates: (ameerUpdates?.data ?? ([] as PostSummary[])).filter((p) => !shownInLatest.has(p.id)).slice(0, 4),
    news: (news?.data ?? []).filter((p) => !shownInLatest.has(p.id)).slice(0, 3),
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
