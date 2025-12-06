#!/bin/bash

# DDD Refactoring - Main Test Runner
# Executes all E2E tests for DDD refactoring phases

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# CONFIGURATION
# ============================================================================

# Test phases to run (can be overridden via command line)
RUN_PHASE_1=${RUN_PHASE_1:-true}
RUN_PHASE_2=${RUN_PHASE_2:-true}
RUN_PHASE_3=${RUN_PHASE_3:-true}
RUN_PHASE_4=${RUN_PHASE_4:-true}

# Test report configuration
REPORT_DIR="$SCRIPT_DIR/reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"

# ============================================================================
# HELP MESSAGE
# ============================================================================

show_help() {
  cat << EOF
DDD Refactoring - E2E Test Suite

Usage: $0 [OPTIONS]

Options:
  -1, --phase1-only       Run Phase 1 tests only (Inventory Integration)
  -2, --phase2-only       Run Phase 2 tests only (Single Source of Truth)
  -3, --phase3-only       Run Phase 3 tests only (Batch Tracking & FEFO)
  -4, --phase4-only       Run Phase 4 tests only (Cascade Delete Strategy)
  -a, --all               Run all phases (default)
  -c, --clean             Clean test data before running
  -h, --help              Show this help message

Environment Variables:
  PRODUCT_SERVICE_URL     Product Service URL (default: http://localhost:8788)
  INVENTORY_SERVICE_URL   Inventory Service URL (default: http://localhost:8792)

Examples:
  $0                      # Run all tests
  $0 --phase1-only        # Run Phase 1 tests only
  $0 --clean --all        # Clean and run all tests

Test Phases:
  Phase 1: Inventory Integration
    - Product locations auto-create inventory
    - UOM location conversion
    - Variant location management

  Phase 2: Single Source of Truth
    - Product stock delegation
    - Low stock detection
    - Virtual bundle stock calculation

  Phase 3: Batch Tracking & FEFO
    - Batch creation with expiration
    - FEFO ordering
    - Expiring/expired batch queries
    - Batch status management

  Phase 4: Cascade Delete Strategy
    - Warehouse soft delete
    - Orphaned reference cleanup
    - Product deletion validation
    - Cascade delete verification

EOF
}

# ============================================================================
# PARSE COMMAND LINE ARGUMENTS
# ============================================================================

CLEAN_DATA=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -1|--phase1-only)
      RUN_PHASE_1=true
      RUN_PHASE_2=false
      RUN_PHASE_3=false
      RUN_PHASE_4=false
      shift
      ;;
    -2|--phase2-only)
      RUN_PHASE_1=false
      RUN_PHASE_2=true
      RUN_PHASE_3=false
      RUN_PHASE_4=false
      shift
      ;;
    -3|--phase3-only)
      RUN_PHASE_1=false
      RUN_PHASE_2=false
      RUN_PHASE_3=true
      RUN_PHASE_4=false
      shift
      ;;
    -4|--phase4-only)
      RUN_PHASE_1=false
      RUN_PHASE_2=false
      RUN_PHASE_3=false
      RUN_PHASE_4=true
      shift
      ;;
    -a|--all)
      RUN_PHASE_1=true
      RUN_PHASE_2=true
      RUN_PHASE_3=true
      RUN_PHASE_4=true
      shift
      ;;
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
║          DDD REFACTORING - E2E TEST SUITE                        ║
║                                                                   ║
║  Comprehensive testing for Domain-Driven Design implementation   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
  echo ""
}

# ============================================================================
# TEST EXECUTION TRACKING
# ============================================================================

PHASE_RESULTS=()

