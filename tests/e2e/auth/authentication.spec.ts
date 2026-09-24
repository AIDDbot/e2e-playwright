import { type APIRequestContext, type Page, expect, test } from "@playwright/test";
import authFixture from "../../fixtures/auth.json" with { type: "json" };
import { uniqueEmail } from "../../fixtures/test-data.js";
import { LoginPage, RegisterPage } from "../../pages/auth.page.js";
import { NavigationPage } from "../../pages/navigation.page.js";

const BACK_URL = process.env["E2E_BACK_URL"];

const registerViaApi = async (
  request: APIRequestContext,
  body: Readonly<{ email: string; name: string; password: string }>,
): Promise<void> => {
  const response = await request.post(`${BACK_URL}/api/auth/register`, { data: body });
  expect(response.status()).toBe(201);
};

const countPostRequests = (page: Page, path: string): (() => number) => {
  let count = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(path)) count += 1;
  });
  return () => count;
};

const holdPostRequests = async (page: Page, path: string): Promise<() => void> => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${path}`, async (route) => {
    await held;
    await route.continue();
  });
  return release;
};

test.describe("Register then login", () => {
  test("AC-AUT-06 registering confirms success, and login shows the user in navigation", async ({
    page,
  }) => {
    const email = uniqueEmail("ui-flow");
    const { name, password } = authFixture.users.ada;
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);

    await registerPage.goto();
    await registerPage.submit({ email, name, password });

    await expect(page).toHaveURL("/login?registered=1");
    await expect(
      loginPage.registrationSuccessMessage(authFixture.messages.registrationSuccess),
    ).toBeVisible();

    await loginPage.submit({ email, password });
    await expect(page).toHaveURL("/");
    await expect(new NavigationPage(page).authenticatedUser(name, "user")).toBeVisible();
  });

  test("AC-AUT-13 the register form has no Role field", async ({ page }) => {
    await new RegisterPage(page).goto();
    await expect(page.getByRole("combobox", { name: "Role" })).toHaveCount(0);
    await expect(page.getByLabel("Role")).toHaveCount(0);
  });
});

test.describe("Register errors", () => {
  test("AC-AUT-07 shows duplicate email error and allows a retry", async ({ page, request }) => {
    const email = uniqueEmail("ui-dup");
    await registerViaApi(request, {
      email,
      name: authFixture.users.ada.name,
      password: "first-pw",
    });

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.submit({ email, name: "Ada 2", password: "second-pw" });
    await registerPage.expectError(authFixture.messages.emailAlreadyRegistered);
    await expect(page).toHaveURL(/\/register/);
    await expect(registerPage.submitButton).toBeEnabled();

    await registerPage.submit({
      email: uniqueEmail("ui-dup-retry"),
      name: "Ada 2",
      password: "second-pw",
    });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login errors", () => {
  test("AC-AUT-08 shows wrong password error and allows a retry", async ({ page, request }) => {
    const email = uniqueEmail("ui-badpw");
    const password = "correct-pw";
    await registerViaApi(request, { email, name: "Ada", password });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submit({ email, password: "wrong-pw" });
    await loginPage.expectError(authFixture.messages.invalidCredentials);
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.submitButton).toBeEnabled();

    await loginPage.submit({ email, password });
    await expect(page).toHaveURL("/");
  });
});

test.describe("Double submit", () => {
  test("AC-AUT-09 clicking Register twice sends one registration request", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fill({
      email: uniqueEmail("ui-double-register"),
      name: authFixture.users.ada.name,
      password: authFixture.users.ada.password,
    });

    const registerRequests = countPostRequests(page, "/api/auth/register");
    const releaseRequest = await holdPostRequests(page, "/api/auth/register");
    await registerPage.submitButton.dblclick();
    await expect(registerPage.submitButton).toBeDisabled();
    releaseRequest();

    await expect(page).toHaveURL(/\/login/);
    expect(registerRequests()).toBe(1);
  });

  test("AC-AUT-10 clicking Log in twice sends one login request", async ({ page, request }) => {
    const email = uniqueEmail("ui-double-login");
    const password = authFixture.users.ada.password;
    await registerViaApi(request, { email, name: "Ada", password });

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fill({ email, password });

    const loginRequests = countPostRequests(page, "/api/auth/login");
    const releaseRequest = await holdPostRequests(page, "/api/auth/login");
    await loginPage.submitButton.dblclick();
    await expect(loginPage.submitButton).toBeDisabled();
    releaseRequest();

    await expect(page).toHaveURL("/");
    expect(loginRequests()).toBe(1);
  });
});
