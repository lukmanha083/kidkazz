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

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| **1** | Inventory Service Schema Enhancement | 2-3 days | ✅ Complete |
| **2** | Data Migration Scripts | 2-3 days | ✅ Complete |
| **3** | WebSocket & Optimistic Locking | 3-4 days | ✅ Complete |
| **4** | Product Service Schema Cleanup | 1-2 days | ✅ Complete (2025-12-10) |
| **5** | API Refactoring | 2-3 days | ✅ Complete (2025-12-10) |
| **6** | Testing & Validation | 2-3 days | 🔄 In Progress |
| **7** | Inter-Warehouse Transfer (Inbound/Outbound) | 3-4 days | ⏳ Pending |
| **8** | Stock Opname & Physical Bundles | 4-5 days | ⏳ Pending |

**Total Estimated Time**: 4-5 weeks

---

## Phase 1: Inventory Service Schema Enhancement

### 1.1 Add New Columns to Inventory Table

**Migration file**: `services/inventory-service/migrations/0005_ddd_enhancement.sql`

> **⚠️ IMPORTANT: SQLite Limitation**
>
> SQLite does not allow `DEFAULT CURRENT_TIMESTAMP` or other non-constant defaults in `ALTER TABLE ADD COLUMN` statements.
>
> **What doesn't work:**
> ```sql
> ALTER TABLE inventory ADD COLUMN last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP; -- ❌ ERROR
> ALTER TABLE inventory ADD COLUMN version INTEGER NOT NULL DEFAULT 1; -- ❌ May cause issues
> ```
>
> **What works:**
> ```sql
> ALTER TABLE inventory ADD COLUMN last_modified_at TEXT; -- ✅ OK (null by default)
> ALTER TABLE inventory ADD COLUMN version INTEGER DEFAULT 1; -- ✅ OK (without NOT NULL)
> ```
>
> **Solution:** Set `last_modified_at` in application code when creating/updating records:
> ```typescript
> lastModifiedAt: new Date().toISOString()
> ```

```sql
-- Add variant and UOM support
ALTER TABLE inventory ADD COLUMN variant_id TEXT;
ALTER TABLE inventory ADD COLUMN uom_id TEXT;

-- Add physical location fields (from Product Service)
ALTER TABLE inventory ADD COLUMN rack TEXT;
ALTER TABLE inventory ADD COLUMN bin TEXT;
ALTER TABLE inventory ADD COLUMN zone TEXT;
ALTER TABLE inventory ADD COLUMN aisle TEXT;

-- Add optimistic locking fields
-- Note: SQLite doesn't allow DEFAULT CURRENT_TIMESTAMP in ALTER TABLE
ALTER TABLE inventory ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE inventory ADD COLUMN last_modified_at TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_uom ON inventory(uom_id);
CREATE INDEX IF NOT EXISTS idx_inventory_version ON inventory(product_id, warehouse_id, version);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(warehouse_id, zone, aisle, rack, bin);

-- Add optimistic locking to batches
ALTER TABLE inventory_batches ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE inventory_batches ADD COLUMN last_modified_at TEXT;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_version ON inventory_batches(inventory_id, version);
```

### 1.2 Update Inventory Service Schema

**File**: `services/inventory-service/src/infrastructure/db/schema.ts`

```typescript
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),

  // NEW: Variant and UOM support (Phase 1 DDD Enhancement)
  variantId: text('variant_id'),
  uomId: text('uom_id'),

  // Stock levels
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityReserved: integer('quantity_reserved').default(0).notNull(),
  quantityInTransit: integer('quantity_in_transit').default(0),
  minimumStock: integer('minimum_stock').default(0),

  // NEW: Physical location (moved from Product Service - Phase 1 DDD Enhancement)
  rack: text('rack'),
  bin: text('bin'),
  zone: text('zone'),
  aisle: text('aisle'),

  // NEW: Optimistic locking (Phase 1 DDD Enhancement)
  // Note: Using default(1) without notNull() due to SQLite ALTER TABLE limitations
  version: integer('version').default(1),
  lastModifiedAt: text('last_modified_at'), // Set in application code: new Date().toISOString()

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
- [x] Migration SQL created (`services/product-service/migrations/0018_ddd_phase4_remove_stock_fields.sql`)
- [x] Schema.ts cleaned up (removed minimumStock, expirationDate, alertDate, stock, quantity fields)
- [x] TypeScript types updated (automatically inferred from schema)

**Completed: 2025-12-10**

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
- [x] Product location routes simplified (removed quantity from schema, removed inventory sync code)
- [x] Variant location routes simplified (removed quantity from schema, removed stock validation)
- [x] UOM location routes simplified (removed quantity from schema, removed stock validation)
- [x] All inventory sync code removed (no more INVENTORY_SERVICE.fetch calls for stock sync)
- [x] Helper endpoints added:
  - `GET /api/product-locations/product/:productId/with-stock` - Fetches stock from Inventory Service
  - `GET /api/variant-locations/variant/:variantId/with-stock` - Fetches variant stock from Inventory Service
  - `GET /api/product-uom-locations/uom/:productUOMId/with-stock` - Fetches UOM stock from Inventory Service

**Completed: 2025-12-10**

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

## Phase 7: Inter-Warehouse Transfer (Inbound/Outbound Workflow)

> **DDD Pure Approach**: Stock transfers follow proper warehouse management workflow with document-based state transitions, audit trail, and real-time tracking.

### 7.1 Transfer Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTER-WAREHOUSE TRANSFER WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DESTINATION WAREHOUSE (Inbound)          SOURCE WAREHOUSE (Outbound)        │
│  ─────────────────────────────           ──────────────────────────          │
│                                                                              │
│  1. CREATE TRANSFER REQUEST ───────────→ 2. RECEIVE & APPROVE REQUEST        │
│     (Low stock trigger or manual)           (Warehouse manager approval)     │
│     Status: REQUESTED                       Status: APPROVED / REJECTED      │
│                                                     │                        │
│                                                     ▼                        │
│                                          3. PICK & PACK STOCK                │
│                                             (Picking list generated)         │
│                                             Status: PICKING → PACKED         │
│                                                     │                        │
│                                                     ▼                        │
│                                          4. GOODS ISSUE (GI)                 │
│                                             - Deduct from quantityAvailable  │
│                                             - Add to quantityInTransit       │
│                                             Status: SHIPPED                  │
│                                                     │                        │
│                              ◄───────────────────────                        │
│                                                                              │
│  5. IN TRANSIT                                                               │
│     (Stock cannot be sold)                                                   │
│     Status: IN_TRANSIT                                                       │
│              │                                                               │
│              ▼                                                               │
│  6. GOODS RECEIPT (GR)                                                       │
│     - Receive & verify shipment                                              │
│     Status: RECEIVED                                                         │
│              │                                                               │
│              ▼                                                               │
│  7. PUTAWAY                                                                  │
│     - Deduct from quantityInTransit                                          │
│     - Add to quantityAvailable (destination)                                 │
│     - Assign rack/bin/zone/aisle                                             │
│     Status: COMPLETED                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 State Machine

```
                                    ┌──────────┐
                                    │ REJECTED │
                                    └──────────┘
                                         ▲
                                         │
┌───────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐    ┌─────────┐
│ REQUESTED │───→│ APPROVED │───→│ PICKING  │───→│ PACKED │───→│ SHIPPED │
└───────────┘    └──────────┘    └──────────┘    └────────┘    └─────────┘
                      │                │              │              │
                      ▼                ▼              ▼              ▼
                ┌───────────┐   ┌───────────┐  ┌───────────┐        │
                │ CANCELLED │   │ CANCELLED │  │ CANCELLED │        │
                └───────────┘   └───────────┘  └───────────┘        │
                                                                    ▼
