import { type Page, expect, test } from "@playwright/test";
import { ContentPage } from "../../pages/content.page.js";
import { NavigationPage } from "../../pages/navigation.page.js";

// Set by playwright.config.ts from the front package.json (it throws if missing)
const APP_TITLE = process.env["E2E_APP_TITLE"] ?? "";

// A full reload wipes window state, so a surviving marker proves client-side navigation
const markDocument = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    (globalThis as { __spaMarker?: boolean }).__spaMarker = true;
  });
};

const expectSameDocument = async (page: Page): Promise<void> => {
  const marker = await page.evaluate(() => (globalThis as { __spaMarker?: boolean }).__spaMarker);
  expect(marker).toBe(true);
};

test.describe("Client-side navigation", () => {
  test("AC-RTE-01 follows menu, title and content links without a full reload", async ({
    page,
  }) => {
    const content = new ContentPage(page);
    const navigation = new NavigationPage(page);
    await content.goto("/");
    await expect(content.heading()).toHaveText(APP_TITLE);
    await markDocument(page);

    await navigation.aboutLink().click();
    await expect(page).toHaveURL("/about");
    await expect(page).toHaveTitle(`About — ${APP_TITLE}`);
    await expect(content.heading()).toHaveText("About");

    await navigation.appLink(APP_TITLE).click();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle(APP_TITLE);

    await content.main.getByRole("link").first().click();
    await expect(page).toHaveURL("/items/1");
    await expect(page).toHaveTitle("Item — Details");
    await expect(content.heading()).toHaveText("Item #1");

    await expectSameDocument(page);
  });

  test("AC-RTE-02 honours browser back and forward without a full reload", async ({ page }) => {
    const content = new ContentPage(page);
    const navigation = new NavigationPage(page);
    await content.goto("/");
    await expect(content.heading()).toHaveText(APP_TITLE);
    await markDocument(page);
    await navigation.aboutLink().click();
    await expect(page).toHaveURL("/about");

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle(APP_TITLE);
    await expect(content.heading()).toHaveText(APP_TITLE);

    await page.goForward();
    await expect(page).toHaveURL("/about");
    await expect(page).toHaveTitle(`About — ${APP_TITLE}`);
    await expect(content.heading()).toHaveText("About");

    await expectSameDocument(page);
  });
});

test.describe("Direct access", () => {
  const routes = [
    { heading: APP_TITLE, path: "/" },
    { heading: "About", path: "/about" },
    { heading: "Item #7", path: "/items/7" },
  ];

  for (const { heading, path } of routes) {
    test(`AC-RTE-03 renders ${path} when opened by URL and reloaded`, async ({ page }) => {
      const content = new ContentPage(page);
      await content.goto(path);
      await expect(content.heading()).toHaveText(heading);

      await page.reload();
      await expect(page).toHaveURL(path);
      await expect(content.heading()).toHaveText(heading);
    });
  }
});

test.describe("Unknown routes", () => {
  test("AC-RTE-04 shows not found with the requested path and a link home", async ({ page }) => {
    const content = new ContentPage(page);
    await content.goto("/no/such/page");

    await expect(content.heading()).toHaveText("Page not found");
    await expect(content.main.getByText("/no/such/page")).toBeVisible();

    await content.homeLink().click();
    await expect(page).toHaveURL("/");
    await expect(content.heading()).toHaveText(APP_TITLE);
  });
});
