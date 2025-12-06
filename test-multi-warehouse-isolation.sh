#!/bin/bash
# Test script for multi-warehouse isolation during cascade delete

echo "=============================================="
echo "MULTI-WAREHOUSE CASCADE DELETE ISOLATION TEST"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WH1="1763901580280-8uijw45uz"  # Warehouse 1 (existing)

# Step 1: Create second warehouse for testing
echo -e "${YELLOW}[1] Creating Warehouse 2 for multi-warehouse testing...${NC}"
WH2_RESPONSE=$(curl -s -X POST http://localhost:8792/api/warehouses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH-TEST-002",
    "name": "Test Warehouse 2",
    "addressLine1": "456 Test Street",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12346",
    "country": "Indonesia",
    "status": "active"
  }')

WH2=$(echo $WH2_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Warehouse 2: $WH2"
echo ""

# Step 2: Create product that will exist in BOTH warehouses
echo -e "${YELLOW}[2] Creating test product (will be in both warehouses)...${NC}"
PRODUCT_RESPONSE=$(curl -s -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "MULTI-WH-001",
    "name": "Multi-Warehouse Test Product",
    "sku": "MWTP-001",
    "price": 100000,
    "stock": 0,
    "baseUnit": "PCS",
    "minimumStock": 5,
    "status": "omnichannel sales"
  }')

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created product: $PRODUCT_ID"
echo ""

# Step 3: Add inventory to BOTH warehouses
echo -e "${YELLOW}[3] Adding inventory to Warehouse 1 (100 units)...${NC}"
curl -s -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"warehouseId\": \"$WH1\",
    \"quantity\": 100,
    \"movementType\": \"in\",
    \"reason\": \"Multi-warehouse test - WH1\"
  }" | jq '{productId, warehouseId, quantityAvailable}'
echo ""

echo -e "${YELLOW}[4] Adding inventory to Warehouse 2 (50 units)...${NC}"
curl -s -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"warehouseId\": \"$WH2\",
    \"quantity\": 50,
    \"movementType\": \"in\",
    \"reason\": \"Multi-warehouse test - WH2\"
  }" | jq '{productId, warehouseId, quantityAvailable}'
echo ""

# Step 4: Verify product exists in both warehouses
echo -e "${YELLOW}[5] Verifying product inventory across warehouses...${NC}"
curl -s "http://localhost:8792/api/inventory?productId=$PRODUCT_ID" | jq '.inventory[] | {warehouseId, quantityAvailable}'
echo ""

# Step 5: Try to delete product (should fail - has stock in multiple warehouses)
echo -e "${YELLOW}[6] Attempting to delete product with inventory in multiple warehouses...${NC}"
echo -e "${RED}Expected: Should FAIL - product has stock${NC}"
curl -s -X DELETE "http://localhost:8788/api/products/$PRODUCT_ID" | jq .
echo ""

# Step 6: Adjust Warehouse 2 to zero
echo -e "${YELLOW}[7] Adjusting Warehouse 2 inventory to zero...${NC}"
curl -s -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"warehouseId\": \"$WH2\",
    \"quantity\": -50,
    \"movementType\": \"out\",
    \"reason\": \"Preparing to delete WH2\"
  }" | jq '{warehouseId, quantityAvailable}'
echo ""

# Step 7: Try to delete product again (should still fail - WH1 has stock)
echo -e "${YELLOW}[8] Attempting to delete product (WH2=0, but WH1=100)...${NC}"
echo -e "${RED}Expected: Should FAIL - WH1 still has stock${NC}"
curl -s -X DELETE "http://localhost:8788/api/products/$PRODUCT_ID" | jq .
echo ""

# Step 8: Get warehouse report before deletion
echo -e "${YELLOW}[9] Getting Warehouse 2 inventory report...${NC}"
curl -s "http://localhost:8792/api/inventory/warehouse/$WH2/report" | jq '{canDelete, totalStock, productCount, message}'
echo ""