┌───────────┐    ┌──────────┐    ┌────────────┐              ┌────────────┐
│ COMPLETED │◄───│ PUTAWAY  │◄───│  RECEIVED  │◄─────────────│ IN_TRANSIT │
└───────────┘    └──────────┘    └────────────┘              └────────────┘
```

**Valid Status Transitions:**
| Current Status | Allowed Next Status |
|----------------|---------------------|
| `requested` | `approved`, `rejected`, `cancelled` |
| `approved` | `picking`, `cancelled` |
| `picking` | `packed`, `cancelled` |
| `packed` | `shipped`, `cancelled` |
| `shipped` | `in_transit` |
| `in_transit` | `received` |
| `received` | `putaway` |
| `putaway` | `completed` |

### 7.3 Database Schema

**Migration file**: `services/inventory-service/migrations/0006_stock_transfer.sql`

```sql
-- Stock Transfer Orders (Main document)
CREATE TABLE stock_transfer_orders (
  id TEXT PRIMARY KEY,

  -- Document identification
  transfer_number TEXT UNIQUE NOT NULL,  -- e.g., "STO-2025-0001"

  -- Warehouses
  source_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  destination_warehouse_id TEXT NOT NULL REFERENCES warehouses(id),

  -- Request info
  requested_by TEXT,                     -- User who requested
  request_reason TEXT,                   -- 'low_stock' | 'replenishment' | 'rebalancing' | 'manual'
  priority TEXT DEFAULT 'normal',        -- 'low' | 'normal' | 'high' | 'urgent'

  -- Approval info
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'requested',
  -- 'requested' | 'approved' | 'rejected' | 'picking' | 'packed' | 'shipped'
  -- | 'in_transit' | 'received' | 'putaway' | 'completed' | 'cancelled'

  -- Shipping info
  shipped_at TEXT,
  carrier TEXT,
  tracking_number TEXT,
  estimated_arrival TEXT,

  -- Receipt info
  received_at TEXT,
  received_by TEXT,
  putaway_at TEXT,
  completed_at TEXT,

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,

  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Stock Transfer Items (Line items)
CREATE TABLE stock_transfer_items (
  id TEXT PRIMARY KEY,

  transfer_order_id TEXT NOT NULL REFERENCES stock_transfer_orders(id) ON DELETE CASCADE,

  -- Product reference
  product_id TEXT NOT NULL,
  variant_id TEXT,
  uom_id TEXT,

  -- Quantities
  quantity_requested INTEGER NOT NULL,    -- Originally requested
  quantity_approved INTEGER,              -- Approved by source warehouse
  quantity_picked INTEGER DEFAULT 0,      -- Actually picked
  quantity_shipped INTEGER DEFAULT 0,     -- Actually shipped
  quantity_received INTEGER DEFAULT 0,    -- Received at destination
  quantity_putaway INTEGER DEFAULT 0,     -- Put away to shelf

  -- Discrepancy tracking
  quantity_damaged INTEGER DEFAULT 0,     -- Damaged during transit
  quantity_missing INTEGER DEFAULT 0,     -- Missing/lost
  discrepancy_notes TEXT,

  -- Batch tracking (if using batches)
  source_batch_id TEXT,
  destination_batch_id TEXT,

  -- Source location
  source_rack TEXT,
  source_bin TEXT,
  source_zone TEXT,
  source_aisle TEXT,

  -- Destination location
  destination_rack TEXT,
  destination_bin TEXT,
  destination_zone TEXT,
  destination_aisle TEXT,

  -- Status (item-level)
  item_status TEXT DEFAULT 'pending',
  -- 'pending' | 'picked' | 'packed' | 'shipped' | 'received' | 'putaway' | 'completed'

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Stock Transfer Logs (Audit trail)
CREATE TABLE stock_transfer_logs (
  id TEXT PRIMARY KEY,

  transfer_order_id TEXT NOT NULL REFERENCES stock_transfer_orders(id) ON DELETE CASCADE,
  transfer_item_id TEXT REFERENCES stock_transfer_items(id),

  -- Action details
  action TEXT NOT NULL,  -- 'created' | 'approved' | 'rejected' | 'picking_started' | etc.
  previous_status TEXT,
  new_status TEXT,

  -- Context
  performed_by TEXT,
  notes TEXT,
  metadata TEXT,  -- JSON for additional data

  -- Timestamp
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_sto_source_warehouse ON stock_transfer_orders(source_warehouse_id);
CREATE INDEX idx_sto_dest_warehouse ON stock_transfer_orders(destination_warehouse_id);
CREATE INDEX idx_sto_status ON stock_transfer_orders(status);
CREATE INDEX idx_sto_transfer_number ON stock_transfer_orders(transfer_number);
CREATE INDEX idx_sti_transfer_order ON stock_transfer_items(transfer_order_id);
CREATE INDEX idx_sti_product ON stock_transfer_items(product_id);
CREATE INDEX idx_stl_transfer_order ON stock_transfer_logs(transfer_order_id);
```

### 7.4 TypeScript Schema

**File**: `services/inventory-service/src/infrastructure/db/schema.ts`

```typescript
// Stock Transfer Orders
export const stockTransferOrders = sqliteTable('stock_transfer_orders', {
  id: text('id').primaryKey(),

  transferNumber: text('transfer_number').unique().notNull(),

  sourceWarehouseId: text('source_warehouse_id').notNull()
    .references(() => warehouses.id),
  destinationWarehouseId: text('destination_warehouse_id').notNull()
    .references(() => warehouses.id),

  requestedBy: text('requested_by'),
  requestReason: text('request_reason'), // 'low_stock' | 'replenishment' | 'rebalancing' | 'manual'
  priority: text('priority').default('normal'),

  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  rejectionReason: text('rejection_reason'),

  status: text('status').notNull().default('requested'),

  shippedAt: text('shipped_at'),
  carrier: text('carrier'),
  trackingNumber: text('tracking_number'),
  estimatedArrival: text('estimated_arrival'),

  receivedAt: text('received_at'),
  receivedBy: text('received_by'),
  putawayAt: text('putaway_at'),
  completedAt: text('completed_at'),

  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),

  version: integer('version').default(1).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// Stock Transfer Items
export const stockTransferItems = sqliteTable('stock_transfer_items', {
  id: text('id').primaryKey(),

  transferOrderId: text('transfer_order_id').notNull()
    .references(() => stockTransferOrders.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),
  variantId: text('variant_id'),
  uomId: text('uom_id'),

  quantityRequested: integer('quantity_requested').notNull(),
  quantityApproved: integer('quantity_approved'),
  quantityPicked: integer('quantity_picked').default(0),
  quantityShipped: integer('quantity_shipped').default(0),
  quantityReceived: integer('quantity_received').default(0),
  quantityPutaway: integer('quantity_putaway').default(0),

  quantityDamaged: integer('quantity_damaged').default(0),
  quantityMissing: integer('quantity_missing').default(0),
  discrepancyNotes: text('discrepancy_notes'),

  sourceBatchId: text('source_batch_id'),
  destinationBatchId: text('destination_batch_id'),

  sourceRack: text('source_rack'),
  sourceBin: text('source_bin'),
  sourceZone: text('source_zone'),
  sourceAisle: text('source_aisle'),

  destinationRack: text('destination_rack'),
  destinationBin: text('destination_bin'),
  destinationZone: text('destination_zone'),
  destinationAisle: text('destination_aisle'),

  itemStatus: text('item_status').default('pending'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Stock Transfer Logs
export const stockTransferLogs = sqliteTable('stock_transfer_logs', {
  id: text('id').primaryKey(),

  transferOrderId: text('transfer_order_id').notNull()
    .references(() => stockTransferOrders.id, { onDelete: 'cascade' }),
  transferItemId: text('transfer_item_id'),

  action: text('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),

  performedBy: text('performed_by'),
  notes: text('notes'),
  metadata: text('metadata'), // JSON

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Types
export type StockTransferOrder = typeof stockTransferOrders.$inferSelect;
export type InsertStockTransferOrder = typeof stockTransferOrders.$inferInsert;

export type StockTransferItem = typeof stockTransferItems.$inferSelect;
export type InsertStockTransferItem = typeof stockTransferItems.$inferInsert;

export type StockTransferLog = typeof stockTransferLogs.$inferSelect;
export type InsertStockTransferLog = typeof stockTransferLogs.$inferInsert;

// Status enum for type safety
export const TransferStatus = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PICKING: 'picking',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  RECEIVED: 'received',
  PUTAWAY: 'putaway',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type TransferStatusType = typeof TransferStatus[keyof typeof TransferStatus];
```

### 7.5 Transfer API Endpoints

**File**: `services/inventory-service/src/routes/transfers.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import {
  stockTransferOrders,
  stockTransferItems,
  stockTransferLogs,
  inventory,
  TransferStatus,
} from '../infrastructure/db/schema';

const app = new Hono<{ Bindings: Bindings }>();

// Helper: Generate transfer number
const generateTransferNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `STO-${year}-${random}`;
};

// Helper: Log transfer action
async function logTransferAction(
  db: any,
  transferOrderId: string,
  action: string,
  previousStatus: string | null,
  newStatus: string | null,
  performedBy?: string,
  notes?: string,
  metadata?: any
) {
  await db.insert(stockTransferLogs).values({
    id: generateId(),
    transferOrderId,
    action,
    previousStatus,
    newStatus,
    performedBy,
    notes,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: new Date(),
  }).run();
}

// Validation schemas
const createTransferRequestSchema = z.object({
  sourceWarehouseId: z.string(),
  destinationWarehouseId: z.string(),
  requestReason: z.enum(['low_stock', 'replenishment', 'rebalancing', 'manual']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    uomId: z.string().optional(),
    quantityRequested: z.number().positive(),
  })).min(1),
});

// ============================================================
// STEP 1: CREATE TRANSFER REQUEST (Destination Warehouse)
// ============================================================
app.post('/request', zValidator('json', createTransferRequestSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  // Validate: Source and destination must be different
  if (data.sourceWarehouseId === data.destinationWarehouseId) {
    return c.json({ error: 'Source and destination warehouse must be different' }, 400);
  }

  // Create transfer order
  const transferOrder = {
    id: generateId(),
    transferNumber: generateTransferNumber(),
    sourceWarehouseId: data.sourceWarehouseId,
    destinationWarehouseId: data.destinationWarehouseId,
    requestedBy: userId,
    requestReason: data.requestReason,
    priority: data.priority || 'normal',
    status: TransferStatus.REQUESTED,
    notes: data.notes,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  await db.insert(stockTransferOrders).values(transferOrder).run();

  // Create transfer items
  const items = data.items.map(item => ({
    id: generateId(),
    transferOrderId: transferOrder.id,
    productId: item.productId,
    variantId: item.variantId || null,
    uomId: item.uomId || null,
    quantityRequested: item.quantityRequested,
    itemStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  }));

  for (const item of items) {
    await db.insert(stockTransferItems).values(item).run();
  }

  // Log action
  await logTransferAction(db, transferOrder.id, 'created', null, TransferStatus.REQUESTED, userId);

  // Broadcast WebSocket event
  await broadcastTransferEvent(c.env, {
    type: 'transfer.requested',
    data: {
      transferId: transferOrder.id,
      transferNumber: transferOrder.transferNumber,
      sourceWarehouseId: data.sourceWarehouseId,
      destinationWarehouseId: data.destinationWarehouseId,
      itemCount: items.length,
      priority: transferOrder.priority,
      timestamp: now.toISOString(),
    },
  });

  return c.json({
    transferOrder: { ...transferOrder, items },
    message: 'Transfer request created',
  }, 201);
});

// ============================================================
// STEP 2: APPROVE/REJECT TRANSFER (Source Warehouse)
// ============================================================
app.post('/:id/approve', zValidator('json', z.object({
  approvedItems: z.array(z.object({
    itemId: z.string(),
    quantityApproved: z.number().min(0),
  })),
  notes: z.string().optional(),
})), async (c) => {
  const transferId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  // Get transfer order
  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.REQUESTED) {
    return c.json({ error: `Cannot approve transfer in ${transfer.status} status` }, 400);
  }

  // Validate stock availability and update items
  for (const approvedItem of data.approvedItems) {
    const item = await db.select().from(stockTransferItems)
      .where(eq(stockTransferItems.id, approvedItem.itemId)).get();

    if (!item) continue;

    // Check stock availability
    const inv = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, item.productId),
        eq(inventory.warehouseId, transfer.sourceWarehouseId),
        item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
      )).get();

    const availableQty = inv?.quantityAvailable || 0;
    const approvedQty = Math.min(approvedItem.quantityApproved, availableQty);

    await db.update(stockTransferItems)
      .set({
        quantityApproved: approvedQty,
        updatedAt: now,
      })
      .where(eq(stockTransferItems.id, approvedItem.itemId))
      .run();
  }

  // Update transfer status
  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.APPROVED,
      approvedBy: userId,
      approvedAt: now.toISOString(),
      notes: data.notes || transfer.notes,
      version: transfer.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(and(
      eq(stockTransferOrders.id, transferId),
      eq(stockTransferOrders.version, transfer.version)
    ))
    .run();

  await logTransferAction(db, transferId, 'approved', TransferStatus.REQUESTED, TransferStatus.APPROVED, userId);

  // Broadcast
  await broadcastTransferEvent(c.env, {
    type: 'transfer.approved',
    data: { transferId, transferNumber: transfer.transferNumber, timestamp: now.toISOString() },
  });

  return c.json({ message: 'Transfer approved', status: TransferStatus.APPROVED });
});

app.post('/:id/reject', zValidator('json', z.object({
  reason: z.string(),
})), async (c) => {
  const transferId = c.req.param('id');
  const { reason } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.REQUESTED) {
    return c.json({ error: `Cannot reject transfer in ${transfer.status} status` }, 400);
  }

  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.REJECTED,
      rejectionReason: reason,
      version: transfer.version + 1,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'rejected', TransferStatus.REQUESTED, TransferStatus.REJECTED, userId, reason);

  return c.json({ message: 'Transfer rejected', status: TransferStatus.REJECTED });
});

// ============================================================
// STEP 3: START PICKING (Source Warehouse)
// ============================================================
app.post('/:id/start-picking', async (c) => {
  const transferId = c.req.param('id');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.APPROVED) {
    return c.json({ error: `Cannot start picking for transfer in ${transfer.status} status` }, 400);
  }

  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.PICKING,
      version: transfer.version + 1,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'picking_started', TransferStatus.APPROVED, TransferStatus.PICKING, userId);

  // Broadcast
  await broadcastTransferEvent(c.env, {
    type: 'transfer.picking_started',
    data: { transferId, transferNumber: transfer.transferNumber, timestamp: new Date().toISOString() },
  });

  return c.json({ message: 'Picking started', status: TransferStatus.PICKING });
});

