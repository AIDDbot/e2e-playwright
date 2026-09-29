// Values published by playwright.config.ts for worker processes.
// Read at import time, so they also work in test titles and describe-level skips.

interface AppAuthor {
  email?: string;
  name?: string;
  url?: string;
}

export const backUrl = process.env["E2E_BACK_URL"] ?? "";
export const frontUrl = process.env["E2E_FRONT_URL"] ?? "";

// From the front package.json, or the live page <title> (the config throws if neither exists)
export const appTitle = process.env["E2E_APP_TITLE"] ?? "";

// From the front package.json author (empty object when absent)
export const appAuthor = JSON.parse(process.env["E2E_APP_AUTHOR"] ?? "{}") as AppAuthor;
