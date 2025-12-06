#!/bin/bash

# DDD Refactoring - Phase 2 Testing: Single Source of Truth
# Tests that Product Service delegates stock queries to Inventory Service and bundle stock is calculated from components

set -e

# Load test helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/test-helpers.sh"

# ============================================================================
# PHASE 2 SETUP
# ============================================================================

setup_phase2() {
  log_info "==================================================================="
  log_info "PHASE 2: Single Source of Truth Tests"
  log_info "==================================================================="
  echo ""

  # Check services
  check_all_services || exit 1

  # Load Phase 1 test data (or create new if running standalone)
  local product_id=$(load_test_data "phase1_product_id")

  if [ -z "$product_id" ]; then
    log_warning "Phase 1 test data not found. Running Phase 1 setup..."
    source "$SCRIPT_DIR/phase1-inventory-integration.sh"
    setup_phase1
    test_1_1_product_with_location
  fi

  echo ""
}

# ============================================================================
# TEST 2.1: Product Total Stock Endpoint
# ============================================================================

test_2_1_product_total_stock() {
  log_test "Test 2.1: Product Total Stock Endpoint"
  echo "------------------------------------------------"

  local product_id=$(load_test_data "phase1_product_id")

  log_info "Querying product total stock..."

  stock_response=$(http_get "$PRODUCT_SERVICE_URL/api/products/$product_id/stock")

  stock_body=$(echo "$stock_response" | head -n -1)
  stock_status=$(echo "$stock_response" | tail -n 1)

  assert_http_status "200" "$stock_status" "Product stock query"

  # Validate total stock
  total_stock=$(extract_json_field "$stock_body" '.totalStock')
  assert_equals "100" "$total_stock" "Total stock matches inventory"

  total_available=$(extract_json_field "$stock_body" '.totalAvailable')
  assert_equals "100" "$total_available" "Total available matches"

  total_reserved=$(extract_json_field "$stock_body" '.totalReserved')
  assert_equals "0" "$total_reserved" "Total reserved is 0"

  # Validate warehouse breakdown
  warehouse_count=$(extract_json_field "$stock_body" '.warehouses | length')
  assert_equals "1" "$warehouse_count" "One warehouse in breakdown"

  is_low_stock=$(extract_json_field "$stock_body" '.warehouses[0].isLowStock')
  assert_equals "false" "$is_low_stock" "Not low stock (100 > 10 minimumStock)"

  log_success "Test 2.1 completed ✅"
  echo ""
}

# ============================================================================
# TEST 2.2: Low Stock Detection
# ============================================================================

test_2_2_low_stock_detection() {
  log_test "Test 2.2: Low Stock Detection"
  echo "------------------------------------------------"

  local product_id=$(load_test_data "phase1_product_id")
  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Adjust inventory to create low stock situation
  log_info "Step 1: Adjusting inventory to create low stock (reduce by 95 to leave 5)..."

  adjust_response=$(http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$product_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": -95,
    \"movementType\": \"out\",
    \"reason\": \"Testing low stock detection\"
  }")

  adjust_status=$(echo "$adjust_response" | tail -n 1)
  assert_http_status "200" "$adjust_status" "Inventory adjustment"

  log_success "Inventory adjusted to 5 units"

  # Wait for inventory sync
  sleep 1

  # Step 2: Test low stock status endpoint
  log_info "Step 2: Querying low stock status..."

  low_stock_response=$(http_get "$PRODUCT_SERVICE_URL/api/products/$product_id/low-stock")

  low_stock_body=$(echo "$low_stock_response" | head -n -1)
  low_stock_status=$(echo "$low_stock_response" | tail -n 1)

  assert_http_status "200" "$low_stock_status" "Low stock query"

  # Validate low stock detection
  is_low_stock=$(extract_json_field "$low_stock_body" '.isLowStock')
  assert_equals "true" "$is_low_stock" "Low stock detected (5 < 10 minimumStock)"

  total_stock=$(extract_json_field "$low_stock_body" '.totalStock')
  assert_equals "5" "$total_stock" "Total stock is 5"

  deficit=$(extract_json_field "$low_stock_body" '.lowStockWarehouses[0].deficit')
  assert_equals "5" "$deficit" "Deficit is 5 (10 - 5)"

  log_success "Test 2.2 completed ✅"
  echo ""
}

