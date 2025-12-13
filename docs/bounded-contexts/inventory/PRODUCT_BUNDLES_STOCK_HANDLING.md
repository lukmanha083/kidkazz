# Product Bundles - Stock Handling Strategy

## Overview

Product bundles are **composite products** made up of multiple component products. For example, a "Baby Starter Kit" might contain:
- 2× Baby Bottle (SKU: BOT-001)
- 1× Diaper Pack (SKU: DIA-012)
- 3× Baby Wipes (SKU: WIP-005)

This document analyzes how bundles should handle inventory in a DDD-compliant way.

---

## Current Implementation (DDD Violation ⚠️)

### Schema
```typescript
// productBundles table
{
  id: string;
  bundleName: string;
  bundleSKU: string;
  barcode: string;
  warehouseId: string;        // Where bundle is assembled
  bundlePrice: number;
  discountPercentage: number;
  availableStock: number;     // ⚠️ DDD VIOLATION - stock in Product Service
  status: 'active' | 'inactive';
}

// bundleItems table
{
  id: string;
  bundleId: string;
  productId: string;           // Component product
  quantity: number;            // How many of this product in bundle
  price: number;
}
```

### Problems

1. **Stock in Product Service** (Violation #1)
   - `availableStock` field duplicates inventory responsibility
   - No integration with Inventory Service
   - Manual stock updates via PATCH endpoint

2. **No Component Deduction**
   - Creating bundle doesn't deduct component products
   - No inventory movements tracked
   - Component stock becomes inaccurate

3. **No Assembly/Disassembly Logic**
   - Can't track when bundles are assembled (components → bundle)
   - Can't track when bundles are disassembled (bundle → components)
   - No audit trail

---

## Solution: Two Approaches

### Approach 1: Virtual Bundles (Recommended for E-commerce)

**Concept**: Bundle stock is calculated in real-time based on component availability.

**How it works**:
```
Bundle: Baby Starter Kit
- 2× Baby Bottle (available: 100 units) → max bundles: 50
- 1× Diaper Pack (available: 30 units) → max bundles: 30
- 3× Baby Wipes (available: 60 units) → max bundles: 20

Available bundles = min(50, 30, 20) = 20 bundles
```

**Implementation**:
```typescript
// Remove availableStock from productBundles schema
export const productBundles = sqliteTable('product_bundles', {
  id: text('id').primaryKey(),
  bundleName: text('bundle_name').notNull(),
  bundleSKU: text('bundle_sku').unique().notNull(),
  warehouseId: text('warehouse_id'),
  bundlePrice: real('bundle_price').notNull(),
  discountPercentage: real('discount_percentage').notNull(),
  status: text('status').default('active').notNull(),
  // ❌ Remove: availableStock
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Add API endpoint to calculate available stock
app.get('/api/bundles/:id/available-stock', async (c) => {
  const bundleId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get bundle items
  const items = await db.select().from(bundleItems)
    .where(eq(bundleItems.bundleId, bundleId)).all();

  let minAvailable = Infinity;

  // For each component, check inventory
  for (const item of items) {
    const invResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/${item.productId}/total-stock`)
    );

    if (invResponse.ok) {
      const { totalStock } = await invResponse.json();
      const maxBundles = Math.floor(totalStock / item.quantity);
      minAvailable = Math.min(minAvailable, maxBundles);
    } else {
      return c.json({ availableStock: 0 }); // Component not available
    }
  }

  return c.json({
    availableStock: minAvailable === Infinity ? 0 : minAvailable
  });
});
```

**When bundle is sold**:
```typescript
// Order Service calls Inventory Service to deduct components
app.post('/orders/:id/complete', async (c) => {
  const order = await getOrder(orderId);

  for (const item of order.items) {
    if (item.isBundle) {
      // Get bundle components
      const bundleItems = await getBundleItems(item.bundleId);

      // Deduct each component
      for (const component of bundleItems) {
        await c.env.INVENTORY_SERVICE.fetch(
          new Request('http://inventory-service/api/inventory/adjust', {
            method: 'POST',
            body: JSON.stringify({
              productId: component.productId,
              warehouseId: order.warehouseId,
              quantity: -component.quantity * item.quantity,
              movementType: 'out',
              reason: 'Bundle sold',
              notes: `Sold ${item.quantity}× ${item.bundleName} (Order: ${orderId})`
            })
          })
        );
      }
    }
  }
});
```

**Pros**:
- ✅ No stock duplication (single source of truth)
- ✅ Real-time availability based on actual component stock
- ✅ No need to "assemble" bundles ahead of time
- ✅ Flexible for e-commerce/retail
- ✅ DDD compliant

**Cons**:
- ❌ Requires real-time calculation (performance)
- ❌ Can't pre-assemble bundles for faster fulfillment
- ❌ Not suitable for manufacturing/assembly workflows

---

### Approach 2: Physical Bundles (Recommended for Manufacturing)

**Concept**: Bundles are physically assembled at warehouse, consuming component inventory.

**How it works**:
1. **Assembly**: Warehouse assembles 10 bundles
   - Deduct: 20× Baby Bottle, 10× Diaper Pack, 30× Baby Wipes
   - Create: 10× Baby Starter Kit inventory
2. **Sale**: Customer buys 2 bundles
   - Deduct: 2× Baby Starter Kit inventory
3. **Disassembly** (optional): Break down 1 bundle
   - Deduct: 1× Baby Starter Kit inventory
   - Return: 2× Baby Bottle, 1× Diaper Pack, 3× Baby Wipes

**Implementation**:
```typescript
// Remove availableStock from productBundles (use Inventory Service instead)

