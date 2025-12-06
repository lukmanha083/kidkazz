# DDD Refactoring - E2E Test Suite

Comprehensive end-to-end testing for Domain-Driven Design refactoring implementation.

## Overview

This test suite validates all four phases of the DDD refactoring:

- **Phase 1**: Inventory Integration - Automatic inventory creation
- **Phase 2**: Single Source of Truth - Stock delegation and virtual bundles
- **Phase 3**: Batch Tracking & FEFO - Expiration management
- **Phase 4**: Cascade Delete Strategy - Safe deletion and cleanup

## Prerequisites

### Services Running

Ensure all services are running before executing tests:

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

### Dependencies

- **bash** (version 4.0+)
- **curl** - For HTTP requests
- **jq** - For JSON parsing

Install jq if not available:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

### Database Migrations

**IMPORTANT**: Run database migrations before testing:

```bash
# Inventory Service - Add inventory_batches table
cd services/inventory-service
npx wrangler d1 migrations apply inventory-db --local

# Product Service - Remove deprecated stock fields
cd services/product-service
npx wrangler d1 migrations apply product-db --local
```

## Quick Start

### Run All Tests

```bash
cd tests/e2e
chmod +x *.sh utils/*.sh
./run-all-tests.sh
```

### Run Specific Phase

```bash
# Phase 1 only
./run-all-tests.sh --phase1-only

# Phase 2 only
./run-all-tests.sh --phase2-only

# Phase 3 only
./run-all-tests.sh --phase3-only

# Phase 4 only
./run-all-tests.sh --phase4-only
```

### Run Individual Test Scripts

```bash
# Make scripts executable
chmod +x phase1-inventory-integration.sh
chmod +x phase2-single-source-truth.sh
chmod +x phase3-batch-tracking-fefo.sh
chmod +x phase4-cascade-delete.sh

# Run individual phases
./phase1-inventory-integration.sh
./phase2-single-source-truth.sh
./phase3-batch-tracking-fefo.sh
./phase4-cascade-delete.sh
```

## Test Suite Structure

```
tests/e2e/
├── README.md                          # This file
├── run-all-tests.sh                   # Main test runner
├── phase1-inventory-integration.sh    # Phase 1 tests
├── phase2-single-source-truth.sh      # Phase 2 tests
├── phase3-batch-tracking-fefo.sh      # Phase 3 tests
├── phase4-cascade-delete.sh           # Phase 4 tests
├── utils/
│   └── test-helpers.sh                # Shared test utilities
└── reports/
    └── test-report-YYYYMMDD-HHMMSS.txt # Test execution reports
```

## Test Coverage

### Phase 1: Inventory Integration

**Test 1.1**: Create Product with Warehouse Allocation
- ✅ Product location auto-creates inventory
- ✅ minimumStock copied from product
- ✅ Quantity matches location

**Test 1.2**: Test UOM Location with Conversion
- ✅ UOM locations are subdivisions (not additions)
- ✅ Conversion factor applied correctly
- ✅ Validation prevents exceeding product location stock

**Test 1.3**: Test Variant Location
- ✅ Variant locations are subdivisions
- ✅ Stock breakdown tracked correctly
- ✅ Validation prevents exceeding limits

### Phase 2: Single Source of Truth

**Test 2.1**: Product Total Stock Endpoint
- ✅ Total stock aggregated across warehouses
- ✅ Warehouse breakdown accurate
- ✅ Low stock detection works

**Test 2.2**: Low Stock Detection
- ✅ Inventory adjustments reflected
- ✅ Low stock status correct
- ✅ Deficit calculated properly

**Test 2.3**: Virtual Bundle Stock Calculation
- ✅ Bundle stock calculated from components
- ✅ Limiting component identified
- ✅ Component breakdown accurate

**Test 2.4**: Warehouse-Specific Bundle Stock
- ✅ Warehouse filtering works
- ✅ Calculations match global when single warehouse

### Phase 3: Batch Tracking & FEFO

**Test 3.1**: Create Batches with Expiration Dates
- ✅ Batches created with expiration dates
- ✅ Non-expiring batches supported
- ✅ Supplier and manufacture date tracked

**Test 3.2**: Verify FEFO Ordering
- ✅ Batches ordered by expiration (earliest first)
- ✅ Non-expiring batches come last
- ✅ FEFO logic correct

**Test 3.3**: Get Expiring Batches
- ✅ Expiring batches filtered correctly
- ✅ Days parameter works
- ✅ Non-expiring batches excluded

**Test 3.4**: Batch Quantity Adjustment
- ✅ Batch quantity updated
- ✅ Parent inventory reflects change
- ✅ Audit trail created

**Test 3.5**: Batch Status Management
- ✅ Mark batches as expired
- ✅ Quarantine batches
- ✅ Status filtering works

**Test 3.6**: Get Expired Batches
- ✅ Expired batches identified
- ✅ Past-date logic works

