# Inventory Business Rules Documentation

## Overview

This document describes all business rules implemented in the Inventory Service, the **single source of truth** for all stock data in the Kidkazz ERP system. The Inventory Service is responsible for stock quantities, batch tracking, movements, and real-time updates.

> **Critical Principle**: Inventory Service is the ONLY authoritative source for stock data. Product Service and other services MUST delegate to Inventory Service for any stock-related queries.

---

## Stock Management Rules

### Rule 1: Negative Stock Restrictions

**Rule**: Only POS sales can create negative stock. Warehouse operations CANNOT.

**Business Rationale**:
- POS operates on a "first-pay-first-served" model
- Customer purchases must always succeed (even if stock goes negative)
- Warehouse operations must be strictly validated to maintain data integrity

**Implementation**:
```typescript
// Warehouse operations - STRICT
public warehouseAdjustOut(quantity: number, reason?: string, performedBy?: string): void {
  if (this.currentStock < quantity) {
    throw new Error('Insufficient stock for warehouse adjustment');
  }
  // ... deduct stock
}

// POS operations - ALLOWS NEGATIVE
public posSale(quantity: number, reason?: string, performedBy?: string): void {
  // No validation - business rule allows negative
  // ... deduct stock (can go negative)
}
```

**API Usage**:
```typescript
// Warehouse adjustment (will fail if insufficient stock)
POST /api/inventory/adjust
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 50,
  "movementType": "out",
  "source": "warehouse"  // Strict validation
}

// POS sale (can create negative stock)
POST /api/inventory/adjust
{
  "productId": "...",
  "warehouseId": "...",
  "quantity": 50,
  "movementType": "out",
  "source": "pos"  // Allows negative
}
```

**Tracking**: All movements record `source` field ('warehouse' or 'pos') for audit trail.

**Error Message**: "Insufficient stock for warehouse adjustment"

---

### Rule 2: Minimum Stock Levels

**Rule**: Minimum stock value cannot be negative. Used for reorder alerts.

**Business Rationale**:
- Minimum stock triggers low stock warnings
- Negative values don't make logical sense
- Alerts warehouse staff when stock falls below threshold

**Implementation**:
```typescript
public setMinimumStock(minimumStock: number): void {
  if (minimumStock < 0) {
    throw new Error('Minimum stock cannot be negative');
  }
  this.props.minimumStock = minimumStock;
}
```

**Low Stock Calculation**:
```typescript
const isLowStock = currentStock <= minimumStock;
const deficit = minimumStock - currentStock; // If negative, stock is healthy
```

**Error Message**: "Minimum stock cannot be negative"

---

### Rule 3: Reserved Quantity Management

**Rule**: Reserved quantity represents stock committed to orders but not yet shipped.

**Business Rationale**:
- Prevents overselling when multiple orders are placed simultaneously
- Available stock = Total stock - Reserved quantity
- Reserved stock is released on order completion or cancellation

**Implementation**:
```typescript
interface InventoryProps {
  quantityAvailable: number;  // Physical stock
  quantityReserved: number;   // Committed to orders
  quantityInTransit: number;  // Between warehouses (Phase 7)
}

// Sellable stock
public getSellableStock(): number {
  return this.quantityAvailable - this.quantityReserved;
}

// Reserve for order
public reserve(quantity: number, orderId: string): void {
  if (this.getSellableStock() < quantity) {
    throw new Error('Insufficient sellable stock for reservation');
  }
  this.quantityReserved += quantity;
  this.addDomainEvent(new StockReserved(this.id, quantity, orderId));
}

// Release on completion/cancellation
public releaseReservation(quantity: number, orderId: string): void {
  this.quantityReserved = Math.max(0, this.quantityReserved - quantity);
  this.addDomainEvent(new ReservationReleased(this.id, quantity, orderId));
}
```

**Error Message**: "Insufficient sellable stock for reservation"

---

### Rule 4: Optimistic Locking for Concurrent Updates

**Rule**: All inventory mutations must use version-based optimistic locking to prevent race conditions.

**Business Rationale**:
- Multiple users/systems may update inventory simultaneously
- Prevents lost updates in concurrent scenarios
- Ensures data consistency

