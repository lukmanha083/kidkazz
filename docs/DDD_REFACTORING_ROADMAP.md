# DDD Refactoring Roadmap: Ideal Architecture Implementation

## Executive Summary

This roadmap outlines the complete refactoring plan to achieve ideal DDD/Hexagonal architecture with real-time inventory via WebSocket.

**Goal**: Single Source of Truth for all inventory data with real-time updates

**Approach**: Direct implementation (no backward compatibility - development phase)

**Key Features**:
- All stock data in Inventory Service
- WebSocket real-time stock updates
- Optimistic locking for race condition prevention
- Clean separation of concerns

---

## Architecture Target State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT SERVICE (Catalog Only)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  products                                                                │
│  ├── name, sku, barcode, description           ✅ CATALOG               │
│  ├── price, retailPrice, wholesalePrice        ✅ PRICING               │
│  ├── minimumOrderQuantity, wholesaleThreshold  ✅ SALES RULES           │
│  └── weight, length, width, height             ✅ PHYSICAL ATTRS        │
│                                                                          │
│  productUOMs (NO stock field)                                            │
│  ├── uomCode, uomName, barcode                 ✅ UOM DEFINITION        │
│  └── conversionFactor                          ✅ CONVERSION INFO       │
│                                                                          │
│  productVariants (NO stock field)                                        │
│  ├── variantName, variantSKU, variantType      ✅ VARIANT INFO          │
│  └── price, image                              ✅ VARIANT DETAILS       │
│                                                                          │
│  productLocations (NO quantity field)                                    │
│  └── rack, bin, zone, aisle                    ✅ PHYSICAL LOCATION     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│         INVENTORY SERVICE (Single Source + Real-Time WebSocket)          │
├─────────────────────────────────────────────────────────────────────────┤
│  inventory (Enhanced)                                                    │
│  ├── productId, warehouseId                    ✅ CORE REFERENCE        │
│  ├── variantId (nullable)                      ✅ VARIANT SUPPORT       │
│  ├── uomId (nullable)                          ✅ UOM SUPPORT           │
│  ├── quantityAvailable                         ✅ STOCK                 │
│  ├── quantityReserved                          ✅ RESERVATIONS          │
│  ├── quantityInTransit                         ✅ SHIPPING/UNPACK       │
│  ├── minimumStock                              ✅ REORDER THRESHOLD     │
│  ├── rack, bin, zone, aisle                    ✅ PHYSICAL LOCATION     │
│  ├── version                                   ✅ OPTIMISTIC LOCK       │
│  └── lastModifiedAt                            ✅ TIMESTAMP             │
│                                                                          │
│  inventoryBatches (Batch-level expiration)                               │
│  ├── expirationDate, alertDate                 ✅ BATCH EXPIRATION      │
│  ├── batchNumber, lotNumber                    ✅ TRACEABILITY          │
│  ├── quantityAvailable                         ✅ BATCH STOCK           │
│  └── version                                   ✅ OPTIMISTIC LOCK       │
│                                                                          │
│  WebSocket Durable Object                                                │
│  ├── Real-time inventory broadcasts            ✅ LIVE UPDATES          │
│  ├── Channel subscriptions                     ✅ TARGETED EVENTS       │
│  └── Connection management                     ✅ RECONNECTION          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Overview

| Phase | Description | Duration |
|-------|-------------|----------|
| **1** | Inventory Service Schema Enhancement | 2-3 days |
| **2** | Data Migration Scripts | 2-3 days |
| **3** | WebSocket & Optimistic Locking | 3-4 days |
| **4** | Product Service Schema Cleanup | 1-2 days |
| **5** | API Refactoring | 2-3 days |
| **6** | Testing & Validation | 2-3 days |

**Total Estimated Time**: 2-3 weeks

---

## Phase 1: Inventory Service Schema Enhancement

### 1.1 Add New Columns to Inventory Table

**Migration file**: `services/inventory-service/migrations/0005_ddd_enhancement.sql`