// ============================================================
// STEP 4: CONFIRM PICKED & PACK (Source Warehouse)
// ============================================================
app.post('/:id/confirm-picked', zValidator('json', z.object({
  items: z.array(z.object({
    itemId: z.string(),
    quantityPicked: z.number().min(0),
    sourceRack: z.string().optional(),
    sourceBin: z.string().optional(),
  })),
})), async (c) => {
  const transferId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.PICKING) {
    return c.json({ error: `Cannot confirm picked for transfer in ${transfer.status} status` }, 400);
  }

  // Update item quantities
  for (const pickedItem of data.items) {
    await db.update(stockTransferItems)
      .set({
        quantityPicked: pickedItem.quantityPicked,
        sourceRack: pickedItem.sourceRack,
        sourceBin: pickedItem.sourceBin,
        itemStatus: 'picked',
        updatedAt: now,
      })
      .where(eq(stockTransferItems.id, pickedItem.itemId))
      .run();
  }

  // Update transfer status to PACKED
  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.PACKED,
      version: transfer.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'packed', TransferStatus.PICKING, TransferStatus.PACKED, userId);

  return c.json({ message: 'Items picked and packed', status: TransferStatus.PACKED });
});

// ============================================================
// STEP 5: GOODS ISSUE - SHIP (Source Warehouse)
// Critical: This deducts from quantityAvailable and adds to quantityInTransit
// ============================================================
app.post('/:id/ship', zValidator('json', z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  estimatedArrival: z.string().optional(),
  notes: z.string().optional(),
})), async (c) => {
  const transferId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.PACKED) {
    return c.json({ error: `Cannot ship transfer in ${transfer.status} status` }, 400);
  }

  // Get all items
  const items = await db.select().from(stockTransferItems)
    .where(eq(stockTransferItems.transferOrderId, transferId)).all();

  // GOODS ISSUE: Deduct from source warehouse, add to in-transit
  for (const item of items) {
    const quantityToShip = item.quantityPicked || 0;
    if (quantityToShip === 0) continue;

    // Get source inventory
    const sourceInv = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, item.productId),
        eq(inventory.warehouseId, transfer.sourceWarehouseId),
        item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
      )).get();

    if (!sourceInv) continue;

    // Deduct from quantityAvailable, add to quantityInTransit
    await db.update(inventory)
      .set({
        quantityAvailable: sourceInv.quantityAvailable - quantityToShip,
        quantityInTransit: (sourceInv.quantityInTransit || 0) + quantityToShip,
        version: sourceInv.version + 1,
        lastModifiedAt: now.toISOString(),
        updatedAt: now,
      })
      .where(and(
        eq(inventory.id, sourceInv.id),
        eq(inventory.version, sourceInv.version)
      ))
      .run();

    // Record movement (Goods Issue)
    await db.insert(inventoryMovements).values({
      id: generateId(),
      inventoryId: sourceInv.id,
      productId: item.productId,
      warehouseId: transfer.sourceWarehouseId,
      movementType: 'transfer_out',
      quantity: -quantityToShip,
      source: 'warehouse',
      referenceType: 'stock_transfer',
      referenceId: transferId,
      reason: `Goods Issue for STO ${transfer.transferNumber}`,
      performedBy: userId,
      createdAt: now,
    }).run();

    // Update item
    await db.update(stockTransferItems)
      .set({
        quantityShipped: quantityToShip,
        itemStatus: 'shipped',
        updatedAt: now,
      })
      .where(eq(stockTransferItems.id, item.id))
      .run();
  }

  // Update transfer status
  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.SHIPPED,
      shippedAt: now.toISOString(),
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      estimatedArrival: data.estimatedArrival,
      notes: data.notes || transfer.notes,
      version: transfer.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'shipped', TransferStatus.PACKED, TransferStatus.SHIPPED, userId, null, {
    carrier: data.carrier,
    trackingNumber: data.trackingNumber,
  });

  // Broadcast to both warehouses
  await broadcastTransferEvent(c.env, {
    type: 'transfer.shipped',
    data: {
      transferId,
      transferNumber: transfer.transferNumber,
      sourceWarehouseId: transfer.sourceWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId,
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      timestamp: now.toISOString(),
    },
  });

  // Also update status to IN_TRANSIT immediately (shipment started)
  await db.update(stockTransferOrders)
    .set({ status: TransferStatus.IN_TRANSIT })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  return c.json({
    message: 'Goods issued and shipped',
    status: TransferStatus.IN_TRANSIT,
    trackingNumber: data.trackingNumber,
  });
});

// ============================================================
// STEP 6: GOODS RECEIPT (Destination Warehouse)
// ============================================================
app.post('/:id/receive', zValidator('json', z.object({
  items: z.array(z.object({
    itemId: z.string(),
    quantityReceived: z.number().min(0),
    quantityDamaged: z.number().min(0).optional(),
    quantityMissing: z.number().min(0).optional(),
    discrepancyNotes: z.string().optional(),
  })),
  notes: z.string().optional(),
})), async (c) => {
  const transferId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.IN_TRANSIT) {
    return c.json({ error: `Cannot receive transfer in ${transfer.status} status` }, 400);
  }

  // Update received quantities
  for (const receivedItem of data.items) {
    await db.update(stockTransferItems)
      .set({
        quantityReceived: receivedItem.quantityReceived,
        quantityDamaged: receivedItem.quantityDamaged || 0,
        quantityMissing: receivedItem.quantityMissing || 0,
        discrepancyNotes: receivedItem.discrepancyNotes,
        itemStatus: 'received',
        updatedAt: now,
      })
      .where(eq(stockTransferItems.id, receivedItem.itemId))
      .run();
  }

  // Update transfer status
  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.RECEIVED,
      receivedAt: now.toISOString(),
      receivedBy: userId,
      notes: data.notes || transfer.notes,
      version: transfer.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'received', TransferStatus.IN_TRANSIT, TransferStatus.RECEIVED, userId);

  // Broadcast
  await broadcastTransferEvent(c.env, {
    type: 'transfer.received',
    data: { transferId, transferNumber: transfer.transferNumber, timestamp: now.toISOString() },
  });

  return c.json({ message: 'Goods received', status: TransferStatus.RECEIVED });
});

// ============================================================
// STEP 7: PUTAWAY - Complete Transfer (Destination Warehouse)
// Critical: This deducts from quantityInTransit and adds to destination quantityAvailable
// ============================================================
app.post('/:id/putaway', zValidator('json', z.object({
  items: z.array(z.object({
    itemId: z.string(),
    quantityPutaway: z.number().min(0),
    destinationRack: z.string().optional(),
    destinationBin: z.string().optional(),
    destinationZone: z.string().optional(),
    destinationAisle: z.string().optional(),
  })),
})), async (c) => {
  const transferId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
  if (transfer.status !== TransferStatus.RECEIVED) {
    return c.json({ error: `Cannot putaway transfer in ${transfer.status} status` }, 400);
  }

  // Process putaway for each item
  for (const putawayItem of data.items) {
    const item = await db.select().from(stockTransferItems)
      .where(eq(stockTransferItems.id, putawayItem.itemId)).get();

    if (!item || putawayItem.quantityPutaway === 0) continue;

    // Deduct from source warehouse's quantityInTransit
    const sourceInv = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, item.productId),
        eq(inventory.warehouseId, transfer.sourceWarehouseId),
        item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
      )).get();

    if (sourceInv) {
      await db.update(inventory)
        .set({
          quantityInTransit: Math.max(0, (sourceInv.quantityInTransit || 0) - putawayItem.quantityPutaway),
          version: sourceInv.version + 1,
          lastModifiedAt: now.toISOString(),
          updatedAt: now,
        })
        .where(eq(inventory.id, sourceInv.id))
        .run();
    }

    // Add to destination warehouse's quantityAvailable
    let destInv = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, item.productId),
        eq(inventory.warehouseId, transfer.destinationWarehouseId),
        item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
      )).get();

    if (destInv) {
      // Update existing inventory
      await db.update(inventory)
        .set({
          quantityAvailable: destInv.quantityAvailable + putawayItem.quantityPutaway,
          rack: putawayItem.destinationRack || destInv.rack,
          bin: putawayItem.destinationBin || destInv.bin,
          zone: putawayItem.destinationZone || destInv.zone,
          aisle: putawayItem.destinationAisle || destInv.aisle,
          version: destInv.version + 1,
          lastModifiedAt: now.toISOString(),
          updatedAt: now,
        })
        .where(eq(inventory.id, destInv.id))
        .run();
    } else {
      // Create new inventory record at destination
      const newInvId = generateId();
      await db.insert(inventory).values({
        id: newInvId,
        productId: item.productId,
        warehouseId: transfer.destinationWarehouseId,
        variantId: item.variantId,
        uomId: item.uomId,
        quantityAvailable: putawayItem.quantityPutaway,
        quantityReserved: 0,
        quantityInTransit: 0,
        minimumStock: 0,
        rack: putawayItem.destinationRack,
        bin: putawayItem.destinationBin,
        zone: putawayItem.destinationZone,
        aisle: putawayItem.destinationAisle,
        version: 1,
        lastModifiedAt: now.toISOString(),
        createdAt: now,
        updatedAt: now,
      }).run();
      destInv = { id: newInvId } as any;
    }

    // Record movement (Goods Receipt)
    await db.insert(inventoryMovements).values({
      id: generateId(),
      inventoryId: destInv.id,
      productId: item.productId,
      warehouseId: transfer.destinationWarehouseId,
      movementType: 'transfer_in',
      quantity: putawayItem.quantityPutaway,
      source: 'warehouse',
      referenceType: 'stock_transfer',
      referenceId: transferId,
      reason: `Goods Receipt for STO ${transfer.transferNumber}`,
      performedBy: userId,
      createdAt: now,
    }).run();

    // Update item
    await db.update(stockTransferItems)
      .set({
        quantityPutaway: putawayItem.quantityPutaway,
        destinationRack: putawayItem.destinationRack,
        destinationBin: putawayItem.destinationBin,
        destinationZone: putawayItem.destinationZone,
        destinationAisle: putawayItem.destinationAisle,
        itemStatus: 'completed',
        updatedAt: now,
      })
      .where(eq(stockTransferItems.id, putawayItem.itemId))
      .run();

    // Broadcast inventory update for destination warehouse
    await broadcastInventoryChange(c.env, {
      type: 'inventory.updated',
      data: {
        productId: item.productId,
        warehouseId: transfer.destinationWarehouseId,
        variantId: item.variantId,
        timestamp: now.toISOString(),
      },
    });
  }

  // Update transfer status to PUTAWAY then COMPLETED
  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.COMPLETED,
      putawayAt: now.toISOString(),
      completedAt: now.toISOString(),
      version: transfer.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'completed', TransferStatus.RECEIVED, TransferStatus.COMPLETED, userId);

  // Broadcast completion
  await broadcastTransferEvent(c.env, {
    type: 'transfer.completed',
    data: {
      transferId,
      transferNumber: transfer.transferNumber,
      sourceWarehouseId: transfer.sourceWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId,
      timestamp: now.toISOString(),
    },
  });

  return c.json({ message: 'Transfer completed', status: TransferStatus.COMPLETED });
});

