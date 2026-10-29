import { expect, test } from "@playwright/test";

test.describe("status codes and redirects", () => {
  const cases: [path: string, status: number, location?: RegExp][] = [
    ["/", 200],
    ["/news/", 200],
    ["/no-such-page-e2e/", 404],
    ["/deeper/missing/path/", 404],
    ["/xmlrpc.php", 404],
    ["/category/", 404],
    // Stored WordPress attachment redirect, answered before rendering.
    ["/element_17/", 308, /\/media\/uploads\/.+element_17/],
    // next.config redirects.
    ["/blog/", 308, /\/news\/$/],
    ["/ml/about-us/", 308, /\/about-us\/$/],
    ["/wp-login.php", 307, /\/admin\/login\/$/],
    // Trailing slash is canonical.
    ["/news", 308, /\/news\/$/],
  ];

  for (const [path, status, location] of cases) {
    test(`${path} → ${status}`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(status);
      if (location) expect(res.headers()["location"]).toMatch(location);
    });
  }

  test("missing pages are not indexable", async ({ page }) => {
    await page.goto("/no-such-page-e2e/");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});

test.describe("metadata", () => {
  test("home page has title, description, canonical and social tags", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(" ");
    expect(jsonLd).toMatch(/"@type":"(Organization|WebSite)"/);
  });

  test("robots.txt, sitemap and feed are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    // Preview and staging builds must never be indexed; production sets SITE_INDEXABLE=true.
    expect(await robots.text()).toContain(process.env.E2E_EXPECT_INDEXABLE ? "Allow: /" : "Disallow: /");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect((await sitemap.text()).match(/<loc>/g)?.length ?? 0).toBeGreaterThan(50);

    const feed = await request.get("/feed/");
    expect(feed.ok()).toBe(true);
    expect(await feed.text()).toContain("<rss");
  });
});
