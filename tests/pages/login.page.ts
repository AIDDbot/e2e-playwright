import type { Locator, Page } from "@playwright/test";
import { copy } from "../test-data/copy.js";
import { AuthFormPage, type LoginFields } from "./auth-form.page.js";

export class LoginPage extends AuthFormPage<LoginFields> {
  readonly registrationSuccessMessage: Locator;

  constructor(page: Page) {
    super(page, "/login", "Log in");
    this.registrationSuccessMessage = page.getByText(copy.auth.registrationSuccess);
  }
}
