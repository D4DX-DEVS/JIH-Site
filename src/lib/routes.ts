import { pathFor } from "./slug";

// Public URL shapes. They match the WordPress permalinks so legacy URLs keep working.
export const routes = {
  post: (slug: string) => pathFor(slug),
  page: (slug: string) => pathFor(slug),
  category: (slugs: string[]) => pathFor("category", ...slugs),
  tag: (slug: string) => pathFor("tag", slug),
  leader: (slug: string) => pathFor("leadership", slug),
  gallery: (slug: string) => pathFor("image-gallery", slug),
  galleryCategory: (slug: string) => pathFor("image-category", slug),
  video: (slug: string) => pathFor("video-gallery", slug),
};

export function youtubeThumb(id: string, quality: "hq" | "maxres" = "hq"): string {
  return `https://i.ytimg.com/vi/${id}/${quality === "hq" ? "hqdefault" : "maxresdefault"}.jpg`;
}