# ============================================================================
# TEST 2.3: Virtual Bundle Stock Calculation
# ============================================================================

test_2_3_virtual_bundle_stock() {
  log_test "Test 2.3: Virtual Bundle Stock Calculation"
  echo "------------------------------------------------"

  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  # Step 1: Create component products
  log_info "Step 1: Creating bundle component products..."

  # Component 1: Baby Bottle
  bottle_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "BOTTLE-PHASE2-001",
    "name": "Baby Bottle (Phase 2)",
    "sku": "BOT-PHASE2-001",
    "price": 25000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')
  bottle_body=$(echo "$bottle_response" | head -n -1)
  bottle_id=$(extract_id_from_response "$bottle_body")
  save_test_data "phase2_bottle_id" "$bottle_id"
  log_success "Bottle created: $bottle_id"

  # Component 2: Diaper Pack
  diaper_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "DIAPER-PHASE2-001",
    "name": "Diaper Pack (Phase 2)",
    "sku": "DIA-PHASE2-001",
    "price": 45000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')
  diaper_body=$(echo "$diaper_response" | head -n -1)
  diaper_id=$(extract_id_from_response "$diaper_body")
  save_test_data "phase2_diaper_id" "$diaper_id"
  log_success "Diaper created: $diaper_id"

  # Component 3: Baby Wipes
  wipes_response=$(http_post "$PRODUCT_SERVICE_URL/api/products" '{
    "barcode": "WIPES-PHASE2-001",
    "name": "Baby Wipes (Phase 2)",
    "sku": "WIP-PHASE2-001",
    "price": 15000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }')
  wipes_body=$(echo "$wipes_response" | head -n -1)
  wipes_id=$(extract_id_from_response "$wipes_body")
  save_test_data "phase2_wipes_id" "$wipes_id"
  log_success "Wipes created: $wipes_id"

  # Step 2: Add inventory for components
  log_info "Step 2: Adding inventory for components..."

  # Bottle: 100 units (max 50 bundles = 100/2)
  http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$bottle_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 100,
    \"movementType\": \"in\",
    \"reason\": \"Initial stock for bundle testing\"
  }" > /dev/null
  log_success "Bottle inventory: 100 units (max 50 bundles)"

  # Diaper: 30 units (max 30 bundles = 30/1)
  http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$diaper_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 30,
    \"movementType\": \"in\",
    \"reason\": \"Initial stock for bundle testing\"
  }" > /dev/null
  log_success "Diaper inventory: 30 units (max 30 bundles)"

  # Wipes: 60 units (max 20 bundles = 60/3)
  http_post "$INVENTORY_SERVICE_URL/api/inventory/adjust" "{
    \"productId\": \"$wipes_id\",
    \"warehouseId\": \"$warehouse_id\",
    \"quantity\": 60,
    \"movementType\": \"in\",
    \"reason\": \"Initial stock for bundle testing\"
  }" > /dev/null
  log_success "Wipes inventory: 60 units (max 20 bundles) - LIMITING COMPONENT"

  sleep 1

  # Step 3: Create bundle
  log_info "Step 3: Creating bundle..."

  bundle_response=$(http_post "$PRODUCT_SERVICE_URL/api/bundles" "{
    \"bundleName\": \"Baby Starter Kit (Phase 2)\",
    \"bundleSKU\": \"BUNDLE-BABY-PHASE2-001\",
    \"bundlePrice\": 200000,
    \"discountPercentage\": 10,
    \"status\": \"active\",
    \"availableStock\": 0,
    \"items\": [
      {
        \"productId\": \"$bottle_id\",
        \"productSKU\": \"BOT-PHASE2-001\",
        \"productName\": \"Baby Bottle (Phase 2)\",
        \"barcode\": \"BOTTLE-PHASE2-001\",
        \"quantity\": 2,
        \"price\": 25000
      },
      {
        \"productId\": \"$diaper_id\",
        \"productSKU\": \"DIA-PHASE2-001\",
        \"productName\": \"Diaper Pack (Phase 2)\",
        \"barcode\": \"DIAPER-PHASE2-001\",
        \"quantity\": 1,
        \"price\": 45000
      },
      {
        \"productId\": \"$wipes_id\",
        \"productSKU\": \"WIP-PHASE2-001\",
        \"productName\": \"Baby Wipes (Phase 2)\",
        \"barcode\": \"WIPES-PHASE2-001\",
        \"quantity\": 3,
        \"price\": 15000
      }
    ]
  }")

  bundle_body=$(echo "$bundle_response" | head -n -1)
  bundle_status=$(echo "$bundle_response" | tail -n 1)

  assert_http_status "200" "$bundle_status" "Bundle creation"

  bundle_id=$(extract_id_from_response "$bundle_body")
  save_test_data "phase2_bundle_id" "$bundle_id"

  log_success "Bundle created: $bundle_id"

  # Step 4: Test virtual bundle stock calculation
  log_info "Step 4: Testing virtual bundle stock calculation..."

  bundle_stock_response=$(http_get "$PRODUCT_SERVICE_URL/api/bundles/$bundle_id/available-stock")

  bundle_stock_body=$(echo "$bundle_stock_response" | head -n -1)
  bundle_stock_status=$(echo "$bundle_stock_response" | tail -n 1)

  assert_http_status "200" "$bundle_stock_status" "Bundle stock query"

  # Validate available stock (should be 20: min(50, 30, 20) = 20)
  available_stock=$(extract_json_field "$bundle_stock_body" '.availableStock')
  assert_equals "20" "$available_stock" "Bundle stock correctly calculated as 20 (limited by wipes)"

  # Validate limiting component
  limiting_component_name=$(extract_json_field "$bundle_stock_body" '.limitingComponent.productName')
  assert_contains "Wipes" "$limiting_component_name" "Wipes identified as limiting component"

  # Validate component breakdown
  bottle_max_bundles=$(extract_json_field "$bundle_stock_body" '.componentAvailability[0].maxBundles')
  diaper_max_bundles=$(extract_json_field "$bundle_stock_body" '.componentAvailability[1].maxBundles')
  wipes_max_bundles=$(extract_json_field "$bundle_stock_body" '.componentAvailability[2].maxBundles')

  assert_equals "50" "$bottle_max_bundles" "Bottle can make 50 bundles"
  assert_equals "30" "$diaper_max_bundles" "Diaper can make 30 bundles"
  assert_equals "20" "$wipes_max_bundles" "Wipes can make 20 bundles (limiting)"

  log_success "Test 2.3 completed ✅"
  echo ""
}

