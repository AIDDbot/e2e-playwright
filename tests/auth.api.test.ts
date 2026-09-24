import { type APIRequestContext, expect, test } from "@playwright/test";

const BACK_URL = process.env["E2E_BACK_URL"];
const REGISTER_PATH = "/api/auth/register";
const LOGIN_PATH = "/api/auth/login";
const INVALID_CREDENTIALS = "Invalid credentials";
const REQUIRED_FIELDS = "Email, name, and password are required";
const EMAIL_ALREADY_REGISTERED = "Email already registered";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AuthSession {
  token: string;
  user: AuthUser;
}

// Unique per test since the database is shared per run
const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const registerUser = async (
  request: APIRequestContext,
  body: Readonly<Record<string, unknown>>,
) => request.post(`${BACK_URL}${REGISTER_PATH}`, { data: body });

const loginUser = async (request: APIRequestContext, body: Readonly<Record<string, unknown>>) =>
  request.post(`${BACK_URL}${LOGIN_PATH}`, { data: body });

test.describe("Auth API — register", () => {
  test("AC-AUT-01 registers with 201 and the normalized user, role always user", async ({
    request,
  }) => {
    const email = uniqueEmail("reg");
    const response = await registerUser(request, {
      email: ` ${email.toUpperCase()} `,
      name: "Ada Lovelace",
      password: "s3cret-pw",
    });

    expect(response.status()).toBe(201);
    const user = (await response.json()) as AuthUser;
    expect(user.id).toEqual(expect.any(Number));
    expect(user.email).toBe(email);
    expect(user.name).toBe("Ada Lovelace");
    expect(user.role).toBe("user");
    expect(user.createdAt).toEqual(expect.any(String));
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("password_hash");
  });

  test("AC-AUT-02 rejects a duplicate email (any letter case) with 409, and the first password still logs in", async ({
    request,
  }) => {
    const email = uniqueEmail("dup");
    const first = await registerUser(request, {
      email,
      name: "Ada",
      password: "first-pw",
    });
    expect(first.status()).toBe(201);

    const second = await registerUser(request, {
      email: email.toUpperCase(),
      name: "Ada 2",
      password: "second-pw",
    });
    expect(second.status()).toBe(409);
    const secondBody = (await second.json()) as { error: string };
    expect(secondBody.error).toBe(EMAIL_ALREADY_REGISTERED);

    const login = await loginUser(request, { email, password: "first-pw" });
    expect(login.status()).toBe(200);
  });

  test("AC-AUT-03 rejects missing name, empty password, and a non-string email with 400; login then 401", async ({
    request,
  }) => {
    const missingNameEmail = uniqueEmail("no-name");
    const missingName = await registerUser(request, {
      email: missingNameEmail,
      password: "pw",
    });
    expect(missingName.status()).toBe(400);
    const missingNameBody = (await missingName.json()) as { error: string };
    expect(missingNameBody.error).toBe(REQUIRED_FIELDS);

    const missingNameLogin = await loginUser(request, {
      email: missingNameEmail,
      password: "pw",
    });
    expect(missingNameLogin.status()).toBe(401);

    const emptyPasswordEmail = uniqueEmail("empty-pw");
    const emptyPassword = await registerUser(request, {
      email: emptyPasswordEmail,
      name: "Ada",
      password: "",
    });
    expect(emptyPassword.status()).toBe(400);
    const emptyPasswordBody = (await emptyPassword.json()) as { error: string };
    expect(emptyPasswordBody.error).toBe(REQUIRED_FIELDS);

    const emptyPasswordLogin = await loginUser(request, {
      email: emptyPasswordEmail,
      password: "pw",
    });
    expect(emptyPasswordLogin.status()).toBe(401);

    const nonStringEmail = await registerUser(request, {
      email: 123,
      name: "Ada",
      password: "pw",
    });
    expect(nonStringEmail.status()).toBe(400);
    const nonStringEmailBody = (await nonStringEmail.json()) as { error: string };
    expect(nonStringEmailBody.error).toBe(REQUIRED_FIELDS);
  });

  test("AC-AUT-12 ignores a client-supplied role and always stores/returns role user", async ({
    request,
  }) => {
    const email = uniqueEmail("ignored-role");
    const response = await registerUser(request, {
      email,
      name: "Ada",
      password: "s3cret-pw",
      role: "admin",
    });

    expect(response.status()).toBe(201);
    const user = (await response.json()) as AuthUser;
    expect(user.role).toBe("user");
  });
});

test.describe("Auth API — login", () => {
  test("AC-AUT-04 logs in with a non-empty token and the user's id, email, name and role", async ({
    request,
  }) => {
    const email = uniqueEmail("login-ok");
    const registerResponse = await registerUser(request, {
      email,
      name: "Grace Hopper",
      password: "s3cret-pw",
    });
    expect(registerResponse.status()).toBe(201);

    const response = await loginUser(request, { email, password: "s3cret-pw" });

    expect(response.status()).toBe(200);
    const session = (await response.json()) as AuthSession;
    expect(session.token).toEqual(expect.any(String));
    expect(session.token.length).toBeGreaterThan(0);
    expect(session.user.email).toBe(email);
    expect(session.user.name).toBe("Grace Hopper");
    expect(session.user.role).toBe("user");
    expect(session.user).not.toHaveProperty("password");
    expect(session.user).not.toHaveProperty("passwordHash");
    expect(session.user).not.toHaveProperty("password_hash");
  });

  test("AC-AUT-05 rejects a wrong password and an unknown email with the same 401 error body", async ({
    request,
  }) => {
    const email = uniqueEmail("wrong-pw");
    const registerResponse = await registerUser(request, {
      email,
      name: "Ada",
      password: "correct-pw",
    });
    expect(registerResponse.status()).toBe(201);

    const wrongPassword = await loginUser(request, { email, password: "wrong-pw" });
    expect(wrongPassword.status()).toBe(401);
    const wrongPasswordBody = (await wrongPassword.json()) as { error: string };
    expect(wrongPasswordBody.error).toBe(INVALID_CREDENTIALS);

    const unknownEmail = await loginUser(request, {
      email: uniqueEmail("unknown"),
      password: "correct-pw",
    });
    expect(unknownEmail.status()).toBe(401);
    const unknownEmailBody = (await unknownEmail.json()) as { error: string };
    expect(unknownEmailBody.error).toBe(INVALID_CREDENTIALS);
  });
});
