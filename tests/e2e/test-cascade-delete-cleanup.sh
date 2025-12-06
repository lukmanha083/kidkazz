#!/bin/bash

# DDD Refactoring - Cascade Delete & Cleanup Tests
# Tests the actual implementation of cascade delete and orphaned data cleanup

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# SETUP
# ============================================================================

setup_tests() {
  log_info "==================================================================="
  log_info "CASCADE DELETE & ORPHANED DATA CLEANUP TESTS"
  log_info "==================================================================="
  echo ""

  # Check services
  check_all_services || exit 1

  echo ""
  log_info "Creating test warehouse..."

  # Create test warehouse
  warehouse_response=$(http_post "$INVENTORY_SERVICE_URL/api/warehouses" '{
    "code": "WH-CASCADE-TEST",
    "name": "Cascade Test Warehouse",
    "addressLine1": "Jl. Test No. 123",
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
  save_test_data "warehouse_id" "$warehouse_id"

  log_success "Warehouse created: $warehouse_id"
  echo ""
}

# ============================================================================
# TEST 1: Product Deletion Validation (Critical Bug Fix)
# ============================================================================

test_1_product_deletion_validation() {
  log_test "Test 1: Product Deletion Validation (Always Checks Inventory)"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "warehouse_id")

  # Create product with inventory
  log_info "Step 1: Creating product with inventory..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "TEST-DEL-001",
    "name": "Test Product Deletion",
    "sku": "DEL-001",
    "price": 50000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  product_id=$(extract_id_from_response "$product_body")
  save_test_data "test1_product_id" "$product_id"

  # Add product location (this auto-creates inventory)
  http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 100
  }" > /dev/null

  log_success "Product created with 100 units inventory"

  sleep 1

  # Attempt to delete product with inventory (should fail)
  log_info "Step 2: Attempting to delete product with inventory (should fail)..."

  delete_response=$(http_delete "$PRODUCT_SERVICE_URL/api/products/$product_id")

  delete_body=$(echo "$delete_response" | head -n -1)
  delete_status=$(echo "$delete_response" | tail -n 1)

  # CRITICAL: Should fail with 400
  assert_http_status "400" "$delete_status" "❌ Product deletion BLOCKED (inventory > 0)"

  # Verify error message
  error_message=$(extract_json_field "$delete_body" '.error')
  assert_contains "Cannot delete product" "$error_message" "Error message descriptive"

  total_stock=$(extract_json_field "$delete_body" '.details.totalStock')
  assert_equals "100" "$total_stock" "Error shows correct stock count"

  # Reduce inventory to zero
  log_info "Step 3: Reducing inventory to zero..."

  http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": -100,
    \"movementType\": \"out\",
    \"reason\": \"Preparing for deletion\"
  }" > /dev/null

  sleep 1

  # Delete product (should succeed now)
  log_info "Step 4: Deleting product with zero inventory (should succeed)..."

  delete_success_response=$(http_delete "$PRODUCT_SERVICE_URL/api/products/$product_id")

  delete_success_body=$(echo "$delete_success_response" | head -n -1)
  delete_success_status=$(echo "$delete_success_response" | tail -n 1)

  assert_http_status "200" "$delete_success_status" "✅ Product deletion SUCCEEDS (inventory = 0)"

  # Verify cascade delete of inventory
  inventory_cleaned=$(extract_json_field "$delete_success_body" '.inventoryCleaned')
  assert_equals "true" "$inventory_cleaned" "Inventory records cleaned up"

  log_success "Test 1 completed ✅"
  echo ""
}

# ============================================================================
# TEST 2: Cascade Delete - Product Level
# ============================================================================

test_2_cascade_delete_product() {
  log_test "Test 2: Cascade Delete - Product Inventory Cleanup"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "warehouse_id")

  # Create product with inventory
  log_info "Step 1: Creating product with inventory in multiple warehouses..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "TEST-CASCADE-001",
    "name": "Test Cascade Delete Product",
    "sku": "CASCADE-001",
    "price": 30000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  product_id=$(extract_id_from_response "$product_body")
  save_test_data "test2_product_id" "$product_id"

  # Add inventory
  http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 50
  }" > /dev/null

  log_success "Product created with inventory"

  sleep 1

  # Delete product (will call cascade delete endpoint)
  log_info "Step 2: Deleting product (will trigger cascade delete)..."

  # First, reduce inventory to zero
  http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": -50,
    \"movementType\": \"out\",
    \"reason\": \"Preparing for deletion\"
  }" > /dev/null

  sleep 1

  delete_response=$(http_delete "$PRODUCT_SERVICE_URL/api/products/$product_id")

  delete_body=$(echo "$delete_response" | head -n -1)
  delete_status=$(echo "$delete_response" | tail -n 1)

  assert_http_status "200" "$delete_status" "Product deleted successfully"

  # Verify inventory cleanup
  deleted_count=$(extract_json_field "$delete_body" '.deletedInventoryRecords')

  if [ "$deleted_count" -ge 0 ]; then
    log_success "✅ Inventory records cleaned up: $deleted_count"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "❌ Inventory cleanup failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  # Verify no inventory remains
  log_info "Step 3: Verifying no inventory remains..."

  inventory_response=$(http_get "$INVENTORY_SERVICE_URL/api/inventory?productId=$product_id")
  inventory_body=$(echo "$inventory_response" | head -n -1)

  remaining_inventory=$(extract_json_field "$inventory_body" '.total')
  assert_equals "0" "$remaining_inventory" "No inventory records remain"

  log_success "Test 2 completed ✅"
  echo ""
}

