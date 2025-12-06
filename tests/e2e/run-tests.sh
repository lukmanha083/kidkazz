#!/bin/bash

# DDD Refactoring - Main Test Runner (Current Implementation)
# Tests the actual implemented features: cascade delete and orphaned data cleanup

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# CONFIGURATION
# ============================================================================

REPORT_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"

# ============================================================================
# HELP MESSAGE
# ============================================================================

show_help() {
  cat << EOF
DDD Refactoring - E2E Test Suite (Current Implementation)

Tests the actual implemented features:
  - Product deletion validation (critical bug fix)
  - Cascade delete for products and warehouses
  - Orphaned locations cleanup
  - Orphaned inventory cleanup

Usage: $0 [OPTIONS]

Options:
  -c, --clean             Clean test data before running
  -h, --help              Show this help message

Environment Variables:
  PRODUCT_SERVICE_URL     Product Service URL (default: http://localhost:8788)
  INVENTORY_SERVICE_URL   Inventory Service URL (default: http://localhost:8792)

Examples:
  $0                      # Run all tests
  $0 --clean              # Clean and run tests

Prerequisites:
  1. Start services:
     Terminal 1: cd services/product-service && npm run dev
     Terminal 2: cd services/inventory-service && npm run dev

  2. Install jq: brew install jq (macOS) or sudo apt-get install jq (Ubuntu)

Test Coverage:
  Test 1: Product Deletion Validation
    - ✅ ALWAYS checks inventory before deletion
    - ✅ Blocks deletion if inventory > 0
    - ✅ Returns helpful error messages
    - ✅ Succeeds when inventory = 0
    - ✅ Cascades to inventory service

  Test 2: Cascade Delete - Product Level
    - ✅ DELETE /api/inventory/product/:productId endpoint
    - ✅ Deletes all inventory records for product
    - ✅ Verifies no inventory remains

  Test 3: Orphaned Locations Cleanup
    - ✅ GET /api/cleanup/orphaned-locations/check
    - ✅ POST /api/cleanup/orphaned-locations
    - ✅ Detects locations referencing deleted warehouses
    - ✅ Cleans up orphaned locations

  Test 4: Orphaned Inventory Cleanup
    - ✅ GET /api/cleanup/orphaned-inventory/check
    - ✅ POST /api/cleanup/orphaned-inventory
    - ✅ Detects inventory with deleted warehouses
    - ✅ Cleans up orphaned inventory

EOF
}

# ============================================================================
# PARSE COMMAND LINE ARGUMENTS
# ============================================================================

CLEAN_DATA=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--clean)
      CLEAN_DATA=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      echo ""
      show_help
      exit 1
      ;;
  esac
done

# ============================================================================
# BANNER
# ============================================================================

show_banner() {
  cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     CASCADE DELETE & ORPHANED DATA CLEANUP TEST SUITE            ║
║                                                                   ║
║  Testing actual implemented features                             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
  echo ""
}

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

main() {
  # Start time
  START_TIME=$(date +%s)

  # Show banner
  show_banner

  # Log configuration
  log_info "Test Configuration:"
  log_info "  Product Service:  $PRODUCT_SERVICE_URL"
  log_info "  Inventory Service: $INVENTORY_SERVICE_URL"
  log_info "  Report File:      $REPORT_FILE"
  echo ""

  # Clean test data if requested
  if [ "$CLEAN_DATA" = true ]; then
    log_info "Cleaning test data..."
    cleanup_test_data
    echo ""
  fi

  # Check service health
  if ! check_all_services; then
    log_error "Service health check failed. Please ensure all services are running."
    log_error ""
    log_error "Start services with:"
    log_error "  Terminal 1: cd services/product-service && npm run dev"
    log_error "  Terminal 2: cd services/inventory-service && npm run dev"
    exit 1
  fi

  echo ""

  # ============================================================================
  # RUN TESTS
  # ============================================================================

  log_info "==================================================================="
  log_info "Running Cascade Delete & Cleanup Tests"
  log_info "==================================================================="
  echo ""

  # Source and run tests
  source "$SCRIPT_DIR/test-cascade-delete-cleanup.sh"

  if main 2>&1 | tee -a "$REPORT_FILE"; then
    TEST_STATUS="PASSED"
  else
    TEST_STATUS="FAILED"
  fi

  # ============================================================================
  # FINAL SUMMARY
  # ============================================================================

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  MINUTES=$((DURATION / 60))
  SECONDS=$((DURATION % 60))

  echo ""
  log_info "==================================================================="
  log_info "FINAL SUMMARY"
  log_info "==================================================================="
  echo ""
  log_info "Total Duration: ${MINUTES}m ${SECONDS}s"
  log_info "Report saved to: $REPORT_FILE"
  echo ""

  # Final status
  if [ "$TEST_STATUS" = "PASSED" ] && [ "$TESTS_FAILED" -eq 0 ]; then
    log_success "╔═══════════════════════════════════════════════════════════════════╗"
    log_success "║                                                                   ║"
    log_success "║                   ALL TESTS PASSED ✅                             ║"
    log_success "║                                                                   ║"
    log_success "╚═══════════════════════════════════════════════════════════════════╝"
    return 0
  else
    log_error "╔═══════════════════════════════════════════════════════════════════╗"
    log_error "║                                                                   ║"
    log_error "║                   SOME TESTS FAILED ❌                            ║"
    log_error "║                                                                   ║"
    log_error "╚═══════════════════════════════════════════════════════════════════╝"
    return 1
  fi
}

# Run main
main
exit $?