record_phase_result() {
  local phase_name="$1"
  local status="$2"
  local tests_run="$3"
  local tests_passed="$4"
  local tests_failed="$5"

  PHASE_RESULTS+=("$phase_name|$status|$tests_run|$tests_passed|$tests_failed")
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
  # PHASE 1: Inventory Integration
  # ============================================================================

  if [ "$RUN_PHASE_1" = true ]; then
    log_info "==================================================================="
    log_info "PHASE 1: Inventory Integration"
    log_info "==================================================================="
    echo ""

    # Reset counters
    TESTS_RUN=0
    TESTS_PASSED=0
    TESTS_FAILED=0

    # Source and run Phase 1 tests
    source "$SCRIPT_DIR/phase1-inventory-integration.sh"

    if main_phase1 2>&1 | tee -a "$REPORT_FILE"; then
      record_phase_result "Phase 1" "PASSED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    else
      record_phase_result "Phase 1" "FAILED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    fi

    echo ""
  fi

  # ============================================================================
  # PHASE 2: Single Source of Truth
  # ============================================================================

  if [ "$RUN_PHASE_2" = true ]; then
    log_info "==================================================================="
    log_info "PHASE 2: Single Source of Truth"
    log_info "==================================================================="
    echo ""

    # Reset counters
    TESTS_RUN=0
    TESTS_PASSED=0
    TESTS_FAILED=0

    # Source and run Phase 2 tests
    source "$SCRIPT_DIR/phase2-single-source-truth.sh"

    if main 2>&1 | tee -a "$REPORT_FILE"; then
      record_phase_result "Phase 2" "PASSED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    else
      record_phase_result "Phase 2" "FAILED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    fi

    echo ""
  fi

  # ============================================================================
  # PHASE 3: Batch Tracking & FEFO
  # ============================================================================

  if [ "$RUN_PHASE_3" = true ]; then
    log_info "==================================================================="
    log_info "PHASE 3: Batch Tracking & FEFO"
    log_info "==================================================================="
    echo ""

    # Reset counters
    TESTS_RUN=0
    TESTS_PASSED=0
    TESTS_FAILED=0

    # Source and run Phase 3 tests
    source "$SCRIPT_DIR/phase3-batch-tracking-fefo.sh"

    if main 2>&1 | tee -a "$REPORT_FILE"; then
      record_phase_result "Phase 3" "PASSED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    else
      record_phase_result "Phase 3" "FAILED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    fi

    echo ""
  fi

  # ============================================================================
  # PHASE 4: Cascade Delete Strategy
  # ============================================================================

  if [ "$RUN_PHASE_4" = true ]; then
    log_info "==================================================================="
    log_info "PHASE 4: Cascade Delete Strategy"
    log_info "==================================================================="
    echo ""

    # Reset counters
    TESTS_RUN=0
    TESTS_PASSED=0
    TESTS_FAILED=0

    # Source and run Phase 4 tests
    source "$SCRIPT_DIR/phase4-cascade-delete.sh"

    if main 2>&1 | tee -a "$REPORT_FILE"; then
      record_phase_result "Phase 4" "PASSED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    else
      record_phase_result "Phase 4" "FAILED" "$TESTS_RUN" "$TESTS_PASSED" "$TESTS_FAILED"
    fi

    echo ""
  fi

  # ============================================================================
  # FINAL SUMMARY
  # ============================================================================

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  log_info "==================================================================="
  log_info "FINAL TEST SUMMARY"
  log_info "==================================================================="
  echo ""

  # Calculate totals
  TOTAL_TESTS=0
  TOTAL_PASSED=0
  TOTAL_FAILED=0
  ALL_PASSED=true

  echo -e "${BLUE}Phase Results:${NC}"
  echo "-------------------------------------------------------------------"
  printf "%-20s %-10s %-10s %-10s %-10s\n" "Phase" "Status" "Total" "Passed" "Failed"
  echo "-------------------------------------------------------------------"

  for result in "${PHASE_RESULTS[@]}"; do
    IFS='|' read -r phase_name status tests_run tests_passed tests_failed <<< "$result"

    # Color status
    if [ "$status" = "PASSED" ]; then
      status_colored="${GREEN}${status}${NC}"
    else
      status_colored="${RED}${status}${NC}"
      ALL_PASSED=false
    fi

    printf "%-20s %-20s %-10s %-10s %-10s\n" \
      "$phase_name" \
      "$(echo -e "$status_colored")" \
      "$tests_run" \
      "$tests_passed" \
      "$tests_failed"

    TOTAL_TESTS=$((TOTAL_TESTS + tests_run))
    TOTAL_PASSED=$((TOTAL_PASSED + tests_passed))
    TOTAL_FAILED=$((TOTAL_FAILED + tests_failed))
  done

  echo "-------------------------------------------------------------------"
  printf "%-20s %-20s %-10s %-10s %-10s\n" \
    "TOTAL" \
    "" \
    "$TOTAL_TESTS" \
    "$TOTAL_PASSED" \
    "$TOTAL_FAILED"
  echo "-------------------------------------------------------------------"
  echo ""

  # Duration
  MINUTES=$((DURATION / 60))
  SECONDS=$((DURATION % 60))

  log_info "Total Duration: ${MINUTES}m ${SECONDS}s"
  log_info "Report saved to: $REPORT_FILE"
  echo ""

  # Final status
  if [ "$ALL_PASSED" = true ] && [ "$TOTAL_FAILED" -eq 0 ]; then
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

# Wrapper for Phase 1 main function
main_phase1() {
  setup_phase1
  test_1_1_product_with_location
  test_1_2_uom_location
  test_1_3_variant_location
  cleanup_phase1
  print_test_summary
}

# Run main
main
exit $?
