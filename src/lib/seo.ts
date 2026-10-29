import type { Metadata } from "next";
import type { PublicMedia } from "@/lib/data/media";
import { pickVariant } from "@/lib/media-url";
import { absoluteUrl } from "@/lib/site-url";

interface MetaInput {
  title: string;
  description?: string;
  path: string;
  image?: PublicMedia | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string;
  noindex?: boolean;
}

export function buildMetadata({ title, description, path, image, type = "website", publishedTime, modifiedTime, noindex }: MetaInput): Metadata {
  const desc = description?.slice(0, 300);
  const images = image ? [{ url: absoluteUrl(pickVariant(image, 1200)), width: image.width ?? undefined, height: image.height ?? undefined }] : undefined;
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url: absoluteUrl(path),
      title,
      description: desc,
      images,
      ...(type === "article" ? { publishedTime: publishedTime ?? undefined, modifiedTime } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: desc, images: images?.map((i) => i.url) },
  };
}
