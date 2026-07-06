import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT ?? 3000;
const serverUrl = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/reports",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["json", { outputFile: "./e2e/reports/results.json" }]],
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
