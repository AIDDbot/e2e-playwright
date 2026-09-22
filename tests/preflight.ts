import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StartupProblem } from "./startup-problems.js";

export interface TargetSettings {
  name: string;
  directory: string;
  directoryVariable: string;
  port: number;
  portVariable: string;
}

export interface PreflightSettings {
  reuseExistingServer: boolean;
  targets: TargetSettings[];
}

const PORT_PROBE_TIMEOUT_MS = 500;
const MAX_PORT = 65_535;
const NUMBER_SETTINGS = ["E2E_BACK_PORT", "E2E_FRONT_PORT", "E2E_SERVER_TIMEOUT_MS"];
const PORT_SETTINGS = new Set(["E2E_BACK_PORT", "E2E_FRONT_PORT"]);
const BOOLEAN_VALUES = new Set(["", "0", "1", "false", "true"]);

// Invalid values would otherwise fall back to the defaults without notice
const checkSettings = (): StartupProblem[] => {
  const problems: StartupProblem[] = [];
  for (const variable of NUMBER_SETTINGS) {
    const raw = process.env[variable]?.trim();
    if (!raw) {
      continue;
    }
    const value = Number(raw);
    const limit = PORT_SETTINGS.has(variable) ? MAX_PORT : Number.MAX_SAFE_INTEGER;
    if (!Number.isInteger(value) || value < 1 || value > limit) {
      problems.push({
        area: "settings",
        cause: `${variable}="${raw}" is not a whole number between 1 and ${limit}.`,
        fix: `Correct or remove ${variable} in the shell or in .env.`,
      });
    }
  }
  const reuse = process.env["E2E_REUSE_SERVER"]?.trim().toLowerCase() ?? "";
  if (!BOOLEAN_VALUES.has(reuse)) {
    problems.push({
      area: "settings",
      cause: `E2E_REUSE_SERVER="${process.env["E2E_REUSE_SERVER"]}" is not one of 1, 0, true, false.`,
      fix: "Correct or remove E2E_REUSE_SERVER in the shell or in .env.",
    });
  }
  return problems;
};

const readManifest = (target: TargetSettings): Record<string, unknown> | StartupProblem => {
  const manifestPath = join(target.directory, "package.json");
  if (!existsSync(manifestPath)) {
    return {
      area: target.name,
      cause: `No package.json in ${target.directory}.`,
      fix: `Point ${target.directoryVariable} to the ${target.name} project folder.`,
    };
  }
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  } catch (error) {
    return {
      area: target.name,
      cause: `${manifestPath} cannot be read as JSON: ${(error as Error).message}`,
      fix: "Fix the file syntax or its read permissions.",
    };
  }
};

const checkTarget = (target: TargetSettings): StartupProblem[] => {
  if (!existsSync(target.directory)) {
    return [
      {
        area: target.name,
        cause: `Target directory not found: ${target.directory}.`,
        fix: `Set ${target.directoryVariable} (shell or .env) to the ${target.name} folder, relative to this directory or absolute.`,
      },
    ];
  }
  const manifest = readManifest(target);
  if ("fix" in manifest) {
    return [manifest as StartupProblem];
  }
  const problems: StartupProblem[] = [];
  const scripts = (manifest["scripts"] ?? {}) as Record<string, unknown>;
  if (typeof scripts["start"] !== "string") {
    problems.push({
      area: target.name,
      cause: `${target.directory}/package.json has no "start" script; the suite runs "bun start" there.`,
      fix: `Add a "start" script that serves the ${target.name} on the PORT environment variable.`,
    });
  }
  const dependencies = {
    ...(manifest["dependencies"] as object),
    ...(manifest["devDependencies"] as object),
  };
  if (Object.keys(dependencies).length > 0 && !existsSync(join(target.directory, "node_modules"))) {
    problems.push({
      area: target.name,
      cause: `Dependencies of the ${target.name} are not installed (no node_modules in ${target.directory}).`,
      fix: `Run "bun install" in ${target.directory}.`,
    });
  }
  if (target.name === "front" && !manifest["displayName"] && !manifest["name"]) {
    problems.push({
      area: "front",
      cause: `${target.directory}/package.json has neither "displayName" nor "name"; the tests read the app title from it.`,
      fix: 'Add a "displayName" (or "name") to the front package.json.',
    });
  }
  return problems;
};

const isPortAnswering = (port: number, host: string): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = connect({ host, port, timeout: PORT_PROBE_TIMEOUT_MS });
    const finish = (answering: boolean): void => {
      socket.destroy();
      resolve(answering);
    };
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

// Resolves with the bind error code, or undefined when the port can be taken
const tryBind = (port: number): Promise<string | undefined> =>
  new Promise((resolve) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message));
    server.listen(port, () => server.close(() => resolve(undefined)));
  });

interface PortOwner {
  pid: string;
  program: string;
}

