import { describe, expect, it } from "vitest";
import { isLocalizablePath, localizePath, splitLocale } from "@/lib/i18n/config";
import { contentLocale, decidingText, inLocale, localizeHtmlLinks, ownText, pickText } from "@/lib/i18n/content";
import { dictionaries } from "@/lib/i18n/dictionaries";

describe("language addresses", () => {
  it("keeps Malayalam at the WordPress address and puts English under /en/", () => {
    expect(localizePath("/history/", "ml")).toBe("/history/");
    expect(localizePath("/history/", "en")).toBe("/en/history/");
    expect(localizePath("/", "en")).toBe("/en/");
    expect(localizePath("/", "ml")).toBe("/");
  });

  it("switches an address that already has a language, keeping query and hash", () => {
    expect(localizePath("/en/news/?page=2#top", "ml")).toBe("/news/?page=2#top");
    expect(localizePath("/news/?page=2", "en")).toBe("/en/news/?page=2");
    expect(localizePath("/en/", "ml")).toBe("/");
    expect(localizePath("/en/history/", "en")).toBe("/en/history/");
  });

  it("leaves files, the admin, the feed and other sites alone", () => {
    for (const href of ["/media/uploads/a.pdf", "/admin/", "/feed/", "/brand/logo.png", "/sitemap.xml", "https://siokerala.org/", "//cdn.example/x", "mailto:a@b.c", "#main"]) {
      expect(localizePath(href, "en"), href).toBe(href);
    }
    expect(isLocalizablePath("/about-us/")).toBe(true);
    expect(isLocalizablePath("/media/x")).toBe(false);
  });

  it("splits a pathname into language and path, including the internal /ml/ prefix", () => {
    expect(splitLocale("/en/history/")).toEqual({ locale: "en", path: "/history/" });
    expect(splitLocale("/en")).toEqual({ locale: "en", path: "/" });
    expect(splitLocale("/ml/history/")).toEqual({ locale: "ml", path: "/history/" });
    expect(splitLocale("/history/")).toEqual({ locale: "ml", path: "/history/" });
    // Only whole segments count: an English-looking slug is not a language prefix.
    expect(splitLocale("/english-wing/")).toEqual({ locale: "ml", path: "/english-wing/" });
  });
});

describe("choosing the language of a record", () => {
  it("uses the reader's language when the record has it, otherwise the other one", () => {
    expect(contentLocale("en", "മലയാളം", "English")).toBe("en");
    expect(contentLocale("en", "മലയാളം", "")).toBe("ml");
    expect(contentLocale("ml", "", "English")).toBe("en");
    expect(contentLocale("ml", "  ", "  ")).toBe("ml");
    expect(contentLocale("en", null, undefined)).toBe("en");
  });

  it("fills an empty field from the other language without mixing when both exist", () => {
    expect(inLocale("en", "ശീർഷകം", "Title")).toBe("Title");
    expect(inLocale("en", "ശീർഷകം", "")).toBe("ശീർഷകം");
    expect(inLocale("ml", "", "Title")).toBe("Title");
    expect(pickText("ml", "", "Leaders")).toBe("Leaders");
    expect(pickText("ml", "നേതൃത്വം", "Leaders")).toBe("നേതൃത്വം");
  });

  it("decides by the body when there is one, by the title otherwise", () => {
    expect(decidingText({ ml: "<p>ശരീരം</p>", en: "" }, { ml: "", en: "Title" })).toEqual({ ml: "<p>ശരീരം</p>", en: "" });
    expect(decidingText({ ml: "", en: "" }, { ml: "", en: "Title" })).toEqual({ ml: "", en: "Title" });
  });
});

describe("links inside stored HTML", () => {
  it("moves internal links under /en/ on the English site only", () => {
    const html = `<p><a href="/history/">History</a> <a href='/media/uploads/a.pdf'>PDF</a> <a href="https://sio.org/">SIO</a> <a class="x" href="/en/gio/">GIO</a></p>`;
    expect(localizeHtmlLinks(html, "en")).toBe(
      `<p><a href="/en/history/">History</a> <a href='/media/uploads/a.pdf'>PDF</a> <a href="https://sio.org/">SIO</a> <a class="x" href="/en/gio/">GIO</a></p>`,
    );
    expect(localizeHtmlLinks(html, "ml")).toBe(html);
  });
});

describe("interface dictionaries", () => {
  it("give Malayalam every key English has", () => {
    const keys = (value: unknown, prefix = ""): string[] =>
      value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`)) : [prefix.slice(0, -1)];
    expect(keys(dictionaries.ml).sort()).toEqual(keys(dictionaries.en).sort());
  });

  it("have no empty strings", () => {
    const strings = (value: unknown): string[] =>
      typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
    for (const locale of ["ml", "en"] as const) expect(strings(dictionaries[locale]).filter((s) => !s.trim()), locale).toEqual([]);
  });

  it("keeps the interface in English on Malayalam pages, apart from metadata and the language switch", () => {
    const { meta, language, ...rest } = dictionaries.ml;
    const { meta: _meta, language: _language, ...enRest } = dictionaries.en;
    expect(rest).toEqual(enRest);
    expect(meta.siteName).toMatch(/[ഀ-ൿ]/);
    expect(language.switchTo).toBe("Read this page in English");
  });

  it("never borrows a summary from the other language", () => {
    // A Malayalam card with only an English summary shows no summary rather than a mix.
    expect(ownText("ml", "", "Who we are")).toBe("");
    expect(ownText("ml", "ആമുഖം", "Who we are")).toBe("ആമുഖം");
    expect(ownText("en", "ആമുഖം", " ")).toBe("");
    expect(inLocale("ml", "", "History")).toBe("History");
  });
});
