import { expect, test } from "@playwright/test";

test.describe("Client-side routing", () => {
  test("should navigate to About via the menu without a full reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      (window as { __spaMarker?: boolean }).__spaMarker = true;
    });

    await page.getByRole("link", { name: "About" }).click();

    await expect(page).toHaveURL("/about");
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page).toHaveTitle(/About/);

    const marker = await page.evaluate(() => (window as { __spaMarker?: boolean }).__spaMarker);
    expect(marker).toBe(true);
  });

  test("should return home with the browser back button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL("/about");

    await page.goBack();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Hello, world!")).toBeVisible();
  });

  test("should serve deep links directly", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page.locator("#health-status")).toHaveText(/Server up for \d+s/);
  });

  test("should extract params from the URL", async ({ page }) => {
    await page.goto("/items/42");

    await expect(page.getByRole("heading", { name: "Item #42" })).toBeVisible();
  });

  test("should show not-found for unknown routes", async ({ page }) => {
    await page.goto("/nope");

    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("should persist the last visited route in localStorage", async ({ page }) => {
    await page.goto("/about");

    const lastRoute = await page.evaluate(() => localStorage.getItem("last-route"));
    expect(lastRoute).toBe(JSON.stringify("/about"));
  });
});