// ============================================================
// CANCEL TRANSFER (Before shipping)
// ============================================================
app.post('/:id/cancel', zValidator('json', z.object({
  reason: z.string(),
})), async (c) => {
  const transferId = c.req.param('id');
  const { reason } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);

  const cancellableStatuses = [
    TransferStatus.REQUESTED,
    TransferStatus.APPROVED,
    TransferStatus.PICKING,
    TransferStatus.PACKED,
  ];

  if (!cancellableStatuses.includes(transfer.status as any)) {
    return c.json({ error: `Cannot cancel transfer in ${transfer.status} status` }, 400);
  }

  await db.update(stockTransferOrders)
    .set({
      status: TransferStatus.CANCELLED,
      cancellationReason: reason,
      version: transfer.version + 1,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(stockTransferOrders.id, transferId))
    .run();

  await logTransferAction(db, transferId, 'cancelled', transfer.status, TransferStatus.CANCELLED, userId, reason);

  return c.json({ message: 'Transfer cancelled', status: TransferStatus.CANCELLED });
});

// ============================================================
// GET ENDPOINTS
// ============================================================

// GET all transfers for a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const direction = c.req.query('direction'); // 'inbound' | 'outbound' | 'all'
  const status = c.req.query('status');
  const db = drizzle(c.env.DB);

  let query = db.select().from(stockTransferOrders);

  if (direction === 'inbound') {
    query = query.where(eq(stockTransferOrders.destinationWarehouseId, warehouseId));
  } else if (direction === 'outbound') {
    query = query.where(eq(stockTransferOrders.sourceWarehouseId, warehouseId));
  } else {
    query = query.where(or(
      eq(stockTransferOrders.sourceWarehouseId, warehouseId),
      eq(stockTransferOrders.destinationWarehouseId, warehouseId)
    ));
  }

  const transfers = await query.all();

  return c.json({ transfers });
});

// GET single transfer with items
app.get('/:id', async (c) => {
  const transferId = c.req.param('id');
  const db = drizzle(c.env.DB);

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.id, transferId)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);

  const items = await db.select().from(stockTransferItems)
    .where(eq(stockTransferItems.transferOrderId, transferId)).all();

  const logs = await db.select().from(stockTransferLogs)
    .where(eq(stockTransferLogs.transferOrderId, transferId))
    .orderBy(stockTransferLogs.createdAt)
    .all();

  return c.json({ transfer: { ...transfer, items, logs } });
});

// GET transfer by number
app.get('/number/:transferNumber', async (c) => {
  const transferNumber = c.req.param('transferNumber');
  const db = drizzle(c.env.DB);

  const transfer = await db.select().from(stockTransferOrders)
    .where(eq(stockTransferOrders.transferNumber, transferNumber)).get();

  if (!transfer) return c.json({ error: 'Transfer not found' }, 404);

  return c.json({ transfer });
});

export default app;
```

### 7.6 WebSocket Events for Transfers

```typescript
// Add to InventoryWebSocket event types
export interface TransferEvent {
  type:
    | 'transfer.requested'
    | 'transfer.approved'
    | 'transfer.rejected'
    | 'transfer.picking_started'
    | 'transfer.packed'
    | 'transfer.shipped'
    | 'transfer.received'
    | 'transfer.completed'
    | 'transfer.cancelled';
  data: {
    transferId: string;
    transferNumber: string;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    timestamp: string;
    [key: string]: any;
  };
}

// Broadcast helper
async function broadcastTransferEvent(env: Env, event: TransferEvent) {
  // Broadcast to both source and destination warehouse channels
  const channels = [
    `warehouse:${event.data.sourceWarehouseId}`,
    `warehouse:${event.data.destinationWarehouseId}`,
    'global',
  ].filter(Boolean);

  for (const channel of channels) {
    await broadcastInventoryChange(env, {
      ...event,
      channel,
    });
  }
}
```

### 7.7 Auto-Trigger Transfer on Low Stock

```typescript
// Optional: Automatic transfer request when stock falls below minimum
async function checkAndTriggerTransfer(
  env: Env,
  productId: string,
  warehouseId: string
) {
  const db = drizzle(env.DB);

  // Get inventory at this warehouse
  const inv = await db.select().from(inventory)
    .where(and(
      eq(inventory.productId, productId),
      eq(inventory.warehouseId, warehouseId)
    )).get();

  if (!inv || !inv.minimumStock) return;

  // Check if below minimum
  if (inv.quantityAvailable < inv.minimumStock) {
    // Find warehouse with highest stock of this product
    const otherWarehouses = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, productId),
        ne(inventory.warehouseId, warehouseId)
      ))
      .orderBy(desc(inventory.quantityAvailable))
      .all();

    const sourceWarehouse = otherWarehouses.find(w => w.quantityAvailable > inv.minimumStock);

    if (sourceWarehouse) {
      // Create automatic transfer request
      const quantityNeeded = inv.minimumStock - inv.quantityAvailable;

      // ... create transfer request with requestReason: 'low_stock'
      console.log(`Auto-triggered transfer request: ${quantityNeeded} units from ${sourceWarehouse.warehouseId} to ${warehouseId}`);
    }
  }
}
```

### 7.8 Transfer API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transfers/request` | Create transfer request (destination) |
| POST | `/api/transfers/:id/approve` | Approve transfer (source) |
| POST | `/api/transfers/:id/reject` | Reject transfer (source) |
| POST | `/api/transfers/:id/start-picking` | Start picking process |
| POST | `/api/transfers/:id/confirm-picked` | Confirm items picked & pack |
| POST | `/api/transfers/:id/ship` | Goods Issue - ship items |
| POST | `/api/transfers/:id/receive` | Goods Receipt - receive items |
| POST | `/api/transfers/:id/putaway` | Complete transfer - putaway |
| POST | `/api/transfers/:id/cancel` | Cancel transfer |
| GET | `/api/transfers/warehouse/:id` | Get transfers for warehouse |
| GET | `/api/transfers/:id` | Get transfer details |
| GET | `/api/transfers/number/:num` | Get by transfer number |

### 7.9 Deliverables
- [ ] Migration SQL created for stock_transfer tables
- [ ] Schema.ts updated with transfer entities
- [ ] Transfer routes implemented with state machine
- [ ] Goods Issue deducts from source, adds to in-transit
- [ ] Goods Receipt deducts from in-transit, adds to destination
- [ ] WebSocket events for all transfer status changes
- [ ] Auto-trigger transfer on low stock (optional)
- [ ] Complete audit trail in stock_transfer_logs

---

## Phase 8: Stock Opname & Physical Bundles

> **DDD Pure Approach**: Stock Opname (Physical Inventory Count) reconciles system inventory with actual physical count. Physical Bundles allow pre-assembled inventory including nested bundles (bundle from bundle).
>
> **IMPORTANT RULE**: Nested bundles can ONLY be created from Physical Bundles (not Virtual Bundles). This simplifies stock opname - we only count physical inventory units without needing to track virtual bundle calculation layers.

### 8.1 Stock Opname Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STOCK OPNAME WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CREATE OPNAME SESSION                                                    │
│     - Select warehouse                                                       │
│     - Select scope: Full / Zone / Category                                  │
│     - Status: DRAFT                                                          │
│              │                                                               │
│              ▼                                                               │
│  2. START COUNTING                                                           │
│     - Warehouse staff scan barcodes                                          │
│     - Enter actual physical quantities                                       │
│     - Status: IN_PROGRESS                                                    │
│              │                                                               │
│              ▼                                                               │
│  3. GENERATE VARIANCE REPORT                                                 │
│     - Compare: systemQty vs countedQty                                      │
│     - Calculate: variance = countedQty - systemQty                          │
│     - Flag: discrepancies for review                                         │
│     - Status: PENDING_REVIEW                                                 │
│              │                                                               │
│              ▼                                                               │
│  4. REVIEW & APPROVE                                                         │
│     - Manager reviews variances                                              │
│     - Approve / Reject adjustments                                           │
│     - Status: APPROVED / REJECTED                                            │
│              │                                                               │
│              ▼                                                               │
│  5. APPLY ADJUSTMENTS                                                        │
│     - Update inventory.quantityAvailable                                    │
│     - Record movements with reason: "Stock Opname Adjustment"               │
│     - Status: COMPLETED                                                      │
│                                                                              │
│  ⚠️ BUNDLE HANDLING:                                                         │
│  ├── Virtual Bundles: SKIP (calculated from components)                     │
│  └── Physical Bundles: COUNT (exists as physical inventory)                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Stock Opname State Machine

```
┌───────┐    ┌─────────────┐    ┌────────────────┐    ┌──────────┐    ┌───────────┐
│ DRAFT │───→│ IN_PROGRESS │───→│ PENDING_REVIEW │───→│ APPROVED │───→│ COMPLETED │
└───────┘    └─────────────┘    └────────────────┘    └──────────┘    └───────────┘
     │              │                    │                   │
     ▼              ▼                    ▼                   │
┌───────────┐ ┌───────────┐       ┌──────────┐              │
│ CANCELLED │ │ CANCELLED │       │ REJECTED │◄─────────────┘
└───────────┘ └───────────┘       └──────────┘     (if variances unacceptable)
```

### 8.3 Stock Opname Database Schema

**Migration file**: `services/inventory-service/migrations/0007_stock_opname.sql`

