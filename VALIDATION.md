# Validation Checklist for Port Override & Server Reuse Fix

This document describes the validation steps that should be performed when using this archetype to generate a new e2e-playwright project.

## Preconditions

- Generate a new project from this archetype with the standard layout:
  ```
  back/     # API server application
  front/    # Frontend application  
  e2e/      # This e2e-playwright suite
  ```
- Ensure both `back/` and `front/` applications are functional and can start with `bun start`
- Both applications should listen on `PORT` environment variable (back default 3000, front default 4000)

## Test Scenarios

### 1. Default Ports with Cold Start
**Command**: (in e2e directory)
```bash
bun run lint
bun run format:check
bun run test:e2e
```

**Expected Results**:
- ✓ `bun run lint` completes with no TypeScript errors
- ✓ `bun run format:check` shows all files are properly formatted  
- ✓ `bun run test:e2e` starts both servers on default ports (3000, 4000)
- ✓ All specs pass:
  - `tests/health.api.spec.ts` - 3 tests (health endpoint, headers, uptime increase)
  - `tests/health.page.spec.ts` - 5 tests (page load, main content, HTML structure, assets, responsive)
  - `tests/routing.spec.ts` - 6 tests (navigation, back button, deep links, params, not-found, localStorage)
- **Total**: ~14 specs pass
- Servers shut down cleanly after tests complete

### 2. Custom Ports (Regression Test)
**Command**:
```bash
E2E_BACK_PORT=3100 E2E_FRONT_PORT=4100 bun run test:e2e
```

