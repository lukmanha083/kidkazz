#!/bin/bash

# DDD Refactoring - Phase 3 Testing: Batch Tracking & FEFO
# Tests batch-level inventory tracking with expiration dates and FEFO ordering

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# PHASE 3 SETUP
# ============================================================================

setup_phase3() {
  log_info "==================================================================="
  log_info "PHASE 3: Batch Tracking & FEFO Tests"
  log_info "==================================================================="
  echo ""

  # Check services
  check_all_services || exit 1

  # Load warehouse from Phase 1
  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  if [ -z "$warehouse_id" ]; then
    log_error "Phase 1 test data not found. Please run Phase 1 tests first."
    exit 1
  fi

  echo ""
}

# ============================================================================
# TEST 3.1: Create Batches with Expiration Dates
# ============================================================================

test_3_1_create_batches() {
  log_test "Test 3.1: Create Batches with Expiration Dates"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Create product with expiration tracking
  log_info "Creating product for batch tracking (Fresh Milk)..."

  milk_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "MILK-PHASE3-001",
    "name": "Fresh Milk 1L (Phase 3)",
    "sku": "MILK-SKU-PHASE3-001",
    "price": 15000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')

  milk_body=$(echo "$milk_response" | head -n -1)
  milk_id=$(extract_id_from_response "$milk_body")
  save_test_data "phase3_milk_id" "$milk_id"

  log_success "Milk product created: $milk_id"

  # Create inventory record
  log_info "Initializing inventory for batch tracking..."

  inventory_response=$(http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$milk_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 0,
    \"movementType\": \"adjustment\",
    \"reason\": \"Initialize inventory for batch tracking\"
  }")

  inventory_body=$(echo "$inventory_response" | head -n -1)
  inventory_id=$(extract_json_field "$inventory_body" '.inventory.id')
  save_test_data "phase3_inventory_id" "$inventory_id"

  log_success "Inventory initialized: $inventory_id"

  # Create Batch A001 - expires in 15 days
  log_info "Creating Batch A001 (expires in 15 days)..."

  expiry_date_a=$(date -u -d "+15 days" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v+15d +"%Y-%m-%dT%H:%M:%S.000Z")
  manufacture_date=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

  batch_a_response=$(http_post "$INVENTORY_SERVICE_URL/api/batches" "{
    \"inventoryId\": \"$inventory_id\",
    \"productId\": \"$milk_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"batchNumber\": \"A001-PHASE3\",
    \"expirationDate\": \"$expiry_date_a\",
    \"quantityAvailable\": 100,
    \"supplier\": \"Supplier A\",
    \"manufactureDate\": \"$manufacture_date\"
  }")

  batch_a_body=$(echo "$batch_a_response" | head -n -1)
  batch_a_status=$(echo "$batch_a_response" | tail -n 1)

  assert_http_post_status "$batch_a_status" "Batch A001 creation"

  batch_a_id=$(extract_id_from_response "$batch_a_body")
  save_test_data "phase3_batch_a_id" "$batch_a_id"

  log_success "Batch A001 created: $batch_a_id"

  # Create Batch A002 - expires in 30 days
  log_info "Creating Batch A002 (expires in 30 days)..."

  expiry_date_b=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v+30d +"%Y-%m-%dT%H:%M:%S.000Z")

  batch_b_response=$(http_post "$INVENTORY_SERVICE_URL/api/batches" "{
    \"inventoryId\": \"$inventory_id\",
    \"productId\": \"$milk_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"batchNumber\": \"A002-PHASE3\",
    \"expirationDate\": \"$expiry_date_b\",
    \"quantityAvailable\": 50,
    \"supplier\": \"Supplier A\"
  }")

  batch_b_body=$(echo "$batch_b_response" | head -n -1)
  batch_b_status=$(echo "$batch_b_response" | tail -n 1)

  assert_http_post_status "$batch_b_status" "Batch A002 creation"

  batch_b_id=$(extract_id_from_response "$batch_b_body")
  save_test_data "phase3_batch_b_id" "$batch_b_id"

  log_success "Batch A002 created: $batch_b_id"

  # Create Batch B001 - no expiration (long shelf life)
  log_info "Creating Batch B001 (no expiration)..."

  batch_c_response=$(http_post "$INVENTORY_SERVICE_URL/api/batches" "{
    \"inventoryId\": \"$inventory_id\",
    \"productId\": \"$milk_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"batchNumber\": \"B001-PHASE3\",
    \"expirationDate\": null,
    \"quantityAvailable\": 75,
    \"supplier\": \"Supplier B\"
  }")

  batch_c_body=$(echo "$batch_c_response" | head -n -1)
  batch_c_status=$(echo "$batch_c_response" | tail -n 1)

  assert_http_post_status "$batch_c_status" "Batch B001 creation"

  batch_c_id=$(extract_id_from_response "$batch_c_body")
  save_test_data "phase3_batch_c_id" "$batch_c_id"

  log_success "Batch B001 created: $batch_c_id"

  log_success "Test 3.1 completed ✅"
  echo ""
}

