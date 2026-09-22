---
description: Rules for writing and running the Playwright end-to-end suite
paths: "e2e/**"
glob: "e2e/**"
applyTo: "e2e/**"
---
# E2E rules

## Layout

One acceptance document and one or more test files per feature.

```text
e2e/
├── docs/{feature}.md             # objective, acceptance criteria (AC-{KEY}-nn), test plan
├── tests/{feature}.api.test.ts   # API      -> back, `request` + E2E_BACK_URL
├── tests/{feature}.page.test.ts  # one page -> front, `page` + baseURL
├── tests/{feature}.test.ts       # flows across pages (e.g. routing)
├── playwright.config.ts          # starts or reuses back and front; the only place for ports and paths
└── reports/                      # generated, never versioned
```

## Rules

1. Every `AC-{KEY}-nn` in `docs/` is a test whose title starts with its ID. Update docs and tests together.
2. API tests build URLs from `process.env["E2E_BACK_URL"]`; get the front origin from the `baseURL` fixture. Never hardcode hosts or ports.
3. Browser tests navigate with relative paths (`page.goto("/about")`).
4. Locate by role, label or text (`getByRole`, `getByLabel`, `getByText`), scoped to a landmark (`navigation`, `main`) when a name repeats. Use CSS only when there is no accessible handle (e.g. `data-theme` on `<html>`).
5. Use `exact: true` when an accessible name is a substring of another one in scope.
6. Wait with web-first assertions or `expect.poll`; never `waitForTimeout` or fixed sleeps. Wait for the page to render before reading attributes.
7. Simulate API failures with `page.route` (abort or error status); never stop or reconfigure the servers from a test.
8. Tests are independent and parallel-safe: each gets a fresh browser context (empty `localStorage`), arranges its own data, and never asserts exact counts from the shared database.

## Running

- `bun test:e2e` starts both servers from `BACK_DIRECTORY` / `FRONT_DIRECTORY`.
- Servers already running: set `E2E_BACK_PORT`, `E2E_FRONT_PORT` and `E2E_REUSE_SERVER=true` in a local `.env` (see `.env.example`).

---

> last updated: 2026-09-22