// Best effort only: the owner is a hint, never a reason to fail
const findPortOwner = (port: number): PortOwner | undefined => {
  try {
    if (process.platform === "win32") {
      const netstat =
        spawnSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" }).stdout ?? "";
      const line = netstat
        .split(/\r?\n/)
        .find((row) => /LISTENING/i.test(row) && new RegExp(`:${port}\\s`).test(row));
      const pid = line?.trim().split(/\s+/).pop();
      if (!pid) {
        return undefined;
      }
      const tasklist = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
        encoding: "utf8",
      }).stdout;
      return { pid, program: tasklist?.split(",")[0]?.replaceAll('"', "").trim() ?? "" };
    }
    const lsof = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpc"], {
      encoding: "utf8",
    }).stdout;
    const pid = /^p(\d+)/m.exec(lsof ?? "")?.[1];
    return pid ? { pid, program: /^c(.+)/m.exec(lsof ?? "")?.[1] ?? "" } : undefined;
  } catch {
    return undefined;
  }
};

const describeBusyPort = (target: TargetSettings): StartupProblem => {
  const owner = findPortOwner(target.port);
  const program = owner?.program ? ` (${owner.program})` : "";
  const holder = owner ? ` by PID ${owner.pid}${program}` : "";
  const pid = owner?.pid ?? "<pid>";
  const kill = process.platform === "win32" ? `taskkill /PID ${pid} /F` : `kill ${pid}`;
  return {
    area: "port",
    cause: `Port ${target.port} (${target.name}) is already in use${holder}.`,
    fix: `Stop that process ("${kill}"), set ${target.portVariable} to a free port, or set E2E_REUSE_SERVER=1 if it is the ${target.name} you want to test.`,
  };
};

const checkPort = async (target: TargetSettings): Promise<StartupProblem[]> => {
  const answering =
    (await isPortAnswering(target.port, "127.0.0.1")) ||
    (await isPortAnswering(target.port, "::1"));
  const bindError = answering ? "EADDRINUSE" : await tryBind(target.port);
  if (bindError === undefined) {
    return [];
  }
  if (bindError === "EADDRINUSE") {
    return [describeBusyPort(target)];
  }
  const reserved =
    process.platform === "win32"
      ? ' Windows may reserve it (check "netsh interface ipv4 show excludedportrange protocol=tcp").'
      : " Ports below 1024 need elevated privileges.";
  return [
    {
      area: "port",
      cause: `Port ${target.port} (${target.name}) cannot be opened: ${bindError}.${reserved}`,
      fix: `Set ${target.portVariable} to another port (e.g. above 1024 and outside reserved ranges).`,
    },
  ];
};

const checkPorts = async (settings: PreflightSettings): Promise<StartupProblem[]> => {
  const [first, second] = settings.targets;
  if (first && second && first.port === second.port) {
    return [
      {
        area: "port",
        cause: `${first.name} and ${second.name} are both set to port ${first.port}.`,
        fix: `Give ${first.portVariable} and ${second.portVariable} different values.`,
      },
    ];
  }
  // A reused server is expected to be listening already
  if (settings.reuseExistingServer) {
    return [];
  }
  const results = await Promise.all(settings.targets.map(checkPort));
  return results.flat();
};

const checkCommand = (command: string, fix: string): StartupProblem[] => {
  // A single command string lets the shell find .exe and .cmd shims alike
  const result = spawnSync(`${command} --version`, { encoding: "utf8", shell: true });
  if (result.status === 0) {
    return [];
  }
  return [
    {
      area: "tooling",
      cause: `"${command}" is not available on PATH; the servers are started with it.`,
      fix,
    },
  ];
};

const checkBrowser = (): StartupProblem[] => {
  const executable = chromium.executablePath();
  if (existsSync(executable)) {
    return [];
  }
  return [
    {
      area: "tooling",
      cause: `The Playwright Chromium browser is not installed (expected ${executable}).`,
      fix: 'Run "bunx playwright install chromium" in this directory.',
    },
  ];
};

const checkWritable = (): StartupProblem[] => {
  const problems: StartupProblem[] = [];
  try {
    rmSync(mkdtempSync(join(tmpdir(), "e2e-preflight-")), { force: true, recursive: true });
  } catch (error) {
    problems.push({
      area: "permissions",
      cause: `Cannot write to the temp directory ${tmpdir()}, where the per-run database lives: ${(error as Error).message}`,
      fix: "Grant write access to it, or point TMPDIR (TEMP on Windows) to a writable folder.",
    });
  }
  try {
    accessSync(process.cwd(), constants.W_OK);
  } catch {
    problems.push({
      area: "permissions",
      cause: `Cannot write to ${process.cwd()}, where the reports folder is created.`,
      fix: "Grant write access to this directory.",
    });
  }
  return problems;
};

// Checks everything the web servers need before Playwright starts them
export const runPreflight = async (settings: PreflightSettings): Promise<StartupProblem[]> => {
  const settingsProblems = checkSettings();
  const targetProblems = settings.targets.flatMap(checkTarget);
  const toolingProblems = [
    ...checkCommand("bun", 'Install bun (see README "Quick start") and reopen the terminal.'),
    ...checkBrowser(),
  ];
  const portProblems = settingsProblems.length > 0 ? [] : await checkPorts(settings);
  return [
    ...settingsProblems,
    ...targetProblems,
    ...toolingProblems,
    ...portProblems,
    ...checkWritable(),
  ];
};
