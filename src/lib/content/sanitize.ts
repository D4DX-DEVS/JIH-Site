import sanitizeHtml from "sanitize-html";

const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//;

const BASE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "blockquote", "pre", "code",
    "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    iframe: ["src", "title", "allow", "allowfullscreen", "loading", "width", "height"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    ol: ["start", "type"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  // Unknown wrappers (div/section/span from page builders) are dropped but their text is kept.
  disallowedTagsMode: "discard",
  nonTextTags: ["script", "style", "noscript", "textarea", "option", "svg", "template", "button", "form"],
  exclusiveFilter: (frame) => {
    if (frame.tag === "iframe") return !YOUTUBE_EMBED.test(frame.attribs.src ?? "");
    if (frame.tag === "img") return !frame.attribs.src;
    // Drop blocks and inline wrappers that only contain whitespace.
    if (["p", "h2", "h3", "h4", "h5", "h6", "li", "figure", "i", "em", "b", "strong", "u", "a", "span"].includes(frame.tag)) {
      return !frame.text.trim() && !frame.mediaChildren.length;
    }
    return false;
  },
  transformTags: {
    h1: "h2",
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href ?? "");
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(external ? { target: "_blank", rel: "noopener noreferrer" } : { target: "", rel: "" }),
        },
      };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
};

/**
 * Sanitises rich text before it is stored or rendered. Used for admin edits and the
 * WordPress import, so stored HTML is always safe to render with dangerouslySetInnerHTML.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, BASE_OPTIONS)
    .replace(/\s(target|rel)=""/g, "")
    .replace(/[ \t]*\n\s*/g, "\n")
    .replace(/(<br \/>\s*){3,}/g, "<br /><br />")
    .trim();
}

/** Strips all markup, decoding entities, for search indexes, excerpts and meta descriptions. */
export function htmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|h\d|li|div|br)>/gi, "$& "), {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: ["script", "style", "noscript", "svg", "template"],
  })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts plain text at a word boundary. */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Decodes the HTML entities WordPress leaves in titles (&#8211;, &#8217;, &amp; …). */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
