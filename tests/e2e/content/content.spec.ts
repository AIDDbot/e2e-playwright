import { expect, test } from "../../fixtures/index.js";
import { appAuthor, appTitle } from "../../support/run-context.js";

const APP_TITLE = appTitle;
const HEALTH_ROUTE = "**/api/health";
const AUTHOR_NAME = appAuthor.name ?? "";
const AUTHOR_URL = appAuthor.url ?? "";
const AUTHOR_EMAIL = appAuthor.email ?? "";
const isWebUrl = (value: string): boolean => /^https?:\/\//iu.test(value);

test.describe("Home page", () => {
  test(
    "shows title, trust message and the Archetypes links",
    { tag: "@AC-CNT-01" },
    async ({ content }) => {
      await content.goto("/");

      await expect(content.heading()).toHaveText(APP_TITLE);
      await expect(content.trustMessage).toBeVisible();
      await expect(content.archetypesHeading).toBeVisible();

      await expect(content.itemLinks).toHaveCount(4);
      for (let index = 0; index < 4; index += 1) {
        await expect(content.itemLinks.nth(index)).toHaveAttribute("href", `/items/${index + 1}`);
      }
    },
  );
});

test.describe("Item detail page", () => {
  test("shows the item heading and a link home", { tag: "@AC-CNT-02" }, async ({ content }) => {
    await content.goto("/items/42");

    await expect(content.heading()).toHaveText("Item #42");
    await expect(content.homeLink()).toHaveAttribute("href", "/");
  });

  test("renders the id as literal text, not markup", { tag: "@AC-CNT-03" }, async ({ content }) => {
    const id = "&lt;b&gt;bold";
    await content.goto(`/items/${id}`);

    await expect(content.heading()).toHaveText(`Item #${id}`);
  });
});

test.describe("About page", () => {
  test(
    "shows server uptime and recorded runs from the API",
    { tag: "@AC-CNT-04" },
    async ({ content }) => {
      await content.goto("/about");

      await expect(content.healthSummary).toBeVisible();
    },
  );

  const failures = [
    { name: "network error", respond: { abort: true } },
    { name: "server error", respond: { status: 500 } },
  ];

  for (const { name, respond } of failures) {
    test(
      `shows "Health unavailable." on ${name}`,
      { tag: "@AC-CNT-05" },
      async ({ content, page }) => {
        await page.route(HEALTH_ROUTE, async (route) => {
          if ("abort" in respond) {
            await route.abort();
            return;
          }
          await route.fulfill({ status: respond.status });
        });

        await content.goto("/about");

        await expect(content.healthUnavailableMessage).toBeVisible();
      },
    );
  }

  // Skipped by design when the author omits a field; each skip message says how to enable it
  test.describe("Author", () => {
    test.skip(
      !AUTHOR_NAME,
      "No author name in front/package.json. Set author (or author.name) there to enable",
    );

    test("shows the author name from package.json", { tag: "@AC-CNT-06" }, async ({ content }) => {
      await content.goto("/about");

      await expect(content.authorLabel(AUTHOR_NAME)).toBeVisible();
    });

    test(
      "links the author name to its web url in a new tab",
      { tag: "@AC-CNT-07" },
      async ({ content }) => {
        test.skip(
          !isWebUrl(AUTHOR_URL),
          "No http(s) author url in front/package.json. Set author as { name, url } there to enable",
        );

        await content.goto("/about");

        const link = content.authorLink(AUTHOR_NAME);
        await expect(link).toHaveAttribute("href", AUTHOR_URL);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener");
      },
    );

    test("never exposes the author email", { tag: "@AC-CNT-08" }, async ({ content, page }) => {
      test.skip(
        !AUTHOR_EMAIL,
        "No author email in front/package.json. Set author as { name, email } there to enable",
      );

      await content.goto("/about");
      await expect(content.authorLabel(AUTHOR_NAME)).toBeVisible();

      // Checks the served markup too, not only the rendered text
      expect(await page.content()).not.toContain(AUTHOR_EMAIL);
    });

    test(
      "shows the author even when the health API fails",
      { tag: "@AC-CNT-09" },
      async ({ content, page }) => {
        await page.route(HEALTH_ROUTE, async (route) => {
          await route.fulfill({ status: 500 });
        });

        await content.goto("/about");
        await expect(content.healthUnavailableMessage).toBeVisible();
        await expect(content.authorLabel(AUTHOR_NAME)).toBeVisible();
      },
    );
  });
});
