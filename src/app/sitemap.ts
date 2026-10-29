import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapEntries } from "@/lib/data/sitemap";
import { absoluteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const entries = await getSitemapEntries();
  return entries.map((e) => ({
    url: absoluteUrl(e.path),
    lastModified: e.lastModified ? new Date(e.lastModified) : undefined,
    priority: e.priority,
  }));
}