```sql
-- Add variant and UOM support
ALTER TABLE inventory ADD COLUMN variant_id TEXT;
ALTER TABLE inventory ADD COLUMN uom_id TEXT;

-- Add stock in transit (shipping/waiting to unpack)
ALTER TABLE inventory ADD COLUMN quantity_in_transit INTEGER DEFAULT 0;

-- Add physical location fields (from Product Service)
ALTER TABLE inventory ADD COLUMN rack TEXT;
ALTER TABLE inventory ADD COLUMN bin TEXT;
ALTER TABLE inventory ADD COLUMN zone TEXT;
ALTER TABLE inventory ADD COLUMN aisle TEXT;

-- Add optimistic locking fields
ALTER TABLE inventory ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory ADD COLUMN last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Indexes for performance
CREATE INDEX idx_inventory_variant ON inventory(variant_id);
CREATE INDEX idx_inventory_uom ON inventory(uom_id);
CREATE INDEX idx_inventory_version ON inventory(product_id, warehouse_id, version);

-- Add optimistic locking to batches
ALTER TABLE inventory_batches ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_batches ADD COLUMN last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP;
```

### 1.2 Update Inventory Service Schema

**File**: `services/inventory-service/src/infrastructure/db/schema.ts`

```typescript
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),

  // NEW: Variant and UOM support
  variantId: text('variant_id'),
  uomId: text('uom_id'),

  // Stock levels
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityReserved: integer('quantity_reserved').default(0).notNull(),
  quantityInTransit: integer('quantity_in_transit').default(0),
  minimumStock: integer('minimum_stock').default(0),

  // NEW: Physical location (moved from Product Service)
  rack: text('rack'),
  bin: text('bin'),
  zone: text('zone'),
  aisle: text('aisle'),

  // NEW: Optimistic locking
  version: integer('version').default(1).notNull(),
  lastModifiedAt: text('last_modified_at'),

  // Audit
  lastRestockedAt: integer('last_restocked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### 1.3 Deliverables
- [ ] Migration SQL file created
- [ ] Schema.ts updated with new columns
- [ ] TypeScript types updated
- [ ] Run migration on local database

---

## Phase 2: Data Migration

### 2.1 Migration Script: Product Locations → Inventory

**File**: `scripts/migrate-to-inventory-service.ts`

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNull } from 'drizzle-orm';

interface MigrationResult {
  productLocations: { migrated: number; errors: number };
  variantLocations: { migrated: number; errors: number };
  uomLocations: { migrated: number; errors: number };
  expirationDates: { migrated: number; errors: number };
}

export async function runFullMigration(
  productDB: D1Database,
  inventoryDB: D1Database
): Promise<MigrationResult> {
  const productDb = drizzle(productDB);
  const inventoryDb = drizzle(inventoryDB);

  const result: MigrationResult = {
    productLocations: { migrated: 0, errors: 0 },
    variantLocations: { migrated: 0, errors: 0 },
    uomLocations: { migrated: 0, errors: 0 },
    expirationDates: { migrated: 0, errors: 0 },
  };

  console.log('=== Starting Full DDD Migration ===\n');

  // 1. Migrate productLocations
  console.log('Step 1: Migrating product locations...');
  const productLocations = await productDb.select().from(productLocationsTable).all();

  for (const loc of productLocations) {
    try {
      // Check if inventory record exists
      const existing = await inventoryDb
        .select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.productId, loc.productId),
          eq(inventoryTable.warehouseId, loc.warehouseId),
          isNull(inventoryTable.variantId),
          isNull(inventoryTable.uomId)
        ))
        .get();

      if (existing) {
        // Update with location info and quantity
        await inventoryDb
          .update(inventoryTable)
          .set({
            quantityAvailable: loc.quantity,
            rack: loc.rack,
            bin: loc.bin,
            zone: loc.zone,
            aisle: loc.aisle,
            version: existing.version + 1,
            lastModifiedAt: new Date().toISOString(),
            updatedAt: new Date(),
          })
          .where(eq(inventoryTable.id, existing.id))
          .run();
      } else {
        // Create new inventory record
        await inventoryDb.insert(inventoryTable).values({
          id: generateId(),
          productId: loc.productId,
          warehouseId: loc.warehouseId,
          variantId: null,
          uomId: null,
          quantityAvailable: loc.quantity,
          quantityReserved: 0,
          minimumStock: 0,
          rack: loc.rack,
          bin: loc.bin,
          zone: loc.zone,
          aisle: loc.aisle,
          version: 1,
          lastModifiedAt: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).run();
      }
      result.productLocations.migrated++;
    } catch (error) {
      console.error(`Error migrating product location ${loc.id}:`, error);
      result.productLocations.errors++;
    }
  }
  console.log(`  ✅ Product locations: ${result.productLocations.migrated} migrated, ${result.productLocations.errors} errors`);

  // 2. Migrate variantLocations
  console.log('Step 2: Migrating variant locations...');
  const variantLocations = await productDb
    .select({
      location: variantLocationsTable,
      variant: productVariantsTable,
    })
    .from(variantLocationsTable)
    .innerJoin(productVariantsTable, eq(variantLocationsTable.variantId, productVariantsTable.id))
    .all();

  for (const { location, variant } of variantLocations) {
    try {
      await inventoryDb.insert(inventoryTable).values({
        id: generateId(),
        productId: variant.productId,
        warehouseId: location.warehouseId,
        variantId: variant.id,
        uomId: null,
        quantityAvailable: location.quantity,
        quantityReserved: 0,
        minimumStock: 0,
        rack: location.rack,
        bin: location.bin,
        zone: location.zone,
        aisle: location.aisle,
        version: 1,
        lastModifiedAt: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
      result.variantLocations.migrated++;
    } catch (error) {
      console.error(`Error migrating variant location ${location.id}:`, error);
      result.variantLocations.errors++;
    }
  }
  console.log(`  ✅ Variant locations: ${result.variantLocations.migrated} migrated, ${result.variantLocations.errors} errors`);

  // 3. Migrate productUOMLocations
  console.log('Step 3: Migrating UOM locations...');
  const uomLocations = await productDb
    .select({
      location: productUOMLocationsTable,
      uom: productUOMsTable,
    })
    .from(productUOMLocationsTable)
    .innerJoin(productUOMsTable, eq(productUOMLocationsTable.productUOMId, productUOMsTable.id))
    .all();

  for (const { location, uom } of uomLocations) {
    try {
      await inventoryDb.insert(inventoryTable).values({
        id: generateId(),
        productId: uom.productId,
        warehouseId: location.warehouseId,
        variantId: null,
        uomId: uom.id,
        quantityAvailable: location.quantity, // In UOM units
        quantityReserved: 0,
        minimumStock: 0,
        rack: location.rack,
        bin: location.bin,
        zone: location.zone,
        aisle: location.aisle,
        version: 1,
        lastModifiedAt: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
      result.uomLocations.migrated++;
    } catch (error) {
      console.error(`Error migrating UOM location ${location.id}:`, error);
      result.uomLocations.errors++;
    }
  }
  console.log(`  ✅ UOM locations: ${result.uomLocations.migrated} migrated, ${result.uomLocations.errors} errors`);

  // 4. Migrate expirationDate to batches
  console.log('Step 4: Migrating expiration dates to batches...');
  const productsWithExpiration = await productDb
    .select()
    .from(productsTable)
    .where(isNotNull(productsTable.expirationDate))
    .all();

  for (const product of productsWithExpiration) {
    try {
      // Get inventory records for this product
      const inventoryRecords = await inventoryDb
        .select()
        .from(inventoryTable)
        .where(and(
          eq(inventoryTable.productId, product.id),
          isNull(inventoryTable.variantId),
          isNull(inventoryTable.uomId)
        ))
        .all();

      for (const inv of inventoryRecords) {
        await inventoryDb.insert(inventoryBatchesTable).values({
          id: generateId(),
          inventoryId: inv.id,
          productId: product.id,
          warehouseId: inv.warehouseId,
          batchNumber: `MIGRATED-${product.id.slice(-8)}`,
          expirationDate: product.expirationDate,
          alertDate: product.alertDate,
          quantityAvailable: inv.quantityAvailable,
          quantityReserved: 0,
          status: 'active',
          version: 1,
          lastModifiedAt: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).run();
        result.expirationDates.migrated++;
      }
    } catch (error) {
      console.error(`Error migrating expiration for product ${product.id}:`, error);
      result.expirationDates.errors++;
    }
  }
  console.log(`  ✅ Expiration dates: ${result.expirationDates.migrated} batches created, ${result.expirationDates.errors} errors`);

  console.log('\n=== Migration Complete ===');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 2.2 Deliverables
- [ ] Migration script created
- [ ] Script tested on local database
- [ ] Data validation queries prepared
- [ ] Backup procedures documented

---

## Phase 3: WebSocket & Optimistic Locking

### 3.1 WebSocket Durable Object

**File**: `services/inventory-service/src/websocket/InventoryWebSocket.ts`

```typescript
import { DurableObject } from 'cloudflare:workers';

