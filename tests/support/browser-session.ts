import type { Page } from "@playwright/test";
import type { AuthSession } from "../clients/auth.client.ts";

// Where the front persists the session (its authStore); keep in sync with the front
const SESSION_STORAGE_KEY = "auth";
const SEEDED_FLAG = "e2e-session-seeded";

/**
 * Signs the page in without the login form, as if the user had logged in before.
 * Seeds only the first document of the tab, so a later logout or rejected token sticks.
 */
export const seedBrowserSession = async (page: Page, session: AuthSession): Promise<void> => {
  await page.addInitScript(
    ({ flag, key, value }) => {
      if (sessionStorage.getItem(flag) !== null) return;
      localStorage.setItem(key, value);
      sessionStorage.setItem(flag, "1");
    },
    { flag: SEEDED_FLAG, key: SESSION_STORAGE_KEY, value: JSON.stringify(session) },
  );
};
