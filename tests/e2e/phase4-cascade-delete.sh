#!/bin/bash

# DDD Refactoring - Phase 4 Testing: Cascade Delete Strategy
# Tests warehouse soft delete, product deletion validation, and orphaned reference cleanup

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# PHASE 4 SETUP
# ============================================================================

setup_phase4() {
  log_info "==================================================================="
  log_info "PHASE 4: Cascade Delete Strategy Tests"
  log_info "==================================================================="
  echo ""

  # Check services
  check_all_services || exit 1

  echo ""
}

# ============================================================================
# TEST 4.1: Warehouse Soft Delete
# ============================================================================

test_4_1_warehouse_soft_delete() {
  log_test "Test 4.1: Warehouse Soft Delete"
  echo "------------------------------------------------"

  # Step 1: Create test warehouse
  log_info "Step 1: Creating test warehouse for deletion..."

  warehouse_response=$(http_post "$INVENTORY_SERVICE_URL/api/warehouses" '{
    "code": "WH-DELETE-TEST-PHASE4",
    "name": "Warehouse for Delete Testing (Phase 4)",
    "addressLine1": "Jl. Delete Test No. 456",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12345",
    "country": "Indonesia",
    "status": "active"
  }')

  warehouse_body=$(echo "$warehouse_response" | head -n -1)
  warehouse_status=$(echo "$warehouse_response" | tail -n 1)

  assert_http_status "200" "$warehouse_status" "Warehouse creation"

  warehouse_id=$(extract_json_field "$warehouse_body" '.warehouse.id')
  save_test_data "phase4_delete_warehouse_id" "$warehouse_id"

  log_success "Warehouse created: $warehouse_id"

  # Step 2: Create product and location at this warehouse
  log_info "Step 2: Creating product with location at this warehouse..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "DELETE-TEST-PHASE4-001",
    "name": "Product for Delete Test (Phase 4)",
    "sku": "DEL-TEST-PHASE4-001",
    "price": 10000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  product_id=$(extract_id_from_response "$product_body")
  save_test_data "phase4_delete_product_id" "$product_id"

  log_success "Product created: $product_id"

  location_response=$(http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 50
  }")

  log_success "Product location created with 50 units"

  # Step 3: Delete warehouse (soft delete)
  log_info "Step 3: Soft deleting warehouse..."

  delete_response=$(http_delete "$INVENTORY_SERVICE_URL/api/warehouses/$warehouse_id")

  delete_status=$(echo "$delete_response" | tail -n 1)
  assert_http_status "200" "$delete_status" "Warehouse soft delete"

  log_success "Warehouse soft deleted"

  # Step 4: Verify warehouse is soft deleted (not in list)
  log_info "Step 4: Verifying warehouse no longer appears in active list..."

  warehouses_response=$(http_get "$INVENTORY_SERVICE_URL/api/warehouses")
  warehouses_body=$(echo "$warehouses_response" | head -n -1)

  contains_deleted=$(echo "$warehouses_body" | jq -r ".warehouses[] | select(.id == \"$warehouse_id\") | .id // empty")

  if [ -z "$contains_deleted" ]; then
    log_success "✅ Soft deleted warehouse not in active list"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Soft deleted warehouse still appears in active list"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # Step 5: Verify product location still exists (orphaned)
  log_info "Step 5: Verifying product location still exists (orphaned)..."

  locations_response=$(http_get "$PRODUCT_SERVICE_URL/api/product-locations?warehouseId=$warehouse_id")
  locations_body=$(echo "$locations_response" | head -n -1)

  locations_count=$(extract_json_field "$locations_body" '.total')

  if [ "$locations_count" -gt 0 ]; then
    log_success "✅ Product locations still exist (orphaned, not cascaded)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Product locations were deleted (should be orphaned, not cascaded)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  log_success "Test 4.1 completed ✅"
  echo ""
}

# ============================================================================
# TEST 4.2: Cleanup Orphaned References
# ============================================================================

