import type { Locator, Page } from "@playwright/test";

/** The navigation bar every route shares: app link, menu and theme toggle. */
export class NavigationBar {
  readonly root: Locator;
  readonly homeLink: Locator;
  readonly aboutLink: Locator;
  readonly themeToggle: Locator;
  /** No accessible handle for the document theme: it lives in <html data-theme>. */
  readonly themeRoot: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("navigation");
    this.homeLink = this.root.getByRole("link", { exact: true, name: "Home" });
    this.aboutLink = this.root.getByRole("link", { exact: true, name: "About" });
    this.themeToggle = page.getByRole("button", { name: "Toggle theme" });
    this.themeRoot = page.locator("html");
  }

  appLink(appTitle: string): Locator {
    return this.root.getByRole("link", { name: appTitle });
  }

  authenticatedUser(name: string, role: string): Locator {
    return this.root.getByText(`${name} (${role})`);
  }

  /** The current theme, or "" when the document has none yet. */
  async theme(): Promise<string> {
    return (await this.themeRoot.getAttribute("data-theme")) ?? "";
  }

  /** The theme a toggle switches to from the current one. */
  async otherTheme(): Promise<string> {
    return (await this.theme()) === "dark" ? "light" : "dark";
  }
}