export interface InventoryEvent {
  type: 'inventory.updated' | 'inventory.low_stock' | 'inventory.out_of_stock' | 'batch.expiring_soon';
  data: {
    productId?: string;
    warehouseId?: string;
    variantId?: string;
    uomId?: string;
    quantityAvailable?: number;
    quantityReserved?: number;
    version?: number;
    timestamp: string;
    [key: string]: any;
  };
}

export class InventoryWebSocket extends DurableObject {
  private sessions: Map<WebSocket, Set<string>> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle broadcast endpoint (internal)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const event = await request.json() as InventoryEvent;
      await this.broadcast(event);
      return new Response('OK');
    }

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    this.sessions.set(server, new Set(['global']));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const msg = JSON.parse(message.toString());
      const subscriptions = this.sessions.get(ws);
      if (!subscriptions) return;

      switch (msg.type) {
        case 'subscribe':
          if (msg.channel) {
            subscriptions.add(msg.channel);
            ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }));
          }
          break;
        case 'unsubscribe':
          if (msg.channel) {
            subscriptions.delete(msg.channel);
            ws.send(JSON.stringify({ type: 'unsubscribed', channel: msg.channel }));
          }
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }

  async broadcast(event: InventoryEvent): Promise<void> {
    const channel = this.getEventChannel(event);
    const message = JSON.stringify(event);

    for (const [ws, subscriptions] of this.sessions.entries()) {
      if (subscriptions.has(channel) || subscriptions.has('global')) {
        try {
          ws.send(message);
        } catch (error) {
          this.sessions.delete(ws);
        }
      }
    }
  }

  private getEventChannel(event: InventoryEvent): string {
    const { productId, warehouseId, variantId } = event.data;
    if (variantId) return `variant:${variantId}`;
    if (productId && warehouseId) return `product:${productId}:warehouse:${warehouseId}`;
    if (productId) return `product:${productId}`;
    if (warehouseId) return `warehouse:${warehouseId}`;
    return 'global';
  }
}
```

### 3.2 Update wrangler.jsonc

**File**: `services/inventory-service/wrangler.jsonc`

```jsonc
{
  "name": "inventory-service",
  // ... existing config ...
  "durable_objects": {
    "bindings": [
      {
        "name": "INVENTORY_WS",
        "class_name": "InventoryWebSocket"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["InventoryWebSocket"]
    }
  ]
}
```

### 3.3 Update Inventory Routes with Optimistic Locking & Broadcast

**File**: `services/inventory-service/src/routes/inventory.ts`

```typescript
// Broadcast helper
async function broadcastInventoryChange(env: Env, event: InventoryEvent) {
  try {
    const wsId = env.INVENTORY_WS.idFromName('inventory-updates');
    const wsStub = env.INVENTORY_WS.get(wsId);
    await wsStub.fetch('http://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to broadcast:', error);
  }
}

// POST /api/inventory/adjust - With optimistic locking
app.post('/adjust', zValidator('json', adjustStockSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // 1. Get current inventory with version
      const inv = await db
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, data.productId),
          eq(inventory.warehouseId, data.warehouseId),
          data.variantId ? eq(inventory.variantId, data.variantId) : isNull(inventory.variantId),
          data.uomId ? eq(inventory.uomId, data.uomId) : isNull(inventory.uomId)
        ))
        .get();

      if (!inv) {
        // Create new inventory record
        const newInv = {
          id: generateId(),
          productId: data.productId,
          warehouseId: data.warehouseId,
          variantId: data.variantId || null,
          uomId: data.uomId || null,
          quantityAvailable: data.quantity,
          quantityReserved: 0,
          minimumStock: 0,
          rack: data.rack || null,
          bin: data.bin || null,
          zone: data.zone || null,
          aisle: data.aisle || null,
          version: 1,
          lastModifiedAt: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(inventory).values(newInv).run();

        // Broadcast new inventory
        await broadcastInventoryChange(c.env, {
          type: 'inventory.updated',
          data: {
            productId: data.productId,
            warehouseId: data.warehouseId,
            variantId: data.variantId,
            quantityAvailable: data.quantity,
            version: 1,
            timestamp: new Date().toISOString(),
          },
        });

        return c.json({ inventory: newInv, message: 'Inventory created' }, 201);
      }

      // 2. Calculate new quantity
      const currentVersion = inv.version;
      const previousQty = inv.quantityAvailable;
      let newQty: number;

      if (data.movementType === 'in') {
        newQty = previousQty + Math.abs(data.quantity);
      } else if (data.movementType === 'out') {
        const qtyToRemove = Math.abs(data.quantity);
        if (data.source === 'warehouse' && previousQty < qtyToRemove) {
          return c.json({ error: 'Insufficient stock', available: previousQty }, 400);
        }
        newQty = previousQty - qtyToRemove;
      } else {
        newQty = data.quantity; // adjustment
      }

      // 3. Update with version check (optimistic lock)
      const updateResult = await db
        .update(inventory)
        .set({
          quantityAvailable: newQty,
          version: currentVersion + 1,
          lastModifiedAt: new Date().toISOString(),
          updatedAt: new Date(),
          ...(data.rack && { rack: data.rack }),
          ...(data.bin && { bin: data.bin }),
          ...(data.zone && { zone: data.zone }),
          ...(data.aisle && { aisle: data.aisle }),
        })
        .where(and(
          eq(inventory.id, inv.id),
          eq(inventory.version, currentVersion) // Must match!
        ))
        .run();

      // 4. Check if update succeeded
      if (updateResult.meta?.changes === 0) {
        retries++;
        if (retries >= MAX_RETRIES) {
          return c.json({ error: 'Concurrent update conflict. Try again.' }, 409);
        }
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, retries)));
        continue;
      }

      // 5. Record movement
      await db.insert(inventoryMovements).values({
        id: generateId(),
        inventoryId: inv.id,
        productId: data.productId,
        warehouseId: data.warehouseId,
        movementType: data.movementType,
        quantity: data.quantity,
        source: data.source || 'warehouse',
        reason: data.reason,
        notes: data.notes,
        performedBy: data.performedBy,
        createdAt: new Date(),
      }).run();

      // 6. Broadcast change via WebSocket
      const eventType =
        newQty === 0 ? 'inventory.out_of_stock' :
        (inv.minimumStock && newQty < inv.minimumStock) ? 'inventory.low_stock' :
        'inventory.updated';

      await broadcastInventoryChange(c.env, {
        type: eventType,
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          variantId: data.variantId,
          uomId: data.uomId,
          quantityAvailable: newQty,
          quantityReserved: inv.quantityReserved,
          minimumStock: inv.minimumStock,
          version: currentVersion + 1,
          previousQuantity: previousQty,
          changeAmount: data.quantity,
          movementType: data.movementType,
          timestamp: new Date().toISOString(),
        },
      });

      return c.json({
        inventory: { ...inv, quantityAvailable: newQty, version: currentVersion + 1 },
        previousQuantity: previousQty,
        newQuantity: newQty,
        message: 'Inventory adjusted',
      });

    } catch (error) {
      console.error('Inventory adjustment error:', error);
      return c.json({ error: 'Failed to adjust inventory' }, 500);
    }
  }

  return c.json({ error: 'Unexpected error' }, 500);
});

