// Splits WordPress content that holds both languages into separate Malayalam and English text.
// WordPress pages carried an English block followed by its Malayalam twin in one body (TranslatePress
// only swapped interface strings), so the new site stores each language in its own column.
import type { AnyNode } from "domhandler";
import { htmlToText, sanitizeRichText, truncateText } from "../../../src/lib/content/sanitize";
import { load } from "./parse";

export type Script = "ml" | "en";

const MALAYALAM = /[ഀ-ൿ]/g;
const LATIN = /[A-Za-z]/g;

/** Letters of each script; web addresses do not count as English. */
function letters(text: string | null | undefined): { ml: number; en: number } {
  const t = (text ?? "").replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ");
  return { ml: t.match(MALAYALAM)?.length ?? 0, en: t.match(LATIN)?.length ?? 0 };
}

/** The script most of the letters are written in, or null when the text has (almost) no letters. */
export function scriptOf(text: string | null | undefined): Script | null {
  const { ml, en } = letters(text);
  if (ml + en < 3) return null;
  return ml >= en ? "ml" : "en";
}

/** Below this many letters a run of blocks is a caption or signature, not a translation. */
const MIN_RUN_LETTERS = 80;

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const sameSite = (a: string, b: string) => norm(a).replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "") === norm(b).replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");

export interface SplitOptions {
  /** The record's own website. A body link to it repeats the page's "Visit website" button and is dropped. */
  externalUrl?: string;
}

/**
 * Splits HTML into its Malayalam and English versions. WordPress pages put a whole English version and
 * then the Malayalam one in the same body: two runs of top-level blocks, one per language. Only that
 * shape is split, block by block; blocks without letters (images, embeds) and short Latin link labels
 * (brand names such as "Facebook") go to both. Any other body (a Malayalam article with an English
 * caption, signature or tag line) is one text in its majority language and is returned unchanged.
 */
export function splitHtmlByLanguage(html: string, opts: SplitOptions = {}): { ml: string; en: string } {
  const $ = load(html);
  const blocks: Array<{ html: string; script: Script | null }> = [];
  let dropped = false;
  for (const node of $("body").contents().toArray() as AnyNode[]) {
    const el = $(node);
    const outer = $.html(node) ?? "";
    if (!outer.trim()) continue;
    const text = el.text();
    if (node.type === "tag" && el.is("a")) {
      const href = el.attr("href") ?? "";
      if (opts.externalUrl && href && sameSite(href, opts.externalUrl)) {
        dropped = true;
        continue;
      }
      if (scriptOf(text) !== "ml" && text.trim().split(/\s+/).length <= 3) {
        blocks.push({ html: outer, script: null });
        continue;
      }
    }
    // Pictures with a caption or a name under them (a photo grid of leaders) belong to both versions.
    const n = letters(text);
    if (node.type === "tag" && (el.is("figure, img, iframe, video") || (el.find("img, iframe, video").length > 0 && n.ml + n.en < 40))) {
      blocks.push({ html: outer, script: null });
      continue;
    }
    blocks.push({ html: outer, script: scriptOf(text) });
  }

  const runs: Array<{ script: Script; letters: number }> = [];
  for (const b of blocks) {
    if (!b.script) continue;
    const n = letters(load(b.html)("body").text())[b.script];
    const last = runs[runs.length - 1];
    if (last?.script === b.script) last.letters += n;
    else runs.push({ script: b.script, letters: n });
  }
  const join = (script: Script | null) =>
    sanitizeRichText(blocks.filter((b) => b.script === null || script === null || b.script === script).map((b) => b.html).join("\n").trim());

  if (runs.length === 2 && runs.every((r) => r.letters >= MIN_RUN_LETTERS)) return { ml: join("ml"), en: join("en") };
  // One text: all of it belongs to the language most of its letters are in.
  const total = letters($("body").text());
  if (total.ml + total.en < 3) return { ml: html, en: "" };
  const whole = dropped ? join(null) : html;
  return total.ml >= total.en ? { ml: whole, en: "" } : { ml: "", en: whole };
}

/** The text of an opening h1–h3 and the HTML after it, or null when the HTML does not open with a heading. */
export function leadingHeading(html: string): { text: string; rest: string } | null {
  const $ = load(html);
  const first = $("body").children().first();
  if (!first.length || !first.is("h1, h2, h3")) return null;
  const text = first.text().replace(/\s+/g, " ").trim();
  if (!text || text.length > 150) return null;
  first.remove();
  return { text, rest: ($("body").html() ?? "").trim() };
}

/** A record's text in both languages, as stored (plain columns Malayalam, `…En` English). */
export interface BilingualText {
  title: string;
  titleEn: string;
  /** Summary or excerpt. */
  summary: string;
  summaryEn: string;
  html: string;
  htmlEn: string;
  seoTitle: string;
  seoTitleEn: string;
  seoDescription: string;
  seoDescriptionEn: string;
}

/**
 * Moves a value to the English field when it is wholly English (a title with one Malayalam word stays
 * with the Malayalam text it belongs to). English already in the English field is kept.
 */
function moveEnglish(ml: string, en: string): [string, string] {
  if (scriptOf(ml) === "en" && letters(ml).ml === 0) return ["", en.trim() ? en : ml];
  return [ml, en];
}

