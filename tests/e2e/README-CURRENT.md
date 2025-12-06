# Cascade Delete & Orphaned Data Cleanup - E2E Tests

End-to-end testing for the implemented cascade delete and orphaned data cleanup features.

## Overview

This test suite validates the **actual implemented features** from the recent development session:

1. **Critical Bug Fix** - Product deletion validation (inventory checks ALWAYS run)
2. **Cascade Delete** - Product and warehouse inventory cleanup endpoints
3. **Orphaned Data Cleanup** - Detection and cleanup of orphaned locations and inventory

## Quick Start

```bash
cd tests/e2e

# Run all tests
./run-tests.sh

# Clean test data and run
./run-tests.sh --clean

# Run specific test
./test-cascade-delete-cleanup.sh
```

## Prerequisites

### 1. Services Running

```bash
# Terminal 1 - Product Service
cd services/product-service
npm run dev
# Should start on http://localhost:8788

# Terminal 2 - Inventory Service
cd services/inventory-service
npm run dev
# Should start on http://localhost:8792
```

### 2. Dependencies

- **bash** (version 4.0+)
- **curl** - For HTTP requests
- **jq** - For JSON parsing

Install jq:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

## Test Coverage

### Test 1: Product Deletion Validation (Critical Bug Fix)

**Location**: `services/product-service/src/infrastructure/http/routes/products.ts:806-894`

**What it tests**:
- ✅ Inventory check ALWAYS runs first (before checking locations)
- ✅ Deletion blocked if `totalStock > 0`
- ✅ Error message provides helpful details (stock count, warehouses, suggestion)
- ✅ Deletion succeeds when `inventory = 0`
- ✅ Calls `DELETE /api/inventory/product/:productId` to clean up inventory
- ✅ Returns cleanup status in response

**Implementation Details**:
```typescript
// 1. ALWAYS check inventory first
const inventoryResponse = await INVENTORY_SERVICE.fetch(
  `http://inventory-service/api/inventory?productId=${id}`
);

if (totalStock > 0) {
  return c.json({
    error: `Cannot delete product "${product.name}"`,
    reason: 'Product has inventory',
    details: { totalStock, warehouses, suggestion }
  }, 400);
}

// 2. Delete product (CASCADE handles locations, UOMs, variants)
await db.delete(products).where(eq(products.id, id)).run();