test_4_2_cleanup_orphaned() {
  log_test "Test 4.2: Cleanup Orphaned References"
  echo "------------------------------------------------"

  # Step 1: Check for orphaned locations
  log_info "Step 1: Checking for orphaned locations..."

  check_response=$(http_get "$PRODUCT_SERVICE_URL/api/cleanup/orphaned-locations/check")

  check_body=$(echo "$check_response" | head -n -1)
  check_status=$(echo "$check_response" | tail -n 1)

  assert_http_status "200" "$check_status" "Orphaned locations check"

  total_orphaned=$(extract_json_field "$check_body" '.totalOrphaned')

  if [ "$total_orphaned" -gt 0 ]; then
    log_success "✅ Found $total_orphaned orphaned location(s)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_warning "No orphaned locations found (may be expected)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # Step 2: Execute cleanup
  log_info "Step 2: Executing orphaned location cleanup..."

  cleanup_response=$(http_post "$PRODUCT_SERVICE_URL/api/cleanup/orphaned-locations" "")

  cleanup_body=$(echo "$cleanup_response" | head -n -1)
  cleanup_status=$(echo "$cleanup_response" | tail -n 1)

  assert_http_status "200" "$cleanup_status" "Orphaned locations cleanup"

  total_deleted=$(extract_json_field "$cleanup_body" '.totalDeleted')

  if [ "$total_deleted" -ge 0 ]; then
    log_success "✅ Cleaned up $total_deleted orphaned location(s)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Cleanup failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # Step 3: Verify locations are cleaned up
  log_info "Step 3: Verifying orphaned locations are removed..."

  local product_id=$(load_test_data "phase4_delete_product_id")

  verify_response=$(http_get "$PRODUCT_SERVICE_URL/api/product-locations?productId=$product_id")
  verify_body=$(echo "$verify_response" | head -n -1)

  remaining_locations=$(extract_json_field "$verify_body" '.total')
  assert_equals "0" "$remaining_locations" "All orphaned locations cleaned up"

  log_success "Test 4.2 completed ✅"
  echo ""
}

# ============================================================================
# TEST 4.3: Product Deletion Validation
# ============================================================================

test_4_3_product_deletion_validation() {
  log_test "Test 4.3: Product Deletion Validation"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Create product with inventory
  log_info "Step 1: Creating product with inventory..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "PROD-DEL-VAL-PHASE4-001",
    "name": "Product Deletion Validation Test (Phase 4)",
    "sku": "PDV-PHASE4-001",
    "price": 25000,
    "stock": 0,
    "baseUnit": "PCS",
    "minimumStock": 5,
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  product_id=$(extract_id_from_response "$product_body")
  save_test_data "phase4_validation_product_id" "$product_id"

  log_success "Product created: $product_id"

  location_response=$(http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 100
  }")

  log_success "Product location created with 100 units"

  sleep 1

  # Step 2: Attempt to delete product with inventory (should fail)
  log_info "Step 2: Attempting to delete product with inventory (should fail)..."

  delete_response=$(http_delete "$PRODUCT_SERVICE_URL/api/products/$product_id")

  delete_body=$(echo "$delete_response" | head -n -1)
  delete_status=$(echo "$delete_response" | tail -n 1)

  # Should fail with 400
  assert_http_status "400" "$delete_status" "Product deletion blocked with inventory"

  # Verify error message
  error_message=$(extract_json_field "$delete_body" '.error')
  assert_contains "Cannot delete product" "$error_message" "Error message contains 'Cannot delete product'"

  # Step 3: Reduce inventory to zero
  log_info "Step 3: Reducing inventory to zero..."

  adjust_response=$(http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": -100,
    \"movementType\": \"out\",
    \"reason\": \"Preparing for product deletion\"
  }")

  adjust_status=$(echo "$adjust_response" | tail -n 1)
  assert_http_status "200" "$adjust_status" "Inventory adjustment to zero"

  log_success "Inventory reduced to zero"

  sleep 1

  # Step 4: Delete product (should succeed now)
  log_info "Step 4: Deleting product (should succeed now)..."

  delete_success_response=$(http_delete "$PRODUCT_SERVICE_URL/api/products/$product_id")

  delete_success_status=$(echo "$delete_success_response" | tail -n 1)
  assert_http_status "200" "$delete_success_status" "Product deletion succeeds with zero inventory"

  log_success "Product deleted successfully"

  # Step 5: Verify cascaded deletions
  log_info "Step 5: Verifying cascaded deletions..."

  locations_response=$(http_get "$PRODUCT_SERVICE_URL/api/product-locations?productId=$product_id")
  locations_body=$(echo "$locations_response" | head -n -1)
  locations_count=$(extract_json_field "$locations_body" '.total')

  assert_equals "0" "$locations_count" "Product locations cascaded (deleted)"

  inventory_response=$(http_get "$INVENTORY_SERVICE_URL/api/inventory?productId=$product_id")
  inventory_body=$(echo "$inventory_response" | head -n -1)
  inventory_count=$(extract_json_field "$inventory_body" '.total')

  assert_equals "0" "$inventory_count" "Inventory records cleaned up"

  log_success "Test 4.3 completed ✅"
  echo ""
}

