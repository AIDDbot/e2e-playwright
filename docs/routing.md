# Routing

## Objective

Verify that AstroBookings' client-side router navigates between views without a full
page reload, keeps the browser history and deep links usable, and falls back
correctly for unknown routes.

## Acceptance Criteria

| ID        | Scenario                                              | Expected Output                                                                                               |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| AC-RTE-01 | Click the "About" menu link from `/`                  | URL becomes `/about`, "About" heading is visible, title matches `About`, no full reload (SPA marker survives) |
| AC-RTE-02 | Navigate to `/about` then use the browser back button | URL returns to `/`, "Hello, world!" text is visible                                                           |
| AC-RTE-03 | Open `/about` directly (deep link)                    | "About" heading is visible, health status shows `Server up for <n>s`                                          |
| AC-RTE-04 | Open `/items/42` directly                             | "Item #42" heading is visible (route param extracted from the URL)                                            |
| AC-RTE-05 | Open an unknown route, e.g. `/nope`                   | "Page not found" heading is visible                                                                           |
| AC-RTE-06 | Open `/about`                                         | `localStorage["last-route"]` is persisted as `"/about"`                                                       |

## Test Plan

- Suite: [`tests/routing.spec.ts`](../tests/routing.spec.ts) — AC-RTE-01..06
- Run: `npm run test:e2e -- routing`
- Report: `npm run test:e2e:report` (HTML), `reports/results.json` (JSON)