**Expected Results**:
- ✓ Back server starts on port 3100 (receives `PORT=3100` via env)
- ✓ Front server starts on port 4100 (receives `PORT=4100` via env)
- ✓ All ~14 specs pass
- ✓ API specs read from published `E2E_BACK_URL` (http://localhost:3100)
- ✓ Page specs navigate to front server on 4100

**This is the critical regression test** — verifies that port overrides work end-to-end, including API spec port resolution.

### 3. Occupied Port Failure
**Setup**:
```bash
# Terminal 1: Start a decoy server on 4000
bun -e 'Bun.serve({port:4000, fetch:()=>new Response("<title>Foreign</title>")})'

# Terminal 2: Run tests (in e2e directory)
bun run test:e2e
```

**Expected Results**:
- ✓ Test suite **fails immediately** with an error like:
  ```
  Error: http://localhost:4000 is already used
  ```
- ✓ Suite does **NOT** attempt to run any specs
- ✓ Suite does **NOT** accidentally test the foreign server
- ✓ Exit code indicates failure

**Cleanup**:
- Kill the decoy server (Ctrl+C in Terminal 1)
- Verify port 4000 is free: `bun -e 'console.log("port 4000 is free")'`

### 4. Reuse Existing Server (Compatibility Escape Hatch)
**Setup**:
```bash
# Terminal 1: Start a decoy server on 4000
bun -e 'Bun.serve({port:4000, fetch:()=>new Response("<title>Foreign</title>")})'

# Terminal 2: Run tests WITH reuse enabled (in e2e directory)
E2E_REUSE_SERVER=1 bun run test:e2e
```

**Expected Results**:
- ✓ Test suite **does NOT fail** on port conflict
- ✓ Suite proceeds and **reuses the existing server on 4000**
- ✓ Page specs will see the foreign `<title>Foreign</title>` server
- ✓ Page tests **fail** (because they expect real app content, not the decoy)
  - e.g., expecting title to match `/Frontend/` but sees `<title>Foreign</title>`
- ✓ This confirms `E2E_REUSE_SERVER=1` opts into the old behavior for compatibility

**Cleanup**:
- Kill the decoy server (Ctrl+C in Terminal 1)

### 5. Custom Timeout
**Command**:
```bash
E2E_SERVER_TIMEOUT_MS=3000 bun run test:e2e
```

**Expected Results**:
- ✓ If both servers start in < 3000ms (typical: ~364ms each), tests pass
- ✓ Default timeout is 15000ms (15 seconds)

**To test timeout behavior**:
- Modify `back/` or `front/` to add artificial startup delay
- Run with `E2E_SERVER_TIMEOUT_MS=500` to see timeout failure
- Verify error message indicates timeout

## Defects Fixed

### 1. Wrong Application Testing (FIXED)
**Before**: `reuseExistingServer: !process.env["CI"]` meant suite would silently test whatever was on 3000/4000
- Confusing failures with content diffs (`<title>` mismatch, wrong theme)

**After**: `reuseExistingServer = Boolean(process.env["E2E_REUSE_SERVER"])`
- Suite **owns** its servers by default
- Fails fast on port conflict instead of testing wrong app
- Reuse is opt-in only

### 2. Port Overrides Silently Ignored (FIXED)
**Before**: Config read ports from `BACK_PORT`/`PORT` but never passed them to children
- Children inherited ambient `process.env.PORT`
- `BACK_PORT=3100` had no effect (back ignored it)
- `PORT=4100` would affect both servers (uncontrollable)

**After**: Ports passed explicitly through `webServer.env` block
- `env: { PORT: String(backPort) }` for back
- `env: { API_BASE_URL: backUrl, PORT: String(frontPort) }` for front
- Environment variables now work as expected

### 3. API Specs Derived Port Independently (FIXED)
**Before**: `tests/health.api.spec.ts` re-derived port from `BACK_PORT` on its own
- Even if config passed port correctly, specs got wrong URL
- Port override broke 3 out of ~14 specs

**After**: Specs read `process.env["E2E_BACK_URL"]`
- Published by config after computing it
- Worker processes inherit it
- Specs always in sync with config

## Implementation Details

### Constants Changed
```typescript
// Before
const DEFAULT_BACK_PORT = 3000;
const TIMEOUT = 5_000;
const backPort = process.env["BACK_PORT"] ?? DEFAULT_BACK_PORT;
const frontPort = process.env["PORT"] ?? DEFAULT_FRONT_PORT;

// After
const DEFAULT_BACK_PORT = 3_000;
const DEFAULT_SERVER_TIMEOUT_MS = 15_000;
const backPort = resolveNumber("E2E_BACK_PORT", DEFAULT_BACK_PORT);
const frontPort = resolveNumber("E2E_FRONT_PORT", DEFAULT_FRONT_PORT);
const serverTimeoutMs = resolveNumber("E2E_SERVER_TIMEOUT_MS", DEFAULT_SERVER_TIMEOUT_MS);
```

### Helper Function
```typescript
const resolveNumber = (variable: string, fallback: number): number => {
  const value = Number.parseInt(process.env[variable] ?? "", 10);
  return Number.isNaN(value) ? fallback : value;
};
```

### Environment Publishing
```typescript
// Publish the API URL for worker processes to use
process.env["E2E_BACK_URL"] = backUrl;
```

### Port Delivery via env Block
```typescript
// Before: no env block, children got ambient PORT
{ command: "bun start", cwd: backDirectory }

// After: explicit port via env block
{ command: "bun start", cwd: backDirectory, env: { PORT: String(backPort) } }
```

## Related Files Modified

- `playwright.config.ts` - Configuration with fixes
- `tests/health.api.spec.ts` - API spec now reads published URL
- `README.md` - Documentation of new environment variables

## Acceptance Criteria

All tests must pass:
1. ✓ Lint: `bun run lint` with no errors
2. ✓ Format: `bun run format:check` passes
3. ✓ Default run: ~14 specs pass, servers cold-start
4. ✓ Custom ports: `E2E_BACK_PORT=3100 E2E_FRONT_PORT=4100` all specs pass
5. ✓ Port conflict: Suite fails immediately with clear error (no specs run)
6. ✓ Reuse escape hatch: `E2E_REUSE_SERVER=1` allows existing server reuse
