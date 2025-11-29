# DDD Bounded Context Analysis & Report Discrepancy Fix

## Executive Summary

**Critical Findings:**
1. **DDD Violations**: Stock, minimumStock, and expirationDate are incorrectly placed across services
2. **Report Discrepancy**: Product Report shows expired products, but Inventory Report doesn't - here's why
3. **Root Cause**: Architectural misalignment between Product Service and Inventory Service

---

## Part 1: DDD Bounded Context Violations

### Current Schema Issues

#### Product Service (product-service/src/infrastructure/db/schema.ts)
```typescript
export const products = sqliteTable('products', {
  // ... catalog fields
  stock: integer('stock'),               // ❌ VIOLATION: Aggregate, not product catalog
  minimumStock: integer('minimum_stock'), // ❌ VIOLATION: Duplicated in Inventory Service
  expirationDate: text('expiration_date'),// ⚠️  VIOLATION: Should be batch-level, not product-level
  alertDate: text('alert_date'),         // ⚠️  VIOLATION: Tied to expiration
});
```

#### Inventory Service (inventory-service/src/infrastructure/db/schema.ts)
```typescript
export const inventory = sqliteTable('inventory', {
  productId: text('product_id'),
  warehouseId: text('warehouse_id'),
  quantityAvailable: integer('quantity_available'), // ✅ CORRECT
  minimumStock: integer('minimum_stock'),          // ❌ VIOLATION: Duplicated from Product
  // NO expirationDate                             // ❌ MISSING: Should track batches
});
```

---

### Violation #1: Stock in Product Service

**Problem:**
- Product Service stores aggregate `stock` field
- Inventory Service stores warehouse-specific `quantityAvailable`
- Product.stock is derived data (sum of all warehouse quantities)

**Why It Violates DDD:**
- Product Aggregate Root should describe "what" a product is (catalog info)
- Stock is "how many" we have (inventory state) - different bounded context
- Violates **Single Source of Truth** - stock data lives in two places

**Impact:**
- Synchronization issues
- Product Service must query Inventory Service for real-time stock
- Can't trust Product.stock as authoritative

**Correct Design:**
```
Product Service: Product catalog only (no stock field)
Inventory Service: All stock data (per warehouse + aggregate API)
```

---

### Violation #2: minimumStock Duplication

**Problem:**
- `products.minimumStock` - aggregate minimum for the product
- `inventory.minimumStock` - warehouse-specific minimum (defaults to 0!)

**Why It Caused Your Bug:**
```
1. User creates product with minimumStock = 50
2. Product Service: products.minimumStock = 50 ✅
3. Inventory Service: Creates inventory record with minimumStock = 0 (default) ❌
4. Low Stock Report queries Inventory Service
5. Result: No products shown (all have minimumStock=0, so nothing is "low")
```

**Why It Violates DDD:**
- Two services owning same business concept
- Unclear which is the "source of truth"
- Creates tight coupling (need synchronization logic)

**Fix Applied:**
- ✅ Added code to set `inventory.minimumStock` from `product.minimumStock` after creating locations
- ⚠️  Still needs data migration for existing records

---

### Violation #3: expirationDate in Product Service

**Problem:**
- Product Service stores ONE expirationDate per product
- Real-world: Different batches have different expiration dates
- Real-world: Same product in different warehouses = different batches

**Real-World Scenario:**
```
Product: "Fresh Milk 1L" (SKU: MILK-001)

Jakarta Warehouse:
  - Batch #A001: expires 2025-12-15 (100 units)
  - Batch #A002: expires 2025-12-30 (50 units)

Cilangkap Warehouse:
  - Batch #B001: expires 2026-01-10 (75 units)

Current Implementation:
  - products.expirationDate = ??? (can only store ONE date!)
```

**Why It Violates DDD:**
- Expiration is a batch/lot characteristic, not a product characteristic
- Product Catalog describes generic product info
- Inventory Context should track batch-specific expiration dates
- Can't implement FEFO (First Expired, First Out) picking

**Correct Design:**
```sql
-- Inventory Service
CREATE TABLE inventory_batches (
  id TEXT PRIMARY KEY,
  inventory_id TEXT,          -- Links to warehouse inventory
  product_id TEXT,
  warehouse_id TEXT,
  batch_number TEXT,          -- e.g., "A001", "B002"
  expiration_date TEXT,       -- Batch-specific!
  quantity_available INTEGER,
  manufacture_date TEXT,
  received_date TEXT,
  supplier TEXT,
  status TEXT                 -- 'active' | 'expired' | 'quarantined'
);
```

