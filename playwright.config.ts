import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT ?? 3000;
const serverUrl = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./reports/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["json", { outputFile: "./reports/results.json" }],
    ["html", { outputFolder: "./reports/html", open: "never" }],
  ],
  use: {
    baseURL: serverUrl,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "nub run start",
    url: serverUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
