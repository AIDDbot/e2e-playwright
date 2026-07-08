import { defineConfig, devices } from "@playwright/test";

const DEFAULT_FRONT_PORT = 4000;
const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
const CI_WORKERS = 1;

const frontPort = process.env.PORT ?? DEFAULT_FRONT_PORT;
const frontUrl = `http://localhost:${frontPort}`;

const resolveRetries = (): number => {
  if (process.env.CI) {
    return CI_RETRIES;
  }
  return LOCAL_RETRIES;
};

const resolveWorkers = (): number | undefined => {
  if (process.env.CI) {
    return CI_WORKERS;
  }
  return undefined;
};

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: "./reports/test-results",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [
    ["json", { outputFile: "./reports/results.json" }],
    ["html", { open: "never", outputFolder: "./reports/html" }],
  ],
  retries: resolveRetries(),
  testDir: "./tests",
  use: {
    baseURL: frontUrl,
    trace: "on-first-retry",
  },
  // WebServer: [
  //   {
  //     Command: "nub run start",
  //     Cwd: "../back",
  //     ReuseExistingServer: !process.env.CI,
  //     Timeout: 120_000,
  //     Url: `${apiUrl}/api/health`,
  //   },
  //   {
  //     Command: "nub run start",
  //     Cwd: "../front",
  //     ReuseExistingServer: !process.env.CI,
  //     Timeout: 120_000,
  //     Url: frontUrl,
  //   },
  // ],
  workers: resolveWorkers(),
});