---

## Part 2: Why Reports Show Different Data

### Product Report (Shows Expired Items)

**Location:** `/dashboard/products` → `apps/admin-dashboard/src/routes/dashboard/products/index.tsx`

**Data Source:**
```typescript
// Fetches ALL products from Product Service
const products = await productApi.getAll();

// Filters by product.expirationDate
const expiringProducts = products
  .filter(p => {
    if (!p.expirationDate) return false;
    const expirationDate = new Date(p.expirationDate);
    return expirationDate >= today && expirationDate <= thirtyDaysFromNow;
  })
  .slice(0, 5);
```

**What It Shows:**
- ✅ ALL products with expirationDate set
- ✅ Regardless of warehouse allocation
- ✅ Aggregate product-level view

---

### Inventory Expired Stock Report (Empty!)

**Location:** `/dashboard/inventory/expired-stock` → `apps/admin-dashboard/src/routes/dashboard/inventory/expired-stock.tsx`

**Data Source:**
```typescript
// Fetches inventory records (warehouse-specific)
const inventory = await inventoryApi.getAll();
const products = await productApi.getAll();

// Maps inventory to products
const expiredStockItems = inventory
  .map(inv => {
    const product = products.find(p => p.id === inv.productId);

    // Skip if no expiration date
    if (!product || !product.expirationDate) return null;

    const daysUntilExpiration = calculateDaysUntilExpiration(product.expirationDate);

    // Only show if expired, expiring soon (<30 days), or alert reached
    if (daysUntilExpiration < 0) {
      status = 'expired';
    } else if (daysUntilExpiration <= 30) {
      status = 'expiring-soon';
    } else if (product.alertDate && calculateDaysUntilExpiration(product.alertDate) <= 0) {
      status = 'alert';
    } else {
      return null; // Not expired or expiring soon - FILTERED OUT
    }
    // ...
  })
  .filter(item => item !== null);
```

**What It Shows:**
- ❌ Only products WITH inventory records (warehouse allocations)
- ❌ Only products with expirationDate set
- ❌ Only products that are:
  - Already expired (daysUntilExpiration < 0), OR
  - Expiring within 30 days (daysUntilExpiration <= 30), OR
  - Alert date reached

---

### Why Inventory Report is Empty

**Scenario 1: Products Without Warehouse Allocations**
```
Product Report: Shows "Milk" with expirationDate = 2025-12-25
Inventory Report: Empty (no inventory record exists)

Reason: Product created but never allocated to any warehouse
```

**Scenario 2: Expiration Date Too Far Away**
```
Product Report: Shows "Milk" with expirationDate = 2026-03-15 (60 days away)
Inventory Report: Empty (filtered out - more than 30 days)

Reason: Report only shows items expiring within 30 days
```

**Scenario 3: No Expiration Date Set**
```
Product Report: Shows "Milk" with no expirationDate
Inventory Report: Empty (filtered out)

Reason: expirationDate is null
```

**To Debug:**
```sql
-- Check which scenario applies
-- Run in product-service database

-- 1. Products with expiration dates
SELECT id, name, expirationDate, stock
FROM products
WHERE expirationDate IS NOT NULL;

-- 2. Do they have warehouse allocations?
SELECT p.id, p.name, p.expirationDate, pl.warehouseId, pl.quantity
FROM products p
LEFT JOIN product_locations pl ON p.id = pl.productId
WHERE p.expirationDate IS NOT NULL;

-- 3. Check inventory records
SELECT inv.productId, inv.warehouseId, inv.quantityAvailable, p.expirationDate
FROM inventory inv
INNER JOIN products p ON p.id = inv.productId
WHERE p.expirationDate IS NOT NULL;
```

---

## Part 3: Architecture Recommendations

### Immediate Fix (This Sprint)

**1. Data Migration Script**
```typescript
// Sync inventory.minimumStock from products.minimumStock for existing data
// File: services/inventory-service/migrations/sync-minimum-stock.ts

import { db } from '../infrastructure/db';
import { inventory } from '../infrastructure/db/schema';
import { productApi } from '../external/product-api';

async function syncMinimumStock() {
  // Get all inventory records
  const allInventory = await db.select().from(inventory).all();

  for (const inv of allInventory) {
    // Fetch product to get minimumStock
    const product = await productApi.getById(inv.productId);

    if (product && product.minimumStock) {
      // Update inventory record
      await db.update(inventory)
        .set({ minimumStock: product.minimumStock })
        .where(eq(inventory.id, inv.id));

      console.log(`Updated inventory ${inv.id}: minimumStock = ${product.minimumStock}`);
    }
  }

  console.log('Migration complete!');
}
```

