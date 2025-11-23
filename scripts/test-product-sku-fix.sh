#!/bin/bash

# =============================================
# Test Product SKU Fix
# =============================================
# This script tests that the SKU uniqueness check is working correctly
# Run this script after starting the product service (pnpm dev)
# =============================================

set -e

echo "🧪 Testing Product SKU Uniqueness Fix"
echo "======================================"
echo ""

# Check if service is running
if ! curl -s http://localhost:8788/api/products > /dev/null 2>&1; then
    echo "❌ Error: Product service is not running on port 8788"
    echo "Please start the service first:"
    echo "  cd services/product-service && pnpm dev"
    exit 1
fi

echo "✅ Product service is running"
echo ""

# Test 1: Create a new product (should succeed)
echo "Test 1: Creating a new product..."
RESPONSE=$(curl -s -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-BARCODE-001",
    "name": "Test Product",
    "sku": "TEST-SKU-001",
    "description": "Test product for validation",
    "price": 50000,
    "retailPrice": 60000,
    "stock": 10
  }')

if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ Product created successfully"
    PRODUCT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Product ID: $PRODUCT_ID"
else
    echo "❌ Failed to create product"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 2: Try to create another product with the same SKU (should fail)
echo "Test 2: Attempting to create product with duplicate SKU..."
RESPONSE=$(curl -s -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-BARCODE-002",
    "name": "Another Test Product",
    "sku": "TEST-SKU-001",
    "description": "Should fail due to duplicate SKU",
    "price": 60000,
    "retailPrice": 70000,
    "stock": 20
  }')

if echo "$RESPONSE" | grep -q 'SKU_ALREADY_EXISTS'; then
    echo "✅ Duplicate SKU correctly rejected"
    echo "   Error message: $(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
else
    echo "❌ Duplicate SKU was not rejected!"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 3: Try to create another product with the same barcode (should fail)
echo "Test 3: Attempting to create product with duplicate barcode..."
RESPONSE=$(curl -s -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-BARCODE-001",
    "name": "Yet Another Test Product",
    "sku": "TEST-SKU-003",
    "description": "Should fail due to duplicate barcode",
    "price": 70000,
    "retailPrice": 80000,
    "stock": 30
  }')

if echo "$RESPONSE" | grep -q 'BARCODE_ALREADY_EXISTS'; then
    echo "✅ Duplicate barcode correctly rejected"
    echo "   Error message: $(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
else
    echo "❌ Duplicate barcode was not rejected!"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 4: Create a valid product with different SKU and barcode (should succeed)
echo "Test 4: Creating another valid product..."
RESPONSE=$(curl -s -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-BARCODE-004",
    "name": "Valid Test Product",
    "sku": "TEST-SKU-004",
    "description": "This should succeed",
    "price": 80000,
    "retailPrice": 90000,
    "stock": 40
  }')

if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ Second product created successfully"
    PRODUCT_ID_2=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   Product ID: $PRODUCT_ID_2"
else
    echo "❌ Failed to create second product"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

echo "======================================"
echo "✅ All tests passed!"
echo ""
echo "Summary:"
echo "  - Product creation works correctly"
echo "  - Duplicate SKU validation works"
echo "  - Duplicate barcode validation works"
echo "  - Multiple products can be created with unique SKUs/barcodes"
echo ""
echo "💡 You can now clean up test data by running:"
echo "   npx wrangler d1 execute product-db --local --file=scripts/delete-product-uom-test-data.sql"
