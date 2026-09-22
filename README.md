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
tests/      # one suite per feature; only *.test.ts files are run
reports/    # HTML and JSON reports (generated)
```

## Target applications

`bun test:e2e` starts the sibling API and web applications automatically. Run
it from the `e2e` directory in the default scaffold layout:

```text
back/
front/
e2e/
```

For a different layout or ports, set these environment variables (or put them in
a local `.env`, see `.env.example`): `BACK_DIRECTORY`, `FRONT_DIRECTORY`,
`E2E_BACK_PORT` (default `3100`), and `E2E_FRONT_PORT` (default `4100`).
Shell variables take precedence over `.env`.

When developing the archetypes side by side (before scaffolding), copy
`.env.example` to `.env` so the suite targets `../back-express` and
`../front-standard`.

The suite will fail immediately if a target port is already occupied by another
process. To reuse an existing server instead, set `E2E_REUSE_SERVER=1` (or `true`; default `false`).

For custom server startup timeout, set `E2E_SERVER_TIMEOUT_MS` (default `15000`
ms; measured cold start is ~364 ms for back and ~363 ms for front on Windows).

## Startup errors

Before starting the servers, the suite checks settings, target folders and
`package.json` files (a `start` script, installed dependencies), `bun`, the
Chromium browser, free ports and write access. Each server is then started
through `tests/start-target.ts`, which explains a crash or a timeout (for
example, nothing listening on `PORT`, or another app answering the health URL).

Every problem is printed in the same shape, so a person or an agent can search
the output for `E2E startup failed:` and apply the fix:

```text
E2E startup failed: 1 problem(s) found before starting the servers

1. [port] Port 4100 (front) is already in use by PID 28148 (bun.exe).
   Fix: Stop that process ("taskkill /PID 28148 /F"), set E2E_FRONT_PORT to a free port, or set E2E_REUSE_SERVER=1 if it is the front you want to test.
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

With `E2E_REUSE_SERVER` on, an already running back keeps its own database, so
isolation does not apply; the suite prints a warning.

Directory values may be relative to the E2E directory or absolute.

The expected app title is read from `displayName` (or `name`) in the front
`package.json`, so the tests follow the scaffolded app without edits.

---

**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
