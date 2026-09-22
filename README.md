# [e2e-playwright](https://github.com/AIDDbot/e2e-playwright)

End-to-end Playwright suite for an api and web application.

## Quick start

> [!IMPORTANT]
> this projects uses `bun` as a package manager and runner.

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
bun lint            # runs the linter
bun test:e2e        # runs the tests
bun test:e2e:report # opens the last HTML report
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

Directory values may be relative to the E2E directory or absolute.

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
