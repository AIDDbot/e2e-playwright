import { spawn, spawnSync } from "node:child_process";
import { formatStartupProblems, type StartupProblem } from "./startup-problems.js";

// Runs "bun start" for one target (Playwright webServer command) and, when it cannot
// become ready, prints what went wrong and how to fix it instead of a generic timeout.
// Usage: bun tests/support/start-target.ts <name> <readyUrl> <timeoutMs> <portVariable> <directoryVariable>

const POLL_INTERVAL_MS = 250;
const PROBE_TIMEOUT_MS = 1_000;
const OUTPUT_TAIL_LINES = 30;
// Same readiness rule as Playwright's webServer url check
const READY_STATUS_MIN = 200;
const READY_STATUS_MAX = 403;

const [name = "target", readyUrl = "", timeoutArg = "", portVariable = "", directoryVariable = ""] =
  process.argv.slice(2);
const timeoutMs = Number.parseInt(timeoutArg, 10);
const directory = process.cwd();
const port = process.env["PORT"] ?? "";

const outputTail: string[] = [];
const recordOutput = (chunk: Buffer): void => {
  outputTail.push(...chunk.toString().split(/\r?\n/).filter(Boolean));
  outputTail.splice(0, Math.max(0, outputTail.length - OUTPUT_TAIL_LINES));
};

let lastProbe = "no answer yet";
let ready = false;
// Held back until ready, so a failure report shows it once, next to the diagnosis
const pendingStderr: Buffer[] = [];

const child = spawn("bun", ["start"], { stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", recordOutput);
child.stderr.on("data", (chunk: Buffer) => {
  recordOutput(chunk);
  if (ready) {
    process.stderr.write(chunk);
  } else {
    pendingStderr.push(chunk);
  }
});

const killChild = (): void => {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  } else {
    child.kill("SIGTERM");
  }
};

const report = (title: string, problem: StartupProblem): void => {
  const output = outputTail.length > 0 ? `Last ${name} output:\n${outputTail.join("\n")}\n` : "";
  process.stderr.write(`\n${formatStartupProblems(title, [problem])}${output}\n`);
};

// Turns known crash messages into a concrete fix
const diagnoseCrash = (code: number | null): Pick<StartupProblem, "area" | "fix"> => {
  const output = outputTail.join("\n");
  if (code === 0) {
    return {
      area: name,
      fix: `"bun start" must keep a server running on PORT, but it finished on its own. Check that ${directoryVariable} points to the ${name} project.`,
    };
  }
  if (/EADDRINUSE|address already in use|port \d+ is (already )?in use/i.test(output)) {
    return {
      area: "port",
      fix: `Free port ${port}, or set ${portVariable} to another port.`,
    };
  }
  if (/EACCES|EPERM|permission denied|access is denied/i.test(output)) {
    return {
      area: "permissions",
      fix: `Grant the access the ${name} needs (see its output), or set ${portVariable} to a port above 1024 outside reserved ranges.`,
    };
  }
  if (/Cannot find (package|module)|MODULE_NOT_FOUND/i.test(output)) {
    return { area: name, fix: `Run "bun install" in ${directory}.` };
  }
  if (/Script not found|missing script/i.test(output)) {
    return { area: name, fix: `Add a "start" script to ${directory}/package.json.` };
  }
  return {
    area: name,
    fix: `Read the ${name} output (lines prefixed [${name}]) and fix the cause in ${directory}.`,
  };
};

child.once("error", (error) => {
  report(`the ${name} could not be launched`, {
    area: "tooling",
    cause: `Running "bun start" in ${directory} failed: ${error.message}`,
    fix: 'Install bun (see README "Quick start") and make sure it is on PATH.',
  });
  process.exit(1);
});

child.once("exit", (code, signal) => {
  const status = signal ? `signal ${signal}` : `code ${code}`;
  if (ready) {
    process.stderr.write(
      `\nE2E: the ${name} stopped unexpectedly (${status}); tests after this point cannot reach it.\n`,
    );
  } else {
    report(`the ${name} did not start`, {
      ...diagnoseCrash(code),
      cause: `"bun start" in ${directory} exited with ${status} before ${readyUrl} answered.`,
    });
  }
  process.exit(code || 1);
});

const probe = async (): Promise<boolean> => {
  try {
    const response = await fetch(readyUrl, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    lastProbe = `HTTP ${response.status}`;
    return response.status >= READY_STATUS_MIN && response.status <= READY_STATUS_MAX;
  } catch (error) {
    // Bun sets the code on the error, Node on its cause
    const failure = error as { code?: string; cause?: { code?: string }; message: string };
    lastProbe = failure.code ?? failure.cause?.code ?? failure.message;
    return false;
  }
};

const timeoutProblem = (): StartupProblem => {
  if (lastProbe.startsWith("HTTP")) {
    return {
      area: name,
      cause: `Port ${port} answers ${readyUrl} with ${lastProbe}, so another app or route is serving it.`,
      fix: `Check that ${directoryVariable} points to the ${name} project and that it serves ${new URL(readyUrl).pathname}.`,
    };
  }
  return {
    area: name,
    cause: `"bun start" in ${directory} is running, but nothing answered ${readyUrl} within ${timeoutMs} ms (last probe: ${lastProbe}).`,
    fix: `Make the ${name} listen on the PORT environment variable (it got PORT=${port}), or raise E2E_SERVER_TIMEOUT_MS if it is only slow to start.`,
  };
};

const waitUntilReady = async (): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probe()) {
      ready = true;
      pendingStderr.forEach((chunk) => process.stderr.write(chunk));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  report(`the ${name} did not become ready`, timeoutProblem());
  child.removeAllListeners("exit");
  killChild();
  process.exit(1);
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    killChild();
    process.exit(0);
  });
}

await waitUntilReady();
