import { test as base } from "@playwright/test";
import { AuthClient } from "../clients/auth.client.js";
import { LoginPage, RegisterPage } from "../pages/auth.page.js";
import { ContentPage } from "../pages/content.page.js";
import { NavigationPage } from "../pages/navigation.page.js";
import { backUrl } from "../support/run-context.js";

interface PageFixtures {
  content: ContentPage;
  loginPage: LoginPage;
  navigation: NavigationPage;
  registerPage: RegisterPage;
}

interface ClientFixtures {
  authClient: AuthClient;
}

// Specs import test and expect from here instead of @playwright/test
export const test = base.extend<PageFixtures & ClientFixtures>({
  // Own context on the back URL, so UI tests (based on the front) can arrange data too
  authClient: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: backUrl });
    await use(new AuthClient(request));
    await request.dispose();
  },
  content: async ({ page }, use) => {
    await use(new ContentPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  navigation: async ({ page }, use) => {
    await use(new NavigationPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
});

export { expect } from "./matchers.js";
