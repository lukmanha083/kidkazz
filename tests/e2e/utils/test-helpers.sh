#!/bin/bash

# DDD Refactoring - Test Helper Functions
# Provides utility functions for E2E testing

# Color codes for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# Service URLs
export PRODUCT_SERVICE_URL="http://localhost:8788"
export INVENTORY_SERVICE_URL="http://localhost:8792"
export ADMIN_DASHBOARD_URL="http://localhost:3000"

# Test data storage
export TEST_DATA_DIR="/tmp/kidkazz-test-data"
mkdir -p "$TEST_DATA_DIR"

# Test counters
export TESTS_RUN=0
export TESTS_PASSED=0
export TESTS_FAILED=0

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

# ============================================================================
# TEST ASSERTION FUNCTIONS
# ============================================================================

assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="${3:-Assertion failed}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$expected" = "$actual" ]; then
    log_success "✅ $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    log_error "❌ $message"
    log_error "   Expected: $expected"
    log_error "   Actual: $actual"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

assert_not_equals() {
  local not_expected="$1"
  local actual="$2"
  local message="${3:-Assertion failed}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$not_expected" != "$actual" ]; then
    log_success "✅ $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    log_error "❌ $message"
    log_error "   Should not equal: $not_expected"
    log_error "   Actual: $actual"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

assert_contains() {
  local substring="$1"
  local string="$2"
  local message="${3:-Assertion failed}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if echo "$string" | grep -q "$substring"; then
    log_success "✅ $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    log_error "❌ $message"
    log_error "   Expected to contain: $substring"
    log_error "   In: $string"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

assert_http_status() {
  local expected_status="$1"
  local actual_status="$2"
  local message="${3:-HTTP status check}"

  assert_equals "$expected_status" "$actual_status" "$message"
}

assert_json_value() {
  local json="$1"
  local jq_path="$2"
  local expected_value="$3"
  local message="${4:-JSON value check}"

  local actual_value=$(echo "$json" | jq -r "$jq_path")
  assert_equals "$expected_value" "$actual_value" "$message"
}

assert_greater_than() {
  local threshold="$1"
  local actual="$2"
  local message="${3:-Assertion failed}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$actual" -gt "$threshold" ]; then
    log_success "✅ $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    log_error "❌ $message"
    log_error "   Expected > $threshold"
    log_error "   Actual: $actual"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# ============================================================================
# HTTP REQUEST FUNCTIONS
# ============================================================================

http_get() {
  local url="$1"
  local output_file="${2:-}"

  if [ -n "$output_file" ]; then
    curl -s -w "\n%{http_code}" "$url" -o "$output_file"
  else
    curl -s -w "\n%{http_code}" "$url"
  fi
}

http_post() {
  local url="$1"
  local data="$2"
  local output_file="${3:-}"

  if [ -n "$output_file" ]; then
    curl -s -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$data" \
      -w "\n%{http_code}" \
      -o "$output_file"
  else
    curl -s -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$data" \
      -w "\n%{http_code}"
  fi
}

http_delete() {
  local url="$1"

  curl -s -X DELETE "$url" -w "\n%{http_code}"
}

http_patch() {
  local url="$1"
  local data="$2"

  curl -s -X PATCH "$url" \
    -H "Content-Type: application/json" \
    -d "$data" \
    -w "\n%{http_code}"
}

# ============================================================================
# SERVICE HEALTH CHECKS
# ============================================================================

check_service_health() {
  local service_name="$1"
  local health_url="$2"

  log_info "Checking $service_name health..."

  response=$(curl -s "$health_url" 2>&1)
  status=$?

  if [ $status -eq 0 ] && echo "$response" | grep -q "healthy"; then
    log_success "$service_name is healthy"
    return 0
  else
    log_error "$service_name is not healthy or not responding"
    log_error "Response: $response"
    return 1
  fi
}

check_all_services() {
  log_info "==================================================================="
  log_info "Checking service health..."
  log_info "==================================================================="

  local all_healthy=true

  if ! check_service_health "Product Service" "$PRODUCT_SERVICE_URL/health"; then
    all_healthy=false
  fi

  if ! check_service_health "Inventory Service" "$INVENTORY_SERVICE_URL/health"; then
    all_healthy=false
  fi

  echo ""

  if [ "$all_healthy" = true ]; then
    log_success "All services are healthy ✅"
    return 0
  else
    log_error "Some services are unhealthy ❌"
    log_error "Please start all services before running tests"
    return 1
  fi
}

# ============================================================================
# DATA MANAGEMENT FUNCTIONS
# ============================================================================

save_test_data() {
  local key="$1"
  local value="$2"

  echo "$value" > "$TEST_DATA_DIR/$key"
}

load_test_data() {
  local key="$1"

  if [ -f "$TEST_DATA_DIR/$key" ]; then
    cat "$TEST_DATA_DIR/$key"
  else
    echo ""
  fi
}

cleanup_test_data() {
  log_info "Cleaning up test data..."
  rm -rf "$TEST_DATA_DIR"
  mkdir -p "$TEST_DATA_DIR"
  log_success "Test data cleaned up"
}

# ============================================================================
# JSON PARSING FUNCTIONS
# ============================================================================

extract_json_field() {
  local json="$1"
  local field="$2"

  echo "$json" | jq -r "$field"
}

extract_id_from_response() {
  local response="$1"

  # Try common ID field names
  local id=$(echo "$response" | jq -r '.id // .productId // .warehouseId // .bundleId // .inventoryId // .batchId // empty')

  if [ -z "$id" ] || [ "$id" = "null" ]; then
    # Try nested objects
    id=$(echo "$response" | jq -r '.product.id // .warehouse.id // .bundle.id // .inventory.id // .batch.id // empty')
  fi

  echo "$id"
}

# ============================================================================
# TEST SUMMARY FUNCTIONS
# ============================================================================

print_test_summary() {
  echo ""
  log_info "==================================================================="
  log_info "TEST SUMMARY"
  log_info "==================================================================="
  echo -e "Total Tests:  ${BLUE}$TESTS_RUN${NC}"
  echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"

  if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    log_success "ALL TESTS PASSED ✅"
    return 0
  else
    echo ""
    log_error "SOME TESTS FAILED ❌"
    return 1
  fi
}

# ============================================================================
# WAIT FUNCTIONS
# ============================================================================

wait_for_condition() {
  local condition_cmd="$1"
  local timeout="${2:-30}"
  local interval="${3:-1}"

  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    if eval "$condition_cmd"; then
      return 0
    fi

    sleep $interval
    elapsed=$((elapsed + interval))
  done

  return 1
}

# ============================================================================
# INITIALIZATION
# ============================================================================

log_info "Test helpers loaded successfully"
log_info "Test data directory: $TEST_DATA_DIR"
