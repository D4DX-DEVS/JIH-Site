/**
 * The public site is bilingual. Malayalam is the default and keeps the WordPress addresses
 * (/history/); English lives under /en/ (/en/history/). next.config.ts rewrites unprefixed
 * addresses to /ml/… internally, so both languages render through app/[lang].
 */
export const LOCALES = ["ml", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ml";
/** Prefix of the language that is not the default. */
export const EN_PREFIX = "/en";

export const OTHER_LOCALE: Record<Locale, Locale> = { ml: "en", en: "ml" };
/** Each language's own name for itself, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { ml: "മലയാളം", en: "English" };
export const OG_LOCALES: Record<Locale, string> = { ml: "ml_IN", en: "en_IN" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// Addresses that are the same in both languages: files, the admin, the feed, other sites.
const SHARED_PATH = /^\/(?:media|admin|feed|brand|wp-content)(?:\/|$)|^\/(?:robots\.txt|sitemap\.xml|icon\.png|apple-icon\.png)$/;

/** True for an address the site serves in both languages (an internal page, not a file or another site). */
export function isLocalizablePath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !SHARED_PATH.test(href);
}

/**
 * Splits a pathname into its language and the path without the language prefix. The internal
 * /ml/ prefix (the rewrite target, and the old TranslatePress addresses) also counts as Malayalam;
 * "ml" and "en" are reserved slugs, so no page can live there.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return { locale, path: pathname.slice(prefix.length) || "/" };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/**
 * The address of an internal page in a language. Accepts paths with or without a language
 * prefix, and keeps the query and hash. Anything else (files, other sites, mailto:) is returned as is.
 */
export function localizePath(href: string, locale: Locale): string {
  if (!isLocalizablePath(href)) return href;
  const cut = href.search(/[?#]/);
  const pathname = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? "" : href.slice(cut);
  const { path } = splitLocale(pathname);
  if (locale === DEFAULT_LOCALE) return `${path}${rest}`;
  return `${EN_PREFIX}${path === "/" ? "/" : path}${rest}`;
}

/** A `lang` attribute for text shown in a language other than the page's (fallback content), else undefined. */
export function langAttr(textLang: Locale, pageLocale: Locale): Locale | undefined {
  return textLang === pageLocale ? undefined : textLang;
}