// Add assembly endpoint
app.post('/api/bundles/:id/assemble', async (c) => {
  const bundleId = c.req.param('id');
  const { warehouseId, quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Get bundle details
  const bundle = await db.select().from(productBundles)
    .where(eq(productBundles.id, bundleId)).get();

  if (!bundle) {
    return c.json({ error: 'Bundle not found' }, 404);
  }

  // Get bundle items
  const items = await db.select().from(bundleItems)
    .where(eq(bundleItems.bundleId, bundleId)).all();

  // Step 1: Check if components are available
  for (const item of items) {
    const requiredQty = item.quantity * quantity;
    const invResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/${item.productId}/${warehouseId}`)
    );

    if (invResponse.ok) {
      const inv = await invResponse.json();
      if (inv.quantityAvailable < requiredQty) {
        return c.json({
          error: `Insufficient stock for ${item.productName}`,
          required: requiredQty,
          available: inv.quantityAvailable
        }, 400);
      }
    } else {
      return c.json({ error: `Component ${item.productName} not found in inventory` }, 400);
    }
  }

  // Step 2: Deduct component inventory
  for (const item of items) {
    await c.env.INVENTORY_SERVICE.fetch(
      new Request('http://inventory-service/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.productId,
          warehouseId: warehouseId,
          quantity: -item.quantity * quantity,
          movementType: 'out',
          reason: 'Bundle assembly',
          notes: `Assembled ${quantity}× ${bundle.bundleName} (consumed ${item.quantity * quantity} units)`
        })
      })
    );
  }

  // Step 3: Create bundle inventory (bundle as a "product" in inventory)
  await c.env.INVENTORY_SERVICE.fetch(
    new Request('http://inventory-service/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: bundleId,  // Bundle ID as productId
        warehouseId: warehouseId,
        quantity: quantity,
        movementType: 'in',
        reason: 'Bundle assembled',
        notes: `Assembled ${quantity}× ${bundle.bundleName} from components`
      })
    })
  );

  return c.json({
    success: true,
    bundlesAssembled: quantity,
    message: `Successfully assembled ${quantity} units of ${bundle.bundleName}`
  });
});
```

**Pros**:
- ✅ Supports physical assembly workflows
- ✅ Pre-assembled bundles for faster fulfillment
- ✅ Accurate inventory tracking
- ✅ DDD compliant (uses Inventory Service)
- ✅ Can track assembly labor/costs

**Cons**:
- ❌ More complex (assembly/disassembly operations)
- ❌ Requires warehouse coordination
- ❌ Less flexible (can't sell bundle if not assembled)

---

## Recommendation

### For Your System: **Hybrid Approach**

Since your system supports both retail (Baby Kidkazz) and wholesale:

1. **Virtual Bundles** (Default)
   - Use for online sales, retail POS
   - Real-time stock calculation
   - No assembly required

2. **Physical Bundles** (Optional)
   - Use when bundles are pre-packaged for marketing (e.g., holiday gift sets)
   - Warehouse can optionally "assemble" bundles
   - Once assembled, sell from bundle inventory

**Implementation Priority**:

**Phase 2A: Virtual Bundles (High Priority)**
- Remove `availableStock` from `productBundles` schema
- Add `GET /api/bundles/:id/available-stock` endpoint
- Update admin dashboard to show calculated stock
- Update Order Service to deduct components when bundle sold

**Phase 3B: Physical Bundles (Low Priority)**
- Add `POST /api/bundles/:id/assemble` endpoint
- Add `POST /api/bundles/:id/disassemble` endpoint
- Add assembly workflow to admin dashboard
- Track bundle as separate inventory item

---

## Migration Plan

### Step 1: Remove `availableStock` field
```sql
-- Migration: Remove availableStock column
ALTER TABLE product_bundles DROP COLUMN available_stock;
```

### Step 2: Add virtual stock calculation
```typescript
// Product Service: bundles.ts
app.get('/:id/available-stock', async (c) => {
  // Calculate based on components (see Approach 1)
});
```

### Step 3: Update admin dashboard
```typescript
// Instead of bundle.availableStock, call:
const response = await fetch(`/api/bundles/${bundleId}/available-stock`);
const { availableStock } = await response.json();
```

### Step 4: Update Order Service
```typescript
// When order contains bundle, deduct components
// (See Approach 1 example)
```

---

## Data Flow Comparison

### ❌ Current (DDD Violation)
```
Product Service
├── products (stock field) ❌
├── productLocations (quantity field) ❌
├── productUOMLocations (quantity field) ❌
├── variantLocations (quantity field) ❌
└── productBundles (availableStock field) ❌

Inventory Service
└── inventory (quantityAvailable field) ✅
```
**Problem**: 5 places storing stock, 4 violations!

### ✅ After Fix (DDD Compliant)
```
Product Service
├── products (no stock)
├── productLocations (removed)
├── productUOMLocations (removed)
├── variantLocations (removed)
└── productBundles (no availableStock)

Inventory Service
├── inventory (quantityAvailable) ✅
│   ├── Regular products
│   ├── Product variants
│   ├── Product UOMs (converted to base units)
│   └── Assembled bundles (if using Physical approach)
└── bundle_stock_calculation (virtual API)
```

**Single Source of Truth**: Inventory Service only!

---

## Summary

| Aspect | Virtual Bundles | Physical Bundles | Current (Violation) |
|--------|----------------|------------------|---------------------|
| Stock location | Calculated | Inventory Service | Product Service ❌ |
| Assembly required | No | Yes | No |
| Real-time availability | Yes | No | No |
| DDD compliant | ✅ | ✅ | ❌ |
| Complexity | Low | High | Low |
| Use case | E-commerce | Manufacturing | Legacy |
| Recommended | **Yes (Phase 2A)** | Optional (Phase 3B) | No |

---

## Next Steps

1. **Document this approach** ✅ (this file)
2. **Update DDD_ANALYSIS_AND_FIX.md** to include bundles
3. **Add to Phase 2 roadmap**:
   - Remove `availableStock` from bundles
   - Implement virtual stock calculation
   - Update Order Service to deduct components
4. **Add to Phase 3 roadmap** (optional):
   - Implement physical assembly endpoints
   - Add assembly UI to admin dashboard

---

## Testing Scenarios

### Test 1: Virtual Bundle Stock Calculation
```
Given:
- Bundle "Baby Starter Kit" contains:
  - 2× Baby Bottle (stock: 100)
  - 1× Diaper Pack (stock: 30)
  - 3× Baby Wipes (stock: 60)

When: GET /api/bundles/{id}/available-stock

Expected: { "availableStock": 20 }
Calculation: min(100/2, 30/1, 60/3) = min(50, 30, 20) = 20
```

### Test 2: Bundle Sale Deduction
```
Given:
- Customer orders 2× "Baby Starter Kit"

When: Order completed

Expected inventory movements:
- Baby Bottle: -4 units (2 bundles × 2)
- Diaper Pack: -2 units (2 bundles × 1)
- Baby Wipes: -6 units (2 bundles × 3)
```

### Test 3: Bundle Assembly (Physical)
```
Given:
- Warehouse assembles 10× "Baby Starter Kit"

When: POST /api/bundles/{id}/assemble
Body: { "warehouseId": "WH001", "quantity": 10 }

Expected inventory movements:
- Baby Bottle: -20 units
- Diaper Pack: -10 units
- Baby Wipes: -30 units
- Baby Starter Kit: +10 units (new inventory record)
```

---

**Status**: Documentation complete ✅
**Next**: Update DDD roadmap and implement in Phase 2A
