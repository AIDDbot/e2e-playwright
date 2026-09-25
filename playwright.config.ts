import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runPreflight } from "./tests/support/preflight.js";
import { formatStartupProblems } from "./tests/support/startup-problems.js";

const DEFAULT_BACK_PORT = 3_000;
const DEFAULT_FRONT_PORT = 4_000;
const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_BACK_DIRECTORY = "../back";
const DEFAULT_FRONT_DIRECTORY = "../front";
const CI_RETRIES = 2;
const LOCAL_RETRIES = 0;
const CI_WORKERS = 1;
const PREFLIGHT_EXIT_CODE = 1;
// Extra time so the launcher reports its own, more precise timeout first
const LAUNCHER_GRACE_MS = 5_000;
const launcherPath = resolve(import.meta.dirname, "tests", "support", "start-target.ts");

// Optional local overrides (e.g. sibling archetype folders before scaffolding)
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const resolveNumber = (variable: string, fallback: number): number => {
  const value = Number.parseInt(process.env[variable] ?? "", 10);
  return Number.isNaN(value) ? fallback : value;
};

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

// Workers re-evaluate this file and inherit E2E_CONFIGURED from the main process
const isMainProcess = !process.env["E2E_CONFIGURED"];

// Fail fast with every cause and its fix, instead of Playwright's generic webServer errors.
// A URL that already answers is kept; only the silent targets are launched.
const launch = new Set(
  (process.env["E2E_LAUNCH"] ?? "").split(",").filter((name) => name.length > 0),
);
if (isMainProcess) {
  const result = await runPreflight({
    targets: [
      {
        directory: backDirectory,
        directoryVariable: "BACK_DIRECTORY",
        name: "back",
        port: backPort,
        portVariable: "E2E_BACK_PORT",
        readyUrl: `${backUrl}/api/health`,
      },
      {
        directory: frontDirectory,
        directoryVariable: "FRONT_DIRECTORY",
        name: "front",
        port: frontPort,
        portVariable: "E2E_FRONT_PORT",
        readyUrl: frontUrl,
      },
    ],
  });
  if (result.problems.length > 0) {
    const title = `${result.problems.length} problem(s) found before starting the servers`;
    console.error(formatStartupProblems(title, result.problems));
    process.exit(PREFLIGHT_EXIT_CODE);
  }
  process.env["E2E_LAUNCH"] = result.launch.join(",");
  for (const name of result.launch) {
    launch.add(name);
  }
}

interface FrontManifest {
  author?: string | { email?: string; name?: string; url?: string };
  displayName?: string;
  name?: string;
}

// App title and author come from the front manifest so tests never hard-code them.
// When that folder is absent, the running page <title> is used instead.
const frontManifestPath = resolve(frontDirectory, "package.json");

const readFrontManifest = (): FrontManifest | undefined => {
  if (!existsSync(frontManifestPath)) {
    return undefined;
  }
  return JSON.parse(readFileSync(frontManifestPath, "utf8")) as FrontManifest;
};

const readLiveTitle = async (): Promise<string> => {
  const explicit = process.env["E2E_APP_TITLE"]?.trim();
  if (explicit) {
    return explicit;
  }
  const response = await fetch(frontUrl, { signal: AbortSignal.timeout(2_000) });
  const html = await response.text();
  const title = /<title[^>]*>([^<]*)<\/title>/iu.exec(html)?.[1]?.trim();
  if (!title) {
    throw new Error(
      `The front at ${frontUrl} has no <title>, and ${frontManifestPath} was not found. Set E2E_APP_TITLE or FRONT_DIRECTORY.`,
    );
  }
  return title;
};

const readAppTitle = async (manifest: FrontManifest | undefined): Promise<string> => {
  const title = manifest?.displayName ?? manifest?.name;
  if (title) {
    return title;
  }
  if (!launch.has("front")) {
    return readLiveTitle();
  }
  throw new Error(`No displayName or name found in ${frontManifestPath}.`);
};

// Normalized as an object; the "Name <email> (url)" string form is not parsed
const readAppAuthor = (manifest: FrontManifest | undefined): string => {
  const { author } = manifest ?? {};
  if (typeof author === "string") {
    return JSON.stringify({ name: author });
  }
  return JSON.stringify(author ?? {});
};

const frontManifest = readFrontManifest();

// One throwaway database per run, only when this suite starts the back.
if (isMainProcess) {
  process.env["E2E_CONFIGURED"] = "1";
  if (launch.has("back")) {
    process.env["E2E_DB_PATH"] = join(tmpdir(), `e2e-${Date.now()}-${process.pid}.db`);
  } else {
    console.warn(
      `Using the back already running at ${backUrl}. It keeps its own database.`,
    );
  }
}
const dbPath = process.env["E2E_DB_PATH"] ?? "";

// Publish the API URL, app title and author for worker processes to use
process.env["E2E_BACK_URL"] = backUrl;
process.env["E2E_APP_TITLE"] = await readAppTitle(frontManifest);
process.env["E2E_APP_AUTHOR"] = readAppAuthor(frontManifest);

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
  globalTeardown: "./tests/support/global-teardown.ts",
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
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: frontUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  ...(launch.size === 0
    ? {}
    : {
      webServer: [
        launch.has("back")
          ? {
            command: launchCommand(
              "back",
              `${backUrl}/api/health`,
              "E2E_BACK_PORT",
              "BACK_DIRECTORY",
            ),
            cwd: backDirectory,
            env: { DB_PATH: dbPath, PORT: String(backPort) },
            name: "back",
            timeout: serverTimeoutMs + LAUNCHER_GRACE_MS,
            url: `${backUrl}/api/health`,
          }
          : undefined,
        launch.has("front")
          ? {
            command: launchCommand("front", frontUrl, "E2E_FRONT_PORT", "FRONT_DIRECTORY"),
            cwd: frontDirectory,
            env: { API_BASE_URL: backUrl, PORT: String(frontPort) },
            name: "front",
            timeout: serverTimeoutMs + LAUNCHER_GRACE_MS,
            url: frontUrl,
          }
          : undefined,
      ].filter((server) => server !== undefined),
    }),
  ...(workers === undefined ? {} : { workers }),
});
