# Phase 6: Testing & Validation

## Overview

Phase 6 focuses on comprehensive testing and validation of the inventory system implemented in Phases 1-5. This ensures data integrity, validates the single source of truth architecture, and confirms real-time WebSocket functionality works correctly.

**Status:** ✅ Complete (2025-12-11)

---

## Objectives

1. **Data Validation** - Verify all inventory data migrated correctly
2. **WebSocket Testing** - Confirm real-time updates work
3. **Optimistic Locking** - Validate concurrent update handling
4. **Data Integrity** - Ensure referential integrity and stock consistency
5. **Regression Testing** - Confirm no breaking changes

---

## 6.1 Data Validation Queries

### Verify Product Locations Migrated

```sql
-- Count product locations in Product Service
SELECT COUNT(*) as product_locations FROM product_locations;

-- Count inventory records in Inventory Service (base products only)
SELECT COUNT(*) as inventory_records
FROM inventory
WHERE variant_id IS NULL AND uom_id IS NULL;

-- These counts should match (or be close, accounting for multi-warehouse)
```

### Verify Variant Locations Migrated

```sql
-- Count variant locations in Product Service
SELECT COUNT(*) as variant_locations FROM variant_locations;

-- Count variant inventory in Inventory Service
SELECT COUNT(*) as variant_inventory FROM inventory WHERE variant_id IS NOT NULL;
```

### Verify UOM Locations Migrated

```sql
-- Count UOM locations in Product Service
SELECT COUNT(*) as uom_locations FROM product_uom_locations;

-- Count UOM inventory in Inventory Service
SELECT COUNT(*) as uom_inventory FROM inventory WHERE uom_id IS NOT NULL;
```

### Verify Expiration Dates Migrated

```sql
-- Products that had expiration dates (old system)
SELECT COUNT(*) as products_with_expiration
FROM products WHERE expiration_date IS NOT NULL;

-- Batch records created (new system)
SELECT COUNT(*) as batch_records FROM inventory_batches;

-- Each product with expiration should have at least one batch
```

### Verify Total Stock Matches

```sql
-- Total stock in Product Service (deprecated - for comparison only)
SELECT SUM(quantity) as product_service_total FROM product_locations;

-- Total stock in Inventory Service
SELECT SUM(quantity_available) as inventory_service_total
FROM inventory WHERE variant_id IS NULL AND uom_id IS NULL;

-- These should match!
```

### Low Stock Verification

```sql
-- Products below minimum stock
SELECT
  i.product_id,
  p.name,
  i.warehouse_id,
  i.quantity_available,
  i.minimum_stock,
  (i.minimum_stock - i.quantity_available) as shortage
FROM inventory i
JOIN products p ON i.product_id = p.id
WHERE i.quantity_available < i.minimum_stock
ORDER BY shortage DESC;
```

---

## 6.2 WebSocket Testing

### Browser Console Test

```javascript
// Connect to Inventory WebSocket
const ws = new WebSocket('ws://localhost:8792/ws');

ws.onopen = () => {
  console.log('✅ Connected to Inventory WebSocket');

  // Subscribe to global channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'global'
  }));

  // Subscribe to specific warehouse
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'warehouse:wh_001'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Event received:', data);
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('🔌 WebSocket disconnected');
};
```

### Test Event Types

| Event Type | Trigger | Expected Data |
|------------|---------|---------------|
| `inventory.updated` | Stock adjustment | `{ productId, warehouseId, quantityAvailable, quantityReserved }` |
| `inventory.low_stock` | Stock falls below minimum | `{ productId, warehouseId, currentStock, minimumStock }` |
| `inventory.reserved` | Order placed | `{ productId, orderId, quantity }` |
| `inventory.released` | Order cancelled | `{ productId, orderId, quantity }` |
| `batch.created` | New batch added | `{ batchId, productId, expirationDate }` |
| `batch.expiring` | Batch near expiration | `{ batchId, productId, daysUntilExpiry }` |

### Trigger Test Event

```bash
# In another terminal, adjust inventory and watch for real-time event
curl -X POST http://localhost:8792/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-product",
    "warehouseId": "test-warehouse",
    "quantity": 10,
    "movementType": "in",
    "reason": "WebSocket test",
    "source": "warehouse"
  }'
```

### Expected WebSocket Message

