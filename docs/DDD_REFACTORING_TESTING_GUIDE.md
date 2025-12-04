# DDD Refactoring - End-to-End Testing Guide

## Overview

Complete testing guide for all three phases of DDD refactoring implementation. Tests verify that the system properly implements single source of truth for inventory data, virtual bundle stock calculation, and batch-level expiration tracking.

**Branch**: `claude/refactor-with-docs-01SQc3GSy1ZLC6wRS9DKouSC`
**Prerequisites**: Services running on default ports
**Duration**: ~30-45 minutes for complete test suite

---

## Environment Setup

### 1. Start All Services

```bash
# Terminal 1 - Product Service
cd services/product-service
npm run dev
# Should start on http://localhost:8788

# Terminal 2 - Inventory Service
cd services/inventory-service
npm run dev
# Should start on http://localhost:8792

# Terminal 3 - Admin Dashboard (optional, for visual verification)
cd apps/admin-dashboard
npm run dev
# Should start on http://localhost:3000
```

### 2. Verify Services are Running

```bash
# Test Product Service health
curl http://localhost:8788/health
# Expected: {"status":"healthy","service":"product-service"}

# Test Inventory Service health
curl http://localhost:8792/health
# Expected: {"status":"healthy","service":"inventory-service"}
```

---

## Database Migrations (Phase 2C & Phase 3)

**⚠️ IMPORTANT**: Before testing, you must run database migrations to update the schema for Phase 2C (cleanup) and Phase 3 (batch tracking).

### Migration 1: Add Inventory Batches Table (Phase 3)

This migration adds the `inventory_batches` table for batch/lot tracking with FEFO support.

```bash
# Navigate to Inventory Service
cd services/inventory-service

# Apply migration using Wrangler D1 (recommended for development)
npx wrangler d1 migrations apply inventory-db --local

# This will apply migration: 0003_add_inventory_batches_table.sql
```

**Migration File**: `services/inventory-service/migrations/0003_add_inventory_batches_table.sql`

**What it does**:
- Creates `inventory_batches` table with batch identification, expiration tracking, and traceability fields
- Adds indexes for efficient FEFO (First Expired, First Out) queries
- Enables batch-level expiration tracking (DDD fix: expiration is a batch characteristic, not product characteristic)

### Migration 2: Remove Deprecated Stock Fields (Phase 2C)

This migration removes the deprecated `stock` and `availableStock` fields from Product Service.

```bash
# Navigate to Product Service
cd services/product-service

# Apply migration using Wrangler D1 (recommended for development)
npx wrangler d1 migrations apply product-db --local

# This will apply migration: 0017_remove_deprecated_stock_fields.sql
```

**Migration File**: `services/product-service/migrations/0017_remove_deprecated_stock_fields.sql`

**What it does**:
- Removes `products.stock` column (stock is now managed by Inventory Service only)
- Removes `productBundles.availableStock` column (bundles now use virtual stock calculation)
- Enforces single source of truth for stock data

**Note**: For production deployment, remove the `--local` flag:
```bash
# Production migrations
cd services/product-service
npx wrangler d1 migrations apply product-db

cd services/inventory-service
npx wrangler d1 migrations apply inventory-db
```

### Verification

After running migrations, verify the schema changes:

```bash
# Verify inventory_batches table exists
curl http://localhost:8792/api/batches
# Expected: {"batches": [], "total": 0}

# Verify product endpoints still work (without stock field)
curl http://localhost:8788/api/products
# Expected: Products array without stock field

# Verify bundle endpoints work (without availableStock field)
curl http://localhost:8788/api/bundles
# Expected: Bundles array without availableStock field
```

### Migration Rollback (If Needed)

If you need to rollback migrations:

```bash
# Product Service: Add stock fields back
ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE productBundles ADD COLUMN availableStock INTEGER DEFAULT 0 NOT NULL;

# Inventory Service: Drop inventory_batches table
DROP TABLE IF EXISTS inventory_batches;
```

---

## Phase 1 Testing - Inventory Integration

**Goal**: Verify that productLocations, productUOMLocations, and variantLocations automatically create inventory records.

