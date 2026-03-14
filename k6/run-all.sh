#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# k6 Load Test Runner
#
# Runs all load tests sequentially and generates a summary report.
#
# Usage:
#   ./k6/run-all.sh                              # Default: localhost:3000
#   ./k6/run-all.sh https://staging.example.com   # Custom target
#   PROFILE=smoke ./k6/run-all.sh                 # Smoke test only
#
# Prerequisites:
#   brew install k6   (macOS)
#   snap install k6   (Linux)
#
# Output:
#   k6/results/  — JSON results per test
#   k6/results/summary.txt — Combined summary
# ──────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PROFILE="${PROFILE:-load}"
RESULTS_DIR="k6/results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SUMMARY_FILE="${RESULTS_DIR}/summary-${TIMESTAMP}.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     k6 Load Test Suite                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Target:  ${GREEN}${BASE_URL}${NC}"
echo -e "  Profile: ${YELLOW}${PROFILE}${NC}"
echo -e "  Time:    ${TIMESTAMP}"
echo ""

# Check k6 is installed
if ! command -v k6 &> /dev/null; then
  echo -e "${RED}Error: k6 is not installed.${NC}"
  echo "  Install: brew install k6 (macOS) or snap install k6 (Linux)"
  echo "  Docs:    https://k6.io/docs/getting-started/installation/"
  exit 1
fi

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Initialize summary
{
  echo "═══════════════════════════════════════════"
  echo " k6 Load Test Report"
  echo " Target:  ${BASE_URL}"
  echo " Profile: ${PROFILE}"
  echo " Date:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "═══════════════════════════════════════════"
  echo ""
} > "${SUMMARY_FILE}"

# Test definitions: name → script
declare -a TESTS=(
  "api-health:k6/api-health.js"
  "homepage:k6/homepage.js"
  "lead-submission:k6/lead-submission.js"
  "checkout-flow:k6/checkout-flow.js"
)

PASSED=0
FAILED=0
TOTAL=${#TESTS[@]}

run_test() {
  local name="$1"
  local script="$2"
  local result_file="${RESULTS_DIR}/${name}-${TIMESTAMP}.json"

  echo -e "${BLUE}── Running: ${name} ──${NC}"

  if k6 run \
    -e "BASE_URL=${BASE_URL}" \
    -e "PROFILE=${PROFILE}" \
    --summary-export="${result_file}" \
    --quiet \
    "${script}" 2>&1; then
    echo -e "${GREEN}  ✓ ${name} passed${NC}"
    ((PASSED++))
    echo "[PASS] ${name}" >> "${SUMMARY_FILE}"
  else
    echo -e "${RED}  ✗ ${name} failed${NC}"
    ((FAILED++))
    echo "[FAIL] ${name}" >> "${SUMMARY_FILE}"
  fi

  # Append JSON results to summary
  if [ -f "${result_file}" ]; then
    echo "" >> "${SUMMARY_FILE}"
    echo "--- ${name} results ---" >> "${SUMMARY_FILE}"
    # Extract key metrics from JSON
    if command -v jq &> /dev/null; then
      jq '{
        http_req_duration_p95: .metrics.http_req_duration.values["p(95)"],
        http_req_duration_p99: .metrics.http_req_duration.values["p(99)"],
        http_req_duration_avg: .metrics.http_req_duration.values.avg,
        http_reqs_count: .metrics.http_reqs.values.count,
        http_req_failed_rate: .metrics.http_req_failed.values.rate,
        iterations: .metrics.iterations.values.count,
        data_received: .metrics.data_received.values.count
      }' "${result_file}" >> "${SUMMARY_FILE}" 2>/dev/null || true
    fi
    echo "" >> "${SUMMARY_FILE}"
  fi

  echo ""
}

# Run all tests
for test_entry in "${TESTS[@]}"; do
  IFS=':' read -r name script <<< "${test_entry}"
  run_test "${name}" "${script}"
done

# Run concurrent users test (separate — uses PROFILE env var)
echo -e "${BLUE}── Running: concurrent-users (${PROFILE}) ──${NC}"
CONCURRENT_RESULT="${RESULTS_DIR}/concurrent-users-${TIMESTAMP}.json"

if k6 run \
  -e "BASE_URL=${BASE_URL}" \
  -e "PROFILE=${PROFILE}" \
  --summary-export="${CONCURRENT_RESULT}" \
  --quiet \
  k6/concurrent-users.js 2>&1; then
  echo -e "${GREEN}  ✓ concurrent-users passed${NC}"
  ((PASSED++))
  echo "[PASS] concurrent-users" >> "${SUMMARY_FILE}"
else
  echo -e "${RED}  ✗ concurrent-users failed${NC}"
  ((FAILED++))
  echo "[FAIL] concurrent-users" >> "${SUMMARY_FILE}"
fi
((TOTAL++))

# Final summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "  Results: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC} / ${TOTAL} total"
echo -e "  Report:  ${SUMMARY_FILE}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

{
  echo ""
  echo "═══════════════════════════════════════════"
  echo " TOTAL: ${PASSED} passed, ${FAILED} failed / ${TOTAL} tests"
  echo "═══════════════════════════════════════════"
} >> "${SUMMARY_FILE}"

# Exit with failure if any test failed
[ "${FAILED}" -eq 0 ] || exit 1
