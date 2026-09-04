import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const DEFAULT_BACK_PORT = 3000;
const DEFAULT_FRONT_PORT = 4000;
const DEFAULT_BACK_DIRECTORY = "../astro-bookings-api";
const DEFAULT_FRONT_DIRECTORY = "../astro-bookings-web";
const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
const CI_WORKERS = 1;

const backPort = process.env["BACK_PORT"] ?? DEFAULT_BACK_PORT;
const frontPort = process.env["PORT"] ?? DEFAULT_FRONT_PORT;
const backDirectory = resolve(process.cwd(), process.env["BACK_DIRECTORY"] ?? DEFAULT_BACK_DIRECTORY);
const frontDirectory = resolve(process.cwd(), process.env["FRONT_DIRECTORY"] ?? DEFAULT_FRONT_DIRECTORY);
const backUrl = `http://localhost:${backPort}`;
const frontUrl = `http://localhost:${frontPort}`;

const resolveRetries = (): number => {
  if (process.env["CI"]) {
    return CI_RETRIES;
  }
  return LOCAL_RETRIES;
};

const resolveWorkers = (): number | undefined => {
  if (process.env["CI"]) {
    return CI_WORKERS;
  }
  return undefined;
};

const workers = resolveWorkers();

export default defineConfig({
  forbidOnly: Boolean(process.env["CI"]),
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
  webServer: [
    {
      command: "bun start",
      cwd: backDirectory,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
      url: `${backUrl}/api/health`,
    },
    {
      command: "bun start",
      cwd: frontDirectory,
      env: { API_BASE_URL: backUrl },
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
      url: frontUrl,
    },
  ],
  ...(workers === undefined ? {} : { workers }),
});
