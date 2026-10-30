import { expect, test } from "@playwright/test";
import { firstNewsArticle } from "./helpers";

test.describe("public site", () => {
  test("home page carries every section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Jamaat-e-Islami Hind Kerala/);
    await expect(page.getByRole("heading", { level: 1, name: "Jamaat-e-Islami Hind Kerala" })).toBeVisible();
    for (const name of ["Latest Updates", "Ameer Updates", "Posters", "News", "Videos", "Image Gallery"]) {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeAttached();
    }
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("header navigation reaches the news archive", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "News", exact: true }).first().click();
    await expect(page).toHaveURL(/\/news\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("news archive paginates with real links", async ({ page }) => {
    await page.goto("/news/");
    const firstOnPageOne = await page.locator("main article h2, main article h3").first().textContent();
    const pager = page.getByRole("navigation", { name: "News pages" });
    await pager.getByRole("link", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\/news\/\?page=2$/);
    await expect(page.locator("main article h2, main article h3").first()).not.toHaveText(firstOnPageOne ?? "");
  });

  test("a page past the end shows the not-found view", async ({ page }) => {
    await page.goto("/news/?page=999");
    await expect(page.getByRole("heading", { name: /could not be found/i }).first()).toBeVisible();
  });

  test("an article renders with breadcrumb structured data", async ({ page }) => {
    const href = await firstNewsArticle(page);
    await page.goto(href);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const types = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(types.join(" ")).toContain("BreadcrumbList");
  });

  test("search finds content and handles no results", async ({ page }) => {
    await page.goto("/search/");
    await page.locator("main #search-q").fill("jamaat");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search\/\?q=jamaat/);
    await expect(page.locator("#results-title")).toBeAttached();
    await expect(page.locator("main article").first()).toBeVisible();

    await page.goto("/search/?q=zzqxjvnotaword");
    await expect(page.locator("main article")).toHaveCount(0);
  });

  test("contact form validates before sending", async ({ page }) => {
    await page.goto("/contact/");
    const form = page.getByRole("form", { name: "Contact form" });
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByLabel("Message")).toHaveAttribute("aria-invalid", "true");
  });
});
