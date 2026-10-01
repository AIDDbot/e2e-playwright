import type { Locator, Page } from "@playwright/test";
import { copy } from "../test-data/copy.ts";
import { AppPage } from "./app.page.ts";

export class HomePage extends AppPage {
  readonly trustMessage: Locator;
  readonly archetypesHeading: Locator;
  readonly itemLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.trustMessage = this.main.getByText(copy.home.trustMessage);
    this.archetypesHeading = this.main.getByRole("heading", {
      level: 2,
      name: copy.home.archetypesHeading,
    });
    this.itemLinks = this.main.getByRole("listitem").getByRole("link");
  }

  async goto(): Promise<void> {
    await this.open("/");
  }
}
