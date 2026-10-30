import { describe, expect, it } from "vitest";
import { bilingualSearchText, leadingHeading, scriptOf, separateField, separateLanguages, splitHtmlByLanguage, type BilingualText } from "../../scripts/migrate/lib/language";

const blank: BilingualText = {
  title: "", titleEn: "", summary: "", summaryEn: "", html: "", htmlEn: "", seoTitle: "", seoTitleEn: "", seoDescription: "", seoDescriptionEn: "",
};

// Shapes taken from the imported WordPress pages (womens-wing, sio, gio).
const WOMENS_WING = `<h2>Women's wing of Jama'athe Islami</h2>
<p>Since the formation of Jama’athe Islami, solid and revolutionary efforts were made to reform women.</p>
<h2>ജമാഅത്തെ ഇസ്‌ലാമി വനിതാ വിഭാഗം</h2>
<p>ജമാഅത്തെ ഇസ്‌ലാമിയുടെ രൂപീകരണം തൊട്ടേ സമൂഹത്തിന്റ പാതിയായ സ്ത്രീകളെ സംസ്‌കരിക്കുവാനും ശ്രമങ്ങള്‍ നടത്തി.</p>`;

describe("script detection", () => {
  it("follows the majority of letters and ignores letterless text", () => {
    expect(scriptOf("ജമാഅത്തെ ഇസ്‌ലാമി")).toBe("ml");
    expect(scriptOf("Students Islamic Organization of India (SIO)")).toBe("en");
    expect(scriptOf("കേരള സോൺ പ്രസിഡന്റ്‌ : മുഹമ്മദ് സഈദ് ടി.കെ (SIO)")).toBe("ml");
    expect(scriptOf("2023 - 24")).toBeNull();
    expect(scriptOf("")).toBeNull();
  });
});

describe("splitting a body", () => {
  it("sends each block to its language and shared blocks to both", () => {
    const html = `<p>English text here: Teen India is a collective of students who study in high school classes across Kerala.</p><img src="/media/uploads/a.jpg" alt="" /><p>മലയാളം വാചകം: ഹൈസ്‌കൂള്‍ ക്ലാസുകളില്‍ പഠിക്കുന്ന വിദ്യാര്‍ത്ഥികളുടെ കൂട്ടായ്മയാണ് ടീന്‍ ഇന്ത്യ.</p><a href="https://twitter.com/x">X-twitter</a>`;
    const { ml, en } = splitHtmlByLanguage(html);
    expect(en).toContain("English text");
    expect(en).not.toContain("മലയാളം");
    expect(ml).toContain("മലയാളം");
    expect(ml).not.toContain("English text");
    for (const side of [ml, en]) {
      expect(side).toContain("/media/uploads/a.jpg");
      expect(side).toContain("X-twitter");
    }
  });

  it("drops a link to the record's own website, which the page button already offers", () => {
    const html = `<p>മലയാളം വാചകം.</p><a href="https://siokerala.org/" target="_blank">Website</a>`;
    expect(splitHtmlByLanguage(html, { externalUrl: "https://www.siokerala.org" }).ml).not.toContain("Website");
  });

  it("returns an empty side when only images would remain", () => {
    expect(splitHtmlByLanguage(`<img src="/a.jpg" alt="" /><p>English only.</p>`).ml).toBe("");
  });

  it("reads an opening heading", () => {
    expect(leadingHeading("<h2>SIO</h2><p>Text</p>")).toEqual({ text: "SIO", rest: "<p>Text</p>" });
    expect(leadingHeading("<p>No heading</p>")).toBeNull();
  });
});

