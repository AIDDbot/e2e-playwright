import { type AuthSession, type AuthUser } from "../clients/auth.client.js";
import { expect, test } from "../fixtures/index.js";
import authData from "../test-data/auth.json" with { type: "json" };
import { uniqueEmail } from "../test-data/unique.js";

test.describe("Auth API — register", () => {
  test("AC-AUT-01 registers with 201 and the normalized user, role always user", async ({
    authClient,
  }) => {
    const email = uniqueEmail("reg");
    const response = await authClient.register({
      email: ` ${email.toUpperCase()} `,
      name: authData.users.ada.name,
      password: authData.users.ada.password,
    });

    expect(response.status()).toBe(201);
    const user = (await response.json()) as AuthUser;
    expect(user.id).toEqual(expect.any(Number));
    expect(user.email).toBe(email);
    expect(user.name).toBe(authData.users.ada.name);
    expect(user.role).toBe("user");
    expect(user.createdAt).toEqual(expect.any(String));
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("password_hash");
  });

  test("AC-AUT-02 rejects a duplicate email (any letter case) with 409, and the first password still logs in", async ({
    authClient,
  }) => {
    const email = uniqueEmail("dup");
    const first = await authClient.register({
      email,
      name: authData.users.ada.name,
      password: "first-pw",
    });
    expect(first.status()).toBe(201);

    const second = await authClient.register({
      email: email.toUpperCase(),
      name: "Ada 2",
      password: "second-pw",
    });
    expect(second.status()).toBe(409);
    const secondBody = (await second.json()) as { error: string };
    expect(secondBody.error).toBe(authData.messages.emailAlreadyRegistered);

    const login = await authClient.login({ email, password: "first-pw" });
    expect(login.status()).toBe(200);
  });

  test("AC-AUT-03a rejects a missing name and does not create a loginable user", async ({
    authClient,
  }) => {
    const missingNameEmail = uniqueEmail("no-name");
    const missingName = await authClient.register({
      email: missingNameEmail,
      password: "pw",
    });
    expect(missingName.status()).toBe(400);
    const missingNameBody = (await missingName.json()) as { error: string };
    expect(missingNameBody.error).toBe(authData.messages.requiredFields);

    const missingNameLogin = await authClient.login({
      email: missingNameEmail,
      password: "pw",
    });
    expect(missingNameLogin.status()).toBe(401);
  });

  test("AC-AUT-03b rejects an empty password and does not create a loginable user", async ({
    authClient,
  }) => {
    const emptyPasswordEmail = uniqueEmail("empty-pw");
    const emptyPassword = await authClient.register({
      email: emptyPasswordEmail,
      name: "Ada",
      password: "",
    });
    expect(emptyPassword.status()).toBe(400);
    const emptyPasswordBody = (await emptyPassword.json()) as { error: string };
    expect(emptyPasswordBody.error).toBe(authData.messages.requiredFields);

    const emptyPasswordLogin = await authClient.login({
      email: emptyPasswordEmail,
      password: "pw",
    });
    expect(emptyPasswordLogin.status()).toBe(401);
  });

  test("AC-AUT-03c rejects a non-string email", async ({ authClient }) => {
    const nonStringEmail = await authClient.register({
      email: 123,
      name: "Ada",
      password: "pw",
    });
    expect(nonStringEmail.status()).toBe(400);
    const nonStringEmailBody = (await nonStringEmail.json()) as { error: string };
    expect(nonStringEmailBody.error).toBe(authData.messages.requiredFields);
  });

  test("AC-AUT-12 ignores a client-supplied role and always stores/returns role user", async ({
    authClient,
  }) => {
    const email = uniqueEmail("ignored-role");
    const response = await authClient.register({
      email,
      name: "Ada",
      password: authData.users.ada.password,
      role: "admin",
    });

    expect(response.status()).toBe(201);
    const user = (await response.json()) as AuthUser;
    expect(user.role).toBe("user");
  });
});

test.describe("Auth API — login", () => {
  test("AC-AUT-04 logs in with a non-empty token and the user's id, email, name and role", async ({
    authClient,
  }) => {
    const email = uniqueEmail("login-ok");
    await authClient.registerUser({
      email,
      name: authData.users.grace.name,
      password: authData.users.grace.password,
    });

    const response = await authClient.login({
      email,
      password: authData.users.grace.password,
    });

    expect(response.status()).toBe(200);
    const session = (await response.json()) as AuthSession;
    expect(session.token).toEqual(expect.any(String));
    expect(session.token.length).toBeGreaterThan(0);
    expect(session.user.email).toBe(email);
    expect(session.user.name).toBe(authData.users.grace.name);
    expect(session.user.role).toBe("user");
    expect(session.user).not.toHaveProperty("password");
    expect(session.user).not.toHaveProperty("passwordHash");
    expect(session.user).not.toHaveProperty("password_hash");
  });

  test("AC-AUT-05 rejects a wrong password and an unknown email with the same 401 error body", async ({
    authClient,
  }) => {
    const email = uniqueEmail("wrong-pw");
    await authClient.registerUser({ email, name: "Ada", password: "correct-pw" });

    const wrongPassword = await authClient.login({ email, password: "wrong-pw" });
    expect(wrongPassword.status()).toBe(401);
    const wrongPasswordBody = (await wrongPassword.json()) as { error: string };
    expect(wrongPasswordBody.error).toBe(authData.messages.invalidCredentials);

    const unknownEmail = await authClient.login({
      email: uniqueEmail("unknown"),
      password: "correct-pw",
    });
    expect(unknownEmail.status()).toBe(401);
    const unknownEmailBody = (await unknownEmail.json()) as { error: string };
    expect(unknownEmailBody.error).toBe(authData.messages.invalidCredentials);
  });
});

test.describe("Auth API — session guard", () => {
  const rejected = [
    { authorization: undefined, name: "without an Authorization header" },
    { authorization: "Token abc", name: "with a non-Bearer scheme" },
    { authorization: "Bearer", name: "with a Bearer header and no token" },
    { authorization: "Bearer unknown-session-token", name: "with an unknown token" },
  ];

  for (const { authorization, name } of rejected) {
    test(`AC-AUT-14 rejects GET /api/auth/me ${name} with 401 and an error body`, async ({
      authClient,
    }) => {
      const response = await authClient.me(authorization);

      expect(response.status()).toBe(401);
      const body = (await response.json()) as { error: unknown };
      expect(body.error).toEqual(expect.any(String));
      expect(body.error).not.toBe("");
    });
  }

  test("AC-AUT-15 returns the logged-in public user for its Bearer token", async ({
    authClient,
  }) => {
    const email = uniqueEmail("me");
    const { name, password } = authData.users.ada;
    await authClient.registerUser({ email, name, password });
    const session = await authClient.loginUser({ email, password });

    const response = await authClient.me(`Bearer ${session.token}`);

    expect(response.status()).toBe(200);
    const user = (await response.json()) as AuthUser;
    expect(user).toEqual(session.user);
    expect(user.email).toBe(email);
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("password_hash");
  });
});
