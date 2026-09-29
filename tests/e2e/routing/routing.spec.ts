import { type Page, type Request } from "@playwright/test";
import { expect, test } from "../../fixtures/index.js";
import { type AppPage } from "../../pages/app.page.js";
import { appTitle } from "../../support/run-context.js";
import { copy } from "../../test-data/copy.js";

// A full reload wipes window state, so a surviving marker proves client-side navigation
const markDocument = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    (globalThis as { e2eSpaMarker?: boolean }).e2eSpaMarker = true;
  });
};

const expectSameDocument = async (page: Page): Promise<void> => {
  const marker = await page.evaluate(() => (globalThis as { e2eSpaMarker?: boolean }).e2eSpaMarker);
  expect(marker).toBe(true);
};

test.describe("Client-side navigation", () => {
  test(
    "follows menu, title and content links without a full reload",
    { tag: "@AC-RTE-01" },
    async ({ homePage, page }) => {
      const { navigation } = homePage;
      await homePage.goto();
      await expect(homePage.heading()).toHaveText(appTitle);
      await markDocument(page);

      await navigation.aboutLink.click();
      await expect(page).toHaveURL("/about");
      await expect(page).toHaveTitle(copy.about.title(appTitle));
      await expect(homePage.heading()).toHaveText(copy.about.heading);

      await navigation.appLink(appTitle).click();
      await expect(page).toHaveURL("/");
      await expect(page).toHaveTitle(appTitle);

      await homePage.itemLinks.first().click();
      await expect(page).toHaveURL("/items/1");
      await expect(page).toHaveTitle(copy.item.title);
      await expect(homePage.heading()).toHaveText(copy.item.heading(1));

      await expectSameDocument(page);
    },
  );

  test(
    "honours browser back and forward without a full reload",
    { tag: "@AC-RTE-02" },
    async ({ homePage, page }) => {
      await homePage.goto();
      await expect(homePage.heading()).toHaveText(appTitle);
      await markDocument(page);
      await homePage.navigation.aboutLink.click();
      await expect(page).toHaveURL("/about");

      await page.goBack();
      await expect(page).toHaveURL("/");
      await expect(page).toHaveTitle(appTitle);
      await expect(homePage.heading()).toHaveText(appTitle);

      await page.goForward();
      await expect(page).toHaveURL("/about");
      await expect(page).toHaveTitle(copy.about.title(appTitle));
      await expect(homePage.heading()).toHaveText(copy.about.heading);

      await expectSameDocument(page);
    },
  );
});

test.describe("Direct access", () => {
  const routes = [
    { heading: appTitle, path: "/" },
    { heading: copy.about.heading, path: "/about" },
    { heading: copy.item.heading(7), path: "/items/7" },
  ];

  for (const { heading, path } of routes) {
    test(
      `renders ${path} when opened by URL and reloaded`,
      { tag: "@AC-RTE-03" },
      async ({ appPage, page }) => {
        await appPage.open(path);
        await expect(appPage.heading()).toHaveText(heading);

        await page.reload();
        await expect(page).toHaveURL(path);
        await expect(appPage.heading()).toHaveText(heading);
      },
    );
  }
});

test.describe("Assets on direct access", () => {
  const HTTP_OK = 200;
  const THEME_STYLESHEET = "/styles/theme.css";
  // Declared as --ab-main-max-width in theme.css
  const THEME_TOKEN = "64rem";
  const routes = [
    { heading: appTitle, path: "/" },
    { heading: copy.item.heading(42), path: "/items/42" },
  ];

  // Outcome per requested stylesheet: its status, or why it got none
  type StylesheetLog = Map<Request, number | string>;

  // Chromium aborts a stylesheet answered with a 404 page, so requests are tracked, not only responses
  const logStylesheets = (page: Page): StylesheetLog => {
    const log: StylesheetLog = new Map();
    page.on("request", (request) => {
      if (request.resourceType() === "stylesheet") log.set(request, "no response");
    });
    page.on("response", (response) => {
      if (log.has(response.request())) log.set(response.request(), response.status());
    });
    page.on("requestfailed", (request) => {
      if (log.has(request)) log.set(request, request.failure()?.errorText ?? "failed");
    });
    return log;
  };

  // Relative hrefs resolve against nested routes and 404, while the page content still renders
  const expectStyledPage = async (
    appPage: AppPage,
    page: Page,
    log: StylesheetLog,
  ): Promise<void> => {
    const outcomes = [...log].map(([request, outcome]) => ({
      outcome,
      path: new URL(request.url()).pathname,
    }));
    expect(outcomes.filter(({ outcome }) => outcome !== HTTP_OK)).toEqual([]);
    expect(outcomes.map(({ path }) => path)).toContain(THEME_STYLESHEET);

    const icon = await page.request.get(await appPage.iconUrl());
    await expect(icon).toHaveStatus(HTTP_OK);
    expect(new URL(icon.url()).pathname).toBe("/logo.png");

    expect(await appPage.themeToken()).toBe(THEME_TOKEN);
  };

  for (const { heading, path } of routes) {
    test(
      `loads stylesheets and logo for ${path} when opened by URL and reloaded`,
      { tag: "@AC-RTE-05" },
      async ({ appPage, page }) => {
        // Routing disables the HTTP cache, so the reload fetches again instead of answering 304
        await page.route("**/*", async (route) => route.continue());
        const stylesheets = logStylesheets(page);

        await appPage.open(path);
        await expect(appPage.heading()).toHaveText(heading);
        await expectStyledPage(appPage, page, stylesheets);

        stylesheets.clear();
        await page.reload();
        await expect(appPage.heading()).toHaveText(heading);
        await expectStyledPage(appPage, page, stylesheets);
      },
    );
  }
});

test.describe("Unknown routes", () => {
  test(
    "shows not found with the requested path and a link home",
    { tag: "@AC-RTE-04" },
    async ({ notFoundPage, page }) => {
      const path = "/no/such/page";
      await notFoundPage.goto(path);

      await expect(notFoundPage.heading()).toHaveText(copy.notFound.heading);
      await expect(notFoundPage.requestedPath(path)).toBeVisible();

      await notFoundPage.homeLink.click();
      await expect(page).toHaveURL("/");
      await expect(notFoundPage.heading()).toHaveText(appTitle);
    },
  );
});