### Test 1.1: Create Product with Warehouse Allocation

```bash
# Step 1: Create a warehouse (if not exists)
curl -X POST http://localhost:8792/api/warehouses \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH-TEST-001",
    "name": "Test Warehouse Jakarta",
    "addressLine1": "Jl. Test No. 123",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12345",
    "country": "Indonesia",
    "status": "active"
  }'

# Save the warehouse ID from response
# Example response: {"warehouse": {"id": "wh_12345..."}}
```

```bash
# Step 2: Create a product
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "TEST-PROD-001",
    "name": "Test Product Phase 1",
    "sku": "TEST-SKU-001",
    "description": "Testing inventory integration",
    "price": 50000,
    "stock": 0,
    "baseUnit": "PCS",
    "minimumStock": 10,
    "status": "omnichannel sales"
  }'

# Save the product ID from response
# Example response: {"id": "prod_12345..."}
```

```bash
# Step 3: Create product location (should auto-create inventory)
curl -X POST http://localhost:8788/api/product-locations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_12345...",
    "warehouseId": "wh_12345...",
    "quantity": 100
  }'

# Expected: Location created successfully
```

```bash
# Step 4: Verify inventory was created automatically
curl "http://localhost:8792/api/inventory?productId=prod_12345..."

# Expected response:
# {
#   "inventory": [
#     {
#       "id": "inv_...",
#       "productId": "prod_12345...",
#       "warehouseId": "wh_12345...",
#       "quantityAvailable": 100,
#       "minimumStock": 10,  # ✅ Copied from product!
#       ...
#     }
#   ],
#   "total": 1
# }
```

**✅ Pass Criteria**:
- Inventory record exists
- `quantityAvailable` = 100
- `minimumStock` = 10 (copied from product)

### Test 1.2: Test UOM Location with Conversion

**⚠️ IMPORTANT**: UOM locations are **subdivisions** of product location stock, not additions!

**Stock Consistency Rule**:
```
Product Location Quantity >= Sum of UOM Location Quantities (in base units)
```

For example:
- Product location: 100 PCS
- UOM location: 10 boxes × 6 = 60 PCS ✅ Valid (60 <= 100)
- UOM location: 20 boxes × 6 = 120 PCS ❌ Invalid (120 > 100)

```bash
# Step 1: Create UOM
curl -X POST http://localhost:8788/api/uoms \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BOX6",
    "name": "Box of 6",
    "conversionFactor": 6,
    "isBaseUnit": false,
    "baseUnitCode": "PCS"
  }'

# Save UOM ID
```

```bash
# Step 2: Add UOM to product
curl -X POST http://localhost:8788/api/uoms/products \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_12345...",
    "uomCode": "BOX6",
    "uomName": "Box of 6",
    "barcode": "TEST-BOX6-001",
    "conversionFactor": 6,
    "stock": 0,
    "isDefault": false
  }'

# Save productUOM ID from response
```

```bash
# Step 3: Create UOM location (10 boxes = 60 PCS, which is valid since 60 <= 100)
curl -X POST http://localhost:8788/api/product-uom-locations \
  -H "Content-Type: application/json" \
  -d '{
    "productUOMId": "puom_...",
    "warehouseId": "wh_12345...",
    "quantity": 10,
    "rack": "A1",
    "bin": "TOP"
  }'

# Expected: Success - UOM location created
```

```bash
# Step 4: Verify inventory reflects the breakdown (NOT addition)
curl "http://localhost:8792/api/inventory?productId=prod_12345..."

# Expected:
# quantityAvailable = 100 PCS (unchanged from Test 1.1)
#
# Stock breakdown:
# - Total: 100 PCS at warehouse
# - UOM breakdown: 10 boxes (60 PCS) + 40 PCS loose = 100 PCS total
```

