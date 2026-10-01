#!/bin/bash

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Testing Guidelines Validation Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Track if any step failed
FAILED=0

# Step 1: Lint with oxlint
echo -e "${YELLOW}[1/5] Running Oxlint...${NC}"
if npm run lint; then
  echo -e "${GREEN}✓ Oxlint passed${NC}\n"
else
  echo -e "${RED}✗ Oxlint failed${NC}"
  FAILED=1
  echo -e "${YELLOW}Tip: Run 'npm run lint:fix' to auto-fix${NC}\n"
fi

# Step 2: Check code complexity
echo -e "${YELLOW}[2/5] Checking complexity...${NC}"
if npm run quality:complexity > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Complexity check passed${NC}\n"
else
  echo -e "${RED}✗ Complexity exceeds limits${NC}"
  FAILED=1
  npm run quality:complexity
  echo ""
fi

# Step 3: Run formatting check
echo -e "${YELLOW}[3/5] Checking code format...${NC}"
if npm run format:check > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Format check passed${NC}\n"
else
  echo -e "${RED}✗ Code not formatted${NC}"
  FAILED=1
  echo -e "${YELLOW}Tip: Run 'npm run fix' to auto-format${NC}\n"
fi

# Step 4: Check for common testing issues
echo -e "${YELLOW}[4/5] Checking for testing anti-patterns...${NC}"
TESTS_FILES=$(find tests -name "*.spec.ts" -type f)
ISSUES=0

# Check for hardcoded emails (simple heuristic)
if grep -r "@example\.com\|@test\.com" tests/e2e/*.spec.ts 2>/dev/null | grep -v "uniqueEmail" > /dev/null; then
  echo -e "${RED}  ⚠ Found potentially hardcoded emails in tests${NC}"
  grep -r "@example\.com\|@test\.com" tests/e2e/*.spec.ts 2>/dev/null | grep -v "uniqueEmail"
  ISSUES=1
fi

# Check for waitForTimeout (anti-pattern)
if grep -r "waitForTimeout" tests --include="*.spec.ts" | grep -v "//" > /dev/null; then
  echo -e "${RED}  ⚠ Found hardcoded waits (waitForTimeout)${NC}"
  grep -r "waitForTimeout" tests --include="*.spec.ts" | grep -v "//"
  ISSUES=1
fi

# Check for CSS selectors in page objects
if grep -r "locator(\"[.#]" tests/pages --include="*.ts" > /dev/null; then
  echo -e "${RED}  ⚠ Found CSS selectors in page objects${NC}"
  grep -r "locator(\"[.#]" tests/pages --include="*.ts"
  ISSUES=1
fi

if [ $ISSUES -eq 0 ]; then
  echo -e "${GREEN}✓ No obvious anti-patterns found${NC}\n"
else
  echo ""
  FAILED=1
fi

# Step 5: List tests with tags
echo -e "${YELLOW}[5/5] Test coverage by AC tag...${NC}"
TAG_COUNT=$(grep -r "@AC-" tests --include="*.spec.ts" | wc -l)
TEST_COUNT=$(grep -r "test(" tests --include="*.spec.ts" | wc -l)

echo -e "  Total tests: ${TEST_COUNT}"
echo -e "  Tests with AC tags: ${TAG_COUNT}"

if [ $TAG_COUNT -lt $TEST_COUNT ]; then
  echo -e "${YELLOW}  ⚠ Some tests missing AC tags${NC}"
  echo -e "${YELLOW}    Tip: Add { tag: \"@AC-XXX\" } to tests${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All validation checks passed!${NC}"
  echo -e "${GREEN}Ready to commit.${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 0
else
  echo -e "${RED}✗ Some validation checks failed${NC}"
  echo -e "${YELLOW}Run 'npm run fix' to auto-fix common issues${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 1
fi