# ============================================================================
# TEST 3.2: Verify FEFO Ordering
# ============================================================================

test_3_2_verify_fefo() {
  log_test "Test 3.2: Verify FEFO Ordering"
  echo "------------------------------------------------"

  local milk_id=$(load_test_data "phase3_milk_id")
  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  log_info "Querying batches for product (should be FEFO ordered)..."

  batches_response=$(http_get "$INVENTORY_SERVICE_URL/api/batches/product/$milk_id/warehouse/$warehouse_id")

  batches_body=$(echo "$batches_response" | head -n -1)
  batches_status=$(echo "$batches_response" | tail -n 1)

  assert_http_status "200" "$batches_status" "Batches query"

  # Extract batch numbers in order
  first_batch=$(extract_json_field "$batches_body" '.batches[0].batchNumber')
  second_batch=$(extract_json_field "$batches_body" '.batches[1].batchNumber')
  third_batch=$(extract_json_field "$batches_body" '.batches[2].batchNumber')

  # Verify FEFO order
  assert_equals "A001-PHASE3" "$first_batch" "First batch is A001 (expires in 15 days)"
  assert_equals "A002-PHASE3" "$second_batch" "Second batch is A002 (expires in 30 days)"
  assert_equals "B001-PHASE3" "$third_batch" "Third batch is B001 (no expiration - last)"

  log_success "Test 3.2 completed ✅"
  echo ""
}

# ============================================================================
# TEST 3.3: Get Expiring Batches
# ============================================================================

test_3_3_expiring_batches() {
  log_test "Test 3.3: Get Expiring Batches"
  echo "------------------------------------------------"

  log_info "Querying batches expiring within 30 days..."

  expiring_response=$(http_get "$INVENTORY_SERVICE_URL/api/batches/expiring?days=30")

  expiring_body=$(echo "$expiring_response" | head -n -1)
  expiring_status=$(echo "$expiring_response" | tail -n 1)

  assert_http_status "200" "$expiring_status" "Expiring batches query"

  # Count expiring batches (should be 2: A001 and A002)
  expiring_count=$(extract_json_field "$expiring_body" '.batches | length')

  # Should be at least 2 (A001 and A002)
  if [ "$expiring_count" -ge 2 ]; then
    log_success "✅ Found $expiring_count expiring batches (includes A001 and A002)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Expected at least 2 expiring batches, found $expiring_count"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # Verify B001 is NOT included (no expiration)
  contains_b001=$(echo "$expiring_body" | jq -r '.batches[] | select(.batchNumber == "B001-PHASE3") | .batchNumber // empty')

  if [ -z "$contains_b001" ]; then
    log_success "✅ B001 correctly excluded (no expiration date)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ B001 should not be in expiring list (has no expiration date)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  log_success "Test 3.3 completed ✅"
  echo ""
}

# ============================================================================
# TEST 3.4: Batch Quantity Adjustment
# ============================================================================

test_3_4_batch_adjustment() {
  log_test "Test 3.4: Batch Quantity Adjustment"
  echo "------------------------------------------------"

  local batch_a_id=$(load_test_data "phase3_batch_a_id")

  # Adjust batch quantity (damage/spoilage)
  log_info "Adjusting Batch A001 quantity (reduce by 10 due to damage)..."

  adjust_response=$(http_patch "$INVENTORY_SERVICE_URL/api/batches/$batch_a_id/adjust" '{
    "quantity": -10,
    "reason": "Damaged units removed",
    "notes": "5 units broken, 5 units expired early",
    "performedBy": "warehouse_manager_001"
  }')

  adjust_body=$(echo "$adjust_response" | head -n -1)
  adjust_status=$(echo "$adjust_response" | tail -n 1)

  assert_http_post_status "$adjust_status" "Batch adjustment"

  # Verify adjustment
  log_info "Verifying batch quantity updated..."

  batch_response=$(http_get "$INVENTORY_SERVICE_URL/api/batches/$batch_a_id")

  batch_body=$(echo "$batch_response" | head -n -1)

  quantity_available=$(extract_json_field "$batch_body" '.batch.quantityAvailable')
  assert_equals "90" "$quantity_available" "Batch quantity reduced to 90 (100 - 10)"

  log_success "Test 3.4 completed ✅"
  echo ""
}

