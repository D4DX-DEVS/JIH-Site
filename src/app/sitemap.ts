import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapEntries } from "@/lib/data/sitemap";
import { localizePath, LOCALES } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/site-url";

/** Every page in both languages, each pointing at its twin through hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const entries = await getSitemapEntries();
  return entries.flatMap((e) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localizePath(e.path, l))]));
    return LOCALES.map((locale) => ({
      url: absoluteUrl(localizePath(e.path, locale)),
      lastModified: e.lastModified ? new Date(e.lastModified) : undefined,
      priority: e.priority,
      alternates: { languages },
    }));
  });
}