```bash
# Step 5: Test validation - try to exceed product location stock (should fail)
curl -X POST http://localhost:8788/api/product-uom-locations \
  -H "Content-Type: application/json" \
  -d '{
    "productUOMId": "puom_...",
    "warehouseId": "wh_12345...",
    "quantity": 10,
    "rack": "A2",
    "bin": "BOTTOM"
  }'

# Expected: 400 Error
# {
#   "error": "Stock validation failed for warehouse: Total UOM stock at this
#             warehouse would be 120 PCS, but product location stock is only
#             100 PCS. Please adjust product location stock first or reduce
#             UOM quantities."
# }
```

**✅ Pass Criteria**:
- Inventory `quantityAvailable` = 100 (NOT 160!)
- UOM location stores quantity in UOM units (10 boxes)
- System prevents exceeding product location stock
- UOM locations are subdivisions, not additions

### Test 1.3: Test Variant Location

**⚠️ IMPORTANT**: Like UOM locations, variant locations are also **subdivisions** of product location stock!

**Stock Consistency Rule**:
```
Product Location Quantity >= Sum of Variant Location Quantities
```

For example:
- Product location: 100 PCS
- Variant Red: 30 PCS ✅ Valid (30 <= 100)
- Variant Blue: 70 PCS ✅ Valid (30 + 70 = 100)
- Variant Green: 20 PCS ❌ Invalid (30 + 70 + 20 = 120 > 100)

```bash
# Step 1: Create product variant
curl -X POST http://localhost:8788/api/variants \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_12345...",
    "productName": "Test Product Phase 1",
    "productSKU": "TEST-SKU-001",
    "variantName": "Red",
    "variantSKU": "TEST-SKU-001-RED",
    "variantType": "Color",
    "price": 55000,
    "stock": 0,
    "status": "active"
  }'

# Save variant ID
```

```bash
# Step 2: Create variant location (30 PCS, which is valid since 30 <= 100)
curl -X POST http://localhost:8788/api/variant-locations \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "var_...",
    "warehouseId": "wh_12345...",
    "quantity": 30
  }'

# Expected: Success - Variant location created
```

```bash
# Step 3: Verify inventory reflects the breakdown (NOT addition)
curl "http://localhost:8792/api/inventory?productId=prod_12345..."

# Expected:
# quantityAvailable = 100 PCS (unchanged from Test 1.1)
#
# Stock breakdown:
# - Total: 100 PCS at warehouse
# - Variant breakdown: 30 PCS Red + 70 PCS other variants/loose = 100 PCS total
```

```bash
# Step 4: Test validation - try to exceed product location stock (should fail)
curl -X POST http://localhost:8788/api/variants \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_12345...",
    "productName": "Test Product Phase 1",
    "productSKU": "TEST-SKU-001",
    "variantName": "Blue",
    "variantSKU": "TEST-SKU-001-BLUE",
    "variantType": "Color",
    "price": 55000,
    "stock": 0,
    "status": "active"
  }'

# Save variant ID as var_blue_...

curl -X POST http://localhost:8788/api/variant-locations \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "var_blue_...",
    "warehouseId": "wh_12345...",
    "quantity": 80
  }'

# Expected: 400 Error
# {
#   "error": "Stock validation failed for warehouse: Total variant stock at this
#             warehouse would be 110 PCS, but product location stock is only
#             100 PCS. Please adjust product location stock first or reduce
#             variant quantities."
# }
```

**✅ Pass Criteria**:
- Inventory `quantityAvailable` = 100 (NOT 130!)
- Variant location stores quantity normally
- System prevents exceeding product location stock
- Variant locations are subdivisions, not additions

---

## Phase 2 Testing - Single Source of Truth

**Goal**: Verify that Product Service delegates stock queries to Inventory Service and bundle stock is calculated from components.

### Test 2.1: Product Total Stock Endpoint

```bash
# Test total stock aggregation across warehouses
curl http://localhost:8788/api/products/prod_12345.../stock

# Expected response:
# {
#   "productId": "prod_12345...",
#   "totalStock": 210,
#   "totalReserved": 0,
#   "totalAvailable": 210,
#   "warehouses": [
#     {
#       "warehouseId": "wh_12345...",
#       "quantityAvailable": 210,
#       "quantityReserved": 0,
#       "minimumStock": 10,
#       "isLowStock": false
#     }
#   ]
# }
```