```json
{
  "type": "inventory.updated",
  "channel": "global",
  "data": {
    "productId": "test-product",
    "warehouseId": "test-warehouse",
    "quantityAvailable": 110,
    "quantityReserved": 0,
    "quantityInTransit": 0,
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

---

## 6.3 Optimistic Locking Test

### Concurrent Update Test

```bash
# Run 5 concurrent stock adjustments
for i in {1..5}; do
  curl -X POST http://localhost:8792/api/inventory/adjust \
    -H "Content-Type: application/json" \
    -d '{
      "productId": "test-product",
      "warehouseId": "test-warehouse",
      "quantity": -1,
      "movementType": "out",
      "reason": "Concurrent test '"$i"'",
      "source": "warehouse"
    }' &
done
wait

echo "Concurrent requests completed"
```

### Verify Results

```bash
# Check final stock - should be exactly 5 less than before
curl http://localhost:8792/api/inventory/test-product

# All 5 requests should have processed successfully
# Stock should be reduced by exactly 5 units
```

### Version Conflict Handling

When two requests try to update the same inventory record simultaneously:

```
Request A: Read version=1, quantityAvailable=100
Request B: Read version=1, quantityAvailable=100

Request A: UPDATE ... SET quantityAvailable=90, version=2 WHERE version=1
           ✅ Success (version was still 1)

Request B: UPDATE ... SET quantityAvailable=95, version=2 WHERE version=1
           ❌ Fails (version is now 2, not 1)
           → Retry: Read version=2, quantityAvailable=90
           → UPDATE ... SET quantityAvailable=85, version=3 WHERE version=2
           ✅ Success
```

### Test Script

```typescript
// services/inventory-service/src/tests/optimistic-locking.test.ts
import { describe, it, expect } from 'vitest';

describe('Optimistic Locking', () => {
  it('should handle concurrent updates without data loss', async () => {
    const productId = 'test-product';
    const warehouseId = 'test-warehouse';

    // Get initial stock
    const initialStock = await getInventory(productId, warehouseId);
    const initialQty = initialStock.quantityAvailable;

    // Run 10 concurrent decrements of 1 unit each
    const promises = Array.from({ length: 10 }, () =>
      adjustInventory({
        productId,
        warehouseId,
        quantity: -1,
        movementType: 'out',
        reason: 'Concurrent test',
        source: 'warehouse'
      })
    );

    await Promise.all(promises);

    // Verify final stock
    const finalStock = await getInventory(productId, warehouseId);
    expect(finalStock.quantityAvailable).toBe(initialQty - 10);
  });

  it('should increment version on each update', async () => {
    const productId = 'test-product';
    const warehouseId = 'test-warehouse';

    const before = await getInventory(productId, warehouseId);

    await adjustInventory({
      productId,
      warehouseId,
      quantity: 1,
      movementType: 'in',
      reason: 'Version test',
      source: 'warehouse'
    });

    const after = await getInventory(productId, warehouseId);
    expect(after.version).toBe(before.version + 1);
  });
});
```

---

## 6.4 Data Integrity Tests

### Referential Integrity

```sql
-- Check for orphaned inventory records (no product)
SELECT i.id, i.product_id
FROM inventory i
LEFT JOIN products p ON i.product_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned batch records (no inventory)
SELECT b.id, b.inventory_id
FROM inventory_batches b
LEFT JOIN inventory i ON b.inventory_id = i.id
WHERE i.id IS NULL;

-- Check for orphaned movement records
SELECT m.id, m.inventory_id
FROM inventory_movements m
LEFT JOIN inventory i ON m.inventory_id = i.id
WHERE i.id IS NULL;
```

### Stock Consistency

```sql
-- Verify batch quantities sum to inventory quantity
SELECT
  i.id,
  i.product_id,
  i.quantity_available as inventory_qty,
  COALESCE(SUM(b.quantity), 0) as batch_total,
  i.quantity_available - COALESCE(SUM(b.quantity), 0) as difference
FROM inventory i
LEFT JOIN inventory_batches b ON b.inventory_id = i.id AND b.status = 'active'
GROUP BY i.id
HAVING difference != 0;

-- Should return empty (no discrepancies)
```

### Movement Audit Trail

```sql
-- Verify movements balance to current stock
SELECT
  i.product_id,
  i.warehouse_id,
  i.quantity_available as current_stock,
  SUM(m.quantity) as movement_total,
  i.quantity_available - SUM(m.quantity) as discrepancy
FROM inventory i
LEFT JOIN inventory_movements m ON m.inventory_id = i.id
GROUP BY i.id
HAVING discrepancy != 0;

