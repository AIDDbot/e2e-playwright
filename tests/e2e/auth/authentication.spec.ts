import { type Page } from "@playwright/test";
import { expect, test } from "../../fixtures/index.js";
import { copy } from "../../test-data/copy.js";
import users from "../../test-data/users.json" with { type: "json" };
import { uniqueEmail } from "../../test-data/unique.js";

const countPostRequests = (page: Page, path: string): (() => number) => {
  let count = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(path)) count += 1;
  });
  return () => count;
};

const holdPostRequests = async (page: Page, path: string): Promise<() => void> => {
  const { promise: held, resolve: release } = Promise.withResolvers<void>();
  await page.route(`**${path}`, async (route) => {
    await held;
    await route.continue();
  });
  return release;
};

test.describe("Register then login", () => {
  test(
    "registering confirms success, and login shows the user in navigation",
    { tag: "@AC-AUT-06" },
    async ({ loginPage, page, registerPage }) => {
      const email = uniqueEmail("ui-flow");
      const { name, password } = users.ada;

      await registerPage.goto();
      await registerPage.submit({ email, name, password });

      await expect(page).toHaveURL("/login?registered=1");
      await expect(loginPage.registrationSuccessMessage).toBeVisible();

      await loginPage.submit({ email, password });
      await expect(page).toHaveURL("/");
      await expect(loginPage.navigation.authenticatedUser(name, "user")).toBeVisible();
    },
  );

  test("the register form has no Role field", { tag: "@AC-AUT-13" }, async ({ registerPage }) => {
    await registerPage.goto();
    await expect(registerPage.nameInput).toBeVisible();
    await expect(registerPage.roleInputs).toHaveCount(0);
  });
});

test.describe("Register errors", () => {
  test(
    "shows duplicate email error and allows a retry",
    { tag: "@AC-AUT-07" },
    async ({ authClient, page, registerPage }) => {
      const email = uniqueEmail("ui-dup");
      await authClient.registerUser({
        email,
        name: users.ada.name,
        password: "first-pw",
      });

      await registerPage.goto();
      await registerPage.submit({ email, name: "Ada 2", password: "second-pw" });
      await registerPage.expectError(copy.auth.emailAlreadyRegistered);
      await expect(page).toHaveURL(/\/register/);
      await expect(registerPage.submitButton).toBeEnabled();

      await registerPage.submit({
        email: uniqueEmail("ui-dup-retry"),
        name: "Ada 2",
        password: "second-pw",
      });
      await expect(page).toHaveURL(/\/login/);
    },
  );
});

test.describe("Login errors", () => {
  test(
    "shows wrong password error and allows a retry",
    { tag: "@AC-AUT-08" },
    async ({ authClient, loginPage, page }) => {
      const email = uniqueEmail("ui-badpw");
      const password = "correct-pw";
      await authClient.registerUser({ email, name: "Ada", password });

      await loginPage.goto();
      await loginPage.submit({ email, password: "wrong-pw" });
      await loginPage.expectError(copy.auth.invalidCredentials);
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.submitButton).toBeEnabled();

      await loginPage.submit({ email, password });
      await expect(page).toHaveURL("/");
    },
  );
});

test.describe("Double submit", () => {
  test(
    "clicking Register twice sends one registration request",
    { tag: "@AC-AUT-09" },
    async ({ page, registerPage }) => {
      await registerPage.goto();
      await registerPage.fill({
        email: uniqueEmail("ui-double-register"),
        name: users.ada.name,
        password: users.ada.password,
      });

      const registerRequests = countPostRequests(page, "/api/auth/register");
      const releaseRequest = await holdPostRequests(page, "/api/auth/register");
      await registerPage.submitButton.dblclick();
      await expect(registerPage.submitButton).toBeDisabled();
      releaseRequest();

      await expect(page).toHaveURL(/\/login/);
      expect(registerRequests()).toBe(1);
    },
  );

  test(
    "clicking Log in twice sends one login request",
    { tag: "@AC-AUT-10" },
    async ({ authClient, loginPage, page }) => {
      const email = uniqueEmail("ui-double-login");
      const password = users.ada.password;
      await authClient.registerUser({ email, name: "Ada", password });

      await loginPage.goto();
      await loginPage.fill({ email, password });

      const loginRequests = countPostRequests(page, "/api/auth/login");
      const releaseRequest = await holdPostRequests(page, "/api/auth/login");
      await loginPage.submitButton.dblclick();
      await expect(loginPage.submitButton).toBeDisabled();
      releaseRequest();

      await expect(page).toHaveURL("/");
      expect(loginRequests()).toBe(1);
    },
  );
});

test.describe("Session", () => {
  test(
    "keeps the user signed in after a reload",
    { tag: "@auth-session" },
    async ({ homePage, page, signedInUser }) => {
      const { name, session } = signedInUser;
      const currentUser = homePage.navigation.authenticatedUser(name, session.user.role);
      await homePage.goto();
      await expect(currentUser).toBeVisible();

      await page.reload();
      await expect(currentUser).toBeVisible();
    },
  );
});
