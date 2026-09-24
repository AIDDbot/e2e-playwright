import { expect, test } from "@playwright/test";

// Set by playwright.config.ts from the front package.json (it throws if missing)
const APP_TITLE = process.env["E2E_APP_TITLE"] ?? "";
const ITEM_COUNT = 4;
const HEALTH_ROUTE = "**/api/health";

interface AppAuthor {
  email?: string;
  name?: string;
  url?: string;
}

// Set by playwright.config.ts from the front package.json author (empty object when absent)
const APP_AUTHOR = JSON.parse(process.env["E2E_APP_AUTHOR"] ?? "{}") as AppAuthor;
const AUTHOR_NAME = APP_AUTHOR.name ?? "";
const AUTHOR_URL = APP_AUTHOR.url ?? "";
const AUTHOR_EMAIL = APP_AUTHOR.email ?? "";
const isWebUrl = (value: string): boolean => /^https?:\/\//iu.test(value);

test.describe("Home page", () => {
  test("AC-CNT-01 shows title, trust message and the Archetypes links", async ({ page }) => {
    await page.goto("/");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: APP_TITLE })).toBeVisible();
    await expect(main.getByText(/trust/i)).toBeVisible();
    await expect(main.getByRole("heading", { level: 2, name: "Archetypes" })).toBeVisible();

    const links = main.getByRole("listitem").getByRole("link");
    await expect(links).toHaveCount(ITEM_COUNT);
    for (let index = 0; index < ITEM_COUNT; index += 1) {
      await expect(links.nth(index)).toHaveAttribute("href", `/items/${index + 1}`);
    }
  });
});

test.describe("Item detail page", () => {
  test("AC-CNT-02 shows the item heading and a link home", async ({ page }) => {
    await page.goto("/items/42");

    await expect(page.getByRole("heading", { level: 1, name: "Item #42" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Back home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("AC-CNT-03 renders the id as literal text, not markup", async ({ page }) => {
    const id = "&lt;b&gt;bold";
    await page.goto(`/items/${id}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Item #${id}`);
  });
});

test.describe("About page", () => {
  test("AC-CNT-04 shows server uptime and recorded runs from the API", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByText(/Server up for \d+s — \d+ run\(s\) recorded\./)).toBeVisible();
  });

  const failures = [
    { name: "network error", respond: { abort: true } },
    { name: "server error", respond: { status: 500 } },
  ];

  for (const { name, respond } of failures) {
    test(`AC-CNT-05 shows "Health unavailable." on ${name}`, async ({ page }) => {
      await page.route(HEALTH_ROUTE, async (route) => {
        if ("abort" in respond) {
          await route.abort();
          return;
        }
        await route.fulfill({ status: respond.status });
      });

      await page.goto("/about");

      await expect(page.getByText("Health unavailable.")).toBeVisible();
    });
  }

  test.describe("Author", () => {
    test.skip(!AUTHOR_NAME, "The front package.json declares no author name");

    test("AC-CNT-06 shows the author name from package.json", async ({ page }) => {
      await page.goto("/about");

      await expect(page.getByText(`Author: ${AUTHOR_NAME}`)).toBeVisible();
    });

    test("AC-CNT-07 links the author name to its web url in a new tab", async ({ page }) => {
      test.skip(!isWebUrl(AUTHOR_URL), "The front package.json declares no http(s) author url");

      await page.goto("/about");

      const link = page.getByRole("main").getByRole("link", { name: AUTHOR_NAME });
      await expect(link).toHaveAttribute("href", AUTHOR_URL);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener");
    });

    test("AC-CNT-08 never exposes the author email", async ({ page }) => {
      test.skip(!AUTHOR_EMAIL, "The front package.json declares no author email");

      await page.goto("/about");
      await expect(page.getByText(`Author: ${AUTHOR_NAME}`)).toBeVisible();

      // Checks the served markup too, not only the rendered text
      expect(await page.content()).not.toContain(AUTHOR_EMAIL);
    });

    test("AC-CNT-09 shows the author even when the health API fails", async ({ page }) => {
      await page.route(HEALTH_ROUTE, async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.goto("/about");

      await expect(page.getByText("Health unavailable.")).toBeVisible();
      await expect(page.getByText(`Author: ${AUTHOR_NAME}`)).toBeVisible();
    });
  });
});
