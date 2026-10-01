import type { Locator, Page } from "@playwright/test";
import { AppPage } from "./app.page.ts";

export class ItemPage extends AppPage {
  readonly homeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.homeLink = this.main.getByRole("link", { name: "Back home" });
  }

  async goto(id: string | number): Promise<void> {
    await this.open(`/items/${id}`);
  }
}
