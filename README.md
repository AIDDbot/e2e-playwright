# astrobookings-e2e

End-to-end Playwright suite for the AstroBookings application.

## Quick start

> [!IMPORTANT]
> this projects uses `nub` as a package manager and runner.

[Nub](https://github.com/nubjs/nub) is an all-in-one toolkit powered by Node.js that modernizes the developer experience of the Node.js ecosystem. Use it instead of node, npm run, and npx (or the equivalents in your preferred package manager).

```bash
npm install -g --ignore-scripts=false @nubjs/nub   # one-time, system-level
nub node install 26 && nub node pin 26 # latest Node.js 26 LTS
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
