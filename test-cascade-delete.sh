#!/bin/bash
# Test script for cascade delete validation

echo "=== Testing Product Cascade Delete ==="
echo ""

echo "1. Creating test product..."
PRODUCT_RESPONSE=$(curl -s -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "CASCADE-TEST-001",
    "name": "Cascade Delete Test Product",
    "sku": "CDT-001",
    "price": 50000,
    "stock": 0,
    "baseUnit": "PCS",
    "minimumStock": 10,
    "status": "omnichannel sales"
  }')

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created product: $PRODUCT_ID"
echo ""

echo "2. Adding inventory to warehouse..."
curl -s -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"warehouseId\": \"1763901580280-8uijw45uz\",
    \"quantity\": 100,
    \"movementType\": \"in\",
    \"reason\": \"Testing cascade delete\"
  }" | jq .
echo ""

echo "3. Checking inventory exists..."
curl -s "http://localhost:8792/api/inventory?productId=$PRODUCT_ID" | jq .
echo ""

echo "4. Attempting to delete product with inventory (should fail)..."
DELETE_FAIL=$(curl -s -X DELETE http://localhost:8788/api/products/$PRODUCT_ID)
echo $DELETE_FAIL | jq .
echo ""

echo "5. Adjusting inventory to zero..."
curl -s -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"warehouseId\": \"1763901580280-8uijw45uz\",
    \"quantity\": -100,
    \"movementType\": \"out\",
    \"reason\": \"Preparing for deletion\"
  }" | jq .
echo ""

echo "6. Deleting product (should succeed and clean up inventory)..."
DELETE_SUCCESS=$(curl -s -X DELETE http://localhost:8788/api/products/$PRODUCT_ID)
echo $DELETE_SUCCESS | jq .
echo ""

echo "7. Verifying inventory was deleted..."
INVENTORY_CHECK=$(curl -s "http://localhost:8792/api/inventory?productId=$PRODUCT_ID")
echo $INVENTORY_CHECK | jq .
INVENTORY_COUNT=$(echo $INVENTORY_CHECK | jq '.total')
echo ""

if [ "$INVENTORY_COUNT" == "0" ]; then
  echo "✅ SUCCESS: Inventory was properly cascade deleted!"
else
  echo "❌ FAILED: Inventory records still exist (orphaned)"
fi
echo ""

echo "=== Testing Warehouse Inventory Report ==="
echo ""

echo "8. Getting warehouse inventory report..."
curl -s "http://localhost:8792/api/inventory/warehouse/1763901580280-8uijw45uz/report" | jq .
echo ""

echo "Test complete!"
