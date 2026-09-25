# [e2e-playwright](https://github.com/AIDDbot/e2e-playwright)

End-to-end Playwright suite for an api and web application.

## Quick start

> [!IMPORTANT]
> This project uses `bun` as a package manager and runner.

1. Install bun: the fastest tooling manager for Node.js projects.

```bash
# Install Bun
# (Windows PowerShell)
powershell -c "irm bun.com/install.ps1 | iex"
# (macOS/Linux)
curl -fsSL https://bun.com/install | bash -s
# Verify installation
bun --version
# Upgrade Bun to the latest stable version
bun upgrade --stable
```

2. Install dependencies and run the tests

```bash
bun install
bun lint            # type-checks the project (tsc --noEmit)
bun format          # formats the code (oxfmt)
bun test:e2e        # runs the tests
bun test:e2e:report # opens the last HTML report
```

## Project structure

```text
tests/
  api/      # API contract tests (*.spec.ts)
  e2e/      # user journeys grouped by feature (*.spec.ts)
  fixtures/ # static JSON data and TypeScript-generated values
  pages/    # page objects shared by UI tests
  support/  # server startup checks, launcher and Playwright teardown
reports/    # HTML and JSON reports (generated)
```

## Target applications

> [!IMPORTANT]
> This project is meant to be used alongside the sibling API and web applications.

Backend with Express: https://github.com/AIDDbot/back-express
Frontend with Standard web: https://github.com/AIDDbot/front-standard

`bun test:e2e` uses whatever is already listening on the API and web ports. It
starts a sibling project only when that port is silent and the folder is there
(`../back` and `../front` in the scaffold layout below). If a server is already
open somewhere else, its folder is not required. The app title then comes from
the page `<title>` when the front `package.json` is not available.

```text
back/
front/
e2e/
```

For a different layout or ports, set these environment variables (or put them in
a local `.env`, see `.env.example`): `BACK_DIRECTORY`, `FRONT_DIRECTORY`,
`E2E_BACK_PORT` (default `3000`), and `E2E_FRONT_PORT` (default `4000`).
Shell variables take precedence over `.env`.

When developing the archetypes side by side (before scaffolding), copy
`.env.example` to `.env` so the suite targets `../back-express` and
`../front-standard`.

If a port is taken by something that does not answer the expected URL, the suite
stops and names that process. A server that already answers is left running.

For custom server startup timeout, set `E2E_SERVER_TIMEOUT_MS` (default `15000`
ms; measured cold start is ~364 ms for back and ~363 ms for front on Windows).

## Startup errors

Before starting the servers, the suite checks settings, target folders and
`package.json` files (a `start` script, installed dependencies), `bun`, the
Chromium browser, free ports and write access. Each server is then started
through `tests/support/start-target.ts`, which explains a crash or a timeout (for
example, nothing listening on `PORT`, or another app answering the health URL).

Every problem is printed in the same shape, so a person or an agent can search
the output for `E2E startup failed:` and apply the fix:

```text
E2E startup failed: 1 problem(s) found before starting the servers

1. [port] Port 4000 (front) is already in use by PID 28148 (bun.exe).
   Fix: Stop that process ("taskkill /PID 28148 /F"), or set E2E_FRONT_PORT to a free port. A front you want to keep must already answer http://localhost:4000.
```

The area tag is one of `settings`, `back`, `front`, `tooling`, `port` or
`permissions`. The run exits with code `1`, and no tests run.

## Test data

Each run starts the back with an empty database: a fresh `e2e-<timestamp>-<pid>.db`
in the OS temp directory, passed as `DB_PATH`. The back's own `data/demo.db`
is never touched, and the file (with its `-wal`/`-shm` companions) is deleted
when the run ends.

Because tests run in parallel and share that database within a run:

- Each test creates the data it needs, with unique identifiers (e.g. a
  `crypto.randomUUID()` suffix), and never relies on data left by another test.
- Tests must not depend on execution order.
- Assert on the records the test created, never on global totals or counts.

When the back is already running, it keeps its own database, so isolation does
not apply; the suite prints a warning.

Directory values may be relative to the E2E directory or absolute.

The expected app title is read from `displayName` (or `name`) in the front
`package.json`, so the tests follow the scaffolded app without edits.

---

**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