// GET /ws - WebSocket endpoint
app.get('/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Expected WebSocket' }, 426);
  }

  const wsId = c.env.INVENTORY_WS.idFromName('inventory-updates');
  const wsStub = c.env.INVENTORY_WS.get(wsId);
  return wsStub.fetch(c.req.raw);
});
```

### 3.4 New API Endpoints

```typescript
// GET /api/inventory/variant/:variantId - Get stock for variant
app.get('/variant/:variantId', async (c) => {
  const variantId = c.req.param('variantId');
  const db = drizzle(c.env.DB);

  const records = await db
    .select()
    .from(inventory)
    .where(eq(inventory.variantId, variantId))
    .all();

  return c.json({
    variantId,
    warehouses: records,
    totalAvailable: records.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
  });
});

// GET /api/inventory/uom/:uomId - Get stock for UOM
app.get('/uom/:uomId', async (c) => {
  const uomId = c.req.param('uomId');
  const db = drizzle(c.env.DB);

  const records = await db
    .select()
    .from(inventory)
    .where(eq(inventory.uomId, uomId))
    .all();

  return c.json({
    uomId,
    warehouses: records,
    totalAvailable: records.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
  });
});
```

### 3.5 Deliverables
- [ ] WebSocket Durable Object created
- [ ] wrangler.jsonc updated
- [ ] Inventory routes updated with optimistic locking
- [ ] Broadcast on all stock changes
- [ ] New variant/UOM endpoints added
- [ ] WebSocket endpoint `/ws` added

---

## Phase 4: Product Service Schema Cleanup

> **IMPORTANT**: We are ONLY removing stock/quantity fields. All tables (productLocations, variantLocations, productUOMLocations, etc.) are KEPT for their catalog/location purposes.

### 4.1 Remove Stock Fields Only (Keep Tables)

**Migration file**: `services/product-service/migrations/0003_remove_stock_fields.sql`

```sql
-- Remove stock-related columns from products
-- NOTE: Table products is KEPT, only these columns removed
ALTER TABLE products DROP COLUMN minimum_stock;
ALTER TABLE products DROP COLUMN expiration_date;
ALTER TABLE products DROP COLUMN alert_date;

