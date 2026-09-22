import { expect, test } from "@playwright/test";

// Set by playwright.config.ts from the front package.json (it throws if missing)
const APP_TITLE = process.env["E2E_APP_TITLE"] ?? "";
const PAGES = ["/", "/about", "/items/1", "/no/such/page"];

test.describe("Navigation bar", () => {
  for (const path of PAGES) {
    test(`AC-NAV-01 shows title, menu and theme toggle on ${path}`, async ({ page }) => {
      await page.goto(path);

      const nav = page.getByRole("navigation");
      await expect(nav.getByRole("link", { name: APP_TITLE })).toHaveAttribute("href", "/");
      await expect(nav.getByRole("link", { exact: true, name: "Home" })).toHaveAttribute(
        "href",
        "/",
      );
      await expect(nav.getByRole("link", { exact: true, name: "About" })).toHaveAttribute(
        "href",
        "/about",
      );
      await expect(nav.getByRole("button", { name: "Toggle theme" })).toBeVisible();
    });
  }
});

test.describe("Theme toggle", () => {
  test("AC-NAV-02 switches between dark and light themes", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    await expect(toggle).toBeVisible();
    // No accessible handle for the document theme: read it from <html>
    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    const other = initial === "dark" ? "light" : "dark";

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", other);

    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", initial ?? "");
  });

  test("AC-NAV-03 keeps the chosen theme after a reload", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    await expect(toggle).toBeVisible();
    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    const other = initial === "dark" ? "light" : "dark";

    await toggle.click();
    await page.reload();

    await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
    await expect(html).toHaveAttribute("data-theme", other);
  });
});
