import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const DEFAULT_BACK_PORT = 3_000;
const DEFAULT_FRONT_PORT = 4_000;
const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_BACK_DIRECTORY = "../back";
const DEFAULT_FRONT_DIRECTORY = "../front";
const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
const CI_WORKERS = 1;

const resolveNumber = (variable: string, fallback: number): number => {
  const value = Number.parseInt(process.env[variable] ?? "", 10);
  return Number.isNaN(value) ? fallback : value;
};

const reuseExistingServer = Boolean(process.env["E2E_REUSE_SERVER"]);
const backPort = resolveNumber("E2E_BACK_PORT", DEFAULT_BACK_PORT);
const frontPort = resolveNumber("E2E_FRONT_PORT", DEFAULT_FRONT_PORT);
const serverTimeoutMs = resolveNumber("E2E_SERVER_TIMEOUT_MS", DEFAULT_SERVER_TIMEOUT_MS);
const backDirectory = resolve(
  process.cwd(),
  process.env["BACK_DIRECTORY"] ?? DEFAULT_BACK_DIRECTORY,
);
const frontDirectory = resolve(
  process.cwd(),
  process.env["FRONT_DIRECTORY"] ?? DEFAULT_FRONT_DIRECTORY,
);
const backUrl = `http://localhost:${backPort}`;
const frontUrl = `http://localhost:${frontPort}`;

// Publish the API URL for worker processes to use
process.env["E2E_BACK_URL"] = backUrl;

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
      env: { PORT: String(backPort) },
      reuseExistingServer,
      timeout: serverTimeoutMs,
      url: `${backUrl}/api/health`,
    },
    {
      command: "bun start",
      cwd: frontDirectory,
      env: { API_BASE_URL: backUrl, PORT: String(frontPort) },
      reuseExistingServer,
      timeout: serverTimeoutMs,
      url: frontUrl,
    },
  ],
  ...(workers === undefined ? {} : { workers }),
});
