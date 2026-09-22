# Routing

## Objective

Verify that the client-side router navigates without full reloads, keeps
history and deep links usable, and handles unknown routes.

## Acceptance Criteria

| ID        | PRD   | Scenario                                              | Expected Output                                                                  |
| --------- | ----- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| AC-RTE-01 | F0002 | Follow the "About", app title and first item links    | Matching page, URL and document title for each step; no full reload              |
| AC-RTE-02 | F0002 | Go to `/about`, then browser back and forward         | Matching page, URL and document title for each step; no full reload              |
| AC-RTE-03 | F0003 | Open `/`, `/about` and `/items/7` by URL, then reload | The page for that route is rendered both times                                   |
| AC-RTE-04 | F0008 | Open an unknown route, e.g. `/no/such/page`           | "Page not found", the requested path, and a "Back home" link that returns to `/` |

## Test Plan

- Suite: [`tests/routing.test.ts`](../tests/routing.test.ts) — AC-RTE-01..04
- Run: `bun test:e2e -- routing`
