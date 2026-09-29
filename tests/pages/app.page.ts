import type { Locator, Page } from "@playwright/test";
import { NavigationBar } from "./navigation.bar.js";

/** The layout every route shares; concrete pages extend it with their own content. */
export class AppPage {
  readonly navigation: NavigationBar;
  readonly main: Locator;
  readonly icon: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = new NavigationBar(page);
    this.main = page.getByRole("main");
    this.icon = page.locator('link[rel="icon"]');
  }

  /** Opens any route; concrete pages expose a goto() for their own. */
  async open(path: string): Promise<void> {
    await this.page.goto(path);
  }

  heading(level: 1 | 2 = 1): Locator {
    return this.main.getByRole("heading", { level });
  }

  /** Absolute URL of the favicon, resolved against the current route like the browser does. */
  async iconUrl(): Promise<string> {
    return this.icon.evaluate((link: HTMLLinkElement) => link.href);
  }

  /** A custom property declared only in theme.css; empty when that stylesheet did not apply. */
  async themeToken(): Promise<string> {
    return this.page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--ab-main-max-width").trim(),
    );
  }
}
