import type { SiteSettings } from "@/lib/data/settings";
import type { Locale } from "@/lib/i18n/config";
import { mediaUrl } from "@/lib/media-url";
import { absoluteUrl, siteUrl } from "@/lib/site-url";

/** Serialises structured data safely for an inline script tag. */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function OrganizationJsonLd({ settings }: { settings: SiteSettings }) {
  const { site, contact, social } = settings;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: site.name,
        alternateName: site.shortName,
        url: siteUrl(),
        logo: settings.logo ? absoluteUrl(mediaUrl(settings.logo.r2Key)) : absoluteUrl("/brand/logo-blue.png"),
        description: site.tagline,
        telephone: contact.phone || undefined,
        address: contact.address
          ? { "@type": "PostalAddress", streetAddress: contact.address, addressRegion: "Kerala", addressCountry: "IN" }
          : undefined,
        sameAs: Object.values(social).filter((u) => u && !u.includes("cloudwaysapps.com")),
      }}
    />
  );
}

interface ArticleJsonLdProps {
  url: string;
  title: string;
  description: string;
  image?: string;
  publishedAt: string | null;
  updatedAt: string;
  publisher: string;
  /** Language of the article text. */
  lang: Locale;
}

export function ArticleJsonLd({ url, title, description, image, publishedAt, updatedAt, publisher, lang }: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        mainEntityOfPage: absoluteUrl(url),
        headline: title.slice(0, 110),
        description,
        image: image ? [image] : undefined,
        datePublished: publishedAt ?? undefined,
        dateModified: updatedAt,
        inLanguage: lang,
        publisher: { "@type": "Organization", name: publisher, logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-blue.png") } },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; url: string }> }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.url) })),
      }}
    />
  );
}
