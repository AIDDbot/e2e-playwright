import { expect, type Locator, type Page } from "@playwright/test";
import { AppPage } from "./app.page.ts";

export type LoginFields = Readonly<{ email: string; password: string }>;

/** Shared shape of the register and login forms: credentials, submit and error alert. */
export abstract class AuthFormPage<Fields extends LoginFields> extends AppPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;

  private readonly path: string;

  constructor(page: Page, path: string, submitName: string) {
    super(page);
    this.path = path;
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: submitName });
    this.alert = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.open(this.path);
  }

  async fill(fields: Fields): Promise<void> {
    await this.emailInput.fill(fields.email);
    await this.passwordInput.fill(fields.password);
  }

  async submit(fields?: Fields): Promise<void> {
    if (fields) await this.fill(fields);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.alert).toHaveText(message);
  }
}
