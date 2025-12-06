#!/bin/bash

# DDD Refactoring - Phase 1 Testing: Inventory Integration
# Tests that productLocations, productUOMLocations, and variantLocations automatically create inventory records

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# PHASE 1 SETUP
# ============================================================================

setup_phase1() {
  log_info "==================================================================="
  log_info "PHASE 1: Inventory Integration Tests"
  log_info "==================================================================="
  echo ""

  # Check services
  check_all_services || exit 1

  echo ""
  log_info "Creating test warehouse..."

  # Create test warehouse
  warehouse_response=$(http_post "$INVENTORY_SERVICE_URL/api/warehouses" '{
    "code": "WH-PHASE1-TEST",
    "name": "Phase 1 Test Warehouse",
    "addressLine1": "Jl. Phase 1 Test No. 123",
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
  save_test_data "phase1_warehouse_id" "$warehouse_id"

  log_success "Warehouse created: $warehouse_id"
  echo ""
}

# ============================================================================
# TEST 1.1: Create Product with Warehouse Allocation
# ============================================================================

test_1_1_product_with_location() {
  log_test "Test 1.1: Create Product with Warehouse Allocation"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Create product
  log_info "Step 1: Creating product..."

  product_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "TEST-PROD-PHASE1-001",
    "name": "Test Product Phase 1",
    "sku": "TEST-SKU-PHASE1-001",
    "description": "Testing inventory integration",
    "price": 50000,
    "stock": 0,
    "baseUnit": "PCS",
    "minimumStock": 10,
    "status": "omnichannel sales"
  }')

  product_body=$(echo "$product_response" | head -n -1)
  product_status=$(echo "$product_response" | tail -n 1)

  assert_http_status "200" "$product_status" "Product creation"

  product_id=$(extract_id_from_response "$product_body")
  save_test_data "phase1_product_id" "$product_id"

  log_success "Product created: $product_id"

  # Step 2: Create product location
  log_info "Step 2: Creating product location..."

  location_response=$(http_post "$PRODUCT_SERVICE_URL/api/product-locations" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 100
  }")

  location_body=$(echo "$location_response" | head -n -1)
  location_status=$(echo "$location_response" | tail -n 1)

  assert_http_status "200" "$location_status" "Product location creation"

  location_id=$(extract_id_from_response "$location_body")
  save_test_data "phase1_location_id" "$location_id"

  log_success "Product location created: $location_id"

  # Step 3: Verify inventory was auto-created
  log_info "Step 3: Verifying inventory auto-creation..."

  sleep 1 # Allow time for inventory creation

  inventory_response=$(http_get "$INVENTORY_SERVICE_URL/api/inventory?productId=$product_id")

  inventory_body=$(echo "$inventory_response" | head -n -1)
  inventory_status=$(echo "$inventory_response" | tail -n 1)

  assert_http_status "200" "$inventory_status" "Inventory query"

  # Validate inventory exists
  total_inventory=$(extract_json_field "$inventory_body" '.total')
  assert_equals "1" "$total_inventory" "Inventory record exists"

  # Validate quantity
  quantity_available=$(extract_json_field "$inventory_body" '.inventory[0].quantityAvailable')
  assert_equals "100" "$quantity_available" "Inventory quantity matches location"

  # Validate minimumStock copied from product
  minimum_stock=$(extract_json_field "$inventory_body" '.inventory[0].minimumStock')
  assert_equals "10" "$minimum_stock" "minimumStock copied from product"

  # Save inventory ID
  inventory_id=$(extract_json_field "$inventory_body" '.inventory[0].id')
  save_test_data "phase1_inventory_id" "$inventory_id"

  log_success "Test 1.1 completed ✅"
  echo ""
}

# ============================================================================
# TEST 1.2: Test UOM Location with Conversion
# ============================================================================