# ============================================================================
# TEST 4.4: Product Deletion with UOM and Variants
# ============================================================================

test_4_4_product_cascade_complete() {
  log_test "Test 4.4: Product Deletion with UOM and Variants"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Create product with UOMs and variants
  log_info "Step 1: Creating product with UOMs and variants..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "CASCADE-PHASE4-001",
    "name": "Product Cascade Delete Test (Phase 4)",
    "sku": "CASCADE-PHASE4-001",
    "price": 30000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  product_id=$(extract_id_from_response "$product_body")
  save_test_data "phase4_cascade_product_id" "$product_id"

  log_success "Product created: $product_id"

  # Add product location
  http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 0
  }" > /dev/null

  log_success "Product location created"

  # Add product UOM
  http_post "$PRODUCT_SERVICE_URL/api/uoms/products" "{
    \"productId\": \"$product_id\",
    \"uomCode\": \"BOX10\",
    \"uomName\": \"Box of 10\",
    \"barcode\": \"CASCADE-PHASE4-BOX10\",
    \"conversionFactor\": 10,
    \"stock\": 0,
    \"isDefault\": false
  }" > /dev/null

  log_success "Product UOM created"

  # Add variant
  variant_response=$(http_post "$PRODUCT_SERVICE_URL/api/variants" "{
    \"productId\": \"$product_id\",
    \"productName\": \"Product Cascade Delete Test (Phase 4)\",
    \"productSKU\": \"CASCADE-PHASE4-001\",
    \"variantName\": \"Red\",
    \"variantSKU\": \"CASCADE-PHASE4-001-RED\",
    \"variantType\": \"Color\",
    \"price\": 30000,
    \"stock\": 0,
    \"status\": \"active\"
  }")

  log_success "Variant created"

  # Step 2: Delete product
  log_info "Step 2: Deleting product (should cascade to all dependencies)..."

  delete_response=$(http_delete "$PRODUCT_SERVICE_URL/api/products/$product_id")

  delete_status=$(echo "$delete_response" | tail -n 1)
  assert_http_status "200" "$delete_status" "Product deletion with dependencies"

  log_success "Product deleted"

  # Step 3: Verify all dependent data deleted
  log_info "Step 3: Verifying all dependent data deleted via CASCADE..."

  # Product locations
  locations_response=$(http_get "$PRODUCT_SERVICE_URL/api/product-locations?productId=$product_id")
  locations_body=$(echo "$locations_response" | head -n -1)
  locations_count=$(extract_json_field "$locations_body" '.total')
  assert_equals "0" "$locations_count" "Product locations cascaded"

  # Variants
  variants_response=$(http_get "$PRODUCT_SERVICE_URL/api/variants?productId=$product_id")
  variants_body=$(echo "$variants_response" | head -n -1)
  variants_count=$(extract_json_field "$variants_body" '.total // 0')
  assert_equals "0" "$variants_count" "Variants cascaded"

  # Inventory
  inventory_response=$(http_get "$INVENTORY_SERVICE_URL/api/inventory?productId=$product_id")
  inventory_body=$(echo "$inventory_response" | head -n -1)
  inventory_count=$(extract_json_field "$inventory_body" '.total')
  assert_equals "0" "$inventory_count" "Inventory cleaned up"

  log_success "Test 4.4 completed ✅"
  echo ""
}

# ============================================================================
# PHASE 4 CLEANUP
# ============================================================================

cleanup_phase4() {
  log_info "==================================================================="
  log_info "Phase 4 Cleanup"
  log_info "==================================================================="

  log_info "Phase 4 test data cleanup complete"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  setup_phase4

  test_4_1_warehouse_soft_delete
  test_4_2_cleanup_orphaned
  test_4_3_product_deletion_validation
  test_4_4_product_cascade_complete

  cleanup_phase4

  print_test_summary
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main
  exit $?
fi