**Implementation**:
```typescript
interface Inventory {
  id: string;
  version: number;  // Incremented on every update
  // ... other fields
}

public update(changes: Partial<InventoryProps>): void {
  // Increment version on every update
  this.version += 1;
  // ... apply changes
}

// Repository check
async save(inventory: Inventory): Promise<void> {
  const result = await db.update(inventoryTable)
    .set({ ...inventory, version: inventory.version })
    .where(and(
      eq(inventoryTable.id, inventory.id),
      eq(inventoryTable.version, inventory.version - 1)  // Check previous version
    ));

  if (result.rowsAffected === 0) {
    throw new Error('Concurrent modification detected. Please refresh and try again.');
  }
}
```

**Error Message**: "Concurrent modification detected. Please refresh and try again."

---

### Rule 5: Single Source of Truth

**Rule**: Product Service MUST delegate all stock queries to Inventory Service. Stock data MUST NOT be duplicated in Product Service.

**Business Rationale**:
- Prevents data divergence between services
- Single authoritative source for inventory data
- Eliminates sync issues

**Implementation**:
```typescript
// Product Service - CORRECT
app.get('/api/products/:id/stock', async (c) => {
  // Delegate to Inventory Service
  const response = await c.env.INVENTORY_SERVICE.fetch(
    new Request(`http://inventory-service/api/inventory/product/${productId}/total-stock`)
  );
  return response;
});

// Product Service - WRONG (DDD Violation!)
app.get('/api/products/:id', async (c) => {
  const product = await getProduct(id);
  return c.json({
    ...product,
    stock: product.stock  // ❌ NEVER store/return stock from Product Service
  });
});
```

**Removed Fields from Product Service**:
- `products.stock` - Removed in Phase 4
- `productBundles.availableStock` - Removed, calculated dynamically
- Direct stock fields in product tables

---

## Batch Tracking Rules

### Rule 6: Batch-Level Expiration (Not Product-Level)

**Rule**: Expiration dates are tracked at the batch/lot level, NOT the product level. Each batch can have a different expiration date.

**Business Rationale**:
- Products may have multiple batches from different shipments
- Each batch has its own manufacturing and expiration dates
- FEFO (First Expired, First Out) requires batch-level tracking

**Implementation**:
```typescript
// CORRECT: Batch has expiration
interface InventoryBatch {
  id: string;
  inventoryId: string;
  batchNumber: string;
  lotNumber?: string;
  expirationDate: Date;      // ✅ Per-batch expiration
  alertDate?: Date;          // Days before expiration to alert
  manufactureDate?: Date;
  quantity: number;
  status: 'active' | 'expired' | 'quarantined' | 'recalled';
}

// WRONG: Product has expiration
interface Product {
  expirationDate: Date;  // ❌ REMOVED - This was a DDD violation
}
```

**Error Message**: "Use batch-level expiration tracking instead of product-level"

---

### Rule 7: FEFO (First Expired, First Out)

**Rule**: When picking stock, batches must be consumed in order of expiration date (earliest first).

**Business Rationale**:
- Minimizes waste from expired products
- Regulatory compliance for food/pharmaceutical products
- Industry best practice for perishable goods

**Implementation**:
```typescript
// Get batches ordered by expiration (FEFO)
app.get('/api/batches/product/:productId/warehouse/:warehouseId', async (c) => {
  const batches = await db.select()
    .from(inventoryBatches)
    .where(and(
      eq(inventoryBatches.productId, productId),
      eq(inventoryBatches.warehouseId, warehouseId),
      eq(inventoryBatches.status, 'active')
    ))
    .orderBy(asc(inventoryBatches.expirationDate));  // FEFO order

  return c.json(batches);
});

