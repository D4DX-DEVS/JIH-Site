import "server-only";
import { listCategories, listPosts, type PostSummary } from "./posts";
import { getMastheadImages, listGalleries, listGalleryCategories, listLeaders, listPosters, listVideos } from "./collections";
import { listPagesInSection } from "./pages";
import { getSettings } from "./settings";

/** Everything the homepage shows, in one round of cached reads. Mirrors the WordPress homepage blocks. */
export async function getHomeData() {
  const categories = await listCategories();
  const ameerCategory = categories.find((c) => c.slug === "ameer-updates");
  const newsCategory = categories.find((c) => c.slug === "state-news");

  const [latest, ameerUpdates, news, masthead, posters, videos, galleries, galleryCategories, leaders, departments, feeders, publications, settings] =
    await Promise.all([
      listPosts({ page: 1, pageSize: 8 }),
      ameerCategory ? listPosts({ page: 1, pageSize: 4, categoryIds: [ameerCategory.id] }) : null,
      newsCategory ? listPosts({ page: 1, pageSize: 12, categoryIds: [newsCategory.id] }) : null,
      getMastheadImages(5),
      listPosters(),
      listVideos({ page: 1, pageSize: 4 }),
      listGalleries({ page: 1, pageSize: 5 }),
      listGalleryCategories(),
      listLeaders(),
      listPagesInSection("department"),
      listPagesInSection("feeder"),
      listPagesInSection("publication"),
      getSettings(),
    ]);

  // Latest Updates shows the first five; News skips those so the two blocks never repeat a story.
  const shownInLatest = new Set(latest.data.slice(0, 5).map((p) => p.id));
  return {
    latest: latest.data,
    ameerUpdates: ameerUpdates?.data ?? ([] as PostSummary[]),
    news: (news?.data ?? []).filter((p) => !shownInLatest.has(p.id)).slice(0, 6),
    ameer: leaders.find((l) => l.groupKey === "ameer") ?? null,
    masthead,
    posters,
    videos: videos.data,
    galleries: galleries.data,
    galleryCategories,
    departments,
    feeders,
    publications,
    settings,
    totals: {
      posts: latest.total,
      galleries: galleries.total,
      videos: videos.total,
      leaders: leaders.length,
      organisations: departments.length + feeders.length + publications.length,
    },
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
