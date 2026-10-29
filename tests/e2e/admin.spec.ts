import { expect, test } from "@playwright/test";
import { admin, hasAdminCredentials, signIn } from "./helpers";

test.describe("admin access control", () => {
  test("signed-out visitors are sent to the login page", async ({ page, request }) => {
    for (const target of ["/admin/", "/admin/posts/", "/admin/settings/"]) {
      const res = await request.get(target, { maxRedirects: 0 });
      expect(res.status(), target).toBe(307);
      expect(res.headers()["location"]).toMatch(/\/admin\/login\/$/);
    }
    await page.goto("/admin/media/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
    await expect(page.getByRole("heading", { name: "Sign in to the admin" })).toBeVisible();
  });

  test("a forged session cookie does not open the admin", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "jih_admin_session", value: "forged-token", url: baseURL! }]);
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("the upload API refuses anonymous requests", async ({ request }) => {
    const res = await request.post("/admin/api/media/", {
      multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) } },
    });
    expect(res.status()).toBe(401);
  });

  test("admin pages are excluded from search engines", async ({ request }) => {
    const res = await request.get("/admin/login/");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("admin session", () => {
  test.skip(!hasAdminCredentials, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (test credentials) to run");

  test("wrong password is refused", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.getByLabel("Email").fill(admin.email);
    await page.getByLabel("Password").fill(`${admin.password}-wrong`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login\//);
  });

  test("sign in, see real metrics, sign out", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/posts/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/$/);
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/login\/$/);
  });

  test("the upload API refuses cross-site requests even with a session", async ({ page }) => {
    await signIn(page);
    const res = await page.request.post("/admin/api/media/", {
      headers: { origin: "https://evil.example" },
      multipart: { file: { name: "x.png", mimeType: "image/png", buffer: tinyPng() } },
    });
    expect(res.status()).toBe(403);
  });

  test("upload an image to the media library and delete it", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/media/");
    const name = `e2e-upload-${Date.now()}`;
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload files" }).click();
    await (await chooser).setFiles({ name: `${name}.png`, mimeType: "image/png", buffer: tinyPng() });
    await expect(page.getByText("File uploaded")).toBeVisible();

    await page.goto(`/admin/media/?q=${name}`);
    const del = page.getByRole("button", { name: new RegExp(`^Delete .*${name}`) });
    await expect(del).toBeVisible();
    await del.click();
    await page.getByRole("button", { name: "Delete file" }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^Delete .*${name}`) })).toHaveCount(0);
  });
});

/** A valid 8×8 PNG in the brand navy, inline so the test needs no fixture file. */
function tinyPng(): Buffer {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGklEQVR4nGNgl3Njl6vHJBmwirLLuTEMSh0AJish4XfTdsYAAAAASUVORK5CYII=", "base64");
}
