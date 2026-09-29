import { type APIResponse, expect as baseExpect } from "@playwright/test";

// Never part of a user returned by the API, whatever the naming convention of the back
const SECRET_FIELDS = ["password", "passwordHash", "password_hash"];

const readBody = async (response: APIResponse): Promise<string> => {
  try {
    return await response.text();
  } catch {
    return "<unreadable body>";
  }
};

const readError = async (response: APIResponse): Promise<unknown> => {
  try {
    return ((await response.json()) as { error?: unknown }).error;
  } catch {
    return undefined;
  }
};

// Failure messages show the URL and the body, which a bare status comparison hides
export const expect = baseExpect.extend({
  async toHaveStatus(response: APIResponse, expected: number) {
    const actual = response.status();
    const pass = actual === expected;
    const body = pass === this.isNot ? await readBody(response) : "";
    return {
      actual,
      expected,
      message: () =>
        `${this.utils.matcherHint("toHaveStatus", undefined, undefined, { isNot: this.isNot })}\n\n` +
        `${response.url()}\n` +
        `Expected status: ${this.isNot ? "not " : ""}${this.utils.printExpected(expected)}\n` +
        `Received status: ${this.utils.printReceived(actual)}\n` +
        `Body: ${body}`,
      name: "toHaveStatus",
      pass,
    };
  },

  /** A status plus an { error } body: the given message, or any non-empty string. */
  async toBeApiError(response: APIResponse, status: number, message?: string) {
    const actual = response.status();
    const error = await readError(response);
    const errorMatches =
      message === undefined ? typeof error === "string" && error !== "" : error === message;
    const pass = actual === status && errorMatches;
    const expectedError = message === undefined ? "any non-empty string" : JSON.stringify(message);
    return {
      message: () =>
        `${this.utils.matcherHint("toBeApiError", undefined, undefined, { isNot: this.isNot })}\n\n` +
        `${response.url()}\n` +
        `Expected: ${this.isNot ? "not " : ""}${status} with error ${expectedError}\n` +
        `Received: ${actual} with error ${JSON.stringify(error)}`,
      name: "toBeApiError",
      pass,
    };
  },

  /** A user object without any password field. */
  toBePublicUser(user: object) {
    const exposed = SECRET_FIELDS.filter((field) => field in user);
    return {
      message: () =>
        `${this.utils.matcherHint("toBePublicUser", undefined, "", { isNot: this.isNot })}\n\n` +
        (exposed.length > 0
          ? `Exposed fields: ${exposed.join(", ")}`
          : `No field among ${SECRET_FIELDS.join(", ")}`),
      name: "toBePublicUser",
      pass: exposed.length === 0,
    };
  },
});