**2. Add Validation**
```typescript
// Prevent creating products with expirationDate but no warehouse allocation
// apps/admin-dashboard/src/routes/dashboard/products/all.tsx

if (formData.expirationDate && warehouseAllocations.length === 0) {
  toast.error('Expiration date requires warehouse allocation', {
    description: 'Products with expiration dates must be allocated to at least one warehouse for inventory tracking'
  });
  return;
}
```

---

### Short-Term Refactoring (Next Sprint)

**1. Create Inventory Service Total Stock API**
```typescript
// services/inventory-service/src/infrastructure/http/routes.ts

// GET /api/inventory/product/:productId/total-stock
app.get('/api/inventory/product/:productId/total-stock', async (c) => {
  const productId = c.req.param('productId');

  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .all();

  const totalStock = inventoryRecords.reduce(
    (sum, inv) => sum + inv.quantityAvailable,
    0
  );

  return c.json({ productId, totalStock });
});
```

**2. Remove stock from Product Service**
```typescript
// product-service/src/infrastructure/db/schema.ts
export const products = sqliteTable('products', {
  // ... keep catalog fields
  // stock: integer('stock'), ❌ REMOVE
  // minimumStock: integer('minimum_stock'), ❌ REMOVE
});
```

**3. Update Product Service to Query Inventory**
```typescript
// product-service/src/application/use-cases/GetProduct.ts
async execute(productId: string) {
  const product = await this.productRepo.findById(productId);

  // Query Inventory Service for stock
  const stockData = await this.inventoryService.getTotalStock(productId);

  return {
    ...product,
    stock: stockData.totalStock, // From Inventory Service
  };
}
```

---

### Long-Term Refactoring (Future Phases)

**1. Implement Batch/Lot Tracking**

**New Schema:**
```sql
-- inventory-service/src/infrastructure/db/schema.ts
export const inventoryBatches = sqliteTable('inventory_batches', {
  id: text('id').primaryKey(),
  inventoryId: text('inventory_id')
    .notNull()
    .references(() => inventory.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),

  // Batch identification
  batchNumber: text('batch_number').notNull(),
  lotNumber: text('lot_number'),

  // Batch-specific expiration
  expirationDate: text('expiration_date'),
  manufactureDate: text('manufacture_date'),

  // Stock for this batch
  quantityAvailable: integer('quantity_available').default(0).notNull(),

  // Traceability
  receivedDate: text('received_date'),
  supplier: text('supplier'),
  purchaseOrderId: text('purchase_order_id'),

  // Status
  status: text('status').default('active'), // 'active' | 'expired' | 'quarantined' | 'recalled'

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

**2. Implement FEFO Picking**
```typescript
// inventory-service/src/domain/services/PickingStrategy.ts
class FEFOPickingStrategy {
  // First Expired, First Out
  async allocateStock(productId: string, warehouseId: string, quantity: number) {
    // Get all batches for this product at this warehouse
    const batches = await db
      .select()
      .from(inventoryBatches)
      .where(
        and(
          eq(inventoryBatches.productId, productId),
          eq(inventoryBatches.warehouseId, warehouseId),
          eq(inventoryBatches.status, 'active')
        )
      )
      .orderBy(asc(inventoryBatches.expirationDate)) // Oldest first
      .all();

    let remainingQty = quantity;
    const allocations = [];

    for (const batch of batches) {
      if (remainingQty === 0) break;

      const allocateQty = Math.min(remainingQty, batch.quantityAvailable);

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: allocateQty,
        expirationDate: batch.expirationDate,
      });

