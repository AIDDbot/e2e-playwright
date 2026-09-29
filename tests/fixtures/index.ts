import { test as base } from "@playwright/test";
import { AuthClient } from "../clients/auth.client.js";
import { AboutPage } from "../pages/about.page.js";
import { AppPage } from "../pages/app.page.js";
import { HomePage } from "../pages/home.page.js";
import { ItemPage } from "../pages/item.page.js";
import { LoginPage } from "../pages/login.page.js";
import { NotFoundPage } from "../pages/not-found.page.js";
import { RegisterPage } from "../pages/register.page.js";
import { backUrl } from "../support/run-context.js";

interface PageFixtures {
  aboutPage: AboutPage;
  /** Any route, for tests about the shared layout (navigation, assets, routing). */
  appPage: AppPage;
  homePage: HomePage;
  itemPage: ItemPage;
  loginPage: LoginPage;
  notFoundPage: NotFoundPage;
  registerPage: RegisterPage;
}

interface ClientFixtures {
  authClient: AuthClient;
}

// Specs import test and expect from here instead of @playwright/test
export const test = base.extend<PageFixtures & ClientFixtures>({
  aboutPage: async ({ page }, use) => {
    await use(new AboutPage(page));
  },
  appPage: async ({ page }, use) => {
    await use(new AppPage(page));
  },
  // Own context on the back URL, so UI tests (based on the front) can arrange data too
  authClient: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: backUrl });
    await use(new AuthClient(request));
    await request.dispose();
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  itemPage: async ({ page }, use) => {
    await use(new ItemPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  notFoundPage: async ({ page }, use) => {
    await use(new NotFoundPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
});

export { expect } from "./matchers.js";
