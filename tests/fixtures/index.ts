import { test as base } from "@playwright/test";
import { AuthClient, type AuthSession, type NewUser } from "../clients/auth.client.js";
import { AboutPage } from "../pages/about.page.js";
import { AppPage } from "../pages/app.page.js";
import { HomePage } from "../pages/home.page.js";
import { ItemPage } from "../pages/item.page.js";
import { LoginPage } from "../pages/login.page.js";
import { NotFoundPage } from "../pages/not-found.page.js";
import { RegisterPage } from "../pages/register.page.js";
import { seedBrowserSession } from "../support/browser-session.js";
import { backUrl } from "../support/run-context.js";
import { uniqueEmail } from "../test-data/unique.js";
import users from "../test-data/users.json" with { type: "json" };

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

interface SessionFixtures {
  /** A fresh user, registered and logged in through the API, with the page already signed in. */
  signedInUser: NewUser & { session: AuthSession };
}

// Specs import test and expect from here instead of @playwright/test
export const test = base.extend<PageFixtures & ClientFixtures & SessionFixtures>({
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
  // Skips the forms, which have their own tests, so protected flows start signed in
  signedInUser: async ({ authClient, page }, use) => {
    const user = { ...users.ada, email: uniqueEmail("signed-in") };
    await authClient.registerUser(user);
    const session = await authClient.loginUser(user);
    await seedBrowserSession(page, session);
    await use({ ...user, session });
  },
});

export { expect } from "./matchers.js";
