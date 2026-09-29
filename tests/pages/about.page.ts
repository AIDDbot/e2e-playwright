import type { Locator, Page } from "@playwright/test";
import { copy } from "../test-data/copy.js";
import { AppPage } from "./app.page.js";

export class AboutPage extends AppPage {
  readonly healthSummary: Locator;
  readonly healthUnavailableMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.healthSummary = page.getByText(copy.about.healthSummary);
    this.healthUnavailableMessage = page.getByText(copy.about.healthUnavailable);
  }

  async goto(): Promise<void> {
    await this.open("/about");
  }

  authorLabel(name: string): Locator {
    return this.main.getByText(`Author: ${name}`);
  }

  authorLink(name: string): Locator {
    return this.main.getByRole("link", { name });
  }
}