-- Should return empty (movements should sum to current stock)
```

---

## 6.5 Implementation Files

### Test Suite Location

```
services/inventory-service/
├── src/
│   └── tests/
│       └── phase6-validation.test.ts    # Comprehensive test suite
└── scripts/
    └── phase6-validation.ts             # CLI validation tool
```

### Test Suite Coverage

| Test Category | Tests | Status |
|--------------|-------|--------|
| 6.1 Data Validation | 5 tests | ✅ Pass |
| 6.2 WebSocket Tests | 6 tests | ✅ Pass |
| 6.3 Optimistic Locking | 3 tests | ✅ Pass |
| 6.4 Data Integrity | 4 tests | ✅ Pass |
| **Total** | **18 tests** | **✅ All Pass** |

### CLI Validation Tool

```bash
# Run all validations
npx tsx scripts/phase6-validation.ts all

# Run specific validation
npx tsx scripts/phase6-validation.ts data
npx tsx scripts/phase6-validation.ts websocket
npx tsx scripts/phase6-validation.ts locking
npx tsx scripts/phase6-validation.ts integrity

# Output example:
# ✅ Data Validation: PASSED (5/5 checks)
# ✅ WebSocket Tests: PASSED (6/6 checks)
# ✅ Optimistic Locking: PASSED (3/3 checks)
# ✅ Data Integrity: PASSED (4/4 checks)
#
# PHASE 6 VALIDATION: ALL PASSED ✅
```

---

## 6.6 Running Tests

### Unit Tests

```bash
# Run all inventory service tests
cd services/inventory-service
pnpm test

# Run only Phase 6 tests
pnpm test -- --grep "Phase 6"

# Run with coverage
pnpm test:coverage
```

### Integration Tests

```bash
# Start local D1 database
wrangler d1 execute kidkazz-inventory --local --file=migrations/0001_initial.sql
wrangler d1 execute kidkazz-inventory --local --file=migrations/0002_batches.sql
# ... run all migrations

# Seed test data
npx tsx scripts/seed-test-data.ts

# Run integration tests
pnpm test:integration
```

### E2E Tests

```bash
# Start the service
pnpm dev

# In another terminal, run E2E tests
pnpm test:e2e
```

---

## 6.7 Test Data Seeding

### Seed Script

```typescript
// scripts/seed-test-data.ts
import { drizzle } from 'drizzle-orm/d1';

async function seedTestData(env: Env) {
  const db = drizzle(env.DB);

  // Create test warehouse
  await db.insert(warehouses).values({
    id: 'test-warehouse',
    name: 'Test Warehouse',
    code: 'WH-TEST',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create test product (in Product Service)
  // ...

  // Create test inventory
  await db.insert(inventory).values({
    id: 'inv-test-001',
    productId: 'test-product',
    warehouseId: 'test-warehouse',
    quantityAvailable: 100,
    quantityReserved: 0,
    quantityInTransit: 0,
    minimumStock: 10,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create test batches
  await db.insert(inventoryBatches).values({
    id: 'batch-001',
    inventoryId: 'inv-test-001',
    batchNumber: 'BATCH-2025-001',
    quantity: 100,
    expirationDate: '2025-06-30',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Test data seeded successfully');
}
```

---

## 6.8 Deliverables Checklist

- [x] All validation queries pass
- [x] WebSocket connection works
- [x] Real-time events received correctly
- [x] Optimistic locking prevents conflicts
- [x] No data loss verified
- [x] Referential integrity maintained
- [x] Stock consistency verified
- [x] Movement audit trail accurate
- [x] Test suite created and documented
- [x] CLI validation tool created

---

## 6.9 Known Issues & Resolutions

### Issue 1: Batches Endpoint URL

**Problem:** Tests were using wrong endpoint URL for batches.

**Resolution:** Fixed endpoint from `/api/batches` to `/api/inventory/batches`.

**Commit:** `1a311d8 - Fix batches endpoint URL in phase6-validation`

### Issue 2: WebSocket Durable Object Binding

**Problem:** WebSocket tests failing due to missing Durable Object binding in test environment.

**Resolution:** Added mock Durable Object for test environment.

---

## Related Documentation

- [DDD Refactoring Roadmap](../../ddd/DDD_REFACTORING_ROADMAP.md) - Master plan
- [WebSocket Real-Time Inventory](./WEBSOCKET_REALTIME_INVENTORY.md) - WebSocket implementation
- [Business Rules](./BUSINESS_RULES.md) - Inventory business rules
- [Phase 7: Inter-Warehouse Transfer](./PHASE_7_INTER_WAREHOUSE_TRANSFER.md) - Next phase
