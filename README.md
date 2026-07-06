# astrobookings-e2e
End-to-end Playwright suite for the AstroBookings application.

## Quick start

```bash
npm install -g --ignore-scripts=false @nubjs/nub   # one-time, system-level
nub node install 26 && nub node pin 26
nub install
nub run test:e2e   # runs the tests
nub run test:e2e:report   # opens the last HTML report
```
[NOTE: configure how to run the server in the playwright.config.ts file]

## Layout

- `tests/` — Playwright suites, one file per feature (`*.spec.ts`).
- `docs/{feature}.md` — spec for each feature, with acceptance criteria mapped to
  the suite that verifies them. Suites should map 1:1 to a doc as the project grows.
- `reports/` — generated JSON and HTML reports (git-ignored, regenerated per run).

---

-**Author** 
 - [Alberto Basalo](https://albertobasalo.dev) 
 - [GitHub](https://github.com/AIDDbot/AIDDbot) 
 - [A.I. Code Academy](https://aicode.academy) (ES)