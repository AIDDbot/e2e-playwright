import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page.js";

export class NavigationPage extends BasePage {
  readonly navigation: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.navigation = page.getByRole("navigation");
    this.themeToggle = page.getByRole("button", { name: "Toggle theme" });
  }

  async goto(path = "/"): Promise<void> {
    await this.navigate(path);
  }

  appLink(name: string): Locator {
    return this.navigation.getByRole("link", { name });
  }

  homeLink(): Locator {
    return this.navigation.getByRole("link", { exact: true, name: "Home" });
  }

  aboutLink(): Locator {
    return this.navigation.getByRole("link", { exact: true, name: "About" });
  }

  authenticatedUser(name: string, role: string): Locator {
    return this.navigation.getByText(`${name} (${role})`);
  }
}
