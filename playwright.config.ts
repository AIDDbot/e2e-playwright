import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runPreflight } from "./tests/preflight.js";
import { formatStartupProblems } from "./tests/startup-problems.js";

const DEFAULT_BACK_PORT = 3_100;
const DEFAULT_FRONT_PORT = 4_100;
const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_BACK_DIRECTORY = "../back";
const DEFAULT_FRONT_DIRECTORY = "../front";
const DEFAULT_REUSE_SERVER = false;
const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
const CI_WORKERS = 1;
const PREFLIGHT_EXIT_CODE = 1;
// Extra time so the launcher reports its own, more precise timeout first
const LAUNCHER_GRACE_MS = 5_000;
const launcherPath = resolve(import.meta.dirname, "tests", "start-target.ts");

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
// Workers re-evaluate this file and inherit E2E_DB_PATH from the main process
const isMainProcess = !process.env["E2E_DB_PATH"];

// Fail fast with every cause and its fix, instead of Playwright's generic webServer errors
if (isMainProcess) {
  const problems = await runPreflight({
    reuseExistingServer,
    targets: [
      {
        directory: backDirectory,
        directoryVariable: "BACK_DIRECTORY",
        name: "back",
        port: backPort,
        portVariable: "E2E_BACK_PORT",
      },
      {
        directory: frontDirectory,
        directoryVariable: "FRONT_DIRECTORY",
        name: "front",
        port: frontPort,
        portVariable: "E2E_FRONT_PORT",
      },
    ],
  });
  if (problems.length > 0) {
    const title = `${problems.length} problem(s) found before starting the servers`;
    console.error(formatStartupProblems(title, problems));
    process.exit(PREFLIGHT_EXIT_CODE);
  }
}

interface FrontManifest {
  author?: string | { email?: string; name?: string; url?: string };
  displayName?: string;
  name?: string;
}

// App title and author come from the front manifest so tests never hard-code them
const frontManifestPath = resolve(frontDirectory, "package.json");
const frontManifest = JSON.parse(readFileSync(frontManifestPath, "utf8")) as FrontManifest;

const readAppTitle = (): string => {
  const title = frontManifest.displayName ?? frontManifest.name;
  if (!title) {
    throw new Error(`No displayName or name found in ${frontManifestPath}.`);
  }
  return title;
};

// Normalized as an object; the "Name <email> (url)" string form is not parsed
const readAppAuthor = (): string => {
  const { author } = frontManifest;
  if (typeof author === "string") {
    return JSON.stringify({ name: author });
  }
  return JSON.stringify(author ?? {});
};

// One throwaway database per run
if (isMainProcess) {
  process.env["E2E_DB_PATH"] = join(tmpdir(), `e2e-${Date.now()}-${process.pid}.db`);
}
const dbPath = process.env["E2E_DB_PATH"] ?? "";
if (isMainProcess && reuseExistingServer) {
  console.warn(
    "E2E_REUSE_SERVER is on: an already running back keeps its own database, not the isolated one.",
  );
}

const backUrl = `http://localhost:${backPort}`;
const frontUrl = `http://localhost:${frontPort}`;

// Publish the API URL, app title and author for worker processes to use
process.env["E2E_BACK_URL"] = backUrl;
process.env["E2E_APP_TITLE"] = readAppTitle();
process.env["E2E_APP_AUTHOR"] = readAppAuthor();

// Runs "bun start" through the launcher, which explains crashes and timeouts
const launchCommand = (
  name: string,
  readyUrl: string,
  portVariable: string,
  directoryVariable: string,
): string =>
  `bun "${launcherPath}" ${name} ${readyUrl} ${serverTimeoutMs} ${portVariable} ${directoryVariable}`;

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
  globalTeardown: "./tests/global-teardown.ts",
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
      command: launchCommand("back", `${backUrl}/api/health`, "E2E_BACK_PORT", "BACK_DIRECTORY"),
      cwd: backDirectory,
      env: { DB_PATH: dbPath, PORT: String(backPort) },
      name: "back",
      reuseExistingServer,
      timeout: serverTimeoutMs + LAUNCHER_GRACE_MS,
      url: `${backUrl}/api/health`,
    },
    {
      command: launchCommand("front", frontUrl, "E2E_FRONT_PORT", "FRONT_DIRECTORY"),
      cwd: frontDirectory,
      env: { API_BASE_URL: backUrl, PORT: String(frontPort) },
      name: "front",
      reuseExistingServer,
      timeout: serverTimeoutMs + LAUNCHER_GRACE_MS,
      url: frontUrl,
    },
  ],
  ...(workers === undefined ? {} : { workers }),
});
