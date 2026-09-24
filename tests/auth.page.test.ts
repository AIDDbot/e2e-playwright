import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

const BACK_URL = process.env["E2E_BACK_URL"];

// Unique per test since the database is shared per run
const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const registerViaApi = async (
  request: APIRequestContext,
  body: Readonly<{ email: string; name: string; password: string }>,
) => {
  const response = await request.post(`${BACK_URL}/api/auth/register`, { data: body });
  expect(response.status()).toBe(201);
};

const fillRegisterFields = async (
  page: Readonly<Page>,
  fields: Readonly<{ email: string; name: string; password: string }>,
) => {
  await page.getByRole("textbox", { name: "Email" }).fill(fields.email);
  await page.getByRole("textbox", { name: "Name" }).fill(fields.name);
  // <input type="password"> carries no ARIA role, so it is located by its label instead.
  await page.getByLabel("Password").fill(fields.password);
};

const fillRegisterForm = async (
  page: Readonly<Page>,
  fields: Readonly<{ email: string; name: string; password: string }>,
) => {
  await fillRegisterFields(page, fields);
  await page.getByRole("button", { name: "Register" }).click();
};

const fillLoginFields = async (
  page: Readonly<Page>,
  fields: Readonly<{ email: string; password: string }>,
) => {
  await page.getByRole("textbox", { name: "Email" }).fill(fields.email);
  await page.getByLabel("Password").fill(fields.password);
};

const fillLoginForm = async (
  page: Readonly<Page>,
  fields: Readonly<{ email: string; password: string }>,
) => {
  await fillLoginFields(page, fields);
  await page.getByRole("button", { name: "Log in" }).click();
};

/** Counts outgoing POST requests to `path` from the moment this is called. */
const countPostRequests = (page: Readonly<Page>, path: string): (() => number) => {
  let count = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(path)) {
      count += 1;
    }
  });
  return () => count;
};

/**
 * Intercepts POST requests to `path` and holds each one until the returned function is
 * called, so a test can assert on UI state (e.g. a disabled submit button) while the
 * request is still in flight. Deliberately never unroutes: each test gets its own `page`,
 * discarded when the test ends, so a lingering route on a dead page is harmless — and
 * unrouting while `route.continue()` is still pending races with it ("Route is already
 * handled!").
 */
const holdPostRequests = async (page: Readonly<Page>, path: string): Promise<() => void> => {
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
  test("AC-AUT-06 registering shows a confirmation on the login page, and logging in shows the user in the nav menu", async ({
    page,
  }) => {
    const email = uniqueEmail("ui-flow");
    const name = "Ada Lovelace";
    const password = "s3cret-pw";

    await page.goto("/register");
    await fillRegisterForm(page, { email, name, password });

    await expect(page).toHaveURL("/login?registered=1");
    await expect(page.getByText("Registration successful. Please log in.")).toBeVisible();

    await fillLoginForm(page, { email, password });

    await expect(page).toHaveURL("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByText(`${name} (user)`)).toBeVisible();
  });

  test("AC-AUT-13 the register form has no Role field", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("combobox", { name: "Role" })).toHaveCount(0);
    await expect(page.getByLabel("Role")).toHaveCount(0);
  });
});

test.describe("Register errors", () => {
  test("AC-AUT-07 shows the API error when registering with an already-used email, then re-enables the form to retry", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("ui-dup");
    await registerViaApi(request, {
      email,
      name: "Ada",
      password: "first-pw",
    });

    await page.goto("/register");
    await fillRegisterForm(page, {
      email,
      name: "Ada 2",
      password: "second-pw",
    });

    await expect(page.getByRole("alert")).toHaveText(/already registered/i);
    await expect(page).toHaveURL(/\/register/);

    const button = page.getByRole("button", { name: "Register" });
    await expect(button).toBeEnabled();

    // Retrying with a fresh email must succeed and send a new request.
    await fillRegisterFields(page, {
      email: uniqueEmail("ui-dup-retry"),
      name: "Ada 2",
      password: "second-pw",
    });
    await button.click();

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login errors", () => {
  test("AC-AUT-08 shows the API error on a wrong password, then re-enables the form to retry", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("ui-badpw");
    const password = "correct-pw";
    await registerViaApi(request, {
      email,
      name: "Ada",
      password,
    });

    await page.goto("/login");
    await fillLoginForm(page, { email, password: "wrong-pw" });

    await expect(page.getByRole("alert")).toHaveText("Invalid credentials");
    await expect(page).toHaveURL(/\/login/);

    const button = page.getByRole("button", { name: "Log in" });
    await expect(button).toBeEnabled();

    // Retrying with the correct password must succeed and send a new request.
    await fillLoginFields(page, { email, password });
    await button.click();

    await expect(page).toHaveURL("/");
  });
});

test.describe("Double submit", () => {
  test("AC-AUT-09 clicking Register twice quickly sends exactly one registration request", async ({
    page,
  }) => {
    const email = uniqueEmail("ui-double-register");

    await page.goto("/register");
    await fillRegisterFields(page, {
      email,
      name: "Ada Lovelace",
      password: "s3cret-pw",
    });

    const registerRequests = countPostRequests(page, "/api/auth/register");
    const releaseRegisterRequest = await holdPostRequests(page, "/api/auth/register");

    const button = page.getByRole("button", { name: "Register" });
    await button.dblclick();

    // The request is held: the button must already be disabled while it is in flight.
    await expect(button).toBeDisabled();

    releaseRegisterRequest();

    await expect(page).toHaveURL(/\/login/);
    expect(registerRequests()).toBe(1);
  });

  test("AC-AUT-10 clicking Log in twice quickly sends exactly one login request", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("ui-double-login");
    const password = "s3cret-pw";
    await registerViaApi(request, { email, name: "Ada", password });

    await page.goto("/login");
    await fillLoginFields(page, { email, password });

    const loginRequests = countPostRequests(page, "/api/auth/login");
    const releaseLoginRequest = await holdPostRequests(page, "/api/auth/login");

    const button = page.getByRole("button", { name: "Log in" });
    await button.dblclick();

    // The request is held: the button must already be disabled while it is in flight.
    await expect(button).toBeDisabled();

    releaseLoginRequest();

    await expect(page).toHaveURL("/");
    expect(loginRequests()).toBe(1);
  });
});