test_1_2_uom_location() {
  log_test "Test 1.2: Test UOM Location with Conversion"
  echo "------------------------------------------------"

  local product_id=$(load_test_data "phase1_product_id")
  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Create UOM
  log_info "Step 1: Creating UOM (Box of 6)..."

  uom_response=$(http_post "$PRODUCT_SERVICE_URL/api/uoms" '{
    "code": "BOX6-PHASE1",
    "name": "Box of 6 (Phase 1)",
    "conversionFactor": 6,
    "isBaseUnit": false,
    "baseUnitCode": "PCS"
  }')

  uom_body=$(echo "$uom_response" | head -n -1)
  uom_status=$(echo "$uom_response" | tail -n 1)

  assert_http_status "200" "$uom_status" "UOM creation"

  log_success "UOM created"

  # Step 2: Add UOM to product
  log_info "Step 2: Adding UOM to product..."

  product_uom_response=$(http_post "$PRODUCT_SERVICE_URL/api/uoms/products" "{
    \"productId\": \"$product_id\",
    \"uomCode\": \"BOX6-PHASE1\",
    \"uomName\": \"Box of 6 (Phase 1)\",
    \"barcode\": \"TEST-BOX6-PHASE1-001\",
    \"conversionFactor\": 6,
    \"stock\": 0,
    \"isDefault\": false
  }")

  product_uom_body=$(echo "$product_uom_response" | head -n -1)
  product_uom_status=$(echo "$product_uom_response" | tail -n 1)

  assert_http_status "200" "$product_uom_status" "Product UOM creation"

  product_uom_id=$(extract_id_from_response "$product_uom_body")
  save_test_data "phase1_product_uom_id" "$product_uom_id"

  log_success "Product UOM created: $product_uom_id"

  # Step 3: Create UOM location (10 boxes = 60 PCS, valid since 60 <= 100)
  log_info "Step 3: Creating UOM location (10 boxes = 60 PCS)..."

  uom_location_response=$(http_post "$PRODUCT_SERVICE_URL/api/product-uom-locations" "{
    \"productUOMId\": \"$product_uom_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 10,
    \"rack\": \"A1\",
    \"bin\": \"TOP\"
  }")

  uom_location_body=$(echo "$uom_location_response" | head -n -1)
  uom_location_status=$(echo "$uom_location_response" | tail -n 1)

  assert_http_status "200" "$uom_location_status" "UOM location creation"

  log_success "UOM location created"

  # Step 4: Verify inventory reflects breakdown (NOT addition)
  log_info "Step 4: Verifying inventory is still 100 PCS (not 160)..."

  sleep 1

  inventory_response=$(http_get "$INVENTORY_SERVICE_URL/api/inventory?productId=$product_id")
  inventory_body=$(echo "$inventory_response" | head -n -1)

  quantity_available=$(extract_json_field "$inventory_body" '.inventory[0].quantityAvailable')
  assert_equals "100" "$quantity_available" "Inventory is subdivision, not addition (still 100 PCS)"

  # Step 5: Test validation - try to exceed product location stock
  log_info "Step 5: Testing validation - attempting to create invalid UOM location..."

  invalid_uom_location_response=$(http_post "$PRODUCT_SERVICE_URL/api/product-uom-locations" "{
    \"productUOMId\": \"$product_uom_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 10,
    \"rack\": \"A2\",
    \"bin\": \"BOTTOM\"
  }")

  invalid_status=$(echo "$invalid_uom_location_response" | tail -n 1)

  # Should fail with 400
  if [ "$invalid_status" = "400" ]; then
    log_success "Validation works: Cannot exceed product location stock ✅"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "Validation failed: Should have blocked UOM location exceeding product stock ❌"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  log_success "Test 1.2 completed ✅"
  echo ""
}

# ============================================================================
# TEST 1.3: Test Variant Location
# ============================================================================

