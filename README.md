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

[NOTE: configure how to run the server in the playwright.config.ts file]

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)

