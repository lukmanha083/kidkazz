#!/bin/bash
# Run E2E tests sequentially in correct order
# This ensures tests 01-08 run in order, then 09-10 as standalone

# Don't use set -e, we handle errors manually

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test files in correct order
TEST_FILES=(
  "test/e2e/scenarios/01-period-setup.test.ts"
  "test/e2e/scenarios/02-inventory-purchases.test.ts"
  "test/e2e/scenarios/03-cash-sales.test.ts"
  "test/e2e/scenarios/04-operating-expenses.test.ts"
  "test/e2e/scenarios/05-credit-sales.test.ts"
  "test/e2e/scenarios/06-cash-collections.test.ts"
  "test/e2e/scenarios/07-month-end-close.test.ts"
  "test/e2e/scenarios/08-financial-reports.test.ts"
  "test/e2e/scenarios/09-budget-management.test.ts"
  "test/e2e/scenarios/10-cash-management.test.ts"
  "test/e2e/scenarios/11-bank-reconciliation.test.ts"
  "test/e2e/scenarios/12-fixed-assets.test.ts"
  "test/e2e/scenarios/13-depreciation.test.ts"
)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       E2E TESTS - SEQUENTIAL EXECUTION                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
FAILED_TESTS=""

for TEST_FILE in "${TEST_FILES[@]}"; do
  TEST_NAME=$(basename "$TEST_FILE" .test.ts)
  echo -e "${YELLOW}Running: ${TEST_NAME}${NC}"

  # Run vitest and capture output
  OUTPUT=$(npx vitest run --config vitest.e2e.config.ts "$TEST_FILE" --reporter=basic 2>&1)
  EXIT_CODE=$?

  # Check if tests actually passed by looking for "passed" in output
  if echo "$OUTPUT" | grep -q "passed"; then
    if echo "$OUTPUT" | grep -q "failed"; then
      echo -e "${RED}✗ FAILED: ${TEST_NAME}${NC}"
      echo "$OUTPUT" | tail -20
      ((FAILED++))
      FAILED_TESTS="${FAILED_TESTS}\n  - ${TEST_NAME}"
    else
      echo -e "${GREEN}✓ PASSED: ${TEST_NAME}${NC}"
      ((PASSED++))
    fi
  else
    echo -e "${RED}✗ FAILED: ${TEST_NAME}${NC}"
    echo "$OUTPUT" | tail -20
    ((FAILED++))
    FAILED_TESTS="${FAILED_TESTS}\n  - ${TEST_NAME}"
  fi
  echo ""
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo -e "║  ${GREEN}Passed: ${PASSED}${NC}                                                  ║"
echo -e "║  ${RED}Failed: ${FAILED}${NC}                                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed tests:${FAILED_TESTS}${NC}"
  exit 1
fi

exit 0
