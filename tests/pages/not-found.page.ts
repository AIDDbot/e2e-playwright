import type { Locator, Page } from "@playwright/test";
import { AppPage } from "./app.page.js";

export class NotFoundPage extends AppPage {
  readonly homeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.homeLink = this.main.getByRole("link", { name: "Back home" });
  }

  async goto(path: string): Promise<void> {
    await this.open(path);
  }

  requestedPath(path: string): Locator {
    return this.main.getByText(path);
  }
}
