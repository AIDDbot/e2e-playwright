import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readAppInfo } from "./tests/support/app-info.js";
import { runPreflight } from "./tests/support/preflight.js";
import { readSettings, type TargetName, type TargetSettings } from "./tests/support/settings.js";
import { formatStartupProblems } from "./tests/support/startup-problems.js";

const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
// Tests share one database and create their own unique data, so CI can run them in parallel
const CI_WORKERS = "50%";
const PREFLIGHT_EXIT_CODE = 1;
// Extra time so the launcher reports its own, more precise timeout first
const LAUNCHER_GRACE_MS = 5_000;
const launcherPath = resolve(import.meta.dirname, "tests", "support", "start-target.ts");
const isCI = Boolean(process.env["CI"]);

// Optional local overrides (e.g. sibling archetype folders before scaffolding)
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const { problems: settingsProblems, settings } = readSettings();
const { back, front, serverTimeoutMs } = settings;

// Workers re-evaluate this file and inherit every E2E_* variable from the main process
const isMainProcess = !process.env["E2E_CONFIGURED"];

if (isMainProcess) {
  // Fail fast with every cause and its fix, instead of Playwright's generic webServer errors.
  // A URL that already answers is kept; only the silent targets are launched.
  const preflight = await runPreflight({ settingsProblems, targets: [back, front] });
  if (preflight.problems.length > 0) {
    const title = `${preflight.problems.length} problem(s) found before starting the servers`;
    console.error(formatStartupProblems(title, preflight.problems));
    process.exit(PREFLIGHT_EXIT_CODE);
  }
  const app = await readAppInfo(front, preflight.launch.includes("front"));

  // One throwaway database per run, only when this suite starts the back
  if (preflight.launch.includes("back")) {
    process.env["E2E_DB_PATH"] = join(tmpdir(), `e2e-${Date.now()}-${process.pid}.db`);
  } else {
    console.warn(`Using the back already running at ${back.url}. It keeps its own database.`);
  }

  // Published for the workers (read in tests/support/run-context.ts)
  process.env["E2E_CONFIGURED"] = "1";
  process.env["E2E_LAUNCH"] = preflight.launch.join(",");
  process.env["E2E_BACK_URL"] = back.url;
  process.env["E2E_FRONT_URL"] = front.url;
  process.env["E2E_APP_TITLE"] = app.title;
  process.env["E2E_APP_AUTHOR"] = app.author;
}

const launch = new Set((process.env["E2E_LAUNCH"] ?? "").split(",") as TargetName[]);

// Runs "bun start" through the launcher, which explains crashes and timeouts
const webServerFor = (target: TargetSettings, env: Record<string, string>) => ({
  command: `bun "${launcherPath}" ${target.name} ${target.readyUrl} ${serverTimeoutMs} ${target.portVariable} ${target.directoryVariable}`,
  cwd: target.directory,
  env: { ...env, PORT: String(target.port) },
  name: target.name,
  timeout: serverTimeoutMs + LAUNCHER_GRACE_MS,
  url: target.readyUrl,
});

const webServer = [
  launch.has("back")
    ? webServerFor(back, { DB_PATH: process.env["E2E_DB_PATH"] ?? "" })
    : undefined,
  launch.has("front") ? webServerFor(front, { API_BASE_URL: back.url }) : undefined,
].filter((server) => server !== undefined);

export default defineConfig({
  forbidOnly: isCI,
  fullyParallel: true,
  globalTeardown: "./tests/support/global-teardown.ts",
  outputDir: "./reports/test-results",
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
      use: { baseURL: back.url },
    },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: front.url },
    },
  ],
  reporter: [
    // A person sees one live line; agents and CI read a compact dot line plus full failure details
    process.stdout.isTTY ? ["line"] : ["dot"],
    ["json", { outputFile: "./reports/results.json" }],
    ["html", { open: "never", outputFolder: "./reports/html" }],
  ],
  retries: isCI ? CI_RETRIES : LOCAL_RETRIES,
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  use: {
    screenshot: "only-on-failure",
    // Local runs have no retries, so keep the trace of every failure there
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    video: "retain-on-failure",
  },
  ...(webServer.length === 0 ? {} : { webServer }),
  ...(isCI ? { workers: CI_WORKERS } : {}),
});
