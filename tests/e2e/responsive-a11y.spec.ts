import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, firstNewsArticle } from "./helpers";

const WIDTHS = [375, 768, 1280];
const PAGES = ["/", "/news/", "/contact/", "/leaders/", "/image-gallery/", "/search/?q=jamaat", "/admin/login/"];

test.describe("responsive layout", () => {
  for (const width of WIDTHS) {
    test(`no sideways scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const article = await firstNewsArticle(page);
      for (const path of [...PAGES, article]) {
        await page.goto(path);
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test("mobile menu opens and links work at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Mobile" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "News", exact: true }).first().click();
    await expect(page).toHaveURL(/\/news\/$/);
  });
});

test.describe("entrance animations never hide content", () => {
  // toBeVisible() treats opacity:0 as visible, so these check the computed opacity directly.
  const hiddenReveals = (page: import("@playwright/test").Page) =>
    page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((el) => getComputedStyle(el).opacity === "0").length);

  test("with reduced motion, every section shows without scrolling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect.poll(() => hiddenReveals(page)).toBe(0);
  });

  test("with motion, every section has appeared once scrolled past", async ({ page }) => {
    await page.goto("/");
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 400) await page.evaluate((top) => window.scrollTo(0, top), y);
    await expect.poll(() => hiddenReveals(page), { timeout: 10_000 }).toBe(0);
  });
});

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of PAGES) {
    test(`no serious violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Let scroll entrances settle so axe sees final colours.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
    });
  }
});