**✅ Pass Criteria**:
- `totalStock` = 210 (matches Phase 1 test)
- Warehouse breakdown shows correct data
- `isLowStock` = false (210 > 10 minimumStock)

### Test 2.2: Low Stock Detection

```bash
# Step 1: Adjust inventory to create low stock situation
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_12345...",
    "warehouseId": "wh_12345...",
    "quantity": -205,
    "movementType": "out",
    "reason": "Testing low stock detection"
  }'

# This should leave 5 units (below minimumStock of 10)
```

```bash
# Step 2: Test low stock status endpoint
curl http://localhost:8788/api/products/prod_12345.../low-stock

# Expected response:
# {
#   "productId": "prod_12345...",
#   "isLowStock": true,
#   "totalStock": 5,
#   "lowStockWarehouses": [
#     {
#       "warehouseId": "wh_12345...",
#       "currentStock": 5,
#       "minimumStock": 10,
#       "deficit": 5
#     }
#   ],
#   "message": "Low stock in 1 warehouse(s)"
# }
```

**✅ Pass Criteria**:
- `isLowStock` = true
- `deficit` = 5 (10 - 5)
- Message clearly states issue

### Test 2.3: Virtual Bundle Stock Calculation

```bash
# Step 1: Create component products for bundle
# Component 1: Baby Bottle
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "BOTTLE-001",
    "name": "Baby Bottle",
    "sku": "BOT-001",
    "price": 25000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }'

# Save product ID as bottle_id
```

```bash
# Component 2: Diaper Pack
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "DIAPER-001",
    "name": "Diaper Pack",
    "sku": "DIA-001",
    "price": 45000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }'

# Save product ID as diaper_id
```

```bash
# Component 3: Baby Wipes
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "WIPES-001",
    "name": "Baby Wipes",
    "sku": "WIP-001",
    "price": 15000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }'

# Save product ID as wipes_id
```

```bash
# Step 2: Add inventory for components
# Bottle: 100 units (max 50 bundles = 100/2)
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "bottle_id",
    "warehouseId": "wh_12345...",
    "quantity": 100,
    "movementType": "in",
    "reason": "Initial stock for bundle testing"
  }'

# Diaper: 30 units (max 30 bundles = 30/1)
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "diaper_id",
    "warehouseId": "wh_12345...",
    "quantity": 30,
    "movementType": "in",
    "reason": "Initial stock for bundle testing"
  }'

# Wipes: 60 units (max 20 bundles = 60/3)
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "wipes_id",
    "warehouseId": "wh_12345...",
    "quantity": 60,
    "movementType": "in",
    "reason": "Initial stock for bundle testing"
  }'
```

```bash
# Step 3: Create bundle
curl -X POST http://localhost:8788/api/bundles \
  -H "Content-Type: application/json" \
  -d '{
    "bundleName": "Baby Starter Kit",
    "bundleSKU": "BUNDLE-BABY-001",
    "bundlePrice": 200000,
    "discountPercentage": 10,
    "status": "active",
    "availableStock": 0,
    "items": [
      {
        "productId": "bottle_id",
        "productSKU": "BOT-001",
        "productName": "Baby Bottle",
        "barcode": "BOTTLE-001",
        "quantity": 2,
        "price": 25000
      },
      {
        "productId": "diaper_id",
        "productSKU": "DIA-001",
        "productName": "Diaper Pack",
        "barcode": "DIAPER-001",
        "quantity": 1,
        "price": 45000
      },
      {
        "productId": "wipes_id",
        "productSKU": "WIP-001",
        "productName": "Baby Wipes",
        "barcode": "WIPES-001",
        "quantity": 3,
        "price": 15000
      }
    ]
  }'

# Save bundle ID
```

