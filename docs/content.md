# Content

## Objective

Verify the content of the home, item detail and about pages, including the
about page's health status when the API is up or down.

## Acceptance Criteria

| ID        | PRD   | Scenario                                                            | Expected Output                                                               |
| --------- | ----- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| AC-CNT-01 | F0004 | Open `/`                                                            | App title, a welcome message, and an "Engineering" list linking `/items/1..4` |
| AC-CNT-02 | F0005 | Open `/items/42`                                                    | Heading "Item #42" and a "Back home" link to `/`                              |
| AC-CNT-03 | F0005 | Open `/items/&lt;b&gt;bold`                                         | Heading shows the id literally: "Item #&amp;lt;b&amp;gt;bold"                 |
| AC-CNT-04 | F0006 | Open `/about` with the API up                                       | "Server up for {n}s — {m} run(s) recorded."                                   |
| AC-CNT-05 | F0007 | Open `/about` with the health request failing (network or HTTP 500) | "Health unavailable."                                                         |

## Test Plan

- Suite: [`tests/content.page.test.ts`](../tests/content.page.test.ts) — AC-CNT-01..05
- Run: `bun test:e2e -- content`
