# e2e-playwright

End-to-end Playwright suite for an api and web application.

## Quick start

> [!IMPORTANT]
> this projects uses `nub` as a package manager and runner.

1. Install nub: the fastest tooling manager for Node.js projects.
```bash
npm install -g --ignore-scripts=false @nubjs/nub   # one-time, system-level
nub node install 26 && nub node pin 26
```

2. Install dependencies and run the tests
```bash
nub install
nub run test:e2e   # runs the tests
nub run test:e2e:report   # opens the last HTML report
```

[NOTE: configure how to run the server in the playwright.config.ts file]

---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)

