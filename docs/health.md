# Health

## Objective

Verify that the API exposes a machine-readable health endpoint the web client
can call from its own origin.

## Acceptance Criteria

| ID        | PRD   | Scenario                                         | Expected Output                                               |
| --------- | ----- | ------------------------------------------------ | ------------------------------------------------------------- |
| AC-HLT-01 | F0010 | `GET /api/health`                                | `200`, JSON body with numeric `uptime` (> 0) and `runs` (> 0) |
| AC-HLT-02 | F0011 | Successive `GET /api/health` calls               | `uptime` strictly increases                                   |
| AC-HLT-03 | F0012 | `GET /api/health` with the web client's `Origin` | `access-control-allow-origin` is that origin or `*`           |

## Test Plan

- Suite: [`tests/health.api.test.ts`](../tests/health.api.test.ts) — AC-HLT-01..03
- Run: `bun test:e2e -- health`