test_1_3_variant_location() {
  log_test "Test 1.3: Test Variant Location"
  echo "------------------------------------------------"

  local product_id=$(load_test_data "phase1_product_id")
  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Create product variant
  log_info "Step 1: Creating product variant (Red)..."

  variant_response=$(http_post "$PRODUCT_SERVICE_URL/api/variants" "{
    \"productId\": \"$product_id\",
    \"productName\": \"Test Product Phase 1\",
    \"productSKU\": \"TEST-SKU-PHASE1-001\",
    \"variantName\": \"Red\",
    \"variantSKU\": \"TEST-SKU-PHASE1-001-RED\",
    \"variantType\": \"Color\",
    \"price\": 55000,
    \"stock\": 0,
    \"status\": \"active\"
  }")

  variant_body=$(echo "$variant_response" | head -n -1)
  variant_status=$(echo "$variant_response" | tail -n 1)

  assert_http_status "200" "$variant_status" "Variant creation"

  variant_id=$(extract_id_from_response "$variant_body")
  save_test_data "phase1_variant_id" "$variant_id"

  log_success "Variant created: $variant_id"

  # Step 2: Create variant location (30 PCS, valid since 30 <= 100)
  log_info "Step 2: Creating variant location (30 PCS)..."

  variant_location_response=$(http_post "$PRODUCT_SERVICE_URL/api/variant-locations" "{
    \"variantId\": \"$variant_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 30
  }")

  variant_location_body=$(echo "$variant_location_response" | head -n -1)
  variant_location_status=$(echo "$variant_location_response" | tail -n 1)

  assert_http_status "200" "$variant_location_status" "Variant location creation"

  log_success "Variant location created"

  # Step 3: Verify inventory reflects breakdown (NOT addition)
  log_info "Step 3: Verifying inventory is still 100 PCS (not 130)..."

  sleep 1

  inventory_response=$(http_get "$INVENTORY_SERVICE_URL/api/inventory?productId=$product_id")
  inventory_body=$(echo "$inventory_response" | head -n -1)

  quantity_available=$(extract_json_field "$inventory_body" '.inventory[0].quantityAvailable')
  assert_equals "100" "$quantity_available" "Inventory is subdivision, not addition (still 100 PCS)"

  # Step 4: Test validation - try to exceed product location stock
  log_info "Step 4: Testing validation - creating Blue variant..."

  blue_variant_response=$(http_post "$PRODUCT_SERVICE_URL/api/variants" "{
    \"productId\": \"$product_id\",
    \"productName\": \"Test Product Phase 1\",
    \"productSKU\": \"TEST-SKU-PHASE1-001\",
    \"variantName\": \"Blue\",
    \"variantSKU\": \"TEST-SKU-PHASE1-001-BLUE\",
    \"variantType\": \"Color\",
    \"price\": 55000,
    \"stock\": 0,
    \"status\": \"active\"
  }")

  blue_variant_body=$(echo "$blue_variant_response" | head -n -1)
  blue_variant_id=$(extract_id_from_response "$blue_variant_body")

  log_info "Attempting to create variant location exceeding product stock..."

  invalid_variant_location_response=$(http_post "$PRODUCT_SERVICE_URL/api/variant-locations" "{
    \"variantId\": \"$blue_variant_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 80
  }")

  invalid_status=$(echo "$invalid_variant_location_response" | tail -n 1)

  # Should fail with 400 (30 Red + 80 Blue = 110 > 100)
  if [ "$invalid_status" = "400" ]; then
    log_success "Validation works: Cannot exceed product location stock ✅"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    log_error "Validation failed: Should have blocked variant location exceeding product stock ❌"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  log_success "Test 1.3 completed ✅"
  echo ""
}

# ============================================================================
# PHASE 1 CLEANUP
# ============================================================================

cleanup_phase1() {
  log_info "==================================================================="
  log_info "Phase 1 Cleanup"
  log_info "==================================================================="

  # Note: Cleanup is optional for testing purposes
  # In a real scenario, you might want to delete test data here

  log_info "Phase 1 test data preserved for Phase 2 testing"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  setup_phase1

  test_1_1_product_with_location
  test_1_2_uom_location
  test_1_3_variant_location

  cleanup_phase1

  print_test_summary
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main
  exit $?
fi
