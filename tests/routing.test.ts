import { type Page, expect, test } from "@playwright/test";

const APP_TITLE = "Demo Frontend";

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
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: APP_TITLE })).toBeVisible();
    await markDocument(page);
    const nav = page.getByRole("navigation");

    await nav.getByRole("link", { exact: true, name: "About" }).click();
    await expect(page).toHaveURL("/about");
    await expect(page).toHaveTitle(`About — ${APP_TITLE}`);
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();

    await nav.getByRole("link", { name: APP_TITLE }).click();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle(APP_TITLE);

    await page.getByRole("main").getByRole("link").first().click();
    await expect(page).toHaveURL("/items/1");
    await expect(page).toHaveTitle("Item — Details");
    await expect(page.getByRole("heading", { level: 1, name: "Item #1" })).toBeVisible();

    await expectSameDocument(page);
  });

  test("AC-RTE-02 honours browser back and forward without a full reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: APP_TITLE })).toBeVisible();
    await markDocument(page);
    await page.getByRole("navigation").getByRole("link", { exact: true, name: "About" }).click();
    await expect(page).toHaveURL("/about");

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle(APP_TITLE);
    await expect(page.getByRole("heading", { level: 1, name: APP_TITLE })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL("/about");
    await expect(page).toHaveTitle(`About — ${APP_TITLE}`);
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();

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
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();

      await page.reload();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    });
  }
});

test.describe("Unknown routes", () => {
  test("AC-RTE-04 shows not found with the requested path and a link home", async ({ page }) => {
    await page.goto("/no/such/page");

    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("main").getByText("/no/such/page")).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "Back home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1, name: APP_TITLE })).toBeVisible();
  });
});
