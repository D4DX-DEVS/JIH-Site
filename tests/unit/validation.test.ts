import { describe, expect, it } from "vitest";
import { parseAdminList } from "@/lib/admin/list-params";
import { readListParams } from "@/lib/pagination";
import { navItemSchema, parseYoutubeId, postSchema, redirectSchema } from "@/lib/validation/admin";
import { contactSettingsSchema, socialSettingsSchema } from "@/lib/validation/settings";
import { contactSchema } from "@/lib/validation/contact";

describe("admin list params", () => {
  const opts = { sorts: ["title", "updatedAt"] as const, defaultSort: "updatedAt" as const, statuses: ["draft", "published"] };

  it("whitelists sort, status and page size", () => {
    const p = parseAdminList({ sort: "password; drop table", status: "deleted", pageSize: "1000", page: "-3", order: "sideways" }, opts);
    expect(p).toEqual({ page: 1, pageSize: 20, q: "", sort: "updatedAt", order: "desc", status: "" });
  });

  it("keeps valid values", () => {
    const p = parseAdminList({ sort: "title", status: "draft", pageSize: "50", page: "3", order: "asc", q: "  ജമാഅത്ത്  " }, opts);
    expect(p).toEqual({ page: 3, pageSize: 50, q: "ജമാഅത്ത്", sort: "title", order: "asc", status: "draft" });
  });

  it("public list params fall back to defaults", () => {
    expect(readListParams({ page: "abc", pageSize: "7" })).toEqual({ page: 1, pageSize: 12, q: "" });
  });
});

describe("admin schemas", () => {
  it("derives a slug from Malayalam input", () => {
    const r = postSchema.parse({ title: "A title", titleEn: "", slug: "  പുതിയ വാർത്ത! ", status: "draft" });
    expect(r.slug).toBe("പുതിയ-വാർത്ത");
  });

  it("parses YouTube links and ids", () => {
    expect(parseYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://vimeo.com/123")).toBeNull();
  });

  it("normalises redirect paths and refuses full URLs as the source", () => {
    expect(redirectSchema.parse({ fromPath: "/old-page", toPath: "/news/", statusCode: 301 }).fromPath).toBe("/old-page/");
    expect(redirectSchema.safeParse({ fromPath: "https://x.org/a", toPath: "/", statusCode: 301 }).success).toBe(false);
    expect(redirectSchema.safeParse({ fromPath: "/a", toPath: "javascript:alert(1)", statusCode: 301 }).success).toBe(false);
  });

  it("refuses script URLs in menu links", () => {
    expect(navItemSchema.safeParse({ menu: "header", label: "x", labelEn: "", url: "javascript:alert(1)" }).success).toBe(false);
    expect(navItemSchema.safeParse({ menu: "header", label: "x", labelEn: "", url: "/about-us/" }).success).toBe(true);
  });

  it("refuses protocol-relative targets, which browsers treat as other sites", () => {
    for (const toPath of ["//evil.example/x", "/\\evil.example/x"]) {
      expect(redirectSchema.safeParse({ fromPath: "/a", toPath, statusCode: 301 }).success, toPath).toBe(false);
      expect(navItemSchema.safeParse({ menu: "header", label: "x", labelEn: "", url: toPath }).success, toPath).toBe(false);
    }
    expect(redirectSchema.safeParse({ fromPath: "/a", toPath: "HTTPS://example.org/", statusCode: 301 }).success).toBe(true);
  });

  it("only accepts Google Maps embeds and real URLs in settings", () => {
    const base = { organisation: "", postBox: "", address: "", phone: "", email: "", website: "" };
    expect(contactSettingsSchema.safeParse({ ...base, mapEmbedUrl: "https://www.google.com/maps/embed?pb=1" }).success).toBe(true);
    expect(contactSettingsSchema.safeParse({ ...base, mapEmbedUrl: "https://evil.example/frame" }).success).toBe(false);
    expect(contactSettingsSchema.safeParse({ ...base, mapEmbedUrl: "", email: "nope" }).success).toBe(false);
    expect(socialSettingsSchema.safeParse({ facebook: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("contact form", () => {
  it("requires name, email and a real message", () => {
    expect(contactSchema.safeParse({ name: "", email: "x", message: "short" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Visitor", email: "v@example.org", message: "A message long enough", website: "" }).success).toBe(true);
  });
});