### Phase 4: Cascade Delete Strategy

**Test 4.1**: Warehouse Soft Delete
- ✅ Warehouse soft deleted (deletedAt set)
- ✅ Not in active warehouse list
- ✅ Inventory remains (orphaned, not cascaded)

**Test 4.2**: Cleanup Orphaned Inventory
- ✅ Orphaned inventory detected (deleted warehouses)
- ✅ Orphaned inventory detected (non-existent products)
- ✅ Cleanup executes successfully (only zero-stock records)
- ✅ Non-zero stock records skipped for safety
- ✅ Orphaned data removed

**Test 4.3**: Product Deletion Validation (Critical Bug Fix)
- ✅ ALWAYS checks inventory first before deletion
- ✅ Cannot delete product with inventory > 0
- ✅ Error message helpful and actionable
- ✅ Deletion succeeds when inventory = 0
- ✅ Locations CASCADE deleted
- ✅ Inventory cleaned up via cross-service call

**Test 4.4**: Product Deletion with UOM and Variants
- ✅ Product locations cascade deleted
- ✅ UOMs cascade deleted
- ✅ Variants cascade deleted
- ✅ All dependent data removed
- ✅ Inventory records cleaned up

**Additional Endpoints Tested**:
- `GET /api/cleanup/orphaned-inventory/check` - Detect orphaned inventory
- `POST /api/cleanup/orphaned-inventory` - Clean up orphaned inventory
- `DELETE /api/inventory/product/:productId` - Cascade delete inventory for product
- `DELETE /api/inventory/warehouse/:warehouseId` - Cascade delete inventory for warehouse

## Command Line Options

```bash
./run-all-tests.sh [OPTIONS]

Options:
  -1, --phase1-only       Run Phase 1 tests only
  -2, --phase2-only       Run Phase 2 tests only
  -3, --phase3-only       Run Phase 3 tests only
  -4, --phase4-only       Run Phase 4 tests only
  -a, --all               Run all phases (default)
  -c, --clean             Clean test data before running
  -h, --help              Show help message
```

## Environment Variables

```bash
# Override service URLs (default: localhost)
export PRODUCT_SERVICE_URL="http://localhost:8788"
export INVENTORY_SERVICE_URL="http://localhost:8792"

# Run tests
./run-all-tests.sh
```

## Test Reports

Test reports are automatically saved to `tests/e2e/reports/` with timestamps:

```
tests/e2e/reports/test-report-20250206-143022.txt
```

Reports include:
- All test output
- Pass/fail status for each test
- Summary statistics
- Execution time

## Troubleshooting

### Issue: `jq: command not found`

**Solution**: Install jq (see Prerequisites section)

### Issue: Services Not Responding

**Solution**:
1. Ensure services are running on correct ports
2. Check for port conflicts
3. Restart services if needed

```bash
# Check Product Service
curl http://localhost:8788/health

# Check Inventory Service
curl http://localhost:8792/health
```

### Issue: Tests Failing Due to Previous Data

**Solution**: Clean test data and re-run

```bash
./run-all-tests.sh --clean --all
```

### Issue: Permission Denied

**Solution**: Make scripts executable

```bash
chmod +x run-all-tests.sh
chmod +x phase*.sh
chmod +x utils/test-helpers.sh
```

### Issue: Batch Tests Failing

**Solution**: Ensure inventory_batches migration applied

```bash
cd services/inventory-service
npx wrangler d1 migrations apply inventory-db --local
```

## Expected Duration

- **Phase 1**: ~5-8 minutes
- **Phase 2**: ~5-8 minutes
- **Phase 3**: ~8-12 minutes
- **Phase 4**: ~5-8 minutes
- **Total**: ~25-35 minutes for complete suite

## Success Criteria

All tests should pass with:
- ✅ 100% pass rate
- ✅ All assertions validated
- ✅ No service errors
- ✅ Data integrity maintained

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

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
        run: |
          sudo apt-get update
          sudo apt-get install -y jq

      - name: Start Services
        run: |
          cd services/product-service && npm install && npm run dev &
          cd services/inventory-service && npm install && npm run dev &
          sleep 10

      - name: Run Migrations
        run: |
          cd services/inventory-service && npx wrangler d1 migrations apply inventory-db --local
          cd services/product-service && npx wrangler d1 migrations apply product-db --local

      - name: Run E2E Tests
        run: |
          cd tests/e2e
          chmod +x *.sh utils/*.sh
          ./run-all-tests.sh
```

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use helper functions from `utils/test-helpers.sh`
3. Add assertions for all critical behaviors
4. Update this README with new test coverage
5. Ensure tests clean up after themselves

## Support

For issues or questions:
- Check the main testing guide: `docs/DDD_REFACTORING_TESTING_GUIDE.md`
- Review service logs for errors
- Verify database migrations applied

## License

See project LICENSE file.
