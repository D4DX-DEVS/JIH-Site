import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANY_DEPTH_SECTIONS,
  CATCH_ALL_SECTIONS,
  ROOT_FILES,
  SLUG_SECTIONS,
  STATIC_SECTIONS,
  asNotFound,
  needsAdminSignIn,
  redirectLocation,
  redirectScope,
  redirectStatus,
  routeAtEdge,
} from "@/lib/edge-routing";

type LookupRow = { hasContent: number; toPath: string | null; statusCode: number | null };

/** Stands in for D1: answers the lookup with a fixed row (or throws) and records the bound values. */
function stubDb(row: LookupRow | null | Error) {
  const bound: unknown[][] = [];
  const db = {
    prepare: () => ({
      bind: (...values: unknown[]) => {
        bound.push(values);
        return {
          first: async () => {
            if (row instanceof Error) throw row;
            return row;
          },
        };
      },
    }),
  } as unknown as D1Database;
  return { db, bound };
}

const get = (path: string, init?: RequestInit) => new Request(`https://jihkerala.org${path}`, init);
const MISSING: LookupRow = { hasContent: 0, toPath: null, statusCode: null };

describe("redirect scope", () => {
  it("covers single-segment slugs, guarded by content", () => {
    expect(redirectScope("/element_17/")).toEqual({ path: "/element_17/", slug: "element_17" });
    expect(redirectScope("/%E0%B4%9C%E0%B4%AE%E0%B4%BE%E0%B4%85%E0%B4%A4%E0%B5%8D%E0%B4%A4%E0%B5%8D/")?.slug).toBe("ജമാഅത്ത്");
    expect(redirectScope("/xmlrpc.php")).toEqual({ path: "/xmlrpc.php/", slug: "xmlrpc.php" });
  });

  it("covers deeper legacy paths, including ones under section names", () => {
    expect(redirectScope("/image-gallery/art-works-of-jih/7-2/")).toEqual({ path: "/image-gallery/art-works-of-jih/7-2/", slug: null });
    expect(redirectScope("/leadership/pmujeebrahman/photo-2/")).toEqual({ path: "/leadership/pmujeebrahman/photo-2/", slug: null });
    expect(redirectScope("/parent/child")).toEqual({ path: "/parent/child/", slug: null });
  });

  it("covers addresses no route or config redirect takes", () => {
    for (const path of ["/category/", "/media/", "/author/", "/author/a/b/", "/wp-content/themes/x/", "/news/page/abc/", "/feed/x/", "/x/robots.txt"]) {
      expect(redirectScope(path), path).not.toBeNull();
    }
  });

  it("leaves built-in routes, root files and config redirects to Next.js", () => {
    for (const path of [
      "/",
      "/robots.txt",
      "/sitemap.xml",
      "/icon.png",
      "/admin/",
      "/admin/posts/",
      "/category/a/b/",
      "/media/uploads/x.jpg",
      "/_next/static/a.js",
      "/downloads/",
      "/search/",
      "/image-gallery/",
      "/image-gallery/art-works-of-jih/",
      "/tag/x/",
      "/leadership/x/",
      "/author/admin/",
      "/blog/",
      "/ml/",
      "/ml/about-us/",
      "/wp-admin/",
      "/wp-content/uploads/2021/10/a.png",
      "/news/page/2/",
    ]) {
      expect(redirectScope(path), path).toBeNull();
    }
  });

  it("knows every route folder and root file in the app", () => {
    // A new route needs a rule here, otherwise stored redirects could shadow it and its pages could be marked 404.
    const known = new Set([...ANY_DEPTH_SECTIONS, ...CATCH_ALL_SECTIONS, ...STATIC_SECTIONS, ...SLUG_SECTIONS]);
    const folders = (dir: string) =>
      readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !/^[_([]/.test(d.name))
        .map((d) => d.name);
    expect([...folders("src/app"), ...folders("src/app/[lang]")].filter((name) => !known.has(name))).toEqual([]);

    const served = readdirSync("src/app")
      .map((name) => name.replace(/^robots\.ts$/, "robots.txt").replace(/^sitemap\.ts$/, "sitemap.xml"))
      .filter((name) => /\.(txt|xml|png|ico|svg|jpg|webmanifest)$/.test(name));
    expect(served.filter((name) => !ROOT_FILES.includes(name))).toEqual([]);
  });

  it("keeps temporary redirects temporary", () => {
    expect([301, 302, 307, 308].map(redirectStatus)).toEqual([308, 307, 307, 308]);
  });

  it("keeps same-site locations relative and refuses unusable targets", () => {
    const base = new URL("http://localhost:8787/old/");
    expect(redirectLocation("/media/uploads/a b.jpg", base)).toBe("/media/uploads/a%20b.jpg");
    expect(redirectLocation("/ജമാഅത്ത്/", base)).toBe("/%E0%B4%9C%E0%B4%AE%E0%B4%BE%E0%B4%85%E0%B4%A4%E0%B5%8D%E0%B4%A4%E0%B5%8D/");
    expect(redirectLocation("https://www.youtube.com/@jihkerala", base)).toBe("https://www.youtube.com/@jihkerala");
    expect(redirectLocation("http://", base)).toBeNull();
  });
});

describe("edge decisions", () => {
  it("answers stored redirects without rendering", async () => {
    const { db, bound } = stubDb({ hasContent: 0, toPath: "/media/uploads/2021/10/element_17.png", statusCode: 301 });
    const decision = await routeAtEdge(get("/element_17/"), db);
    expect(decision.kind).toBe("respond");
    if (decision.kind !== "respond") return;
    expect(decision.response.status).toBe(308);
    expect(decision.response.headers.get("location")).toBe("/media/uploads/2021/10/element_17.png");
    expect(bound[0].slice(0, 2)).toEqual(["/element_17/", "element_17"]);
  });

  it("treats HEAD like GET", async () => {
    const { db } = stubDb({ hasContent: 0, toPath: "/news/", statusCode: 302 });
    const decision = await routeAtEdge(get("/old/", { method: "HEAD" }), db);
    expect(decision.kind === "respond" && decision.response.status).toBe(307);
  });

  it("renders existing content even when a redirect has the same address", async () => {
    const { db } = stubDb({ hasContent: 1, toPath: "/elsewhere/", statusCode: 301 });
    expect(await routeAtEdge(get("/about-us/"), db)).toEqual({ kind: "render", notFound: false });
  });

  it("marks missing pages as 404 for documents but not for client navigations", async () => {
    const { db } = stubDb(MISSING);
    expect(await routeAtEdge(get("/no-such-page/"), db)).toEqual({ kind: "render", notFound: true });
    expect(await routeAtEdge(get("/no-such-page/", { headers: { RSC: "1" } }), db)).toEqual({ kind: "render", notFound: false });
  });

  it("fails open when D1 errors or a stored target is unusable", async () => {
    expect(await routeAtEdge(get("/old/"), stubDb(new Error("D1 unavailable")).db)).toEqual({ kind: "render", notFound: false });
    expect(await routeAtEdge(get("/old/"), stubDb({ hasContent: 0, toPath: "http://", statusCode: 301 }).db)).toEqual({ kind: "render", notFound: false });
  });

  it("applies the same rules to English addresses and keeps their redirects in English", async () => {
    const moved = stubDb({ hasContent: 0, toPath: "/new-name/", statusCode: 301 });
    const decision = await routeAtEdge(get("/en/old-name/"), moved.db);
    expect(decision.kind === "respond" && decision.response.headers.get("location")).toBe("/en/new-name/");
    expect(moved.bound[0].slice(0, 2)).toEqual(["/old-name/", "old-name"]);

    const file = stubDb({ hasContent: 0, toPath: "/media/uploads/a.pdf", statusCode: 301 });
    const toFile = await routeAtEdge(get("/en/a/"), file.db);
    expect(toFile.kind === "respond" && toFile.response.headers.get("location")).toBe("/media/uploads/a.pdf");

    expect(await routeAtEdge(get("/en/no-such-page/"), stubDb(MISSING).db)).toEqual({ kind: "render", notFound: true });
    const home = stubDb(null);
    expect(await routeAtEdge(get("/en/"), home.db)).toEqual({ kind: "render", notFound: false });
    expect(await routeAtEdge(get("/en/news/page/2/"), home.db)).toEqual({ kind: "render", notFound: false });
    expect(home.bound).toHaveLength(0);
  });

  it("skips the database for built-in routes and non-GET requests", async () => {
    const { db, bound } = stubDb(null);
    expect(await routeAtEdge(get("/news/page/2/"), db)).toEqual({ kind: "render", notFound: false });
    expect(await routeAtEdge(get("/x/", { method: "POST" }), db)).toEqual({ kind: "render", notFound: false });
    expect(bound).toHaveLength(0);
  });

  it("redirects signed-out admin requests before anything else", async () => {
    const { db, bound } = stubDb(null);
    const decision = await routeAtEdge(get("/admin/posts/"), db);
    expect(decision.kind === "respond" && decision.response.status).toBe(307);
    expect(decision.kind === "respond" && decision.response.headers.get("location")).toBe("/admin/login/");
    expect(bound).toHaveLength(0);
  });

  it("only turns a rendered 200 into a 404", () => {
    const page = asNotFound(new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }));
    expect(page.status).toBe(404);
    expect(page.headers.get("content-type")).toBe("text/html");
    expect(asNotFound(new Response(null, { status: 308, headers: { location: "/x/" } })).status).toBe(308);
  });
});

describe("admin sign-in gate", () => {
  it("sends signed-out visitors to the login page", () => {
    expect(needsAdminSignIn("/admin/", null)).toBe(true);
    expect(needsAdminSignIn("/admin/posts/", "theme=dark")).toBe(true);
    expect(needsAdminSignIn("/admin/posts/", "jih_admin_session_old=x")).toBe(true);
    expect(needsAdminSignIn("/%61dmin/posts/", null)).toBe(true);
  });

  it("lets the session cookie, the login page, the API and the public site through", () => {
    expect(needsAdminSignIn("/admin/posts/", "theme=dark; jih_admin_session=abc")).toBe(false);
    expect(needsAdminSignIn("/admin/login/", null)).toBe(false);
    expect(needsAdminSignIn("/admin/api/media/upload/", null)).toBe(false);
    expect(needsAdminSignIn("/news/", null)).toBe(false);
  });
});
