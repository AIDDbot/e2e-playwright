import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page.js";

type RegisterFields = Readonly<{ email: string; name: string; password: string }>;
type LoginFields = Readonly<{ email: string; password: string }>;

export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.nameInput = page.getByRole("textbox", { name: "Name" });
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Register" });
    this.alert = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.navigate("/register");
  }

  async fill(fields: RegisterFields): Promise<void> {
    await this.emailInput.fill(fields.email);
    await this.nameInput.fill(fields.name);
    await this.passwordInput.fill(fields.password);
  }

  async submit(fields?: RegisterFields): Promise<void> {
    if (fields) await this.fill(fields);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.alert).toHaveText(message);
  }
}

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Log in" });
    this.alert = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.navigate("/login");
  }

  async fill(fields: LoginFields): Promise<void> {
    await this.emailInput.fill(fields.email);
    await this.passwordInput.fill(fields.password);
  }

  async submit(fields?: LoginFields): Promise<void> {
    if (fields) await this.fill(fields);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.alert).toHaveText(message);
  }

  registrationSuccessMessage(message: string): Locator {
    return this.page.getByText(message);
  }
}