```bash
# Step 4: Test virtual bundle stock calculation
curl http://localhost:8788/api/bundles/bundle_id/available-stock

# Expected response:
# {
#   "bundleId": "bundle_id",
#   "bundleName": "Baby Starter Kit",
#   "bundleSKU": "BUNDLE-BABY-001",
#   "warehouseId": "all",
#   "availableStock": 20,  # min(50, 30, 20) = 20
#   "limitingComponent": {
#     "productId": "wipes_id",
#     "productName": "Baby Wipes",
#     "available": 60,
#     "required": 3
#   },
#   "componentAvailability": [
#     {
#       "productId": "bottle_id",
#       "productName": "Baby Bottle",
#       "productSKU": "BOT-001",
#       "requiredPerBundle": 2,
#       "availableStock": 100,
#       "maxBundles": 50
#     },
#     {
#       "productId": "diaper_id",
#       "productName": "Diaper Pack",
#       "productSKU": "DIA-001",
#       "requiredPerBundle": 1,
#       "availableStock": 30,
#       "maxBundles": 30
#     },
#     {
#       "productId": "wipes_id",
#       "productName": "Baby Wipes",
#       "productSKU": "WIP-001",
#       "requiredPerBundle": 3,
#       "availableStock": 60,
#       "maxBundles": 20
#     }
#   ],
#   "message": "20 bundles can be assembled"
# }
```

**✅ Pass Criteria**:
- `availableStock` = 20 (correctly calculated as min of max bundles)
- `limitingComponent` identifies "Baby Wipes" as bottleneck
- Component breakdown shows correct calculations

### Test 2.4: Warehouse-Specific Bundle Stock

```bash
# Test bundle stock for specific warehouse
curl "http://localhost:8788/api/bundles/bundle_id/available-stock?warehouseId=wh_12345..."

# Expected:
# Same as Test 2.3 but with "warehouseId": "wh_12345..."
```

**✅ Pass Criteria**:
- Calculation works for specific warehouse
- Results match global calculation (single warehouse scenario)

---

## Phase 3 Testing - Batch Tracking & FEFO

**Goal**: Verify batch-level inventory tracking with expiration dates and FEFO ordering.

### Test 3.1: Create Batches with Expiration Dates

```bash
# Create product with expiration tracking
curl -X POST http://localhost:8788/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "MILK-001",
    "name": "Fresh Milk 1L",
    "sku": "MILK-SKU-001",
    "price": 15000,
    "stock": 0,
    "baseUnit": "PCS",
    "status": "omnichannel sales"
  }'

# Save product ID as milk_id
```

```bash
# Create inventory record first
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "milk_id",
    "warehouseId": "wh_12345...",
    "quantity": 0,
    "movementType": "adjustment",
    "reason": "Initialize inventory for batch tracking"
  }'

# Save inventory ID from response
```

```bash
# Create Batch A001 - expires in 15 days
EXPIRY_DATE_A=$(date -u -d "+15 days" +"%Y-%m-%dT%H:%M:%S.000Z")
curl -X POST http://localhost:8792/api/batches \
  -H "Content-Type: application/json" \
  -d "{
    \"inventoryId\": \"inv_...\",
    \"productId\": \"milk_id\",
    \"warehouseId\": \"wh_12345...\",
    \"batchNumber\": \"A001\",
    \"expirationDate\": \"$EXPIRY_DATE_A\",
    \"quantityAvailable\": 100,
    \"supplier\": \"Supplier A\",
    \"manufactureDate\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
  }"

# Save batch ID as batch_a001
```

```bash
# Create Batch A002 - expires in 30 days
EXPIRY_DATE_B=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%S.000Z")
curl -X POST http://localhost:8792/api/batches \
  -H "Content-Type: application/json" \
  -d "{
    \"inventoryId\": \"inv_...\",
    \"productId\": \"milk_id\",
    \"warehouseId\": \"wh_12345...\",
    \"batchNumber\": \"A002\",
    \"expirationDate\": \"$EXPIRY_DATE_B\",
    \"quantityAvailable\": 50,
    \"supplier\": \"Supplier A\"
  }"

# Save batch ID as batch_a002
```

```bash
# Create Batch B001 - no expiration (long shelf life)
curl -X POST http://localhost:8792/api/batches \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "inv_...",
    "productId": "milk_id",
    "warehouseId": "wh_12345...",
    "batchNumber": "B001",
    "expirationDate": null,
    "quantityAvailable": 75,
    "supplier": "Supplier B"
  }'
```

