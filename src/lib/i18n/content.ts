import { localizePath, OTHER_LOCALE, type Locale } from "./config";

/**
 * Bilingual records keep Malayalam in the plain columns and English in the `…En` columns. A visitor
 * sees each record in one language: theirs when the record has it, otherwise the other one (with a
 * notice), never a mix of both.
 */

const filled = (value: string | null | undefined): value is string => !!value && value.trim() !== "";

/**
 * The language a record is shown in. `ml` and `en` are the record's deciding text in each language:
 * its body when it has one, otherwise its title.
 */
export function contentLocale(locale: Locale, ml: string | null | undefined, en: string | null | undefined): Locale {
  const own = locale === "en" ? en : ml;
  const other = locale === "en" ? ml : en;
  if (filled(own)) return locale;
  return filled(other) ? OTHER_LOCALE[locale] : locale;
}

/** One field in the given language, falling back to the other language when that one is empty. */
export function inLocale(lang: Locale, ml: string | null | undefined, en: string | null | undefined): string {
  const own = lang === "en" ? en : ml;
  const other = lang === "en" ? ml : en;
  return filled(own) ? own : (other ?? "");
}

/**
 * A secondary field (summary, excerpt, description) in the record's language only. Unlike the title,
 * it never borrows the other language: a Malayalam card with an English summary would read as a mix.
 */
export function ownText(lang: Locale, ml: string | null | undefined, en: string | null | undefined): string {
  const own = lang === "en" ? en : ml;
  return filled(own) ? own : "";
}

/** A short standalone label (a category or menu name): the reader's language when there is one, else the other. */
export function pickText(locale: Locale, ml: string | null | undefined, en: string | null | undefined): string {
  return inLocale(contentLocale(locale, ml, en), ml, en);
}

/** The deciding text of a record: the body when either language has one, otherwise the titles. */
export function decidingText(
  body: { ml: string | null | undefined; en: string | null | undefined },
  title: { ml: string | null | undefined; en: string | null | undefined },
): { ml: string; en: string } {
  return filled(body.ml) || filled(body.en) ? { ml: body.ml ?? "", en: body.en ?? "" } : { ml: title.ml ?? "", en: title.en ?? "" };
}

/**
 * Internal links inside stored HTML point at Malayalam addresses. On the English site they are
 * moved under /en/ so a reader stays in their language.
 */
export function localizeHtmlLinks(html: string, locale: Locale): string {
  if (locale !== "en" || !html) return html;
  return html.replace(/(<a\b[^>]*?\shref=)(["'])(\/[^"']*)\2/gi, (_m, start: string, quote: string, href: string) => `${start}${quote}${localizePath(href, locale)}${quote}`);
}