-- Remove stock from product_uoms
-- NOTE: Table product_uoms is KEPT (for UOM definitions)
ALTER TABLE product_uoms DROP COLUMN stock;

-- Remove stock from product_variants
-- NOTE: Table product_variants is KEPT (for variant definitions)
ALTER TABLE product_variants DROP COLUMN stock;

-- Remove quantity from location tables
-- NOTE: Tables are KEPT for physical location mapping (rack, bin, zone, aisle)
ALTER TABLE product_locations DROP COLUMN quantity;
ALTER TABLE variant_locations DROP COLUMN quantity;
ALTER TABLE product_uom_locations DROP COLUMN quantity;
```

### 4.2 What Gets KEPT in Product Service

| Table | Purpose | Fields Removed | Fields Kept |
|-------|---------|----------------|-------------|
| `products` | Product catalog | minimumStock, expirationDate, alertDate | All other fields (name, sku, price, etc.) |
| `productUOMs` | UOM definitions | stock | uomCode, uomName, barcode, conversionFactor |
| `productVariants` | Variant definitions | stock | variantName, variantSKU, variantType, price |
| `productLocations` | Physical location mapping | quantity | productId, warehouseId, rack, bin, zone, aisle |
| `variantLocations` | Variant location mapping | quantity | variantId, warehouseId, rack, bin, zone, aisle |
| `productUOMLocations` | UOM location mapping | quantity | productUOMId, warehouseId, rack, bin, zone, aisle |

### 4.3 Update Product Service Schema

**File**: `services/product-service/src/infrastructure/db/schema.ts`

```typescript
// ============================================
// TABLES KEPT - Only stock fields removed
// ============================================

