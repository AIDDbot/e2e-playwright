# Navigation

## Objective

Verify that every page offers the same navigation bar and that the theme toggle
switches and remembers the user's theme.

## Acceptance Criteria

| ID        | PRD   | Scenario                                          | Expected Output                                                                            |
| --------- | ----- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| AC-NAV-01 | F0001 | Open `/`, `/about`, `/items/1` and an unknown URL | Nav bar shows the app title linking to `/`, "Home" and "About" links, and the theme toggle |
| AC-NAV-02 | F0009 | Click the theme toggle twice                      | Theme switches dark ↔ light and back                                                       |
| AC-NAV-03 | F0009 | Click the theme toggle, then reload               | The chosen theme is kept                                                                   |

## Test Plan

- Suite: [`tests/navigation.page.test.ts`](../tests/navigation.page.test.ts) — AC-NAV-01..03
- Run: `bun test:e2e -- navigation`