```sql
-- Stock Opname Sessions (Main document)
CREATE TABLE stock_opname_sessions (
  id TEXT PRIMARY KEY,

  -- Document identification
  opname_number TEXT UNIQUE NOT NULL,  -- e.g., "SOP-2025-0001"

  -- Scope
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  scope_type TEXT NOT NULL DEFAULT 'full',  -- 'full' | 'zone' | 'category' | 'product'
  scope_zone TEXT,          -- If scope_type = 'zone'
  scope_category_id TEXT,   -- If scope_type = 'category'
  scope_product_ids TEXT,   -- JSON array if scope_type = 'product'

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'completed' | 'cancelled'

  -- Timing
  started_at TEXT,
  completed_at TEXT,

  -- Review
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,

  -- Summary (calculated after counting)
  total_items_counted INTEGER DEFAULT 0,
  total_variance_qty INTEGER DEFAULT 0,
  total_variance_value REAL DEFAULT 0,

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,

  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Stock Opname Items (Line items - each product counted)
CREATE TABLE stock_opname_items (
  id TEXT PRIMARY KEY,

  opname_session_id TEXT NOT NULL REFERENCES stock_opname_sessions(id) ON DELETE CASCADE,

  -- Product reference
  product_id TEXT NOT NULL,
  variant_id TEXT,
  uom_id TEXT,
  bundle_id TEXT,  -- If counting physical bundle

  -- Bundle type indicator
  is_physical_bundle INTEGER DEFAULT 0,  -- 1 = physical bundle, 0 = regular product

  -- System quantity (snapshot at start)
  system_quantity INTEGER NOT NULL,

  -- Counted quantity (from barcode scan)
  counted_quantity INTEGER,

  -- Variance
  variance_quantity INTEGER,  -- counted - system (can be negative)
  variance_value REAL,        -- variance × unit cost

  -- Location where counted
  rack TEXT,
  bin TEXT,
  zone TEXT,
  aisle TEXT,

  -- Counting details
  counted_by TEXT,
  counted_at TEXT,

  -- Adjustment status
  adjustment_status TEXT DEFAULT 'pending',
  -- 'pending' | 'approved' | 'rejected' | 'applied'
  adjustment_reason TEXT,  -- Reason for discrepancy

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Stock Opname Adjustments (Applied adjustments)
CREATE TABLE stock_opname_adjustments (
  id TEXT PRIMARY KEY,

  opname_session_id TEXT NOT NULL REFERENCES stock_opname_sessions(id) ON DELETE CASCADE,
  opname_item_id TEXT NOT NULL REFERENCES stock_opname_items(id),

  -- Product reference
  product_id TEXT NOT NULL,
  variant_id TEXT,
  uom_id TEXT,
  bundle_id TEXT,
  warehouse_id TEXT NOT NULL,

  -- Adjustment details
  previous_quantity INTEGER NOT NULL,
  adjusted_quantity INTEGER NOT NULL,
  adjustment_amount INTEGER NOT NULL,  -- adjusted - previous

  -- Reference
  inventory_movement_id TEXT,  -- Link to inventory_movements record

  -- Approval
  approved_by TEXT,
  approved_at TEXT,

  -- Audit
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_sos_warehouse ON stock_opname_sessions(warehouse_id);
CREATE INDEX idx_sos_status ON stock_opname_sessions(status);
CREATE INDEX idx_sos_opname_number ON stock_opname_sessions(opname_number);
CREATE INDEX idx_soi_session ON stock_opname_items(opname_session_id);
CREATE INDEX idx_soi_product ON stock_opname_items(product_id);
CREATE INDEX idx_soi_bundle ON stock_opname_items(bundle_id);
CREATE INDEX idx_soa_session ON stock_opname_adjustments(opname_session_id);
```

### 8.4 Stock Opname TypeScript Schema

**File**: `services/inventory-service/src/infrastructure/db/schema.ts`

```typescript
// Stock Opname Sessions
export const stockOpnameSessions = sqliteTable('stock_opname_sessions', {
  id: text('id').primaryKey(),

  opnameNumber: text('opname_number').unique().notNull(),

  warehouseId: text('warehouse_id').notNull()
    .references(() => warehouses.id),
  scopeType: text('scope_type').notNull().default('full'),
  scopeZone: text('scope_zone'),
  scopeCategoryId: text('scope_category_id'),
  scopeProductIds: text('scope_product_ids'),  // JSON array

  status: text('status').notNull().default('draft'),

  startedAt: text('started_at'),
  completedAt: text('completed_at'),

  reviewedBy: text('reviewed_by'),
  reviewedAt: text('reviewed_at'),
  reviewNotes: text('review_notes'),

  totalItemsCounted: integer('total_items_counted').default(0),
  totalVarianceQty: integer('total_variance_qty').default(0),
  totalVarianceValue: real('total_variance_value').default(0),

  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),

  version: integer('version').default(1).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// Stock Opname Items
export const stockOpnameItems = sqliteTable('stock_opname_items', {
  id: text('id').primaryKey(),

  opnameSessionId: text('opname_session_id').notNull()
    .references(() => stockOpnameSessions.id, { onDelete: 'cascade' }),

  productId: text('product_id').notNull(),
  variantId: text('variant_id'),
  uomId: text('uom_id'),
  bundleId: text('bundle_id'),

  isPhysicalBundle: integer('is_physical_bundle').default(0),

  systemQuantity: integer('system_quantity').notNull(),
  countedQuantity: integer('counted_quantity'),

  varianceQuantity: integer('variance_quantity'),
  varianceValue: real('variance_value'),

  rack: text('rack'),
  bin: text('bin'),
  zone: text('zone'),
  aisle: text('aisle'),

  countedBy: text('counted_by'),
  countedAt: text('counted_at'),

  adjustmentStatus: text('adjustment_status').default('pending'),
  adjustmentReason: text('adjustment_reason'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Opname Status enum
export const OpnameStatus = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
```

### 8.5 Stock Opname API Endpoints