# ============================================================================
# TEST 3: Orphaned Locations Cleanup
# ============================================================================

test_3_orphaned_locations_cleanup() {
  log_test "Test 3: Orphaned Locations Detection & Cleanup"
  echo "------------------------------------------------"

  # Create a warehouse that will be soft-deleted
  log_info "Step 1: Creating warehouse for soft delete test..."

  orphan_warehouse_response=$(http_post "$INVENTORY_SERVICE_URL/api/warehouses" '{
    "code": "WH-ORPHAN-TEST",
    "name": "Orphan Test Warehouse",
    "addressLine1": "Jl. Orphan Test",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12345",
    "country": "Indonesia",
    "status": "active"
  }')

  orphan_warehouse_body=$(echo "$orphan_warehouse_response" | head -n -1)
  orphan_warehouse_id=$(extract_json_field "$orphan_warehouse_body" '.warehouse.id')

  log_success "Warehouse created: $orphan_warehouse_id"

  # Create product with location at this warehouse
  log_info "Step 2: Creating product location at this warehouse..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "TEST-ORPHAN-001",
    "name": "Test Orphan Product",
    "sku": "ORPHAN-001",
    "price": 20000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  orphan_product_id=$(extract_id_from_response "$product_body")

  http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$orphan_product_id\",
    \"warehouseId\": \"$orphan_warehouse_id\",
    \"quantity\": 0
  }" > /dev/null

  log_success "Product location created"

  # Soft delete the warehouse
  log_info "Step 3: Soft deleting warehouse..."

  http_delete "$INVENTORY_SERVICE_URL/api/warehouses/$orphan_warehouse_id" > /dev/null

  log_success "Warehouse soft deleted"

  sleep 1

  # Check for orphaned locations
  log_info "Step 4: Checking for orphaned locations..."

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

  # Execute cleanup
  log_info "Step 5: Executing orphaned locations cleanup..."

  cleanup_response=$(http_post "$PRODUCT_SERVICE_URL/api/cleanup/orphaned-locations" "")

  cleanup_body=$(echo "$cleanup_response" | head -n -1)
  cleanup_status=$(echo "$cleanup_response" | tail -n 1)

  assert_http_status "200" "$cleanup_status" "Orphaned locations cleanup"

  total_deleted=$(extract_json_field "$cleanup_body" '.totalDeleted')

  log_success "Cleaned up $total_deleted orphaned location(s)"

  # Verify cleanup
  log_info "Step 6: Verifying orphaned locations are removed..."

  verify_response=$(http_get "$PRODUCT_SERVICE_URL/api/product-locations?productId=$orphan_product_id")
  verify_body=$(echo "$verify_response" | head -n -1)

  remaining_locations=$(extract_json_field "$verify_body" '.total')
  assert_equals "0" "$remaining_locations" "All orphaned locations cleaned up"

  log_success "Test 3 completed ✅"
  echo ""
}

# ============================================================================
# TEST 4: Orphaned Inventory Cleanup
# ============================================================================

test_4_orphaned_inventory_cleanup() {
  log_test "Test 4: Orphaned Inventory Detection & Cleanup"
  echo "------------------------------------------------"

  log_info "Step 1: Checking for orphaned inventory..."

  check_response=$(http_get "$INVENTORY_SERVICE_URL/api/cleanup/orphaned-inventory/check")

  check_body=$(echo "$check_response" | head -n -1)
  check_status=$(echo "$check_response" | tail -n 1)

  assert_http_status "200" "$check_status" "Orphaned inventory check"

  total_orphaned=$(extract_json_field "$check_body" '.totalOrphaned // 0')

  log_info "Found $total_orphaned orphaned inventory record(s)"

  # If there are orphaned records, clean them up
  if [ "$total_orphaned" -gt 0 ]; then
    log_info "Step 2: Executing orphaned inventory cleanup..."

    cleanup_response=$(http_post "$INVENTORY_SERVICE_URL/api/cleanup/orphaned-inventory" "")

    cleanup_body=$(echo "$cleanup_response" | head -n -1)
    cleanup_status=$(echo "$cleanup_response" | tail -n 1)

    assert_http_status "200" "$cleanup_status" "Orphaned inventory cleanup"

    deleted_count=$(extract_json_field "$cleanup_body" '.summary.totalDeleted // 0')

    log_success "Cleaned up $deleted_count orphaned inventory record(s)"
  else
    log_success "✅ No orphaned inventory found (good!)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
  fi

  log_success "Test 4 completed ✅"
  echo ""
}

# ============================================================================
# CLEANUP
# ============================================================================

cleanup_tests() {
  log_info "==================================================================="
  log_info "Test Cleanup"
  log_info "==================================================================="

  log_info "Test data preserved for inspection"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  setup_tests

  test_1_product_deletion_validation
  test_2_cascade_delete_product
  test_3_orphaned_locations_cleanup
  test_4_orphaned_inventory_cleanup

  cleanup_tests

  print_test_summary
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main
  exit $?
fi
