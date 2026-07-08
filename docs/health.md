# Health

## Objective

Verify that the AstroBookings server is running, exposes a machine-readable health
endpoint, and renders a home page that a monitoring or smoke-test job can check.

## Acceptance Criteria

| ID        | Scenario                                                              | Expected Output                                                        |
| --------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| AC-HLT-01 | `GET /api/health` while the server is up                              | `200` response, JSON body with numeric `uptime` (> 0) and `runs` (> 0) |
| AC-HLT-02 | `GET /api/health` response headers                                    | `content-type` header contains `application/json`                      |
| AC-HLT-03 | Two calls to `GET /api/health` over time                              | `uptime` strictly increases between calls                              |
| AC-HLT-04 | Navigate to `/`                                                       | Page title matches `AstroBookings`                                     |
| AC-HLT-05 | Navigate to `/`                                                       | A `<main>` landmark is visible                                         |
| AC-HLT-06 | Navigate to `/`                                                       | `<html>` and `<body>` render and are visible                           |
| AC-HLT-07 | Navigate to `/`                                                       | The `styles/theme.css` stylesheet link is attached to the document     |
| AC-HLT-08 | Navigate to `/` at mobile (375x667) and desktop (1920x1080) viewports | `<main>` stays visible at both sizes                                   |

## Test Plan

- Suite: [`tests/health.api.spec.ts`](../tests/health.api.spec.ts) — AC-HLT-01..03
- Suite: [`tests/health.page.spec.ts`](../tests/health.page.spec.ts) — AC-HLT-04..08
- Run: `npm run test:e2e -- health`
- Report: `npm run test:e2e:report` (HTML), `reports/results.json` (JSON)
