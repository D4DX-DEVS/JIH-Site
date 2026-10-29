import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Read per request, so flipping SITE_INDEXABLE on the Worker takes effect without a rebuild.
  await connection();
  // Non-production deployments (previews, staging) must never be indexed.
  const indexable = process.env.SITE_INDEXABLE === "true";
  return {
    rules: indexable ? [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/search/"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: indexable ? absoluteUrl("/sitemap.xml") : undefined,
  };
}
