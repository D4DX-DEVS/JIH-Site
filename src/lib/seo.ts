import type { Metadata } from "next";
import type { PublicMedia } from "@/lib/data/media";
import { localizePath, OG_LOCALES, type Locale } from "@/lib/i18n/config";
import { pickVariant } from "@/lib/media-url";
import { absoluteUrl } from "@/lib/site-url";

interface MetaInput {
  title: string;
  description?: string;
  /** The page's address without a language prefix (routes.page(slug), "/news/"). */
  path: string;
  /** The language of the page being rendered; the canonical address is the one in this language. */
  locale: Locale;
  image?: PublicMedia | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string;
  noindex?: boolean;
}

/** Canonical address plus hreflang links to the same page in both languages. */
export function languageAlternates(path: string, locale: Locale): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizePath(path, locale),
    languages: { ml: localizePath(path, "ml"), en: localizePath(path, "en"), "x-default": localizePath(path, "ml") },
  };
}

export function buildMetadata({ title, description, path, locale, image, type = "website", publishedTime, modifiedTime, noindex }: MetaInput): Metadata {
  const desc = description?.slice(0, 300);
  const images = image ? [{ url: absoluteUrl(pickVariant(image, 1200)), width: image.width ?? undefined, height: image.height ?? undefined }] : undefined;
  return {
    title,
    description: desc,
    alternates: languageAlternates(path, locale),
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url: absoluteUrl(localizePath(path, locale)),
      locale: OG_LOCALES[locale],
      title,
      description: desc,
      images,
      ...(type === "article" ? { publishedTime: publishedTime ?? undefined, modifiedTime } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: desc, images: images?.map((i) => i.url) },
  };
}