// products table: KEPT
// REMOVED: minimumStock, expirationDate, alertDate
// KEPT: id, name, sku, barcode, description, price, minimumOrderQuantity, etc.

// productUOMs table: KEPT
// REMOVED: stock
// KEPT: id, productId, uomCode, uomName, barcode, conversionFactor, etc.

// productVariants table: KEPT
// REMOVED: stock
// KEPT: id, productId, variantName, variantSKU, variantType, price, image, etc.

// productLocations table: KEPT (for physical location only)
// REMOVED: quantity
// KEPT: id, productId, warehouseId, rack, bin, zone, aisle

// variantLocations table: KEPT (for physical location only)
// REMOVED: quantity
// KEPT: id, variantId, warehouseId, rack, bin, zone, aisle

// productUOMLocations table: KEPT (for physical location only)
// REMOVED: quantity
// KEPT: id, productUOMId, warehouseId, rack, bin, zone, aisle
```

### 4.3 Deliverables
- [ ] Migration SQL created
- [ ] Schema.ts cleaned up
- [ ] TypeScript types updated

---

## Phase 5: API Refactoring

### 5.1 Simplify Product Location Routes

**File**: `services/product-service/src/infrastructure/http/routes/product-locations.ts`

```typescript
// SIMPLIFIED: Location management only (no quantity)
const createLocationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  // NO quantity - use Inventory Service
});

