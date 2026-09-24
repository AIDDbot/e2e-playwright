import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page.js";

export class ContentPage extends BasePage {
  readonly main: Locator;
  readonly trustMessage: Locator;
  readonly archetypesHeading: Locator;
  readonly itemLinks: Locator;
  readonly healthSummary: Locator;
  readonly healthUnavailableMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.main = page.getByRole("main");
    this.trustMessage = this.main.getByText(/trust/i);
    this.archetypesHeading = this.main.getByRole("heading", { level: 2, name: "Archetypes" });
    this.itemLinks = this.main.getByRole("listitem").getByRole("link");
    this.healthSummary = page.getByText(/Server up for \d+s — \d+ run\(s\) recorded\./);
    this.healthUnavailableMessage = page.getByText("Health unavailable.");
  }

  async goto(path: string): Promise<void> {
    await this.navigate(path);
  }

  heading(level: 1 | 2 = 1): Locator {
    return this.main.getByRole("heading", { level });
  }

  homeLink(): Locator {
    return this.main.getByRole("link", { name: "Back home" });
  }

  authorLabel(name: string): Locator {
    return this.main.getByText(`Author: ${name}`);
  }

  authorLink(name: string): Locator {
    return this.main.getByRole("link", { name });
  }
}
