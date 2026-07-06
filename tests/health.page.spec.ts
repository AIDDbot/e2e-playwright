import { test, expect } from "@playwright/test";

test.describe("Health Page", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AstroBookings/);
  });

  test("should display the main content", async ({ page }) => {
    await page.goto("/");

    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("should have proper HTML structure", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).toBeVisible();

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should load static assets", async ({ page }) => {
    await page.goto("/");

    const themeLink = page.locator('link[href="styles/theme.css"]');
    await expect(themeLink).toBeAttached();
  });

  test("should be responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const main = page.locator("main");
    await expect(main).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    await expect(main).toBeVisible();
  });
});