      remainingQty -= allocateQty;
    }

    return { allocations, insufficientStock: remainingQty > 0 };
  }
}
```

**3. Migrate Expiration Data**
```typescript
// One-time migration: Move expirationDate from products to inventory_batches
async function migrateExpirationDates() {
  const products = await productDb.select().from(products)
    .where(isNotNull(products.expirationDate))
    .all();

  for (const product of products) {
    // Get all inventory locations for this product
    const inventoryRecords = await inventoryDb
      .select()
      .from(inventory)
      .where(eq(inventory.productId, product.id))
      .all();

    // Create batch for each warehouse location
    for (const inv of inventoryRecords) {
      await inventoryDb.insert(inventoryBatches).values({
        id: generateId(),
        inventoryId: inv.id,
        productId: product.id,
        warehouseId: inv.warehouseId,
        batchNumber: `MIGRATED-${Date.now()}`,
        expirationDate: product.expirationDate, // Migrate date
        quantityAvailable: inv.quantityAvailable,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Remove expirationDate from product
    await productDb.update(products)
      .set({ expirationDate: null, alertDate: null })
      .where(eq(products.id, product.id));
  }
}
```

---

## Part 4: Corrected Bounded Context Definitions

### Product Context (Product Catalog)

**Owns:**
- ✅ Product information (name, description, SKU, barcode)
- ✅ Pricing (retail, wholesale, tier pricing)
- ✅ Categories and subcategories
- ✅ Product images and media
- ✅ Product specifications (weight, dimensions)
- ✅ Product availability settings

**Does NOT Own:**
- ❌ Stock levels (aggregate or warehouse-specific)
- ❌ Warehouse locations
- ❌ Expiration dates (batch-specific data)
- ❌ Minimum stock thresholds
- ❌ Stock movements

---

### Inventory Context (Warehouse Inventory Management)

**Owns:**
- ✅ Stock levels (per warehouse, per batch)
- ✅ Warehouse information
- ✅ Warehouse locations (rack, bin, zone, aisle)
- ✅ Batch/lot tracking
- ✅ Expiration dates (batch-specific)
- ✅ Manufacture dates (batch-specific)
- ✅ Minimum stock thresholds (per warehouse)
- ✅ Stock movements (in/out/transfer/adjustment)
- ✅ Stock reservations
- ✅ Picking strategies (FIFO/LIFO/FEFO)

---

## Part 5: Action Items

### ✅ Already Completed
- [x] Fix: Set inventory.minimumStock when creating product locations
- [x] Fix: Set inventory.minimumStock when updating product allocations
- [x] Document: DDD violations analysis

### 🔴 Critical (This Week)
- [ ] Create migration script to sync inventory.minimumStock from products.minimumStock
- [ ] Run migration on existing data
- [ ] Add validation: products with expirationDate must have warehouse allocations
- [ ] Test: Create product with expiration date, verify it appears in Inventory Report

### 🟡 High Priority (Next Sprint)
- [ ] Create Inventory Service API endpoint: GET /api/inventory/product/:id/total-stock
- [ ] Refactor Product Service to remove stock field
- [ ] Update admin dashboard to call Inventory Service for stock display
- [ ] Add API endpoint: GET /api/inventory/product/:id/low-stock-status

### 🟢 Medium Priority (Future)
- [ ] Design inventory_batches schema
- [ ] Implement batch tracking functionality
- [ ] Migrate expirationDate from Product Service to Inventory Service batches
- [ ] Implement FEFO picking strategy
- [ ] Update Expired Stock Report to use batch-level expiration dates

---

## Part 6: Testing Your Current Setup

### Test 1: Why is Inventory Report Empty?

Run these queries:

```sql
-- In product-service database
SELECT
  id,
  name,
  sku,
  expirationDate,
  stock,
  minimumStock
FROM products
WHERE expirationDate IS NOT NULL;

-- Check if these products have warehouse allocations
SELECT
  p.id,
  p.name,
  p.expirationDate,
  pl.warehouseId,
  pl.quantity
FROM products p
LEFT JOIN product_locations pl ON p.id = pl.productId
WHERE p.expirationDate IS NOT NULL;
```

```sql
-- In inventory-service database
SELECT
  inv.id,
  inv.productId,
  inv.warehouseId,
  inv.quantityAvailable,
  inv.minimumStock
FROM inventory inv;
```

### Test 2: Create Test Product

1. Create a product with:
   - Name: "Test Expired Product"
   - Expiration Date: 5 days from today
   - Minimum Stock: 50
   - Warehouse Allocation: 20 units at Jakarta warehouse

2. Wait 30 seconds for sync

3. Check reports:
   - Product Report (`/dashboard/products`) - should show in "Expiring Soon"
   - Inventory Expired Stock Report (`/dashboard/inventory/expired-stock`) - should now appear!

---

## Conclusion

Your architecture has **three major DDD violations**:

1. **stock in Product Service** - should be in Inventory Service only
2. **minimumStock duplicated** - caused Low Stock Report to be empty (now fixed)
3. **expirationDate in Product Service** - should be batch-level in Inventory Service

The **Inventory Expired Stock Report is empty** because it only shows products that:
- Have warehouse inventory records, AND
- Have expirationDate set, AND
- Are within 30 days of expiration (or already expired)

**Immediate Solution**: Create test product with expiration date + warehouse allocation
**Long-term Solution**: Refactor to proper DDD bounded contexts with batch tracking