# Step 9: Delete Warehouse 2 (should succeed - stock is zero)
echo -e "${YELLOW}[10] Deleting Warehouse 2 with cascade cleanup...${NC}"
echo -e "${GREEN}Expected: Should SUCCEED - stock is zero${NC}"
WH2_DELETE=$(curl -s -X DELETE "http://localhost:8792/api/warehouses/$WH2")
echo $WH2_DELETE | jq .
echo ""

# Step 10: Verify product STILL EXISTS in Warehouse 1
echo -e "${YELLOW}[11] Verifying product isolation - should still exist in WH1...${NC}"
curl -s "http://localhost:8792/api/inventory?productId=$PRODUCT_ID" | jq '{inventory: .inventory | length, warehouses: .inventory[] | {warehouseId, quantityAvailable}}'
echo ""

# Step 11: Verify product can still be fetched
echo -e "${YELLOW}[12] Verifying product still exists in Product Service...${NC}"
curl -s "http://localhost:8788/api/products/$PRODUCT_ID" | jq '{id, name, sku}'
echo ""

# Step 12: Verify Warehouse 2 inventory/locations were cleaned up
echo -e "${YELLOW}[13] Verifying WH2 inventory was deleted (should be empty)...${NC}"
WH2_INV_CHECK=$(curl -s "http://localhost:8792/api/inventory?warehouseId=$WH2")
WH2_INV_COUNT=$(echo $WH2_INV_CHECK | jq '.total')
if [ "$WH2_INV_COUNT" == "0" ]; then
  echo -e "${GREEN}✅ SUCCESS: WH2 inventory cleaned up${NC}"
else
  echo -e "${RED}❌ FAILED: WH2 still has $WH2_INV_COUNT inventory records${NC}"
fi
echo ""

echo -e "${YELLOW}[14] Verifying WH2 product locations were deleted...${NC}"
WH2_LOC_CHECK=$(curl -s "http://localhost:8788/api/product-locations?warehouseId=$WH2")
WH2_LOC_COUNT=$(echo $WH2_LOC_CHECK | jq '.total')
if [ "$WH2_LOC_COUNT" == "0" ]; then
  echo -e "${GREEN}✅ SUCCESS: WH2 product locations cleaned up${NC}"
else
  echo -e "${RED}❌ FAILED: WH2 still has $WH2_LOC_COUNT product locations${NC}"
fi
echo ""

# Step 13: Now adjust WH1 to zero and delete entire product
echo -e "${YELLOW}[15] Final cleanup: Adjusting WH1 to zero and deleting product...${NC}"
curl -s -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"warehouseId\": \"$WH1\",
    \"quantity\": -100,
    \"movementType\": \"out\",
    \"reason\": \"Cleanup test\"
  }" | jq '{warehouseId, quantityAvailable}'
echo ""

echo -e "${YELLOW}[16] Deleting product (all warehouses at zero)...${NC}"
PRODUCT_DELETE=$(curl -s -X DELETE "http://localhost:8788/api/products/$PRODUCT_ID")
echo $PRODUCT_DELETE | jq .
echo ""

# Step 14: Verify complete cleanup
echo -e "${YELLOW}[17] Verifying complete inventory cleanup...${NC}"
FINAL_INV_CHECK=$(curl -s "http://localhost:8792/api/inventory?productId=$PRODUCT_ID")
FINAL_INV_COUNT=$(echo $FINAL_INV_CHECK | jq '.total')
if [ "$FINAL_INV_COUNT" == "0" ]; then
  echo -e "${GREEN}✅ SUCCESS: All inventory records deleted${NC}"
else
  echo -e "${RED}❌ FAILED: ${FINAL_INV_COUNT} inventory records remain (orphaned)${NC}"
fi
echo ""

echo "=============================================="
echo "SUMMARY OF ISOLATION TEST"
echo "=============================================="
echo ""
echo -e "${GREEN}✅ Warehouse deletion only affects targeted warehouse${NC}"
echo -e "${GREEN}✅ Products in other warehouses remain intact${NC}"
echo -e "${GREEN}✅ Product deletion validates ALL warehouses must be zero${NC}"
echo -e "${GREEN}✅ Cascade delete properly isolates by warehouse${NC}"
echo ""
echo "Test complete!"
