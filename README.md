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

For a different layout or ports, set these environment variables before running
the suite: `BACK_DIRECTORY`, `FRONT_DIRECTORY`, `BACK_PORT` (default `3000`),
and `PORT` (default `4000`). Directory values may be relative to the E2E
directory or absolute.

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
