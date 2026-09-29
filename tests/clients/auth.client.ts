import { type APIRequestContext, type APIResponse, expect } from "@playwright/test";

const REGISTER_PATH = "/api/auth/register";
const LOGIN_PATH = "/api/auth/login";
const ME_PATH = "/api/auth/me";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export type NewUser = Readonly<{ email: string; name: string; password: string }>;

// Loose bodies on purpose: contract tests also send invalid payloads
type RequestBody = Readonly<Record<string, unknown>>;

/** Auth API calls against the back; the request context carries the back base URL. */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  register(body: RequestBody): Promise<APIResponse> {
    return this.request.post(REGISTER_PATH, { data: body });
  }

  login(body: RequestBody): Promise<APIResponse> {
    return this.request.post(LOGIN_PATH, { data: body });
  }

  me(authorization?: string): Promise<APIResponse> {
    return this.request.get(ME_PATH, {
      headers: authorization === undefined ? {} : { Authorization: authorization },
    });
  }

  /** Arranges a registered user for tests whose subject is something else. */
  async registerUser(user: NewUser): Promise<AuthUser> {
    const response = await this.register(user);
    expect(response.status(), `POST ${REGISTER_PATH}`).toBe(201);
    return (await response.json()) as AuthUser;
  }

  /** Arranges a logged-in session for a registered user. */
  async loginUser(user: Pick<NewUser, "email" | "password">): Promise<AuthSession> {
    const response = await this.login(user);
    expect(response.status(), `POST ${LOGIN_PATH}`).toBe(200);
    return (await response.json()) as AuthSession;
  }
}