// 3. Clean up inventory in Inventory Service
const deleteResponse = await INVENTORY_SERVICE.fetch(
  `http://inventory-service/api/inventory/product/${id}`,
  { method: 'DELETE' }
);
```

### Test 2: Cascade Delete - Product Level

**Endpoint**: `DELETE /api/inventory/product/:productId`

**Location**: `services/inventory-service/src/routes/inventory.ts:509-557`

**What it tests**:
- ✅ Deletes all inventory records for a product
- ✅ Deletes all inventory movements for the product
- ✅ Returns count of deleted records
- ✅ Works across all warehouses
- ✅ No inventory remains after deletion

**Response Format**:
```json
{
  "message": "Inventory records deleted successfully",
  "productId": "prod_123",
  "deletedInventoryRecords": 2,
  "deletedMovements": 15,
  "totalStockDeleted": 0,
  "warehouses": [
    { "warehouseId": "wh_1", "quantity": 0 },
    { "warehouseId": "wh_2", "quantity": 0 }
  ]
}
```

### Test 3: Orphaned Locations Cleanup

**Endpoints**:
- `GET /api/cleanup/orphaned-locations/check` - Check for orphaned locations
- `POST /api/cleanup/orphaned-locations` - Clean up orphaned locations

**Location**: `services/product-service/src/infrastructure/http/routes/cleanup.ts`

**What it tests**:
- ✅ Detects product locations referencing soft-deleted warehouses
- ✅ Detects UOM locations referencing soft-deleted warehouses
- ✅ Detects variant locations referencing soft-deleted warehouses
- ✅ Cleanup deletes all orphaned locations
- ✅ No orphaned locations remain after cleanup

**Check Response Format**:
```json
{
  "orphanedProductLocations": [
    {
      "id": "loc_123",
      "productId": "prod_456",
      "warehouseId": "wh_deleted",
      "quantity": 0,
      "reason": "Warehouse no longer active or deleted"
    }
  ],
  "orphanedUOMLocations": [],
  "orphanedVariantLocations": [],
  "totalOrphaned": 1,
  "message": "Found 1 orphaned location(s)",
  "warning": "Orphaned locations found! Run POST /api/cleanup/orphaned-locations to delete them."
}
```

**Cleanup Response Format**:
```json
{
  "deletedProductLocations": 1,
  "deletedUOMLocations": 0,
  "deletedVariantLocations": 0,
  "totalDeleted": 1,
  "message": "Cleaned up 1 orphaned location(s)"
}
```

### Test 4: Orphaned Inventory Cleanup

**Endpoints**:
- `GET /api/cleanup/orphaned-inventory/check` - Check for orphaned inventory
- `POST /api/cleanup/orphaned-inventory` - Clean up orphaned inventory

**Location**: `services/inventory-service/src/routes/cleanup.ts`

**What it tests**:
- ✅ Detects inventory records referencing soft-deleted warehouses
- ✅ Detects inventory records for non-existent products
- ✅ Cleanup deletes orphaned inventory (only if stock = 0)
- ✅ Skips inventory with non-zero stock (safety measure)
- ✅ No orphaned inventory remains after cleanup

**Check Response Format**:
```json
{
  "inventoryWithDeletedWarehouses": [
    {
      "id": "inv_123",
      "productId": "prod_456",
      "warehouseId": "wh_deleted",
      "quantityAvailable": 0,
      "quantityReserved": 0
    }
  ],
  "inventoryWithNonExistentProducts": [],
  "totalOrphaned": 1,
  "summary": {
    "deletedWarehouses": 1,
    "nonExistentProducts": 0
  }
}
```

## Test Execution Flow

### 1. Setup Phase
- Check service health (`/health` endpoints)
- Create test warehouse
- Save test data for subsequent tests

### 2. Test 1: Product Deletion Validation
1. Create product with 100 units inventory
2. Attempt deletion (should fail with 400)
3. Verify error message contains stock details
4. Reduce inventory to zero
5. Attempt deletion (should succeed with 200)
6. Verify inventory cleaned up

### 3. Test 2: Cascade Delete
1. Create product with inventory
2. Reduce inventory to zero
3. Delete product
4. Verify cascade delete endpoint called
5. Verify no inventory remains

### 4. Test 3: Orphaned Locations
1. Create warehouse
2. Create product location at warehouse
3. Soft delete warehouse
4. Check for orphaned locations (should find)
5. Execute cleanup
6. Verify locations removed

### 5. Test 4: Orphaned Inventory
1. Check for orphaned inventory
2. Execute cleanup if orphaned records found
3. Verify cleanup successful

## Running Tests

### Run All Tests

```bash
./run-tests.sh
```

### Run with Clean Data

```bash
./run-tests.sh --clean
```

### Run Specific Test File

```bash
./test-cascade-delete-cleanup.sh
```

### View Help

```bash
./run-tests.sh --help
```

## Expected Output

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     CASCADE DELETE & ORPHANED DATA CLEANUP TEST SUITE            ║
║                                                                   ║
║  Testing actual implemented features                             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Test Configuration:
  Product Service:  http://localhost:8788
  Inventory Service: http://localhost:8792
  Report File:      tests/e2e/reports/test-report-20250206-143022.txt

[INFO] Checking service health...
[SUCCESS] Product Service is healthy
[SUCCESS] Inventory Service is healthy

[TEST] Test 1: Product Deletion Validation (Always Checks Inventory)
------------------------------------------------
[INFO] Step 1: Creating product with inventory...
[SUCCESS] Product created with 100 units inventory
[INFO] Step 2: Attempting to delete product with inventory (should fail)...
[SUCCESS] ✅ Product deletion BLOCKED (inventory > 0)
[SUCCESS] ✅ Error message descriptive
[SUCCESS] ✅ Error shows correct stock count
[INFO] Step 3: Reducing inventory to zero...
[INFO] Step 4: Deleting product with zero inventory (should succeed)...
[SUCCESS] ✅ Product deletion SUCCEEDS (inventory = 0)
[SUCCESS] ✅ Inventory records cleaned up
[SUCCESS] Test 1 completed ✅

... (tests continue)

===================================================================
TEST SUMMARY
===================================================================
Total Tests:  15
Passed:       15
Failed:       0

[SUCCESS] ALL TESTS PASSED ✅
```

