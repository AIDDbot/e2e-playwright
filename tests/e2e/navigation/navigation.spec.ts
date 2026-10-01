import { expect, test } from "../../fixtures/index.ts";
import { appTitle } from "../../support/run-context.ts";

const PAGES = ["/", "/about", "/items/1", "/no/such/page"];

test.describe("Navigation bar", () => {
  for (const path of PAGES) {
    test(
      `shows title, menu and theme toggle on ${path}`,
      { tag: "@AC-NAV-01" },
      async ({ appPage }) => {
        const { navigation } = appPage;
        await appPage.open(path);

        await expect(navigation.appLink(appTitle)).toHaveAttribute("href", "/");
        await expect(navigation.homeLink).toHaveAttribute("href", "/");
        await expect(navigation.aboutLink).toHaveAttribute("href", "/about");
        await expect(navigation.themeToggle).toBeVisible();
      },
    );
  }
});

test.describe("Theme toggle", () => {
  test("switches between dark and light themes", { tag: "@AC-NAV-02" }, async ({ homePage }) => {
    const { navigation } = homePage;
    await homePage.goto();
    await expect(navigation.themeToggle).toBeVisible();
    const initial = await navigation.theme();
    const other = await navigation.otherTheme();

    await navigation.themeToggle.click();
    await expect(navigation.themeRoot).toHaveAttribute("data-theme", other);

    await navigation.themeToggle.click();
    await expect(navigation.themeRoot).toHaveAttribute("data-theme", initial);
  });

  test(
    "keeps the chosen theme after a reload",
    { tag: "@AC-NAV-03" },
    async ({ homePage, page }) => {
      const { navigation } = homePage;
      await homePage.goto();
      await expect(navigation.themeToggle).toBeVisible();
      const other = await navigation.otherTheme();

      await navigation.themeToggle.click();
      await page.reload();

      await expect(navigation.themeToggle).toBeVisible();
      await expect(navigation.themeRoot).toHaveAttribute("data-theme", other);
    },
  );
});
