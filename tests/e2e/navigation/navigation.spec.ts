import { expect, test } from "../../fixtures/index.js";
import { appTitle } from "../../support/run-context.js";

const APP_TITLE = appTitle;
const PAGES = ["/", "/about", "/items/1", "/no/such/page"];

test.describe("Navigation bar", () => {
  for (const path of PAGES) {
    test(`AC-NAV-01 shows title, menu and theme toggle on ${path}`, async ({ navigation }) => {
      await navigation.goto(path);

      await expect(navigation.appLink(APP_TITLE)).toHaveAttribute("href", "/");
      await expect(navigation.homeLink()).toHaveAttribute("href", "/");
      await expect(navigation.aboutLink()).toHaveAttribute("href", "/about");
      await expect(navigation.themeToggle).toBeVisible();
    });
  }
});

test.describe("Theme toggle", () => {
  test("AC-NAV-02 switches between dark and light themes", async ({ navigation, page }) => {
    await navigation.goto();
    const toggle = navigation.themeToggle;
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

  test("AC-NAV-03 keeps the chosen theme after a reload", async ({ navigation, page }) => {
    await navigation.goto();
    const toggle = navigation.themeToggle;
    await expect(toggle).toBeVisible();
    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    const other = initial === "dark" ? "light" : "dark";

    await toggle.click();
    await page.reload();

    await expect(toggle).toBeVisible();
    await expect(html).toHaveAttribute("data-theme", other);
  });
});
