import { type AuthSession, type AuthUser } from "../clients/auth.client.js";
import { expect, test } from "../fixtures/index.js";
import authData from "../test-data/auth.json" with { type: "json" };
import { uniqueEmail } from "../test-data/unique.js";

test.describe("Auth API — register", () => {
  test(
    "registers with 201 and the normalized user, role always user",
    { tag: "@AC-AUT-01" },
    async ({ authClient }) => {
      const email = uniqueEmail("reg");
      const response = await authClient.register({
        email: ` ${email.toUpperCase()} `,
        name: authData.users.ada.name,
        password: authData.users.ada.password,
      });

      await expect(response).toHaveStatus(201);
      const user = (await response.json()) as AuthUser;
      expect(user.id).toEqual(expect.any(Number));
      expect(user.email).toBe(email);
      expect(user.name).toBe(authData.users.ada.name);
      expect(user.role).toBe("user");
      expect(user.createdAt).toEqual(expect.any(String));
      expect(user).toBePublicUser();
    },
  );

  test(
    "rejects a duplicate email (any letter case) with 409, and the first password still logs in",
    { tag: "@AC-AUT-02" },
    async ({ authClient }) => {
      const email = uniqueEmail("dup");
      const first = await authClient.register({
        email,
        name: authData.users.ada.name,
        password: "first-pw",
      });
      await expect(first).toHaveStatus(201);

      const second = await authClient.register({
        email: email.toUpperCase(),
        name: "Ada 2",
        password: "second-pw",
      });
      await expect(second).toBeApiError(409, authData.messages.emailAlreadyRegistered);

      const login = await authClient.login({ email, password: "first-pw" });
      await expect(login).toHaveStatus(200);
    },
  );

  test(
    "rejects a missing name and does not create a loginable user",
    { tag: "@AC-AUT-03a" },
    async ({ authClient }) => {
      const missingNameEmail = uniqueEmail("no-name");
      const missingName = await authClient.register({
        email: missingNameEmail,
        password: "pw",
      });
      await expect(missingName).toBeApiError(400, authData.messages.requiredFields);

      const missingNameLogin = await authClient.login({
        email: missingNameEmail,
        password: "pw",
      });
      await expect(missingNameLogin).toHaveStatus(401);
    },
  );

  test(
    "rejects an empty password and does not create a loginable user",
    { tag: "@AC-AUT-03b" },
    async ({ authClient }) => {
      const emptyPasswordEmail = uniqueEmail("empty-pw");
      const emptyPassword = await authClient.register({
        email: emptyPasswordEmail,
        name: "Ada",
        password: "",
      });
      await expect(emptyPassword).toBeApiError(400, authData.messages.requiredFields);

      const emptyPasswordLogin = await authClient.login({
        email: emptyPasswordEmail,
        password: "pw",
      });
      await expect(emptyPasswordLogin).toHaveStatus(401);
    },
  );

  test("rejects a non-string email", { tag: "@AC-AUT-03c" }, async ({ authClient }) => {
    const nonStringEmail = await authClient.register({
      email: 123,
      name: "Ada",
      password: "pw",
    });
    await expect(nonStringEmail).toBeApiError(400, authData.messages.requiredFields);
  });

  test(
    "ignores a client-supplied role and always stores/returns role user",
    { tag: "@AC-AUT-12" },
    async ({ authClient }) => {
      const email = uniqueEmail("ignored-role");
      const response = await authClient.register({
        email,
        name: "Ada",
        password: authData.users.ada.password,
        role: "admin",
      });

      await expect(response).toHaveStatus(201);
      const user = (await response.json()) as AuthUser;
      expect(user.role).toBe("user");
    },
  );
});

test.describe("Auth API — login", () => {
  test(
    "logs in with a non-empty token and the user's id, email, name and role",
    { tag: "@AC-AUT-04" },
    async ({ authClient }) => {
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

      await expect(response).toHaveStatus(200);
      const session = (await response.json()) as AuthSession;
      expect(session.token).toEqual(expect.any(String));
      expect(session.token.length).toBeGreaterThan(0);
      expect(session.user.email).toBe(email);
      expect(session.user.name).toBe(authData.users.grace.name);
      expect(session.user.role).toBe("user");
      expect(session.user).toBePublicUser();
    },
  );

  test(
    "rejects a wrong password and an unknown email with the same 401 error body",
    { tag: "@AC-AUT-05" },
    async ({ authClient }) => {
      const email = uniqueEmail("wrong-pw");
      await authClient.registerUser({ email, name: "Ada", password: "correct-pw" });

      const wrongPassword = await authClient.login({ email, password: "wrong-pw" });
      await expect(wrongPassword).toBeApiError(401, authData.messages.invalidCredentials);

      const unknownEmail = await authClient.login({
        email: uniqueEmail("unknown"),
        password: "correct-pw",
      });
      await expect(unknownEmail).toBeApiError(401, authData.messages.invalidCredentials);
    },
  );
});

test.describe("Auth API — session guard", () => {
  const rejected = [
    { authorization: undefined, name: "without an Authorization header" },
    { authorization: "Token abc", name: "with a non-Bearer scheme" },
    { authorization: "Bearer", name: "with a Bearer header and no token" },
    { authorization: "Bearer unknown-session-token", name: "with an unknown token" },
  ];

  for (const { authorization, name } of rejected) {
    test(
      `rejects GET /api/auth/me ${name} with 401 and an error body`,
      { tag: "@AC-AUT-14" },
      async ({ authClient }) => {
        const response = await authClient.me(authorization);

        await expect(response).toBeApiError(401);
      },
    );
  }

  test(
    "returns the logged-in public user for its Bearer token",
    { tag: "@AC-AUT-15" },
    async ({ authClient }) => {
      const email = uniqueEmail("me");
      const { name, password } = authData.users.ada;
      await authClient.registerUser({ email, name, password });
      const session = await authClient.loginUser({ email, password });

      const response = await authClient.me(`Bearer ${session.token}`);

      await expect(response).toHaveStatus(200);
      const user = (await response.json()) as AuthUser;
      expect(user).toEqual(session.user);
      expect(user.email).toBe(email);
      expect(user).toBePublicUser();
    },
  );
});
