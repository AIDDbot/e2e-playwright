import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_BACK_PORT = 3_100;
const DEFAULT_FRONT_PORT = 4_100;
const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_BACK_DIRECTORY = "../back";
const DEFAULT_FRONT_DIRECTORY = "../front";
const DEFAULT_REUSE_SERVER = false;
const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
const CI_WORKERS = 1;

// Optional local overrides (e.g. sibling archetype folders before scaffolding)
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const resolveNumber = (variable: string, fallback: number): number => {
  const value = Number.parseInt(process.env[variable] ?? "", 10);
  return Number.isNaN(value) ? fallback : value;
};

const resolveBoolean = (variable: string, fallback: boolean): boolean => {
  const value = process.env[variable]?.trim().toLowerCase();
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return fallback;
};

const reuseExistingServer = resolveBoolean("E2E_REUSE_SERVER", DEFAULT_REUSE_SERVER);
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
// Fail fast: on Windows a missing cwd surfaces as a misleading "spawn cmd.exe ENOENT"
for (const [variable, directory] of [
  ["BACK_DIRECTORY", backDirectory],
  ["FRONT_DIRECTORY", frontDirectory],
] as const) {
  if (!existsSync(directory)) {
    throw new Error(`Target directory not found: ${directory}. Set ${variable} to fix it.`);
  }
}

// The app title comes from the front manifest so tests never hard-code it
const readAppTitle = (directory: string): string => {
  const manifestPath = resolve(directory, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    displayName?: string;
    name?: string;
  };
  const title = manifest.displayName ?? manifest.name;
  if (!title) {
    throw new Error(`No displayName or name found in ${manifestPath}.`);
  }
  return title;
};

const backUrl = `http://localhost:${backPort}`;
const frontUrl = `http://localhost:${frontPort}`;

// Publish the API URL and app title for worker processes to use
process.env["E2E_BACK_URL"] = backUrl;
process.env["E2E_APP_TITLE"] = readAppTitle(frontDirectory);

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
  testMatch: "**/*.test.ts",
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