### Test 3.2: Verify FEFO Ordering

```bash
# Get batches for product (should be FEFO ordered)
curl "http://localhost:8792/api/batches/product/milk_id/warehouse/wh_12345..."

# Expected order:
# 1. Batch A001 (expires in 15 days) - FIRST
# 2. Batch A002 (expires in 30 days) - SECOND
# 3. Batch B001 (no expiration) - LAST
```

**✅ Pass Criteria**:
- Batches ordered by expiration date (earliest first)
- Non-expiring batches come last
- All batch details present

### Test 3.3: Get Expiring Batches

```bash
# Get batches expiring within 30 days
curl "http://localhost:8792/api/batches/expiring?days=30"

# Expected:
# - Batch A001 (expires in 15 days) ✅
# - Batch A002 (expires in 30 days) ✅
# - Batch B001 NOT included (no expiration)
```

**✅ Pass Criteria**:
- Only batches with expiration dates returned
- Filtered correctly by days parameter
- Ordered by expiration date

### Test 3.4: Batch Quantity Adjustment

```bash
# Adjust batch quantity (e.g., damage, spoilage)
curl -X PATCH http://localhost:8792/api/batches/batch_a001/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": -10,
    "reason": "Damaged units removed",
    "notes": "5 units broken, 5 units expired early",
    "performedBy": "warehouse_manager_001"
  }'

# Expected:
# - Batch quantity reduced by 10 (100 → 90)
# - Parent inventory updated
# - Movement record created
```

```bash
# Verify adjustment
curl http://localhost:8792/api/batches/batch_a001

# Expected:
# "quantityAvailable": 90
```

**✅ Pass Criteria**:
- Batch quantity updated correctly
- Parent inventory reflects change
- Audit trail created

### Test 3.5: Batch Status Management

```bash
# Mark batch as expired
curl -X PATCH http://localhost:8792/api/batches/batch_a001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "expired",
    "reason": "Reached expiration date",
    "updatedBy": "system_auto"
  }'

# Expected:
# - Batch status changed to "expired"
# - Reason recorded
```

```bash
# Quarantine a batch
curl -X PATCH http://localhost:8792/api/batches/batch_a002/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "quarantined",
    "reason": "Quality control failed - pending inspection",
    "updatedBy": "qa_manager_001"
  }'
```

```bash
# Verify statuses
curl http://localhost:8792/api/batches?status=expired
curl http://localhost:8792/api/batches?status=quarantined
```

**✅ Pass Criteria**:
- Status updates work correctly
- Reasons are recorded
- Filtering by status works

### Test 3.6: Get Expired Batches

```bash
# Get all expired batches
curl http://localhost:8792/api/batches/expired

# Expected:
# - Returns batches past expiration date
# - Ordered by expiration date
```

**✅ Pass Criteria**:
- Expired batches correctly identified
- Past-date logic works
- Useful for cleanup workflows

---

## Integration Testing - End-to-End Scenarios

### Scenario 1: Complete Product Lifecycle

```bash
# 1. Create product
# 2. Add to warehouse (auto-creates inventory)
# 3. Add UOM with location (converts and updates inventory)
# 4. Create variant with location (updates inventory)
# 5. Query total stock (delegates to Inventory Service)
# 6. Verify low stock detection
# 7. Create batch with expiration
# 8. Verify FEFO ordering
```

### Scenario 2: Bundle Order Fulfillment

```bash
# 1. Create bundle with 3 components
# 2. Check virtual stock (calculated from components)
# 3. Simulate order placement
# 4. Deduct component inventory
# 5. Verify bundle stock updated automatically
# 6. Check limiting component changed
```

### Scenario 3: Batch Expiration Management

```bash
# 1. Create batches with different expiration dates
# 2. Query expiring batches (30 days)
# 3. Mark expired batches
# 4. Quarantine suspect batches
# 5. Generate expired stock report
# 6. Clean up expired batches
```

---

## Troubleshooting

### Issue: Inventory Not Created After Location Added

**Symptoms**:
- `GET /api/inventory` returns empty array
- Product location created successfully