## Test Reports

Reports are saved to `tests/e2e/reports/` with timestamps.

## Troubleshooting

### Issue: Services Not Responding

**Check service health**:
```bash
curl http://localhost:8788/health
curl http://localhost:8792/health
```

**Restart services if needed**:
```bash
# Kill existing processes
pkill -f "product-service"
pkill -f "inventory-service"

# Restart
cd services/product-service && npm run dev &
cd services/inventory-service && npm run dev &
```

### Issue: Tests Failing

**Clean test data and re-run**:
```bash
./run-tests.sh --clean
```

**Check test data directory**:
```bash
ls -la /tmp/kidkazz-test-data/
```

### Issue: jq not found

**Install jq**:
```bash
# macOS
brew install jq

# Ubuntu
sudo apt-get install jq
```

## File Structure

```
tests/e2e/
├── README-CURRENT.md                  # This file
├── run-tests.sh                       # Main test runner
├── test-cascade-delete-cleanup.sh     # Cascade delete & cleanup tests
├── utils/
│   ├── test-helpers.sh                # Shared test utilities
│   └── generate-report.sh             # Report generator
└── reports/
    └── test-report-*.txt              # Test execution reports
```

## What's NOT Included

This test suite focuses on the **actually implemented features**. It does NOT include:

- ❌ Phase 1-3 tests from DDD_REFACTORING_TESTING_GUIDE.md (not yet implemented)
- ❌ Batch tracking tests (Phase 3 - not yet implemented)
- ❌ FEFO ordering tests (Phase 3 - not yet implemented)
- ❌ UOM/Variant subdivision validation (Phase 1 - may not be implemented)
- ❌ Virtual bundle stock calculation (Phase 2 - may not be implemented)

For reference documentation about the full DDD refactoring plan, see:
- `docs/DDD_REFACTORING_TESTING_GUIDE.md` (planned implementation)
- `docs/CRON_CONFIGURATION.md` (Cloudflare Workers cron setup)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Cascade Delete Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install Dependencies
        run: sudo apt-get install -y jq

      - name: Start Services
        run: |
          cd services/product-service && npm install && npm run dev &
          cd services/inventory-service && npm install && npm run dev &
          sleep 10

      - name: Run Tests
        run: |
          cd tests/e2e
          ./run-tests.sh
```

## Expected Duration

- **Setup**: ~5 seconds
- **Test 1**: ~5-10 seconds
- **Test 2**: ~5-10 seconds
- **Test 3**: ~10-15 seconds
- **Test 4**: ~5-10 seconds
- **Total**: ~30-50 seconds

## Success Criteria

✅ All tests pass
✅ Product deletion validation works correctly
✅ Cascade delete cleans up inventory
✅ Orphaned locations detected and cleaned
✅ Orphaned inventory detected and cleaned
✅ No errors in service logs

## Support

For issues:
1. Check service logs for errors
2. Verify services are running on correct ports
3. Ensure jq is installed
4. Try cleaning test data with `--clean` flag

## License

See project LICENSE file.
