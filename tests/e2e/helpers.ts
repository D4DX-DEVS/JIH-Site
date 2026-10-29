import { expect, type Page } from "@playwright/test";

export const admin = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
export const hasAdminCredentials = Boolean(admin.email && admin.password);

export async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login/");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

/** The page must not scroll sideways at the current viewport width. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}

/** First article link on the news listing, so tests do not depend on one post's slug. */
export async function firstNewsArticle(page: Page): Promise<string> {
  await page.goto("/news/");
  const href = await page.locator("main article a[href^='/']").first().getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}