**Resolution**:
1. Check service bindings in `wrangler.jsonc`
2. Verify INVENTORY_SERVICE binding exists
3. Restart Product Service
4. Check console logs for errors

### Issue: Bundle Stock Shows 0

**Symptoms**:
- Components have stock
- Bundle `availableStock` returns 0

**Resolution**:
1. Verify component product IDs are correct
2. Check inventory exists for all components
3. Verify warehouse IDs match
4. Check for errors in bundle calculation logic

### Issue: FEFO Order Incorrect

**Symptoms**:
- Batches not ordered by expiration date
- Non-expiring batches appear first

**Resolution**:
1. Verify expiration dates are in ISO format
2. Check batch status (only "active" batches in FEFO)
3. Query specific endpoint: `/api/batches/product/:id/warehouse/:id`

---

## Performance Benchmarks

### Expected Response Times

| Endpoint | Expected Time | Acceptable Time |
|----------|--------------|-----------------|
| GET /api/products/:id/stock | < 100ms | < 300ms |
| GET /api/bundles/:id/available-stock | < 200ms | < 500ms |
| GET /api/batches/product/:id/warehouse/:id | < 50ms | < 150ms |
| POST /api/batches | < 150ms | < 400ms |
| PATCH /api/batches/:id/adjust | < 100ms | < 300ms |

### Load Testing Commands

```bash
# Install Apache Bench (if not installed)
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test product stock endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:8788/api/products/prod_id/stock

# Test bundle stock endpoint
ab -n 100 -c 10 http://localhost:8788/api/bundles/bundle_id/available-stock

# Test batch listing
ab -n 100 -c 10 "http://localhost:8792/api/batches?status=active"
```

---

## Validation Checklist

### Phase 1 ✅
- [ ] Product locations create inventory automatically
- [ ] UOM locations convert quantities correctly
- [ ] Variant locations update inventory
- [ ] minimumStock copied from product to inventory
- [ ] Inventory movements logged

### Phase 2 ✅
- [ ] Product stock delegated to Inventory Service
- [ ] Low stock detection works per warehouse
- [ ] Bundle stock calculated from components
- [ ] Limiting component identified correctly
- [ ] Warehouse-specific calculations work

### Phase 3 ✅
- [ ] Batches created with expiration dates
- [ ] FEFO ordering works (earliest expires first)
- [ ] Expiring batches query works
- [ ] Expired batches identified correctly
- [ ] Batch status management (expired/quarantined/recalled)
- [ ] Batch quantity adjustments update parent inventory
- [ ] Audit trail for all batch operations

---

## Success Criteria

**Overall System**:
- ✅ Single source of truth (Inventory Service) for all stock data
- ✅ No stock duplication across services
- ✅ Virtual bundle stock calculation works
- ✅ Batch-level expiration tracking operational
- ✅ FEFO picking strategy implemented
- ✅ Complete audit trail for all inventory operations
- ✅ DDD principles followed (proper bounded contexts)

**API Response Times**:
- ✅ All endpoints respond within acceptable time
- ✅ No N+1 query problems
- ✅ Efficient database queries

**Data Integrity**:
- ✅ Inventory quantities match location allocations
- ✅ Bundle stock correctly calculated
- ✅ Batch quantities sum to inventory totals
- ✅ Movement records match quantity changes

---

## Next Steps After Testing

1. **Production Deployment**:
   - Run migration scripts
   - Deploy services in order: Inventory → Product → Frontend
   - Monitor for errors

2. **Frontend Integration**:
   - Update admin dashboard to use new endpoints
   - Implement batch management UI
   - Add FEFO indicators

3. **Monitoring**:
   - Set up alerts for low stock
   - Monitor expiring batches
   - Track API performance

4. **Documentation**:
   - Update user guides
   - Create operations manual
   - Document batch workflows

---

**Testing Status**: ⏳ Ready for execution
**Estimated Duration**: 30-45 minutes
**Prerequisites**: All services running
**Branch**: `claude/refactor-with-docs-01SQc3GSy1ZLC6wRS9DKouSC`