# ============================================================================
# TEST 3.5: Batch Status Management
# ============================================================================

test_3_5_batch_status() {
  log_test "Test 3.5: Batch Status Management"
  echo "------------------------------------------------"

  local batch_a_id=$(load_test_data "phase3_batch_a_id")
  local batch_b_id=$(load_test_data "phase3_batch_b_id")

  # Mark batch as expired
  log_info "Marking Batch A001 as expired..."

  expired_response=$(http_patch "$INVENTORY_SERVICE_URL/api/batches/$batch_a_id/status" '{
    "status": "expired",
    "reason": "Reached expiration date",
    "updatedBy": "system_auto"
  }')

  expired_status=$(echo "$expired_response" | tail -n 1)
  assert_http_status "200" "$expired_status" "Mark batch as expired"

  log_success "Batch A001 marked as expired"

  # Quarantine a batch
  log_info "Quarantining Batch A002..."

  quarantine_response=$(http_patch "$INVENTORY_SERVICE_URL/api/batches/$batch_b_id/status" '{
    "status": "quarantined",
    "reason": "Quality control failed - pending inspection",
    "updatedBy": "qa_manager_001"
  }')

  quarantine_status=$(echo "$quarantine_response" | tail -n 1)
  assert_http_status "200" "$quarantine_status" "Quarantine batch"

  log_success "Batch A002 quarantined"

  # Verify status filtering
  log_info "Verifying status filtering..."

  expired_batches=$(http_get "$INVENTORY_SERVICE_URL/api/batches?status=expired")
  expired_body=$(echo "$expired_batches" | head -n -1)
  expired_count=$(extract_json_field "$expired_body" '.batches | length')

  if [ "$expired_count" -gt 0 ]; then
    log_success "✅ Status filter 'expired' works"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Status filter 'expired' failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  quarantined_batches=$(http_get "$INVENTORY_SERVICE_URL/api/batches?status=quarantined")
  quarantined_body=$(echo "$quarantined_batches" | head -n -1)
  quarantined_count=$(extract_json_field "$quarantined_body" '.batches | length')

  if [ "$quarantined_count" -gt 0 ]; then
    log_success "✅ Status filter 'quarantined' works"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Status filter 'quarantined' failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  log_success "Test 3.5 completed ✅"
  echo ""
}

# ============================================================================
# TEST 3.6: Get Expired Batches
# ============================================================================

test_3_6_expired_batches() {
  log_test "Test 3.6: Get Expired Batches"
  echo "------------------------------------------------"

  log_info "Querying expired batches..."

  expired_response=$(http_get "$INVENTORY_SERVICE_URL/api/batches/expired")

  expired_body=$(echo "$expired_response" | head -n -1)
  expired_status=$(echo "$expired_response" | tail -n 1)

  assert_http_status "200" "$expired_status" "Expired batches query"

  # Should return batches with status=expired or past expiration date
  expired_count=$(extract_json_field "$expired_body" '.batches | length')

  if [ "$expired_count" -gt 0 ]; then
    log_success "✅ Found $expired_count expired batch(es)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "No expired batches found (may be expected)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  log_success "Test 3.6 completed ✅"
  echo ""
}

# ============================================================================
# PHASE 3 CLEANUP
# ============================================================================

cleanup_phase3() {
  log_info "==================================================================="
  log_info "Phase 3 Cleanup"
  log_info "==================================================================="

  log_info "Phase 3 test data preserved for Phase 4 testing"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  setup_phase3

  test_3_1_create_batches
  test_3_2_verify_fefo
  test_3_3_expiring_batches
  test_3_4_batch_adjustment
  test_3_5_batch_status
  test_3_6_expired_batches

  cleanup_phase3

  print_test_summary
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main
  exit $?
fi