// Picking logic
async function pickStock(productId: string, warehouseId: string, requiredQty: number): Promise<PickResult[]> {
  const batches = await getBatchesFEFO(productId, warehouseId);
  const picks: PickResult[] = [];
  let remaining = requiredQty;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const pickQty = Math.min(batch.quantity, remaining);
    picks.push({ batchId: batch.id, quantity: pickQty });
    remaining -= pickQty;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock. Short by ${remaining} units.`);
  }

  return picks;
}
```

---

### Rule 8: Batch Status Management

**Rule**: Batches have lifecycle statuses: active, expired, quarantined, recalled.

**Business Rationale**:
- Track batch lifecycle from receipt to consumption/disposal
- Support quality control workflows
- Enable recall procedures

**Status Definitions**:
- **active**: Available for sale/picking
- **expired**: Past expiration date, cannot be sold
- **quarantined**: Under quality investigation, cannot be sold
- **recalled**: Product recall, must be removed from sale

**Implementation**:
```typescript
type BatchStatus = 'active' | 'expired' | 'quarantined' | 'recalled';

// Status transitions
public quarantine(reason: string, performedBy: string): void {
  if (this.status !== 'active') {
    throw new Error('Only active batches can be quarantined');
  }
  this.status = 'quarantined';
  this.addDomainEvent(new BatchQuarantined(this.id, reason, performedBy));
}

public release(performedBy: string): void {
  if (this.status !== 'quarantined') {
    throw new Error('Only quarantined batches can be released');
  }
  this.status = 'active';
  this.addDomainEvent(new BatchReleased(this.id, performedBy));
}

public recall(recallNumber: string, performedBy: string): void {
  this.status = 'recalled';
  this.addDomainEvent(new BatchRecalled(this.id, recallNumber, performedBy));
}
```

**Error Messages**:
- "Only active batches can be quarantined"
- "Only quarantined batches can be released"

---

### Rule 9: Batch Quantity Sync with Parent Inventory

**Rule**: When batch quantities change, the parent inventory record must be updated atomically.

**Business Rationale**:
- Parent inventory = sum of all batch quantities
- Maintains data consistency
- Prevents inventory discrepancies

**Implementation**:
```typescript
// When adjusting batch quantity
public adjustBatchQuantity(batchId: string, adjustment: number): void {
  await db.transaction(async (tx) => {
    // 1. Update batch
    await tx.update(inventoryBatches)
      .set({ quantity: sql`quantity + ${adjustment}` })
      .where(eq(inventoryBatches.id, batchId));

    // 2. Update parent inventory (ATOMIC)
    const batch = await tx.select().from(inventoryBatches)
      .where(eq(inventoryBatches.id, batchId)).get();

    await tx.update(inventory)
      .set({ quantityAvailable: sql`quantity_available + ${adjustment}` })
      .where(eq(inventory.id, batch.inventoryId));

    // 3. Create movement record
    await tx.insert(inventoryMovements).values({
      inventoryId: batch.inventoryId,
      batchId: batchId,
      quantity: adjustment,
      // ...
    });
  });
}
```

---

## Multi-Warehouse Rules

### Rule 10: Stock Per Warehouse

**Rule**: Stock is tracked separately for each warehouse. Total stock = sum of all warehouse stocks.

**Business Rationale**:
- Businesses operate multiple warehouse locations
- Each warehouse needs independent stock tracking
- Enables location-based fulfillment

**Implementation**:
```typescript
// Get total stock across all warehouses
app.get('/api/inventory/product/:id/total-stock', async (c) => {
  const warehouses = await db.select({
    warehouseId: inventory.warehouseId,
    warehouseName: warehouses.name,
    quantity: inventory.quantityAvailable
  })
  .from(inventory)
  .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
  .where(eq(inventory.productId, productId));

  const totalStock = warehouses.reduce((sum, w) => sum + w.quantity, 0);

  return c.json({
    productId,
    totalStock,
    warehouseBreakdown: warehouses
  });
});
```

---

### Rule 11: Stock Consistency Per Warehouse

**Rule**: For each warehouse, product_locations stock must match the sum of product_uom_locations (converted to base units).

**Business Rationale**:
- Ensures data integrity between different stock tracking tables
- Product location is the source of truth for warehouse-specific stock
- Prevents over-allocation of UOM stock

**Implementation**:
```typescript
// Validation per warehouse
for (const warehouse of warehouses) {
  const locationStock = productLocation[warehouse].quantity;  // Base units

  let totalUOMStock = 0;
  for (const uom of productUOMs) {
    const uomLocation = getUOMLocation(uom.id, warehouse.id);
    if (uomLocation) {
      totalUOMStock += uomLocation.quantity * uom.conversionFactor;
    }
  }

  if (locationStock !== totalUOMStock) {
    throw new Error(
      `Stock mismatch in ${warehouse.name}: ` +
      `Location: ${locationStock} ${baseUnit}, UOMs: ${totalUOMStock} ${baseUnit}`
    );
  }
}
```

**Error Message**: "Stock mismatch in {warehouse}. Product locations: X, UOM locations: Y"

---

### Rule 12: Warehouse Code Format

**Rule**: Warehouse code must contain only uppercase letters, numbers, and hyphens.

**Business Rationale**: Standardized format for easy identification and system integration.

**Implementation**:
```typescript
const WAREHOUSE_CODE_REGEX = /^[A-Z0-9-]+$/;

public validateCode(code: string): void {
  if (!WAREHOUSE_CODE_REGEX.test(code)) {
    throw new Error('Code must contain only uppercase letters, numbers, and hyphens');
  }
}
```

**Examples**:
- ✅ Valid: `WH-001`, `WH-JAKARTA-01`, `WH001`
- ❌ Invalid: `wh-001` (lowercase), `WH_001` (underscore), `WH 001` (space)

**Error Message**: "Code must contain only uppercase letters, numbers, and hyphens"

---

### Rule 13: Warehouse Location Required Fields

**Rule**: Address line 1, city, province, and postal code are required for warehouse locations.

**Business Rationale**: Minimum information needed for logistics and shipping.

**Required Fields**:
- `addressLine1` - Street address (required)
- `city` - City name (required)
- `province` - Province/state (required)
- `postalCode` - Postal/ZIP code (required)
- `addressLine2` - Optional (suite, apartment)
- `country` - Optional (defaults to Indonesia)

---

## UOM Conversion Rules

### Rule 14: Base Unit Conversion Factor

**Rule**: Base unit (PCS, KG, L, M, etc.) always has conversion factor of 1. All other UOMs convert relative to the base unit.

**Business Rationale**:
- Base unit is the fundamental tracking unit
- All stock operations convert to base units internally
- Enables consistent inventory calculations

**Implementation**:
```typescript
// Base unit always has factor = 1
interface BaseUnit {
  code: string;        // PCS, KG, L, M
  name: string;        // Pieces, Kilogram, Liter, Meter
  conversionFactor: 1; // Always 1
  isBaseUnit: true;
}

// Custom UOMs have factor > 1
interface CustomUOM {
  code: string;          // BOX6, CARTON18, BAG500G
  name: string;          // Box of 6, Carton of 18
  conversionFactor: number; // 6, 18, 0.5
  isBaseUnit: false;
}
```

**Conversion Examples**:
```typescript
// Piece-based products
10 BOX6 = 10 × 6 = 60 PCS
5 CARTON18 = 5 × 18 = 90 PCS

// Weight-based products
100 BOX500G = 100 × 0.5 = 50 KG
10 CARTON2KG = 10 × 2 = 20 KG
```

---

### Rule 15: UOM Conversion to Base Unit

**Rule**: When converting larger UOMs (BOX, CARTON) to base unit (PCS), the total stock remains constant.

**Business Rationale**:
- Breaking down boxes doesn't create or destroy inventory
- Enables selling individual pieces when boxes are intact
- Maintains audit trail

**Implementation**:
```typescript
// Before conversion
// BOX6: 10 boxes (60 PCS worth)
// PCS: 10 pieces

// Convert 1 BOX6 to PCS
// BOX6: 9 boxes (54 PCS worth)
// PCS: 16 pieces

// Total: 54 + 16 = 70 PCS (unchanged from 60 + 10 = 70 PCS)

async function convertUOM(params: {
  productId: string;
  fromUomCode: string;
  quantity: number;
  warehouseId: string;
}): Promise<void> {
  const fromUom = await getProductUOM(params.productId, params.fromUomCode);
  const pcsToAdd = params.quantity * fromUom.conversionFactor;

  await db.transaction(async (tx) => {
    // Decrease source UOM
    await decreaseUOMStock(tx, fromUom.id, params.quantity);

    // Increase base unit
    await increaseBaseUnitStock(tx, params.productId, pcsToAdd);

    // Log conversion
    await logConversion(tx, params, pcsToAdd);
  });
}
```

**Validation Rules**:
- Cannot convert more than available UOM stock
- Cannot convert base unit to base unit
- Must provide reason for audit trail

---

### Rule 16: Cannot Change Base Unit After Stock Allocation

**Rule**: Once a product has stock transactions, its base unit cannot be changed.

**Business Rationale**:
- Changing base unit would invalidate historical data
- All conversion factors are relative to base unit
- Maintains data integrity

**Implementation**:
```typescript
public changeBaseUnit(newBaseUnit: string): void {
  const hasTransactions = await this.hasInventoryMovements();

  if (hasTransactions) {
    throw new Error('Cannot change base unit after stock has been allocated. Historical data would be invalidated.');
  }

  this.baseUnit = newBaseUnit;
}
```

**Error Message**: "Cannot change base unit after stock has been allocated"

---

## Bundle Rules

### Rule 17: Virtual Bundle Stock Calculation

**Rule**: Virtual bundle stock is calculated in real-time from component availability. Bundle stock = minimum of (component stock / quantity needed) for all components.

**Business Rationale**:
- No stock duplication (single source of truth)
- Real-time availability based on actual component stock
- No need to pre-assemble bundles

**Implementation**:
```typescript
// Bundle: Baby Starter Kit
// - 2× Baby Bottle (stock: 100) → max bundles: 50
// - 1× Diaper Pack (stock: 30) → max bundles: 30
// - 3× Baby Wipes (stock: 60) → max bundles: 20
// Available bundles = min(50, 30, 20) = 20

app.get('/api/bundles/:id/available-stock', async (c) => {
  const items = await getBundleItems(bundleId);
  let minAvailable = Infinity;
  let limitingComponent = null;

  for (const item of items) {
    const stock = await getProductStock(item.productId);
    const maxBundles = Math.floor(stock / item.quantity);

    if (maxBundles < minAvailable) {
      minAvailable = maxBundles;
      limitingComponent = item.productName;
    }
  }

  return c.json({
    availableStock: minAvailable === Infinity ? 0 : minAvailable,
    limitingComponent
  });
});
```

---

### Rule 18: Bundle Sale Deducts Components

**Rule**: When a virtual bundle is sold, component inventory is deducted (not bundle inventory).

**Business Rationale**:
- Virtual bundles don't have their own stock
- Components are the actual inventory
- Maintains accurate component stock levels

**Implementation**:
```typescript
// When bundle is sold
async function processBundleSale(bundleId: string, quantity: number, warehouseId: string): Promise<void> {
  const bundleItems = await getBundleItems(bundleId);

  for (const item of bundleItems) {
    await c.env.INVENTORY_SERVICE.fetch(
      new Request('http://inventory-service/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: item.productId,
          warehouseId: warehouseId,
          quantity: item.quantity * quantity,  // Component qty × bundles sold
          movementType: 'out',
          reason: `Bundle sold: ${bundleName}`,
          source: 'pos'
        })
      })
    );
  }
}
```

---

### Rule 19: Physical Bundle Assembly (Phase 8)

**Rule**: Physical bundles are pre-assembled at warehouse, consuming component inventory and creating bundle inventory.

**Business Rationale**:
- Supports physical assembly workflows
- Pre-assembled bundles for faster fulfillment
- Bundle becomes its own inventory item

**Implementation**:
```typescript
// Assembly: Create 10 bundles
// 1. Deduct components
// 2. Create bundle inventory

async function assembleBundles(bundleId: string, quantity: number, warehouseId: string): Promise<void> {
  const items = await getBundleItems(bundleId);

  await db.transaction(async (tx) => {
    // Validate component availability
    for (const item of items) {
      const required = item.quantity * quantity;
      const available = await getStock(item.productId, warehouseId);

      if (available < required) {
        throw new Error(`Insufficient ${item.productName}: need ${required}, have ${available}`);
      }
    }

    // Deduct components
    for (const item of items) {
      await adjustInventory(tx, {
        productId: item.productId,
        warehouseId,
        quantity: -(item.quantity * quantity),
        reason: `Assembly: ${quantity}× ${bundleName}`
      });
    }

    // Create bundle inventory
    await adjustInventory(tx, {
      productId: bundleId,  // Bundle as product
      warehouseId,
      quantity: quantity,
      reason: `Assembled ${quantity} bundles`
    });
  });
}
```

---

## Movement and Audit Rules

### Rule 20: All Movements Must Be Recorded

**Rule**: Every inventory change creates a movement record for audit trail.

**Business Rationale**:
- Complete audit trail for compliance
- Enables tracking of stock changes
- Supports investigation of discrepancies

**Implementation**:
```typescript
interface InventoryMovement {
  id: string;
  inventoryId: string;
  batchId?: string;
  movementType: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  source: 'pos' | 'warehouse' | 'system' | 'transfer';
  reference?: string;      // Order ID, PO number, etc.
  performedBy: string;
  createdAt: Date;
}

// Automatic movement creation
public adjustStock(quantity: number, type: MovementType, reason: string): void {
  // Update stock
  if (type === 'in') {
    this.quantityAvailable += quantity;
  } else {
    this.quantityAvailable -= quantity;
  }

  // Create movement (always!)
  this.addDomainEvent(new InventoryMovementCreated({
    inventoryId: this.id,
    movementType: type,
    quantity,
    reason
  }));
}
```

---

### Rule 21: Source Tracking

**Rule**: Every movement must record its source for differentiated business rules.

**Business Rationale**:
- POS source allows negative stock
- Warehouse source requires positive stock
- Enables source-specific reporting

**Source Types**:
- `pos` - Point of Sale transactions (allows negative)
- `warehouse` - Warehouse operations (strict validation)
- `system` - System-generated adjustments
- `transfer` - Inter-warehouse transfers

---

## Real-Time Rules

### Rule 22: WebSocket Stock Updates

**Rule**: Stock changes must be broadcast via WebSocket for real-time updates.

**Business Rationale**:
- Multiple users viewing same product
- POS terminals need real-time availability
- Dashboard widgets need live data

**Implementation**:
```typescript
// After inventory update
async function broadcastStockUpdate(productId: string, warehouseId: string): Promise<void> {
  const stock = await getStock(productId, warehouseId);

  await c.env.WEBSOCKET_DO.fetch(
    new Request('http://websocket/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        type: 'STOCK_UPDATE',
        payload: {
          productId,
          warehouseId,
          quantityAvailable: stock.quantityAvailable,
          quantityReserved: stock.quantityReserved,
          isLowStock: stock.quantityAvailable <= stock.minimumStock
        }
      })
    })
  );
}
```

**Event Types**:
- `STOCK_UPDATE` - Stock quantity changed
- `LOW_STOCK_ALERT` - Stock fell below minimum
- `BATCH_EXPIRING` - Batch approaching expiration
- `BATCH_EXPIRED` - Batch has expired

---

### Rule 23: Low Stock Alert Threshold

**Rule**: Alert is triggered when available stock falls at or below minimum stock level.

**Business Rationale**:
- Proactive reorder notification
- Prevents stockouts
- Configurable per product

**Implementation**:
```typescript
function checkLowStock(inventory: Inventory): LowStockStatus {
  const isLowStock = inventory.quantityAvailable <= inventory.minimumStock;
  const deficit = inventory.minimumStock - inventory.quantityAvailable;

  return {
    isLowStock,
    deficit: deficit > 0 ? deficit : 0,
    message: isLowStock
      ? `Low stock: ${inventory.quantityAvailable} available, minimum is ${inventory.minimumStock}`
      : 'Stock level healthy'
  };
}
```

---

## Validation Hierarchy

### Where Rules Are Enforced

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Validation (First Line of Defense)              │
│    - Quantity format (positive numbers)                     │
│    - Required field validation                              │
│    - Real-time stock availability check                     │
│    - User gets immediate feedback                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API Layer Validation (Second Line)                       │
│    - Input schema validation (Zod)                          │
│    - Product/warehouse existence check                      │
│    - Basic business rules                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Domain Layer Validation (Final Authority)                │
│    - Negative stock rules (POS vs warehouse)                │
│    - Optimistic locking                                     │
│    - Batch FEFO ordering                                    │
│    - THIS IS THE SOURCE OF TRUTH                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario 1: POS Sale with Negative Stock

```typescript
// Customer buys 10 items, but only 5 in stock
POST /api/inventory/adjust
{
  "productId": "product-123",
  "warehouseId": "warehouse-001",
  "quantity": 10,
  "movementType": "out",
  "source": "pos",  // Allows negative
  "reason": "POS Sale - Order #12345"
}

// Result: Stock goes to -5
// Movement record created with source='pos'
// Customer gets their purchase ✅
```

### Scenario 2: Warehouse Transfer (Phase 7)

```typescript
// Transfer 20 units from WH-001 to WH-002
// Step 1: OUT from WH-001 (must have 20+ units)
POST /api/inventory/adjust
{
  "productId": "product-123",
  "warehouseId": "WH-001",
  "quantity": 20,
  "movementType": "out",
  "source": "warehouse",  // Strict validation
  "reason": "Transfer to WH-002"
}

// Step 2: IN to WH-002
POST /api/inventory/adjust
{
  "productId": "product-123",
  "warehouseId": "WH-002",
  "quantity": 20,
  "movementType": "in",
  "reason": "Received from WH-001"
}
```

### Scenario 3: FEFO Picking

```typescript
// Pick 50 units using FEFO
// Batch A: 30 units, expires Jan 15
// Batch B: 40 units, expires Jan 20
// Batch C: 20 units, expires Feb 1

// Result:
// - Pick 30 from Batch A (earliest)
// - Pick 20 from Batch B (next earliest)
// Total: 50 units picked
// Remaining: Batch A: 0, Batch B: 20, Batch C: 20
```

### Scenario 4: UOM Conversion

```typescript
// Convert 2 BOX6 to PCS (conversion factor: 6)
POST /api/inventory/convert-uom
{
  "productId": "product-123",
  "fromUomCode": "BOX6",
  "quantity": 2,
  "warehouseId": "WH-001",
  "reason": "PCS sold out"
}

// Before: BOX6=10 (60 PCS), PCS=10 → Total: 70 PCS
// After:  BOX6=8 (48 PCS),  PCS=22 → Total: 70 PCS
```

---

## Troubleshooting

### "Insufficient stock for warehouse adjustment"

**Cause**: Trying to deduct more stock than available with `source='warehouse'`.

**Solution**:
- For POS sales, use `source='pos'`
- For warehouse operations, verify available stock first
- Check if stock is reserved by pending orders

### "Concurrent modification detected"

**Cause**: Another user/process updated the same inventory record.

**Solution**:
- Refresh the page to get latest data
- Retry the operation
- Check for automated processes that may be updating inventory

### "Stock mismatch between locations and UOMs"

**Cause**: UOM stock doesn't align with product location stock.

**Solution**:
- Run stock consistency validation
- Adjust UOM quantities or location stock
- Check for failed transactions that may have caused inconsistency

### "Cannot post to batch with status 'quarantined'"

**Cause**: Trying to pick from a quarantined batch.

**Solution**:
- Use a different batch
- If batch should be available, release it from quarantine first

---

## Rule Testing

### Unit Tests for Domain Rules

```typescript
describe('Inventory', () => {
  it('should prevent negative stock for warehouse operations', () => {
    const inventory = Inventory.create({ quantityAvailable: 50 });

    expect(() => {
      inventory.warehouseAdjustOut(70, 'Test');
    }).toThrow('Insufficient stock');
  });

  it('should allow negative stock for POS operations', () => {
    const inventory = Inventory.create({ quantityAvailable: 50 });

    inventory.posSale(70, 'POS Sale');

    expect(inventory.getAvailableQuantity()).toBe(-20);
  });

  it('should pick batches in FEFO order', async () => {
    // Setup batches with different expiration dates
    const picks = await pickStock('prod-1', 'wh-1', 50);

    // First batch picked should have earliest expiration
    expect(picks[0].batchId).toBe('batch-earliest');
  });
});
```

---

## Rule Change Process

### How to Add/Modify Inventory Rules

1. **Document** the rule in this file first
2. **Implement** in domain layer (Inventory aggregate)
3. **Add** to use case if needed
4. **Update** WebSocket events if real-time update required
5. **Write** tests for the rule
6. **Update** API documentation

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when new rules are added
**Related Docs**:
- [Product Bundles Stock Handling](./PRODUCT_BUNDLES_STOCK_HANDLING.md)
- [UOM Conversion Procedure](./UOM_CONVERSION_PROCEDURE.md)
- [WebSocket Real-Time Inventory](./WEBSOCKET_REALTIME_INVENTORY.md)
- [DDD Business Rules (Main)](../../ddd/BUSINESS_RULES.md)