**File**: `services/inventory-service/src/routes/stock-opname.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Bindings }>();

// Generate opname number
const generateOpnameNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `SOP-${year}-${random}`;
};

// ============================================================
// STEP 1: CREATE OPNAME SESSION
// ============================================================
app.post('/sessions', zValidator('json', z.object({
  warehouseId: z.string(),
  scopeType: z.enum(['full', 'zone', 'category', 'product']).default('full'),
  scopeZone: z.string().optional(),
  scopeCategoryId: z.string().optional(),
  scopeProductIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
})), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const session = {
    id: generateId(),
    opnameNumber: generateOpnameNumber(),
    warehouseId: data.warehouseId,
    scopeType: data.scopeType,
    scopeZone: data.scopeZone,
    scopeCategoryId: data.scopeCategoryId,
    scopeProductIds: data.scopeProductIds ? JSON.stringify(data.scopeProductIds) : null,
    status: OpnameStatus.DRAFT,
    notes: data.notes,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  await db.insert(stockOpnameSessions).values(session).run();

  return c.json({ session, message: 'Opname session created' }, 201);
});

// ============================================================
// STEP 2: START COUNTING - Initialize items from inventory
// ============================================================
app.post('/sessions/:id/start', async (c) => {
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);
  if (session.status !== OpnameStatus.DRAFT) {
    return c.json({ error: `Cannot start session in ${session.status} status` }, 400);
  }

  // Get inventory items for this warehouse based on scope
  let inventoryQuery = db.select().from(inventory)
    .where(eq(inventory.warehouseId, session.warehouseId));

  // Apply scope filters
  if (session.scopeType === 'zone' && session.scopeZone) {
    inventoryQuery = inventoryQuery.where(eq(inventory.zone, session.scopeZone));
  }
  if (session.scopeType === 'product' && session.scopeProductIds) {
    const productIds = JSON.parse(session.scopeProductIds);
    inventoryQuery = inventoryQuery.where(inArray(inventory.productId, productIds));
  }

  const inventoryItems = await inventoryQuery.all();

  // Create opname items (snapshot system quantities)
  for (const inv of inventoryItems) {
    // Check if this is a physical bundle
    const isBundle = inv.bundleId ? 1 : 0;

    await db.insert(stockOpnameItems).values({
      id: generateId(),
      opnameSessionId: sessionId,
      productId: inv.productId,
      variantId: inv.variantId,
      uomId: inv.uomId,
      bundleId: inv.bundleId,
      isPhysicalBundle: isBundle,
      systemQuantity: inv.quantityAvailable,
      rack: inv.rack,
      bin: inv.bin,
      zone: inv.zone,
      aisle: inv.aisle,
      adjustmentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  // Update session status
  await db.update(stockOpnameSessions)
    .set({
      status: OpnameStatus.IN_PROGRESS,
      startedAt: now.toISOString(),
      totalItemsCounted: 0,
      version: session.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockOpnameSessions.id, sessionId))
    .run();

  return c.json({
    message: 'Opname started',
    itemsToCount: inventoryItems.length,
    status: OpnameStatus.IN_PROGRESS,
  });
});

// ============================================================
// STEP 3: RECORD COUNT (Barcode scan entry)
// ============================================================
app.post('/sessions/:id/count', zValidator('json', z.object({
  items: z.array(z.object({
    itemId: z.string().optional(),
    productId: z.string().optional(),  // For finding by barcode/SKU
    barcode: z.string().optional(),
    countedQuantity: z.number().min(0),
    rack: z.string().optional(),
    bin: z.string().optional(),
  })),
})), async (c) => {
  const sessionId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);
  if (session.status !== OpnameStatus.IN_PROGRESS) {
    return c.json({ error: `Cannot count in ${session.status} status` }, 400);
  }

  let countedItems = 0;

  for (const item of data.items) {
    // Find opname item
    let opnameItem;
    if (item.itemId) {
      opnameItem = await db.select().from(stockOpnameItems)
        .where(eq(stockOpnameItems.id, item.itemId)).get();
    } else if (item.productId) {
      opnameItem = await db.select().from(stockOpnameItems)
        .where(and(
          eq(stockOpnameItems.opnameSessionId, sessionId),
          eq(stockOpnameItems.productId, item.productId)
        )).get();
    }

    if (!opnameItem) continue;

    // Calculate variance
    const variance = item.countedQuantity - opnameItem.systemQuantity;

    // Update with counted quantity
    await db.update(stockOpnameItems)
      .set({
        countedQuantity: item.countedQuantity,
        varianceQuantity: variance,
        countedBy: userId,
        countedAt: now.toISOString(),
        rack: item.rack || opnameItem.rack,
        bin: item.bin || opnameItem.bin,
        updatedAt: now,
      })
      .where(eq(stockOpnameItems.id, opnameItem.id))
      .run();

    countedItems++;
  }

  // Update session count
  const totalCounted = await db.select({ count: count() }).from(stockOpnameItems)
    .where(and(
      eq(stockOpnameItems.opnameSessionId, sessionId),
      isNotNull(stockOpnameItems.countedQuantity)
    )).get();

  await db.update(stockOpnameSessions)
    .set({
      totalItemsCounted: totalCounted?.count || 0,
      updatedAt: now,
    })
    .where(eq(stockOpnameSessions.id, sessionId))
    .run();

  return c.json({
    message: `Counted ${countedItems} items`,
    totalCounted: totalCounted?.count || 0,
  });
});

// ============================================================
// STEP 4: FINALIZE COUNTING - Generate variance report
// ============================================================
app.post('/sessions/:id/finalize', async (c) => {
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);
  if (session.status !== OpnameStatus.IN_PROGRESS) {
    return c.json({ error: `Cannot finalize in ${session.status} status` }, 400);
  }

  // Get all items
  const items = await db.select().from(stockOpnameItems)
    .where(eq(stockOpnameItems.opnameSessionId, sessionId)).all();

  // Calculate totals
  let totalVarianceQty = 0;
  let uncountedItems = 0;

  for (const item of items) {
    if (item.countedQuantity === null) {
      uncountedItems++;
    } else {
      totalVarianceQty += item.varianceQuantity || 0;
    }
  }

  // Warn if items not counted
  if (uncountedItems > 0) {
    return c.json({
      error: 'Cannot finalize - some items not counted',
      uncountedItems,
      message: `${uncountedItems} items have not been counted yet`,
    }, 400);
  }

  // Update session
  await db.update(stockOpnameSessions)
    .set({
      status: OpnameStatus.PENDING_REVIEW,
      totalVarianceQty,
      version: session.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockOpnameSessions.id, sessionId))
    .run();

  // Get variance summary
  const variances = items.filter(i => i.varianceQuantity !== 0);

  return c.json({
    message: 'Counting finalized - pending review',
    status: OpnameStatus.PENDING_REVIEW,
    summary: {
      totalItems: items.length,
      itemsWithVariance: variances.length,
      totalVarianceQty,
      positiveVariances: variances.filter(i => (i.varianceQuantity || 0) > 0).length,
      negativeVariances: variances.filter(i => (i.varianceQuantity || 0) < 0).length,
    },
    variances,
  });
});

// ============================================================
// STEP 5: REVIEW & APPROVE
// ============================================================
app.post('/sessions/:id/approve', zValidator('json', z.object({
  approvedItems: z.array(z.object({
    itemId: z.string(),
    approved: z.boolean(),
    adjustmentReason: z.string().optional(),
  })),
  reviewNotes: z.string().optional(),
})), async (c) => {
  const sessionId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);
  if (session.status !== OpnameStatus.PENDING_REVIEW) {
    return c.json({ error: `Cannot approve in ${session.status} status` }, 400);
  }

  // Update each item's approval status
  for (const approval of data.approvedItems) {
    await db.update(stockOpnameItems)
      .set({
        adjustmentStatus: approval.approved ? 'approved' : 'rejected',
        adjustmentReason: approval.adjustmentReason,
        updatedAt: now,
      })
      .where(eq(stockOpnameItems.id, approval.itemId))
      .run();
  }

  // Update session
  await db.update(stockOpnameSessions)
    .set({
      status: OpnameStatus.APPROVED,
      reviewedBy: userId,
      reviewedAt: now.toISOString(),
      reviewNotes: data.reviewNotes,
      version: session.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockOpnameSessions.id, sessionId))
    .run();

  return c.json({ message: 'Opname approved', status: OpnameStatus.APPROVED });
});

// ============================================================
// STEP 6: APPLY ADJUSTMENTS
// ============================================================
app.post('/sessions/:id/apply', async (c) => {
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);
  if (session.status !== OpnameStatus.APPROVED) {
    return c.json({ error: `Cannot apply in ${session.status} status` }, 400);
  }

  // Get approved items with variance
  const approvedItems = await db.select().from(stockOpnameItems)
    .where(and(
      eq(stockOpnameItems.opnameSessionId, sessionId),
      eq(stockOpnameItems.adjustmentStatus, 'approved'),
      ne(stockOpnameItems.varianceQuantity, 0)
    )).all();

  let adjustmentsApplied = 0;

  for (const item of approvedItems) {
    // Get current inventory
    const inv = await db.select().from(inventory)
      .where(and(
        eq(inventory.productId, item.productId),
        eq(inventory.warehouseId, session.warehouseId),
        item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId)
      )).get();

    if (!inv) continue;

    const newQuantity = item.countedQuantity!;
    const adjustmentAmount = newQuantity - inv.quantityAvailable;

    // Update inventory with optimistic locking
    await db.update(inventory)
      .set({
        quantityAvailable: newQuantity,
        version: inv.version + 1,
        lastModifiedAt: now.toISOString(),
        updatedAt: now,
      })
      .where(and(
        eq(inventory.id, inv.id),
        eq(inventory.version, inv.version)
      ))
      .run();

    // Record movement
    const movementId = generateId();
    await db.insert(inventoryMovements).values({
      id: movementId,
      inventoryId: inv.id,
      productId: item.productId,
      warehouseId: session.warehouseId,
      movementType: 'adjustment',
      quantity: adjustmentAmount,
      source: 'warehouse',
      referenceType: 'stock_opname',
      referenceId: sessionId,
      reason: `Stock Opname Adjustment (${session.opnameNumber})`,
      notes: item.adjustmentReason || `Variance: ${item.varianceQuantity}`,
      performedBy: userId,
      createdAt: now,
    }).run();

    // Record adjustment
    await db.insert(stockOpnameAdjustments).values({
      id: generateId(),
      opnameSessionId: sessionId,
      opnameItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      uomId: item.uomId,
      bundleId: item.bundleId,
      warehouseId: session.warehouseId,
      previousQuantity: inv.quantityAvailable,
      adjustedQuantity: newQuantity,
      adjustmentAmount,
      inventoryMovementId: movementId,
      approvedBy: userId,
      approvedAt: now.toISOString(),
      createdAt: now,
    }).run();

    // Update item status
    await db.update(stockOpnameItems)
      .set({ adjustmentStatus: 'applied', updatedAt: now })
      .where(eq(stockOpnameItems.id, item.id))
      .run();

    adjustmentsApplied++;

    // Broadcast inventory update
    await broadcastInventoryChange(c.env, {
      type: 'inventory.updated',
      data: {
        productId: item.productId,
        warehouseId: session.warehouseId,
        reason: 'stock_opname',
        timestamp: now.toISOString(),
      },
    });
  }

  // Complete session
  await db.update(stockOpnameSessions)
    .set({
      status: OpnameStatus.COMPLETED,
      completedAt: now.toISOString(),
      version: session.version + 1,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(eq(stockOpnameSessions.id, sessionId))
    .run();

  return c.json({
    message: 'Adjustments applied',
    status: OpnameStatus.COMPLETED,
    adjustmentsApplied,
  });
});

// ============================================================
// GET ENDPOINTS
// ============================================================

// GET session with items
app.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB);

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);

  const items = await db.select().from(stockOpnameItems)
    .where(eq(stockOpnameItems.opnameSessionId, sessionId)).all();

  return c.json({ session: { ...session, items } });
});

// GET variance report
app.get('/sessions/:id/variance-report', async (c) => {
  const sessionId = c.req.param('id');
  const db = drizzle(c.env.DB);

  const session = await db.select().from(stockOpnameSessions)
    .where(eq(stockOpnameSessions.id, sessionId)).get();

  if (!session) return c.json({ error: 'Session not found' }, 404);

  const items = await db.select().from(stockOpnameItems)
    .where(eq(stockOpnameItems.opnameSessionId, sessionId)).all();

  const variances = items.filter(i => i.varianceQuantity !== 0);

  return c.json({
    session: {
      opnameNumber: session.opnameNumber,
      warehouseId: session.warehouseId,
      status: session.status,
    },
    summary: {
      totalItems: items.length,
      countedItems: items.filter(i => i.countedQuantity !== null).length,
      itemsWithVariance: variances.length,
      totalPositiveVariance: variances.reduce((sum, i) => sum + Math.max(0, i.varianceQuantity || 0), 0),
      totalNegativeVariance: variances.reduce((sum, i) => sum + Math.min(0, i.varianceQuantity || 0), 0),
      netVariance: session.totalVarianceQty,
    },
    variances: variances.map(i => ({
      productId: i.productId,
      variantId: i.variantId,
      bundleId: i.bundleId,
      isPhysicalBundle: i.isPhysicalBundle === 1,
      systemQuantity: i.systemQuantity,
      countedQuantity: i.countedQuantity,
      variance: i.varianceQuantity,
      location: { rack: i.rack, bin: i.bin, zone: i.zone, aisle: i.aisle },
      status: i.adjustmentStatus,
      reason: i.adjustmentReason,
    })),
  });
});

export default app;
```

---

### 8.6 Physical Bundles Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUNDLE TYPES COMPARISON                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VIRTUAL BUNDLE (Current)                 PHYSICAL BUNDLE (New)              │
│  ─────────────────────────                ─────────────────────              │
│                                                                              │
│  • Calculated stock from components       • Pre-assembled physical inventory │
│  • No physical inventory record           • Has inventory record (bundleId)  │
│  • Stock = min(component stocks / qty)    • Stock = quantityAvailable        │
│  • Assembled at order fulfillment         • Assembled in warehouse ahead     │
│  • Cannot exist without components        • Exists independently             │
│                                                                              │
│  Use case: E-commerce, flexible           Use case: Pre-packaged gifts,      │
│            inventory                                 manufacturing           │
│                                                                              │
│  ⚠️ Stock Opname: SKIP                    ✅ Stock Opname: COUNT             │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  NESTED/COMPOSITE BUNDLE (New)                                               │
│  ─────────────────────────────                                               │
│                                                                              │
│  Bundle can contain:                                                         │
│  ├── Regular products                                                        │
│  ├── Product variants                                                        │
│  ├── Other physical bundles  ← NEW!                                          │
│  └── Virtual bundles (resolved to components)                                │
│                                                                              │
│  Example:                                                                    │
│  "Super Baby Kit" (Physical Bundle)                                          │
│  ├── 1× "Baby Starter Kit" (Physical Bundle)                                │
│  │   ├── 2× Baby Bottle                                                      │
│  │   ├── 1× Diaper Pack                                                      │
│  │   └── 3× Baby Wipes                                                       │
│  ├── 1× Baby Clothes Set (Regular Product)                                   │
│  └── 1× Baby Toy (Regular Product)                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.7 Physical Bundle Database Schema

**Migration file**: `services/inventory-service/migrations/0008_physical_bundles.sql`