// POST /api/product-locations
app.post('/', zValidator('json', createLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Just create location record (no inventory sync)
  const newLocation = {
    id: generateId(),
    productId: data.productId,
    warehouseId: data.warehouseId,
    rack: data.rack || null,
    bin: data.bin || null,
    zone: data.zone || null,
    aisle: data.aisle || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(productLocations).values(newLocation).run();

  return c.json(newLocation, 201);
});

// REMOVED: PATCH /:id/quantity - Use Inventory Service instead
```

### 5.2 Remove Inventory Sync Code

Remove all `INVENTORY_SERVICE.fetch()` calls from Product Service routes:
- `product-locations.ts` - Remove inventory sync
- `variant-locations.ts` - Remove validation against product stock
- `product-uom-locations.ts` - Remove validation against product stock

### 5.3 Add Helper Endpoint (Optional)

**Get location with stock (delegates to Inventory Service):**

```typescript
// GET /api/product-locations/product/:productId/with-stock
app.get('/product/:productId/with-stock', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  // Fetch stock from Inventory Service
  const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
    new Request(`http://inventory-service/api/inventory/${productId}`)
  );
  const inventoryData = await inventoryResponse.json();

  // Merge location + stock
  const locationsWithStock = locations.map(loc => {
    const invRecord = inventoryData.warehouses?.find(
      (w: any) => w.warehouseId === loc.warehouseId
    );
    return {
      ...loc,
      quantityAvailable: invRecord?.quantityAvailable || 0,
      quantityReserved: invRecord?.quantityReserved || 0,
    };
  });

  return c.json({ locations: locationsWithStock });
});
```

### 5.4 Deliverables
- [ ] Product location routes simplified
- [ ] Variant location routes simplified
- [ ] UOM location routes simplified
- [ ] All inventory sync code removed
- [ ] Helper endpoint added (optional)

---

## Phase 6: Testing & Validation

### 6.1 Data Validation Queries

```sql
-- 1. Verify product locations migrated
SELECT COUNT(*) as product_locations FROM product_locations;
SELECT COUNT(*) as inventory_records
FROM inventory
WHERE variant_id IS NULL AND uom_id IS NULL;

-- 2. Verify variant locations migrated
SELECT COUNT(*) as variant_locations FROM variant_locations;
SELECT COUNT(*) as variant_inventory FROM inventory WHERE variant_id IS NOT NULL;

-- 3. Verify UOM locations migrated
SELECT COUNT(*) as uom_locations FROM product_uom_locations;
SELECT COUNT(*) as uom_inventory FROM inventory WHERE uom_id IS NOT NULL;

-- 4. Verify expiration dates migrated
SELECT COUNT(*) as products_with_expiration
FROM products WHERE expiration_date IS NOT NULL;
SELECT COUNT(*) as batch_records FROM inventory_batches;

-- 5. Verify total stock matches
SELECT SUM(quantity) as product_service_total FROM product_locations;
SELECT SUM(quantity_available) as inventory_service_total
FROM inventory WHERE variant_id IS NULL AND uom_id IS NULL;
```

### 6.2 WebSocket Test

```javascript
// Browser console test
const ws = new WebSocket('ws://localhost:8792/ws');

ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'global' }));
};

