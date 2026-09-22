import { expect, test } from "@playwright/test";

// Set by playwright.config.ts from the front package.json (it throws if missing)
const APP_TITLE = process.env["E2E_APP_TITLE"] ?? "";
const ITEM_COUNT = 4;
const HEALTH_ROUTE = "**/api/health";

test.describe("Home page", () => {
  test("AC-CNT-01 shows title, welcome message and the Engineering links", async ({ page }) => {
    await page.goto("/");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: APP_TITLE })).toBeVisible();
    await expect(main.getByText(/welcome/i)).toBeVisible();
    await expect(main.getByRole("heading", { level: 2, name: "Engineering" })).toBeVisible();

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
});