```sql
-- Add bundleId to inventory table (for physical bundles)
ALTER TABLE inventory ADD COLUMN bundle_id TEXT;
ALTER TABLE inventory ADD COLUMN is_physical_bundle INTEGER DEFAULT 0;

-- Bundle Assembly Sessions
CREATE TABLE bundle_assembly_sessions (
  id TEXT PRIMARY KEY,

  -- Document identification
  assembly_number TEXT UNIQUE NOT NULL,  -- e.g., "ASM-2025-0001"

  -- Bundle reference
  bundle_id TEXT NOT NULL,  -- References product_bundles.id in Product Service
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),

  -- Operation type
  operation_type TEXT NOT NULL,  -- 'assemble' | 'disassemble'

  -- Quantities
  quantity INTEGER NOT NULL,  -- Number of bundles to assemble/disassemble

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'partial'

  -- Timing
  started_at TEXT,
  completed_at TEXT,

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,

  -- Audit
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Bundle Assembly Items (Components consumed/produced)
CREATE TABLE bundle_assembly_items (
  id TEXT PRIMARY KEY,

  assembly_session_id TEXT NOT NULL REFERENCES bundle_assembly_sessions(id) ON DELETE CASCADE,

  -- Component reference
  product_id TEXT,  -- Regular product component
  variant_id TEXT,  -- Variant component
  bundle_id TEXT,   -- Nested bundle component (bundle within bundle)

  -- Quantities
  required_quantity INTEGER NOT NULL,  -- Qty needed per bundle × num bundles
  actual_quantity INTEGER,              -- Qty actually consumed/produced

  -- Movement reference
  inventory_movement_id TEXT,

  -- Status
  item_status TEXT DEFAULT 'pending',
  -- 'pending' | 'consumed' | 'produced' | 'failed'

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_inventory_bundle ON inventory(bundle_id);
CREATE INDEX idx_bas_bundle ON bundle_assembly_sessions(bundle_id);
CREATE INDEX idx_bas_warehouse ON bundle_assembly_sessions(warehouse_id);
CREATE INDEX idx_bas_status ON bundle_assembly_sessions(status);
CREATE INDEX idx_bai_session ON bundle_assembly_items(assembly_session_id);
```

### 8.8 Physical Bundle Assembly API

**File**: `services/inventory-service/src/routes/bundle-assembly.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono<{ Bindings: Bindings }>();

// ============================================================
// ASSEMBLE BUNDLE - Create physical bundle from components
// Supports nested bundles (bundle from bundle)
// ============================================================
app.post('/assemble', zValidator('json', z.object({
  bundleId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
})), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  // Get bundle definition from Product Service
  const bundleResponse = await c.env.PRODUCT_SERVICE.fetch(
    new Request(`http://product-service/api/bundles/${data.bundleId}`)
  );

  if (!bundleResponse.ok) {
    return c.json({ error: 'Bundle not found' }, 404);
  }

  const bundle = await bundleResponse.json();
  const bundleItems = bundle.items || [];

  // Create assembly session
  const sessionId = generateId();
  const assemblyNumber = `ASM-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  await db.insert(bundleAssemblySessions).values({
    id: sessionId,
    assemblyNumber,
    bundleId: data.bundleId,
    warehouseId: data.warehouseId,
    operationType: 'assemble',
    quantity: data.quantity,
    status: 'in_progress',
    startedAt: now.toISOString(),
    notes: data.notes,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  }).run();

  // Process each component (including nested bundles)
  const results: any[] = [];

  for (const item of bundleItems) {
    const requiredQty = item.quantity * data.quantity;

    // Check if component is a bundle (nested bundle)
    const isNestedBundle = item.bundleId != null;

    // ============================================================
    // RULE: Nested bundles can ONLY be physical bundles
    // Virtual bundles cannot be nested - simplifies stock opname
    // ============================================================
    if (isNestedBundle) {
      // Check if the nested bundle is a physical bundle
      const nestedBundle = await db.select()
        .from(productBundles)
        .where(eq(productBundles.id, item.bundleId))
        .get();

      // Check if physical bundle inventory exists
      const hasPhysicalInventory = await db.select()
        .from(inventory)
        .where(and(
          eq(inventory.bundleId, item.bundleId),
          eq(inventory.isPhysicalBundle, 1)
        )).get();

      if (!hasPhysicalInventory) {
        // Reject nesting virtual bundles
        await db.update(bundleAssemblySessions)
          .set({
            status: 'cancelled',
            cancellationReason: `Cannot nest virtual bundle: ${nestedBundle?.bundleName || item.bundleId}. Only physical bundles can be nested.`,
          })
          .where(eq(bundleAssemblySessions.id, sessionId))
          .run();

        return c.json({
          error: 'Cannot nest virtual bundles',
          message: 'Nested bundles can ONLY be created from Physical Bundles. Virtual bundles cannot be nested to simplify stock opname.',
          bundleId: item.bundleId,
          bundleName: nestedBundle?.bundleName,
        }, 400);
      }
    }

    // Get component inventory
    let componentInv;
    if (isNestedBundle) {
      // Nested bundle - look for physical bundle inventory (already validated above)
      componentInv = await db.select().from(inventory)
        .where(and(
          eq(inventory.bundleId, item.bundleId),
          eq(inventory.warehouseId, data.warehouseId),
          eq(inventory.isPhysicalBundle, 1)
        )).get();
    } else {
      // Regular product or variant
      componentInv = await db.select().from(inventory)
        .where(and(
          eq(inventory.productId, item.productId),
          eq(inventory.warehouseId, data.warehouseId),
          item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId),
          eq(inventory.isPhysicalBundle, 0)
        )).get();
    }

    // Check availability
    if (!componentInv || componentInv.quantityAvailable < requiredQty) {
      await db.update(bundleAssemblySessions)
        .set({ status: 'cancelled', cancellationReason: `Insufficient ${isNestedBundle ? 'bundle' : 'product'}: ${item.productId || item.bundleId}` })
        .where(eq(bundleAssemblySessions.id, sessionId))
        .run();

      return c.json({
        error: 'Insufficient component stock',
        component: item,
        required: requiredQty,
        available: componentInv?.quantityAvailable || 0,
      }, 400);
    }

    // Deduct component
    await db.update(inventory)
      .set({
        quantityAvailable: componentInv.quantityAvailable - requiredQty,
        version: componentInv.version + 1,
        lastModifiedAt: now.toISOString(),
        updatedAt: now,
      })
      .where(eq(inventory.id, componentInv.id))
      .run();

    // Record movement
    const movementId = generateId();
    await db.insert(inventoryMovements).values({
      id: movementId,
      inventoryId: componentInv.id,
      productId: item.productId || item.bundleId,
      warehouseId: data.warehouseId,
      movementType: 'out',
      quantity: -requiredQty,
      source: 'warehouse',
      referenceType: 'bundle_assembly',
      referenceId: sessionId,
      reason: `Assembly: ${data.quantity}× ${bundle.bundleName}`,
      notes: isNestedBundle ? 'Nested bundle consumed' : 'Component consumed',
      performedBy: userId,
      createdAt: now,
    }).run();

    // Record assembly item
    await db.insert(bundleAssemblyItems).values({
      id: generateId(),
      assemblySessionId: sessionId,
      productId: item.productId,
      variantId: item.variantId,
      bundleId: item.bundleId,  // For nested bundles
      requiredQuantity: requiredQty,
      actualQuantity: requiredQty,
      inventoryMovementId: movementId,
      itemStatus: 'consumed',
      createdAt: now,
      updatedAt: now,
    }).run();

    results.push({
      component: item.productId || item.bundleId,
      isNestedBundle,
      consumed: requiredQty,
    });
  }

  // Create physical bundle inventory
  let bundleInv = await db.select().from(inventory)
    .where(and(
      eq(inventory.bundleId, data.bundleId),
      eq(inventory.warehouseId, data.warehouseId),
      eq(inventory.isPhysicalBundle, 1)
    )).get();

  if (bundleInv) {
    // Add to existing bundle inventory
    await db.update(inventory)
      .set({
        quantityAvailable: bundleInv.quantityAvailable + data.quantity,
        version: bundleInv.version + 1,
        lastModifiedAt: now.toISOString(),
        updatedAt: now,
      })
      .where(eq(inventory.id, bundleInv.id))
      .run();
  } else {
    // Create new bundle inventory record
    bundleInv = {
      id: generateId(),
      productId: data.bundleId,  // Use bundleId as productId for tracking
      bundleId: data.bundleId,
      warehouseId: data.warehouseId,
      isPhysicalBundle: 1,
      quantityAvailable: data.quantity,
      quantityReserved: 0,
      quantityInTransit: 0,
      minimumStock: 0,
      version: 1,
      lastModifiedAt: now.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(inventory).values(bundleInv).run();
  }

  // Record bundle creation movement
  await db.insert(inventoryMovements).values({
    id: generateId(),
    inventoryId: bundleInv.id,
    productId: data.bundleId,
    warehouseId: data.warehouseId,
    movementType: 'in',
    quantity: data.quantity,
    source: 'warehouse',
    referenceType: 'bundle_assembly',
    referenceId: sessionId,
    reason: `Bundle assembled: ${data.quantity}× ${bundle.bundleName}`,
    notes: `Assembly ${assemblyNumber}`,
    performedBy: userId,
    createdAt: now,
  }).run();

  // Complete session
  await db.update(bundleAssemblySessions)
    .set({
      status: 'completed',
      completedAt: now.toISOString(),
      version: 2,
      updatedAt: now,
    })
    .where(eq(bundleAssemblySessions.id, sessionId))
    .run();

  // Broadcast
  await broadcastInventoryChange(c.env, {
    type: 'inventory.bundle_assembled',
    data: {
      bundleId: data.bundleId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      assemblyNumber,
      timestamp: now.toISOString(),
    },
  });

  return c.json({
    message: 'Bundle assembled successfully',
    assemblyNumber,
    bundlesCreated: data.quantity,
    componentsConsumed: results,
  });
});

// ============================================================
// DISASSEMBLE BUNDLE - Break down physical bundle to components
// ============================================================
app.post('/disassemble', zValidator('json', z.object({
  bundleId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
})), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const userId = c.req.header('X-User-Id');
  const now = new Date();

  // Check bundle inventory exists
  const bundleInv = await db.select().from(inventory)
    .where(and(
      eq(inventory.bundleId, data.bundleId),
      eq(inventory.warehouseId, data.warehouseId),
      eq(inventory.isPhysicalBundle, 1)
    )).get();

  if (!bundleInv || bundleInv.quantityAvailable < data.quantity) {
    return c.json({
      error: 'Insufficient bundle stock',
      available: bundleInv?.quantityAvailable || 0,
      requested: data.quantity,
    }, 400);
  }

  // Get bundle definition
  const bundleResponse = await c.env.PRODUCT_SERVICE.fetch(
    new Request(`http://product-service/api/bundles/${data.bundleId}`)
  );

  if (!bundleResponse.ok) {
    return c.json({ error: 'Bundle definition not found' }, 404);
  }

  const bundle = await bundleResponse.json();
  const bundleItems = bundle.items || [];

  // Create disassembly session
  const sessionId = generateId();
  const assemblyNumber = `DIS-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  await db.insert(bundleAssemblySessions).values({
    id: sessionId,
    assemblyNumber,
    bundleId: data.bundleId,
    warehouseId: data.warehouseId,
    operationType: 'disassemble',
    quantity: data.quantity,
    status: 'in_progress',
    startedAt: now.toISOString(),
    notes: data.notes,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  }).run();

  // Deduct bundle inventory
  await db.update(inventory)
    .set({
      quantityAvailable: bundleInv.quantityAvailable - data.quantity,
      version: bundleInv.version + 1,
      lastModifiedAt: now.toISOString(),
      updatedAt: now,
    })
    .where(eq(inventory.id, bundleInv.id))
    .run();

  // Record bundle deduction movement
  await db.insert(inventoryMovements).values({
    id: generateId(),
    inventoryId: bundleInv.id,
    productId: data.bundleId,
    warehouseId: data.warehouseId,
    movementType: 'out',
    quantity: -data.quantity,
    source: 'warehouse',
    referenceType: 'bundle_disassembly',
    referenceId: sessionId,
    reason: `Bundle disassembled: ${data.quantity}× ${bundle.bundleName}`,
    performedBy: userId,
    createdAt: now,
  }).run();

  // Return components to inventory
  const results: any[] = [];

  for (const item of bundleItems) {
    const returnQty = item.quantity * data.quantity;
    const isNestedBundle = item.bundleId != null;

    // Find or create component inventory
    let componentInv;
    if (isNestedBundle) {
      componentInv = await db.select().from(inventory)
        .where(and(
          eq(inventory.bundleId, item.bundleId),
          eq(inventory.warehouseId, data.warehouseId),
          eq(inventory.isPhysicalBundle, 1)
        )).get();
    } else {
      componentInv = await db.select().from(inventory)
        .where(and(
          eq(inventory.productId, item.productId),
          eq(inventory.warehouseId, data.warehouseId),
          item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId),
          eq(inventory.isPhysicalBundle, 0)
        )).get();
    }

    if (componentInv) {
      // Add back to inventory
      await db.update(inventory)
        .set({
          quantityAvailable: componentInv.quantityAvailable + returnQty,
          version: componentInv.version + 1,
          lastModifiedAt: now.toISOString(),
          updatedAt: now,
        })
        .where(eq(inventory.id, componentInv.id))
        .run();
    } else {
      // Create new inventory record
      componentInv = {
        id: generateId(),
        productId: item.productId || item.bundleId,
        variantId: item.variantId,
        bundleId: isNestedBundle ? item.bundleId : null,
        warehouseId: data.warehouseId,
        isPhysicalBundle: isNestedBundle ? 1 : 0,
        quantityAvailable: returnQty,
        quantityReserved: 0,
        quantityInTransit: 0,
        minimumStock: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(inventory).values(componentInv).run();
    }

    // Record movement
    await db.insert(inventoryMovements).values({
      id: generateId(),
      inventoryId: componentInv.id,
      productId: item.productId || item.bundleId,
      warehouseId: data.warehouseId,
      movementType: 'in',
      quantity: returnQty,
      source: 'warehouse',
      referenceType: 'bundle_disassembly',
      referenceId: sessionId,
      reason: `Disassembly: ${data.quantity}× ${bundle.bundleName}`,
      notes: isNestedBundle ? 'Nested bundle returned' : 'Component returned',
      performedBy: userId,
      createdAt: now,
    }).run();

    results.push({
      component: item.productId || item.bundleId,
      isNestedBundle,
      returned: returnQty,
    });
  }

  // Complete session
  await db.update(bundleAssemblySessions)
    .set({
      status: 'completed',
      completedAt: now.toISOString(),
      version: 2,
      updatedAt: now,
    })
    .where(eq(bundleAssemblySessions.id, sessionId))
    .run();

  // Broadcast
  await broadcastInventoryChange(c.env, {
    type: 'inventory.bundle_disassembled',
    data: {
      bundleId: data.bundleId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      assemblyNumber,
      timestamp: now.toISOString(),
    },
  });

  return c.json({
    message: 'Bundle disassembled successfully',
    assemblyNumber,
    bundlesDisassembled: data.quantity,
    componentsReturned: results,
  });
});

// ============================================================
// GET Physical Bundle Stock
// ============================================================
app.get('/bundles/:bundleId/stock', async (c) => {
  const bundleId = c.req.param('bundleId');
  const warehouseId = c.req.query('warehouseId');
  const db = drizzle(c.env.DB);

  let query = db.select().from(inventory)
    .where(and(
      eq(inventory.bundleId, bundleId),
      eq(inventory.isPhysicalBundle, 1)
    ));

  if (warehouseId) {
    query = query.where(eq(inventory.warehouseId, warehouseId));
  }

  const records = await query.all();

  return c.json({
    bundleId,
    isPhysicalBundle: true,
    warehouses: records.map(r => ({
      warehouseId: r.warehouseId,
      quantityAvailable: r.quantityAvailable,
      quantityReserved: r.quantityReserved,
      quantityInTransit: r.quantityInTransit,
    })),
    totalAvailable: records.reduce((sum, r) => sum + r.quantityAvailable, 0),
  });
});

export default app;
```

