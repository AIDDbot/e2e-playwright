import type { Locator, Page } from "@playwright/test";
import { AuthFormPage, type LoginFields } from "./auth-form.page.js";

export type RegisterFields = LoginFields & Readonly<{ name: string }>;

export class RegisterPage extends AuthFormPage<RegisterFields> {
  readonly nameInput: Locator;
  /** Any control a user could pick a role with; the form must offer none. */
  readonly roleInputs: Locator;

  constructor(page: Page) {
    super(page, "/register", "Register");
    this.nameInput = page.getByRole("textbox", { name: "Name" });
    this.roleInputs = page.getByRole("combobox", { name: "Role" }).or(page.getByLabel("Role"));
  }

  override async fill(fields: RegisterFields): Promise<void> {
    await super.fill(fields);
    await this.nameInput.fill(fields.name);
  }
}