describe("separating a record", () => {
  it("splits a mixed page into a Malayalam and an English page without duplicate headings", () => {
    const out = separateLanguages({ ...blank, title: "ജമാഅത്തെ ഇസ്‌ലാമി വനിതാ വിഭാഗം", summary: "ജമാഅത്തെ ഇസ്‌ലാമിയുടെ രൂപീകരണം", html: WOMENS_WING });
    expect(out.title).toBe("ജമാഅത്തെ ഇസ്‌ലാമി വനിതാ വിഭാഗം");
    expect(out.titleEn).toBe("Women's wing of Jama'athe Islami");
    expect(out.html).not.toMatch(/<h2>|Since the formation/);
    expect(out.html).toContain("സ്ത്രീകളെ");
    expect(out.htmlEn).not.toMatch(/<h2>|ജമാഅത്തെ/);
    expect(out.htmlEn).toContain("Since the formation");
    expect(out.summary).toBe("ജമാഅത്തെ ഇസ്‌ലാമിയുടെ രൂപീകരണം");
    expect(out.summaryEn).toMatch(/^Since the formation/);
  });

  it("moves an English-only page to the English fields and keeps its Malayalam title", () => {
    const out = separateLanguages({ ...blank, title: "ജി.ഐ.ഒ കേരള", summary: "പെൺകുട്ടികളുടെ വിദ്യാർഥി സംഘടന", html: "<h2>GIO Kerala</h2><p>Girls Islamic Organization is a girl's student organization in Kerala.</p>" });
    expect(out).toMatchObject({ title: "ജി.ഐ.ഒ കേരള", titleEn: "GIO Kerala", html: "", summary: "പെൺകുട്ടികളുടെ വിദ്യാർഥി സംഘടന" });
    expect(out.htmlEn).toContain("Girls Islamic Organization");
  });

  it("moves English titles, summaries and SEO text, and keeps English an editor already wrote", () => {
    const out = separateLanguages({ ...blank, title: "History", summary: "Jamaat in Kerala", seoTitle: "History of JIH", html: "<p>Jama’athe Islami Kerala was established in 1948.</p>", htmlEn: "<p>Edited English.</p>" });
    expect(out).toMatchObject({ title: "", titleEn: "History", summary: "", summaryEn: "Jamaat in Kerala", seoTitle: "", seoTitleEn: "History of JIH", html: "", htmlEn: "<p>Edited English.</p>" });
  });

  it("leaves Malayalam-only records untouched", () => {
    const input = { ...blank, title: "വാർത്ത", summary: "ചുരുക്കം", html: "<p>മലയാളം മാത്രം.</p>" };
    expect(separateLanguages(input)).toEqual({ ...input, html: "<p>മലയാളം മാത്രം.</p>" });
  });

  it("separates short fields", () => {
    expect(separateField("Secretary", "")).toEqual(["", "Secretary"]);
    expect(separateField("സെക്രട്ടറി", "Secretary")).toEqual(["സെക്രട്ടറി", "Secretary"]);
    expect(separateField("Ameer", "Amir")).toEqual(["", "Amir"]);
  });

  it("builds search text from both languages", () => {
    expect(bilingualSearchText({ title: "ചരിത്രം", titleEn: "History", summary: "", summaryEn: "", html: "<p>ഒന്ന്</p>", htmlEn: "<p>One</p>" })).toBe("ചരിത്രം history ഒന്ന് one");
  });
});

describe("Malayalam articles with English fragments", () => {
  it("keeps captions, signatures, tag lines and links inside the Malayalam article", () => {
    const article = `<p>ഇസ്‌ലാമിക പ്രസ്ഥാനത്തിന്റെ കോട്ടയം ജില്ലാ ആസ്ഥാന മന്ദിരത്തിന്റെ ശിലാസ്ഥാപനം നിർവ്വഹിച്ചു. അമീർ MI അബ്ദുൽ അസീസ് സംസാരിച്ചു.</p>
<p>Jamaat e Islami Hind Kottayam</p>
<p>ചടങ്ങിൽ ജില്ലാ നേതാക്കൾ പങ്കെടുത്തു. പ്രവർത്തകരും നാട്ടുകാരും സന്നിഹിതരായിരുന്നു.</p>
<p>https://m.facebook.com/story.php?story_fbid=pfbid0Xatesx6o3Zyt4HvuJY3E5U5HPMnE1jYVYPb5WpsVGtQUDhx8xCtRe88V9MRxaaaaaaaa</p>`;
    expect(splitHtmlByLanguage(article)).toEqual({ ml: article, en: "" });
    const out = separateLanguages({ ...blank, title: "People’s Info – Information & Guidance Centre ഉദ്ഘാടനം", summary: "ചുരുക്കം", html: article });
    expect(out).toMatchObject({ title: "People’s Info – Information & Guidance Centre ഉദ്ഘാടനം", titleEn: "", html: article, htmlEn: "" });
  });

  it("does not split a short English line that ends a Malayalam text", () => {
    const html = `<p>ജമാഅത്തെ ഇസ്‌ലാമിയുടെ രൂപീകരണം തൊട്ടേ സമൂഹത്തിന്റ പാതിയായ സ്ത്രീകളെ സംസ്‌കരിക്കുവാനും ശ്രമങ്ങള്‍ നടത്തി.</p><p>Tag: Jamaat e Islami</p>`;
    expect(splitHtmlByLanguage(html).en).toBe("");
  });
});

describe("pictures", () => {
  it("keeps a photo grid with English captions inside the Malayalam article", () => {
    const html = `<p>കോഴിക്കോട്: ജമാഅത്തെ ഇസ്‌ലാമി സംസ്ഥാന ജനറല്‍ സെക്രട്ടറിയായി ടി കെ ഫാറൂഖിനെ തെരഞ്ഞെടുത്തു. പുതിയ ഭാരവാഹികൾ ചുമതലയേറ്റു.</p>
<figure><img src="/media/uploads/a.png" alt="TK Farook" /><figcaption>TK Farook</figcaption></figure>
<figure><img src="/media/uploads/b.png" alt="VT Abdullah Koya Thangal" /><figcaption>VT Abdullah Koya Thangal</figcaption></figure>
<figure><img src="/media/uploads/c.png" alt="MK Muhammedali" /><figcaption>MK Muhammedali, Assistant Ameer of the state</figcaption></figure>`;
    expect(splitHtmlByLanguage(html)).toEqual({ ml: html, en: "" });
  });
});