### 8.9 Stock Opname API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stock-opname/sessions` | Create opname session |
| POST | `/api/stock-opname/sessions/:id/start` | Start counting (initialize items) |
| POST | `/api/stock-opname/sessions/:id/count` | Record counted quantities |
| POST | `/api/stock-opname/sessions/:id/finalize` | Generate variance report |
| POST | `/api/stock-opname/sessions/:id/approve` | Approve variances |
| POST | `/api/stock-opname/sessions/:id/apply` | Apply adjustments to inventory |
| GET | `/api/stock-opname/sessions/:id` | Get session with items |
| GET | `/api/stock-opname/sessions/:id/variance-report` | Get variance report |

### 8.10 Bundle Assembly API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bundle-assembly/assemble` | Assemble physical bundle (supports nested) |
| POST | `/api/bundle-assembly/disassemble` | Disassemble physical bundle |
| GET | `/api/bundle-assembly/bundles/:id/stock` | Get physical bundle stock |

### 8.11 Handling Bundles in Stock Opname

```typescript
/**
 * BUNDLE HANDLING IN STOCK OPNAME
 *
 * 1. Virtual Bundles:
 *    - SKIP in stock opname (no physical inventory)
 *    - Stock is calculated from components
 *    - Only count the component products
 *
 * 2. Physical Bundles:
 *    - INCLUDE in stock opname
 *    - Has inventory record with isPhysicalBundle=1
 *    - Count as a single unit (don't count internal components)
 *    - Identified by bundleId field in inventory
 *
 * 3. Nested Bundles:
 *    - Physical bundles containing OTHER PHYSICAL BUNDLES only
 *    - RULE: Cannot nest virtual bundles (only physical → physical)
 *    - Count the parent bundle as a unit
 *    - Internal bundles already consumed during assembly
 *    - This simplifies stock opname (no virtual calculation layers)
 */

// When initializing opname items, differentiate bundle types
async function initializeOpnameItems(session, inventoryItems) {
  for (const inv of inventoryItems) {
    // Check if this is a bundle
    if (inv.bundleId) {
      // Physical bundle - include in opname
      if (inv.isPhysicalBundle === 1) {
        createOpnameItem(inv, { isPhysicalBundle: true });
      }
      // Virtual bundle - skip (no physical inventory)
      continue;
    }

    // Regular product - include
    createOpnameItem(inv, { isPhysicalBundle: false });
  }
}
```

### 8.12 Deliverables
- [ ] Stock Opname tables (sessions, items, adjustments) created
- [ ] Stock Opname workflow implemented (6 statuses)
- [ ] Variance report generation
- [ ] Inventory adjustments with audit trail
- [ ] Physical Bundle support in inventory table (bundleId, isPhysicalBundle)
- [ ] Bundle Assembly/Disassembly operations
- [ ] Nested bundle support (physical bundle from physical bundle ONLY)
- [ ] Validation: reject nesting virtual bundles (simplifies stock opname)
- [ ] Stock Opname correctly handles virtual vs physical bundles
- [ ] WebSocket events for opname and assembly operations

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

**New Tables (Inter-Warehouse Transfer):**
- `stock_transfer_orders` - Transfer document with state machine
- `stock_transfer_items` - Line items with quantity tracking
- `stock_transfer_logs` - Complete audit trail

**Transfer Workflow (DDD Pure Approach):**
```
REQUEST → APPROVE → PICKING → PACKED → SHIPPED → IN_TRANSIT → RECEIVED → PUTAWAY → COMPLETED
                                         ↓
                              quantityAvailable → quantityInTransit → quantityAvailable
                              (source warehouse)                      (destination warehouse)
```

**New Tables (Stock Opname & Physical Bundles):**
- `stock_opname_sessions` - Physical inventory count sessions
- `stock_opname_items` - Individual count items with system vs counted qty
- `stock_opname_adjustments` - Variance adjustments with audit trail
- `bundle_assembly_sessions` - Track bundle assembly/disassembly operations
- `bundle_assembly_items` - Component tracking for assembly

**New Inventory Fields (Physical Bundle Support):**
- `inventory.bundleId` - Reference to bundle if physical bundle inventory
- `inventory.isPhysicalBundle` - Flag (0/1) indicating physical bundle

**Stock Opname Workflow:**
```
DRAFT → IN_PROGRESS → PENDING_REVIEW → APPROVED → COMPLETED
              ↓                ↓
         Count items      Generate variance
         via barcode      report & adjustments
```

**Bundle Handling in Stock Opname:**
- Virtual Bundles: SKIP (calculated from components, no physical inventory)
- Physical Bundles: INCLUDE (count as single unit, has inventory record)
- Nested Bundles: Count parent only (internal bundles consumed during assembly)

**Nested Bundle Rule:**
- Nested bundles can ONLY be created from Physical Bundles
- Virtual bundles CANNOT be nested (rejected at assembly time)
- Rationale: Simplifies stock opname by avoiding virtual calculation layers

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
✅ **Multi-Warehouse** - Full inter-warehouse transfer with proper workflow
✅ **ERP-Grade** - Goods Issue/Receipt, document-based state machine
✅ **Full Traceability** - Complete audit trail for all stock movements
✅ **Discrepancy Handling** - Track damaged/missing items during transfer
✅ **Stock Opname** - Physical inventory count with variance detection
✅ **Physical Bundle Support** - Pre-assembled bundle inventory tracking
✅ **Nested Bundles** - Create bundles from physical bundles only (simplifies stock opname)
✅ **Bundle Type Awareness** - Correctly handles virtual vs physical bundles

---

**Document Status**: Complete
**Author**: Claude
**Date**: 2025-12-08
**Version**: 4.0 (With Stock Opname & Physical Bundles)