# ============================================================================
# TEST 2.4: Warehouse-Specific Bundle Stock
# ============================================================================

test_2_4_warehouse_specific_bundle() {
  log_test "Test 2.4: Warehouse-Specific Bundle Stock"
  echo "------------------------------------------------"

  local bundle_id=$(load_test_data "phase2_bundle_id")
  local warehouse_id=$(load_test_data "phase1_warehouse_id")

  log_info "Querying warehouse-specific bundle stock..."

  bundle_stock_response=$(http_get "$PRODUCT_SERVICE_URL/api/bundles/$bundle_id/available-stock?warehouseId=$warehouse_id")

  bundle_stock_body=$(echo "$bundle_stock_response" | head -n -1)
  bundle_stock_status=$(echo "$bundle_stock_response" | tail -n 1)

  assert_http_status "200" "$bundle_stock_status" "Warehouse-specific bundle stock query"

  # Validate warehouse ID in response
  warehouse_id_response=$(extract_json_field "$bundle_stock_body" '.warehouseId')
  assert_equals "$warehouse_id" "$warehouse_id_response" "Warehouse ID matches"

  # Validate available stock (should match global calculation since single warehouse)
  available_stock=$(extract_json_field "$bundle_stock_body" '.availableStock')
  assert_equals "20" "$available_stock" "Warehouse-specific stock matches global calculation"

  log_success "Test 2.4 completed ✅"
  echo ""
}

# ============================================================================
# PHASE 2 CLEANUP
# ============================================================================

cleanup_phase2() {
  log_info "==================================================================="
  log_info "Phase 2 Cleanup"
  log_info "==================================================================="

  log_info "Phase 2 test data preserved for Phase 3 testing"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  setup_phase2

  test_2_1_product_total_stock
  test_2_2_low_stock_detection
  test_2_3_virtual_bundle_stock
  test_2_4_warehouse_specific_bundle

  cleanup_phase2

  print_test_summary
}

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main
  exit $?
fi