/**
 * Separates a page's or post's languages. Plain fields keep Malayalam; English blocks, titles and
 * summaries move to the `…En` fields (existing English text there is kept). An English body that opens
 * with a heading gives the English title; a Malayalam body that opens with the title loses that
 * duplicate (the page hero shows it). Missing summaries are taken from each language's own body.
 */
export function separateLanguages(input: BilingualText, opts: SplitOptions = {}): BilingualText {
  const body = splitHtmlByLanguage(input.html, opts);
  let htmlMl = body.ml;
  const keptEn = input.htmlEn.trim() !== "";
  let htmlEn = keptEn ? input.htmlEn : body.en;
  const [title, movedTitleEn] = moveEnglish(input.title, input.titleEn);
  let titleEn = movedTitleEn;

  // An English version split from the body that opens with a heading: that heading is its title.
  const enHead = keptEn ? null : leadingHeading(htmlEn);
  if (enHead && scriptOf(enHead.text) === "en" && (!titleEn.trim() || norm(enHead.text) === norm(titleEn))) {
    titleEn = titleEn.trim() ? titleEn : enHead.text;
    htmlEn = enHead.rest;
  }
  // A Malayalam heading only goes when it repeats the title: the hero already shows it.
  const mlHead = leadingHeading(htmlMl);
  if (mlHead && title.trim() && norm(mlHead.text) === norm(title)) htmlMl = mlHead.rest;

  let [summary, summaryEn] = moveEnglish(input.summary, input.summaryEn);
  if (!summary.trim() && htmlMl) summary = truncateText(htmlToText(htmlMl), 300);
  if (!summaryEn.trim() && htmlEn) summaryEn = truncateText(htmlToText(htmlEn), 300);
  const [seoTitle, seoTitleEn] = moveEnglish(input.seoTitle, input.seoTitleEn);
  const [seoDescription, seoDescriptionEn] = moveEnglish(input.seoDescription, input.seoDescriptionEn);
  return { title, titleEn, summary, summaryEn, html: htmlMl, htmlEn, seoTitle, seoTitleEn, seoDescription, seoDescriptionEn };
}

/** Short fields (names, labels, captions): English text moves to the English field. */
export function separateField(ml: string, en: string): [string, string] {
  return moveEnglish(ml, en);
}

/** Lowercased text of both languages, for the LIKE search. */
export function bilingualSearchText(t: Pick<BilingualText, "title" | "titleEn" | "summary" | "summaryEn" | "html" | "htmlEn">): string {
  return [t.title, t.titleEn, t.summary, t.summaryEn, htmlToText(t.html), htmlToText(t.htmlEn)].filter((s) => s.trim()).join(" ").toLowerCase();
}

/** Page columns that carry text in both languages. */
export interface PageTextColumns {
  title: string; titleEn: string; summary: string; summaryEn: string; contentHtml: string; contentHtmlEn: string;
  seoTitle: string; seoTitleEn: string; seoDescription: string; seoDescriptionEn: string; externalUrl?: string;
}

/** Post columns that carry text in both languages. */
export interface PostTextColumns {
  title: string; titleEn: string; excerpt: string; excerptEn: string; contentHtml: string; contentHtmlEn: string;
  seoTitle: string; seoTitleEn: string; seoDescription: string; seoDescriptionEn: string;
}

/** separateLanguages for a pages row: the text columns, plus a search text covering both languages. */
export function separatePageColumns(row: PageTextColumns) {
  const t = separateLanguages(
    { ...row, summary: row.summary, summaryEn: row.summaryEn, html: row.contentHtml, htmlEn: row.contentHtmlEn },
    { externalUrl: row.externalUrl },
  );
  return {
    title: t.title, titleEn: t.titleEn, summary: t.summary, summaryEn: t.summaryEn, contentHtml: t.html, contentHtmlEn: t.htmlEn,
    seoTitle: t.seoTitle, seoTitleEn: t.seoTitleEn, seoDescription: t.seoDescription, seoDescriptionEn: t.seoDescriptionEn,
    searchText: bilingualSearchText(t),
  };
}

/** separateLanguages for a posts row: the text columns, plus a search text covering both languages. */
export function separatePostColumns(row: PostTextColumns) {
  const t = separateLanguages({ ...row, summary: row.excerpt, summaryEn: row.excerptEn, html: row.contentHtml, htmlEn: row.contentHtmlEn });
  return {
    title: t.title, titleEn: t.titleEn, excerpt: t.summary, excerptEn: t.summaryEn, contentHtml: t.html, contentHtmlEn: t.htmlEn,
    seoTitle: t.seoTitle, seoTitleEn: t.seoTitleEn, seoDescription: t.seoDescription, seoDescriptionEn: t.seoDescriptionEn,
    searchText: bilingualSearchText(t),
  };
}

/** Rich text that is in one language only (a leader's biography): moved whole to English when it is English. */
export function separateHtml(ml: string, en: string): [string, string] {
  const { ml: htmlMl, en: htmlEn } = splitHtmlByLanguage(ml);
  return [htmlMl, en.trim() ? en : htmlEn];
}