ws.onmessage = (e) => {
  console.log('Event:', JSON.parse(e.data));
};

// In another terminal, adjust inventory and watch for real-time event
```

### 6.3 Optimistic Locking Test

```bash
# Run 5 concurrent updates
for i in {1..5}; do
  curl -X POST http://localhost:8792/api/inventory/adjust \
    -H "Content-Type: application/json" \
    -d '{
      "productId": "test-product",
      "warehouseId": "test-warehouse",
      "quantity": -1,
      "movementType": "out",
      "reason": "Concurrent test '$i'"
    }' &
done
wait

# Verify: All 5 processed, stock reduced by exactly 5
```

### 6.4 Deliverables
- [ ] All validation queries pass
- [ ] WebSocket connection works
- [ ] Real-time events received
- [ ] Optimistic locking prevents conflicts
- [ ] No data loss verified

---

## API Reference

### Inventory Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all inventory |
| GET | `/api/inventory/:productId` | Get product inventory |
| GET | `/api/inventory/:productId/:warehouseId` | Get specific inventory |
| GET | `/api/inventory/variant/:variantId` | Get variant inventory |
| GET | `/api/inventory/uom/:uomId` | Get UOM inventory |
| GET | `/api/inventory/product/:id/total-stock` | Get aggregated stock |
| GET | `/api/inventory/product/:id/low-stock-status` | Check low stock |
| POST | `/api/inventory/adjust` | Adjust stock (with locking) |
| GET | `/ws` | WebSocket real-time updates |

### WebSocket Events

| Event Type | Description |
|------------|-------------|
| `inventory.updated` | Stock level changed |
| `inventory.low_stock` | Stock below minimum threshold |
| `inventory.out_of_stock` | Stock is zero |
| `batch.expiring_soon` | Batch approaching expiration |

### WebSocket Channels

| Channel Format | Example | Description |
|----------------|---------|-------------|
| `global` | `global` | All inventory events |
| `product:{id}` | `product:prod_123` | Specific product |
| `warehouse:{id}` | `warehouse:wh_456` | Specific warehouse |
| `variant:{id}` | `variant:var_789` | Specific variant |

---

## Summary

### What Gets Removed from Product Service

- `products.minimumStock` → Use `inventory.minimumStock`
- `products.expirationDate` → Use `inventoryBatches.expirationDate`
- `products.alertDate` → Use `inventoryBatches.alertDate`
- `productUOMs.stock` → Use Inventory Service
- `productVariants.stock` → Use Inventory Service
- `productLocations.quantity` → Use Inventory Service
- `variantLocations.quantity` → Use Inventory Service
- `productUOMLocations.quantity` → Use Inventory Service

### What Gets Added to Inventory Service

- `inventory.variantId` - Variant support
- `inventory.uomId` - UOM support
- `inventory.quantityInTransit` - Stock in transit (shipping/waiting to unpack)
- `inventory.rack/bin/zone/aisle` - Physical location
- `inventory.version` - Optimistic locking
- `inventory.lastModifiedAt` - Timestamp
- WebSocket Durable Object - Real-time updates
- `/ws` endpoint - WebSocket connection

### What Gets KEPT in Product Service (Tables Not Deleted)

- `productLocations` table - Physical location mapping (rack, bin, zone, aisle)
- `variantLocations` table - Variant location mapping
- `productUOMLocations` table - UOM location mapping
- All catalog tables - products, productUOMs, productVariants, productBundles, etc.

### Benefits

✅ **Single Source of Truth** - All stock in Inventory Service
✅ **Real-Time Updates** - WebSocket broadcasts all changes
✅ **Race Condition Prevention** - Optimistic locking
✅ **Clean Architecture** - Clear bounded contexts
✅ **Scalable** - Independent service scaling
✅ **Omnichannel Ready** - Live stock across all channels

---

**Document Status**: Complete
**Author**: Claude
**Date**: 2025-12-08
**Version**: 2.0 (Simplified - No Backward Compatibility)
