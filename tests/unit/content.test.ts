import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToText, sanitizeRichText, truncateText } from "@/lib/content/sanitize";
import { decodeSegment, isValidSlug, pathFor, slugify } from "@/lib/slug";

describe("sanitizeRichText", () => {
  it("removes scripts, event handlers and javascript: links", () => {
    const out = sanitizeRichText(`<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><img src="x" onerror="y()">`);
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("<p>Hi</p>");
  });

  it("keeps YouTube embeds and drops other iframes", () => {
    const out = sanitizeRichText(`<iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk"></iframe><iframe src="https://evil.example/x"></iframe>`);
    expect(out).toContain("youtube-nocookie.com/embed/abcdefghijk");
    expect(out).not.toContain("evil.example");
  });

  it("opens external links in a new tab safely and leaves internal links alone", () => {
    const out = sanitizeRichText(`<p><a href="https://example.org">ext</a> <a href="/news/">int</a></p>`);
    expect(out).toContain(`<a href="https://example.org" target="_blank" rel="noopener noreferrer">ext</a>`);
    expect(out).toContain(`<a href="/news/">int</a>`);
  });

  it("demotes h1 to h2, lazy-loads images and drops empty blocks", () => {
    const out = sanitizeRichText(`<h1>Title</h1><p> </p><img src="/media/a.jpg" alt="a">`);
    expect(out).toContain("<h2>Title</h2>");
    expect(out).not.toContain("<p>");
    expect(out).toMatch(/<img src="\/media\/a.jpg" alt="a" loading="lazy" decoding="async" \/>/);
  });
});

describe("text helpers", () => {
  it("turns HTML into readable text and truncates on a word", () => {
    expect(htmlToText("<p>One&nbsp;two</p><p>three</p>")).toMatch(/One two\s+three/);
    expect(truncateText("alpha beta gamma delta", 12)).toMatch(/^alpha beta…?$/);
    expect(decodeEntities("A &amp; B &#8211; C")).toBe("A & B – C");
  });
});

describe("slugs", () => {
  it("keeps Malayalam letters and combining marks", () => {
    expect(slugify("ജമാഅത്തെ ഇസ്‌ലാമി Kerala!")).toBe("ജമാഅത്തെ-ഇസ്ലാമി-kerala");
    expect(isValidSlug("ജമാഅത്തെ-ഇസ്ലാമി")).toBe(true);
    expect(isValidSlug("Has Spaces")).toBe(false);
  });

  it("round-trips through percent-encoding", () => {
    const slug = "വിട-പോപ്-ഫ്രാൻസിസ്";
    const path = pathFor(slug);
    expect(path).toMatch(/^\/%E0%B4/);
    expect(decodeSegment(path.slice(1, -1))).toBe(slug);
    expect(decodeSegment("%E0%A4")).toBe("%E0%A4");
    expect(pathFor("category", "state-news")).toBe("/category/state-news/");
  });
});
