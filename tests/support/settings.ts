import { resolve } from "node:path";
import type { StartupProblem } from "./startup-problems.js";

const DEFAULT_BACK_PORT = 3_000;
const DEFAULT_FRONT_PORT = 4_000;
const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_BACK_DIRECTORY = "../back";
const DEFAULT_FRONT_DIRECTORY = "../front";
const MAX_PORT = 65_535;

const TARGET_NAMES = ["back", "front"] as const;

export type TargetName = (typeof TARGET_NAMES)[number];

export const isTargetName = (value: string): value is TargetName =>
  (TARGET_NAMES as readonly string[]).includes(value);

export interface TargetSettings {
  name: TargetName;
  directory: string;
  directoryVariable: string;
  port: number;
  portVariable: string;
  /** Base URL the tests use. */
  url: string;
  /** URL that answers once the server is ready. */
  readyUrl: string;
}

export interface E2eSettings {
  back: TargetSettings;
  front: TargetSettings;
  serverTimeoutMs: number;
}

export interface SettingsResult {
  settings: E2eSettings;
  problems: StartupProblem[];
}

// Invalid values are reported, never silently replaced by the defaults
const readWholeNumber = (
  variable: string,
  fallback: number,
  max: number,
  problems: StartupProblem[],
): number => {
  const raw = process.env[variable]?.trim();
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (Number.isInteger(value) && value >= 1 && value <= max) {
    return value;
  }
  problems.push({
    area: "settings",
    cause: `${variable}="${raw}" is not a whole number between 1 and ${max}.`,
    fix: `Correct or remove ${variable} in the shell or in .env.`,
  });
  return fallback;
};

const readTarget = (
  name: TargetName,
  defaults: { directory: string; port: number; readyPath: string },
  problems: StartupProblem[],
): TargetSettings => {
  const prefix = name.toUpperCase();
  const directoryVariable = `${prefix}_DIRECTORY`;
  const portVariable = `E2E_${prefix}_PORT`;
  const port = readWholeNumber(portVariable, defaults.port, MAX_PORT, problems);
  const url = `http://localhost:${port}`;
  return {
    directory: resolve(process.cwd(), process.env[directoryVariable] ?? defaults.directory),
    directoryVariable,
    name,
    port,
    portVariable,
    readyUrl: `${url}${defaults.readyPath}`,
    url,
  };
};

/** Reads the E2E settings from the environment (shell or .env), with every invalid value as a problem. */
export const readSettings = (): SettingsResult => {
  const problems: StartupProblem[] = [];
  const back = readTarget(
    "back",
    { directory: DEFAULT_BACK_DIRECTORY, port: DEFAULT_BACK_PORT, readyPath: "/api/health" },
    problems,
  );
  const front = readTarget(
    "front",
    { directory: DEFAULT_FRONT_DIRECTORY, port: DEFAULT_FRONT_PORT, readyPath: "" },
    problems,
  );
  const serverTimeoutMs = readWholeNumber(
    "E2E_SERVER_TIMEOUT_MS",
    DEFAULT_SERVER_TIMEOUT_MS,
    Number.MAX_SAFE_INTEGER,
    problems,
  );
  if (problems.length === 0 && back.port === front.port) {
    problems.push({
      area: "port",
      cause: `back and front are both set to port ${back.port}.`,
      fix: `Give ${back.portVariable} and ${front.portVariable} different values.`,
    });
  }
  return { problems, settings: { back, front, serverTimeoutMs } };
};
