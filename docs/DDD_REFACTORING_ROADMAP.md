# DDD Refactoring Roadmap: Product Service → Inventory Service Migration

## Executive Summary

This roadmap outlines the complete migration plan to achieve ideal DDD/Hexagonal architecture by moving all stock-related data from Product Service to Inventory Service.

**Goal**: Single Source of Truth for all inventory data in Inventory Service

**Estimated Duration**: 6-8 weeks
**Risk Level**: Medium (requires careful data migration and API changes)
**Dependencies**: Admin Dashboard frontend updates required

---

## Current State vs Target State

### Current State (With Violations)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT SERVICE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  products                                                                │
│  ├── minimumStock        ❌ DUPLICATE (also in Inventory)               │
│  ├── expirationDate      ❌ WRONG LEVEL (should be batch-level)         │
│  └── alertDate           ❌ WRONG LEVEL (should be batch-level)         │
│                                                                          │
│  productUOMs                                                             │
│  └── stock               ❌ SHOULD BE IN INVENTORY                       │
│                                                                          │
│  productVariants                                                         │
│  └── stock               ❌ SHOULD BE IN INVENTORY                       │
│                                                                          │
│  productLocations                                                        │
│  └── quantity            ❌ SHOULD BE IN INVENTORY (with physical loc)  │
│                                                                          │
│  variantLocations                                                        │
│  └── quantity            ❌ SHOULD BE IN INVENTORY                       │
│                                                                          │
│  productUOMLocations                                                     │
│  └── quantity            ❌ SHOULD BE IN INVENTORY                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       INVENTORY SERVICE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  inventory                                                               │
│  ├── quantityAvailable   ✅ CORRECT                                     │
│  ├── quantityReserved    ✅ CORRECT                                     │
│  └── minimumStock        ✅ CORRECT (but duplicated in products)        │
│                                                                          │
│  inventoryBatches                                                        │
│  ├── expirationDate      ✅ CORRECT (batch-level)                       │
│  └── quantityAvailable   ✅ CORRECT                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Target State (DDD Compliant)

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
│  productUOMs                                                             │
│  ├── uomCode, uomName, barcode                 ✅ UOM DEFINITION        │
│  └── conversionFactor                          ✅ CONVERSION INFO       │
│                                                                          │
│  productVariants                                                         │
│  ├── variantName, variantSKU, variantType      ✅ VARIANT INFO          │
│  └── price, image                              ✅ VARIANT DETAILS       │
│                                                                          │
│  productLocations (Physical Location Only - NO quantity)                 │
│  ├── productId, warehouseId                    ✅ LOCATION REF          │
│  └── rack, bin, zone, aisle                    ✅ PHYSICAL LOCATION     │
│                                                                          │
│  variantLocations (Physical Location Only - NO quantity)                 │
│  └── rack, bin, zone, aisle                    ✅ PHYSICAL LOCATION     │
│                                                                          │
│  productUOMLocations (Physical Location Only - NO quantity)              │
│  └── rack, bin, zone, aisle                    ✅ PHYSICAL LOCATION     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│              INVENTORY SERVICE (Single Source of Truth)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  inventory (Enhanced)                                                    │
│  ├── productId, warehouseId                    ✅ CORE REFERENCE        │
│  ├── variantId (NEW - nullable)                ✅ VARIANT SUPPORT       │
│  ├── uomId (NEW - nullable)                    ✅ UOM SUPPORT           │
│  ├── quantityAvailable                         ✅ STOCK                 │
│  ├── quantityReserved                          ✅ RESERVATIONS          │
│  ├── minimumStock                              ✅ REORDER THRESHOLD     │
│  └── locationInfo (NEW - rack, bin, zone)      ✅ PHYSICAL LOCATION     │
│                                                                          │
│  inventoryBatches                                                        │
│  ├── expirationDate, alertDate                 ✅ BATCH EXPIRATION      │
│  ├── batchNumber, lotNumber                    ✅ TRACEABILITY          │
│  └── quantityAvailable                         ✅ BATCH STOCK           │
│                                                                          │
│  inventoryMovements                                                      │
│  └── Full audit trail                          ✅ AUDIT                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 1: Schema Preparation (Week 1)
**Risk: Low | Dependencies: None**

#### 1.1 Inventory Service Schema Enhancement

**Add new columns to `inventory` table:**

```sql
-- Migration: inventory-service/migrations/0001_add_variant_uom_location.sql

-- Add variant support
ALTER TABLE inventory ADD COLUMN variant_id TEXT;

-- Add UOM support
ALTER TABLE inventory ADD COLUMN uom_id TEXT;

-- Add physical location fields (moved from Product Service)
ALTER TABLE inventory ADD COLUMN rack TEXT;
ALTER TABLE inventory ADD COLUMN bin TEXT;
ALTER TABLE inventory ADD COLUMN zone TEXT;
ALTER TABLE inventory ADD COLUMN aisle TEXT;

-- Create index for variant queries
CREATE INDEX idx_inventory_variant ON inventory(variant_id);

-- Create index for UOM queries
CREATE INDEX idx_inventory_uom ON inventory(uom_id);
```

**Update Inventory Service schema.ts:**

```typescript
// services/inventory-service/src/infrastructure/db/schema.ts

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),

  // NEW: Variant support (nullable - for base products this is null)
  variantId: text('variant_id'),

  // NEW: UOM support (nullable - for base unit this is null)
  uomId: text('uom_id'),

  // Stock levels
  quantityAvailable: integer('quantity_available').default(0).notNull(),
  quantityReserved: integer('quantity_reserved').default(0).notNull(),
  quantityInTransit: integer('quantity_in_transit').default(0),

  // Reorder threshold
  minimumStock: integer('minimum_stock').default(0),

  // NEW: Physical location (moved from Product Service)
  rack: text('rack'),
  bin: text('bin'),
  zone: text('zone'),
  aisle: text('aisle'),

  // Audit fields
  lastRestockedAt: integer('last_restocked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

#### 1.2 New Inventory Service API Endpoints

```typescript
// services/inventory-service/src/routes/inventory.ts

// GET /api/inventory/variant/:variantId - Get inventory for a specific variant
app.get('/variant/:variantId', async (c) => {
  const variantId = c.req.param('variantId');
  const db = drizzle(c.env.DB);

  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.variantId, variantId))
    .all();

  return c.json({
    variantId,
    warehouses: inventoryRecords,
    totalAvailable: inventoryRecords.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
  });
});

// GET /api/inventory/variant/:variantId/:warehouseId
app.get('/variant/:variantId/:warehouseId', async (c) => {
  const { variantId, warehouseId } = c.req.param();
  const db = drizzle(c.env.DB);

  const record = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.variantId, variantId),
      eq(inventory.warehouseId, warehouseId)
    ))
    .get();

  if (!record) {
    return c.json({ error: 'Inventory record not found' }, 404);
  }

  return c.json(record);
});

// GET /api/inventory/uom/:uomId - Get inventory for a specific UOM
app.get('/uom/:uomId', async (c) => {
  const uomId = c.req.param('uomId');
  const db = drizzle(c.env.DB);

  const inventoryRecords = await db
    .select()
    .from(inventory)
    .where(eq(inventory.uomId, uomId))
    .all();

  return c.json({
    uomId,
    warehouses: inventoryRecords,
    totalAvailable: inventoryRecords.reduce((sum, inv) => sum + inv.quantityAvailable, 0),
  });
});

// POST /api/inventory/adjust - Enhanced to support variant/UOM
const adjustStockSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),  // NEW
  uomId: z.string().optional(),       // NEW
  quantity: z.number(),
  movementType: z.enum(['in', 'out', 'adjustment']),
  source: z.enum(['warehouse', 'pos']).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  performedBy: z.string().optional(),
  // NEW: Physical location
  rack: z.string().optional(),
  bin: z.string().optional(),
  zone: z.string().optional(),
  aisle: z.string().optional(),
});
```

#### 1.3 Deliverables
- [ ] Migration script for Inventory Service schema
- [ ] Updated schema.ts with new columns
- [ ] New API endpoints for variant/UOM inventory
- [ ] Unit tests for new endpoints
- [ ] API documentation updated

---

### Phase 2: Data Migration (Week 2-3)
**Risk: Medium | Dependencies: Phase 1 complete**

#### 2.1 Migration Strategy

We will migrate data in this order:
1. **productLocations.quantity** → inventory (with rack, bin, zone, aisle)
2. **variantLocations.quantity** → inventory (with variantId)
3. **productUOMLocations.quantity** → inventory (with uomId)
4. **productVariants.stock** → inventory (aggregate from variant locations)
5. **productUOMs.stock** → inventory (aggregate from UOM locations)
6. **products.minimumStock** → inventory (already done via sync)
7. **products.expirationDate** → inventoryBatches (create batch records)

#### 2.2 Migration Scripts

**Script 1: Migrate productLocations to Inventory Service**

```typescript
// scripts/migrations/migrate-product-locations.ts

import { drizzle } from 'drizzle-orm/d1';
import { productLocations } from '../../services/product-service/src/infrastructure/db/schema';
import { inventory } from '../../services/inventory-service/src/infrastructure/db/schema';

async function migrateProductLocations(productDB: D1Database, inventoryDB: D1Database) {
  const productDb = drizzle(productDB);
  const inventoryDb = drizzle(inventoryDB);

  console.log('Starting productLocations migration...');

  // Get all product locations
  const locations = await productDb.select().from(productLocations).all();
  console.log(`Found ${locations.length} product locations to migrate`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const loc of locations) {
    try {
      // Check if inventory record exists
      const existing = await inventoryDb
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, loc.productId),
          eq(inventory.warehouseId, loc.warehouseId),
          isNull(inventory.variantId),
          isNull(inventory.uomId)
        ))
        .get();

      if (existing) {
        // Update existing record with location info
        await inventoryDb
          .update(inventory)
          .set({
            rack: loc.rack,
            bin: loc.bin,
            zone: loc.zone,
            aisle: loc.aisle,
            // Verify quantity matches
            quantityAvailable: loc.quantity,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, existing.id))
          .run();

        console.log(`Updated inventory ${existing.id} with location info`);
        migrated++;
      } else {
        // Create new inventory record
        await inventoryDb.insert(inventory).values({
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
          createdAt: new Date(),
          updatedAt: new Date(),
        }).run();

        console.log(`Created inventory for product ${loc.productId} at warehouse ${loc.warehouseId}`);
        migrated++;
      }
    } catch (error) {
      console.error(`Error migrating location ${loc.id}:`, error);
      errors++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  return { migrated, skipped, errors };
}
```

**Script 2: Migrate variantLocations to Inventory Service**

```typescript
// scripts/migrations/migrate-variant-locations.ts

async function migrateVariantLocations(productDB: D1Database, inventoryDB: D1Database) {
  const productDb = drizzle(productDB);
  const inventoryDb = drizzle(inventoryDB);

  console.log('Starting variantLocations migration...');

  // Get all variant locations with variant info
  const locations = await productDb
    .select({
      location: variantLocations,
      variant: productVariants,
    })
    .from(variantLocations)
    .innerJoin(productVariants, eq(variantLocations.variantId, productVariants.id))
    .all();

  console.log(`Found ${locations.length} variant locations to migrate`);

  let migrated = 0;

  for (const { location, variant } of locations) {
    try {
      // Check if inventory record exists for this variant + warehouse
      const existing = await inventoryDb
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, variant.productId),
          eq(inventory.warehouseId, location.warehouseId),
          eq(inventory.variantId, variant.id)
        ))
        .get();

      if (existing) {
        // Update with location info
        await inventoryDb
          .update(inventory)
          .set({
            rack: location.rack,
            bin: location.bin,
            zone: location.zone,
            aisle: location.aisle,
            quantityAvailable: location.quantity,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, existing.id))
          .run();

        migrated++;
      } else {
        // Create new inventory record for variant
        await inventoryDb.insert(inventory).values({
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
          createdAt: new Date(),
          updatedAt: new Date(),
        }).run();

        migrated++;
      }
    } catch (error) {
      console.error(`Error migrating variant location ${location.id}:`, error);
    }
  }

  console.log(`Migrated ${migrated} variant locations`);
  return { migrated };
}
```

**Script 3: Migrate productUOMLocations to Inventory Service**

```typescript
// scripts/migrations/migrate-uom-locations.ts

async function migrateUOMLocations(productDB: D1Database, inventoryDB: D1Database) {
  const productDb = drizzle(productDB);
  const inventoryDb = drizzle(inventoryDB);

  console.log('Starting productUOMLocations migration...');

  // Get all UOM locations with UOM info
  const locations = await productDb
    .select({
      location: productUOMLocations,
      uom: productUOMs,
    })
    .from(productUOMLocations)
    .innerJoin(productUOMs, eq(productUOMLocations.productUOMId, productUOMs.id))
    .all();

  console.log(`Found ${locations.length} UOM locations to migrate`);

  let migrated = 0;

  for (const { location, uom } of locations) {
    try {
      // Create inventory record for this UOM at this warehouse
      // Note: Quantity stored in UOM units, not base units
      await inventoryDb.insert(inventory).values({
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
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();

      migrated++;
    } catch (error) {
      console.error(`Error migrating UOM location ${location.id}:`, error);
    }
  }

  console.log(`Migrated ${migrated} UOM locations`);
  return { migrated };
}
```

**Script 4: Migrate expirationDate to inventoryBatches**

```typescript
// scripts/migrations/migrate-expiration-dates.ts

async function migrateExpirationDates(productDB: D1Database, inventoryDB: D1Database) {
  const productDb = drizzle(productDB);
  const inventoryDb = drizzle(inventoryDB);

  console.log('Starting expirationDate migration...');

  // Get products with expiration dates
  const productsWithExpiration = await productDb
    .select()
    .from(products)
    .where(isNotNull(products.expirationDate))
    .all();

  console.log(`Found ${productsWithExpiration.length} products with expiration dates`);

  let migrated = 0;

  for (const product of productsWithExpiration) {
    try {
      // Get all inventory records for this product
      const inventoryRecords = await inventoryDb
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.productId, product.id),
          isNull(inventory.variantId),
          isNull(inventory.uomId)
        ))
        .all();

      // Create batch record for each warehouse
      for (const inv of inventoryRecords) {
        await inventoryDb.insert(inventoryBatches).values({
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
          createdAt: new Date(),
          updatedAt: new Date(),
        }).run();

        migrated++;
      }

      // If no inventory records, create a "pending" batch
      if (inventoryRecords.length === 0) {
        console.log(`Product ${product.sku} has expiration but no inventory - skipping batch creation`);
      }
    } catch (error) {
      console.error(`Error migrating expiration for product ${product.id}:`, error);
    }
  }

  console.log(`Created ${migrated} batch records`);
  return { migrated };
}
```

#### 2.3 Deliverables
- [ ] Migration script: productLocations → inventory
- [ ] Migration script: variantLocations → inventory
- [ ] Migration script: productUOMLocations → inventory
- [ ] Migration script: products.expirationDate → inventoryBatches
- [ ] Validation queries to verify data integrity
- [ ] Rollback scripts

---

### Phase 3: API Updates (Week 3-4)
**Risk: Medium | Dependencies: Phase 2 complete**

#### 3.1 Update Product Service APIs

**Remove quantity from location creation/update:**

```typescript
// services/product-service/src/infrastructure/http/routes/product-locations.ts

// BEFORE (with quantity)
const createLocationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),  // REMOVE THIS
});

// AFTER (location only)
const createLocationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  // quantity: REMOVED - managed by Inventory Service
});
```

**Update POST handler to delegate quantity to Inventory Service:**

```typescript
// POST /api/product-locations - Create new location (no quantity)
app.post('/', zValidator('json', createLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // ... existing validation ...

  // Create location in Product Service (physical location only)
  const newLocation = {
    id: generateId(),
    productId: data.productId,
    warehouseId: data.warehouseId,
    rack: data.rack || null,
    bin: data.bin || null,
    zone: data.zone || null,
    aisle: data.aisle || null,
    // quantity: REMOVED
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(productLocations).values(newLocation).run();

  // Note: Inventory record creation handled separately via:
  // POST /api/inventory/adjust (Inventory Service)

  return c.json(created, 201);
});
```

**Add new endpoint to get location with stock from Inventory Service:**

```typescript
// GET /api/product-locations/product/:productId/with-stock
app.get('/product/:productId/with-stock', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  // Get locations from Product Service
  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  // Fetch stock from Inventory Service for each location
  const locationsWithStock = await Promise.all(
    locations.map(async (loc) => {
      try {
        const invResponse = await c.env.INVENTORY_SERVICE.fetch(
          new Request(`http://inventory-service/api/inventory/${productId}/${loc.warehouseId}`)
        );

        if (invResponse.ok) {
          const inv = await invResponse.json();
          return {
            ...loc,
            quantity: inv.quantityAvailable || 0,
            quantityReserved: inv.quantityReserved || 0,
            minimumStock: inv.minimumStock || 0,
            isLowStock: inv.minimumStock ? inv.quantityAvailable < inv.minimumStock : false,
          };
        }
      } catch (error) {
        console.error(`Failed to fetch inventory for ${loc.warehouseId}:`, error);
      }

      return {
        ...loc,
        quantity: 0,
        quantityReserved: 0,
        minimumStock: 0,
        isLowStock: false,
      };
    })
  );

  return c.json({
    locations: locationsWithStock,
    total: locationsWithStock.length,
  });
});
```

#### 3.2 API Deprecation Strategy

**Add deprecation headers to old endpoints:**

```typescript
// Middleware for deprecated endpoints
const deprecationMiddleware = (newEndpoint: string) => {
  return async (c: Context, next: Next) => {
    c.header('Deprecation', 'true');
    c.header('Sunset', '2025-03-31'); // 90 days from deployment
    c.header('Link', `<${newEndpoint}>; rel="successor-version"`);
    await next();
  };
};

// Apply to old quantity endpoints
app.patch('/:id/quantity',
  deprecationMiddleware('/api/inventory/adjust'),
  async (c) => {
    // ... existing handler ...
    // Add warning in response
    return c.json({
      ...response,
      _deprecation: {
        warning: 'This endpoint is deprecated. Use POST /api/inventory/adjust instead.',
        sunset: '2025-03-31',
        migration: 'See docs/DDD_REFACTORING_ROADMAP.md'
      }
    });
  }
);
```

#### 3.3 Deliverables
- [ ] Updated product-locations.ts (remove quantity)
- [ ] Updated variant-locations.ts (remove quantity)
- [ ] Updated product-uom-locations.ts (remove quantity)
- [ ] New endpoints for location + stock combined
- [ ] Deprecation headers on old endpoints
- [ ] API documentation with migration guide

---

### Phase 4: Schema Cleanup (Week 4-5)
**Risk: High | Dependencies: Phase 3 complete, Frontend updated**

#### 4.1 Product Service Schema Changes

**Remove stock columns from Product Service:**

```sql
-- Migration: product-service/migrations/0002_remove_stock_fields.sql

-- Remove from products table
ALTER TABLE products DROP COLUMN minimum_stock;
ALTER TABLE products DROP COLUMN expiration_date;
ALTER TABLE products DROP COLUMN alert_date;

-- Remove from product_uoms table
ALTER TABLE product_uoms DROP COLUMN stock;

-- Remove from product_variants table
ALTER TABLE product_variants DROP COLUMN stock;

-- Remove from product_locations table
ALTER TABLE product_locations DROP COLUMN quantity;

-- Remove from variant_locations table
ALTER TABLE variant_locations DROP COLUMN quantity;

-- Remove from product_uom_locations table
ALTER TABLE product_uom_locations DROP COLUMN quantity;
```

#### 4.2 Update Schema Files

**Updated product-service schema.ts:**

```typescript
// services/product-service/src/infrastructure/db/schema.ts

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  barcode: text('barcode').unique().notNull(),
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  description: text('description'),
  image: text('image'),
  categoryId: text('category_id'),

  // Pricing
  price: real('price').notNull(),
  retailPrice: real('retail_price'),
  wholesalePrice: real('wholesale_price'),

  // REMOVED: minimumStock - now in Inventory Service
  // REMOVED: expirationDate - now in inventoryBatches
  // REMOVED: alertDate - now in inventoryBatches

  // Base unit
  baseUnit: text('base_unit').default('PCS').notNull(),

  // Sales rules (remain in Product Service)
  wholesaleThreshold: integer('wholesale_threshold').default(100),
  minimumOrderQuantity: integer('minimum_order_quantity').default(1),

  // Physical attributes
  weight: real('weight'),
  length: real('length'),
  width: real('width'),
  height: real('height'),

  // ... other fields unchanged ...
});

export const productUOMs = sqliteTable('product_uoms', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  uomCode: text('uom_code').notNull(),
  uomName: text('uom_name').notNull(),
  barcode: text('barcode').unique().notNull(),
  conversionFactor: integer('conversion_factor').notNull(),
  // REMOVED: stock - now in Inventory Service
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  productSKU: text('product_sku').notNull(),
  variantName: text('variant_name').notNull(),
  variantSKU: text('variant_sku').unique().notNull(),
  variantType: text('variant_type').notNull(),
  price: real('price').notNull(),
  // REMOVED: stock - now in Inventory Service
  status: text('status').default('active').notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const productLocations = sqliteTable('product_locations', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  warehouseId: text('warehouse_id').notNull(),
  rack: text('rack'),
  bin: text('bin'),
  zone: text('zone'),
  aisle: text('aisle'),
  // REMOVED: quantity - now in Inventory Service
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Similar changes for variantLocations and productUOMLocations
```

#### 4.3 Deliverables
- [ ] SQL migration to drop columns
- [ ] Updated schema.ts files
- [ ] Update all TypeScript types/interfaces
- [ ] Remove obsolete validation logic

---

### Phase 5: Frontend Updates (Week 5-6)
**Risk: Medium | Dependencies: Phase 3 APIs available**

#### 5.1 Admin Dashboard Changes

**Update API client:**

```typescript
// apps/admin-dashboard/src/lib/api/index.ts

// Product API - remove stock fields from requests
export const productApi = {
  // ... existing methods ...

  // NEW: Get product with stock from Inventory Service
  async getWithStock(id: string) {
    const product = await this.get(id);
    const stockResponse = await fetch(`/api/inventory/product/${id}/total-stock`);
    const stock = await stockResponse.json();

    return {
      ...product,
      stock: stock.totalStock,
      warehouses: stock.warehouses,
    };
  },

  // DEPRECATED: Don't use these - redirect to Inventory Service
  // - updateStock()
  // - setMinimumStock()
};

// Inventory API - new methods
export const inventoryApi = {
  // ... existing methods ...

  // Stock management (Single Source of Truth)
  async adjustStock(params: AdjustStockParams) {
    return fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async setMinimumStock(inventoryId: string, minimumStock: number) {
    return fetch(`/api/inventory/${inventoryId}/minimum-stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minimumStock }),
    });
  },

  // Variant stock
  async getVariantStock(variantId: string) {
    return fetch(`/api/inventory/variant/${variantId}`);
  },

  // UOM stock
  async getUOMStock(uomId: string) {
    return fetch(`/api/inventory/uom/${uomId}`);
  },
};
```

**Update product forms:**

```typescript
// apps/admin-dashboard/src/routes/dashboard/products/all.tsx

// BEFORE: Stock in product form
const productForm = {
  // ...
  minimumStock: 50,  // REMOVE
  expirationDate: '2025-12-31',  // REMOVE
};

// AFTER: Stock managed separately via Inventory Service
const productForm = {
  // Catalog info only
  name: '',
  sku: '',
  price: 0,
  // ...
};

// Stock form (separate component)
const InventoryAllocationForm = ({ productId }) => {
  const handleAllocate = async (warehouseId, quantity) => {
    await inventoryApi.adjustStock({
      productId,
      warehouseId,
      quantity,
      movementType: 'adjustment',
      reason: 'Initial allocation',
    });
  };

  // ...
};
```

#### 5.2 Component Updates Required

| Component | Current | After |
|-----------|---------|-------|
| ProductForm | Has minimumStock, expirationDate | Remove stock fields |
| ProductTable | Shows stock column | Fetch from Inventory API |
| WarehouseAllocation | Updates productLocations.quantity | Calls Inventory Service |
| VariantForm | Has stock field | Fetch from Inventory API |
| UOMForm | Has stock field | Fetch from Inventory API |
| LowStockReport | Queries products | Queries Inventory Service |
| ExpiringStockReport | Queries products | Queries inventoryBatches |

#### 5.3 Deliverables
- [ ] Updated API client with Inventory Service methods
- [ ] Updated product forms (remove stock fields)
- [ ] Updated stock management UI (use Inventory Service)
- [ ] Updated reports to use Inventory Service
- [ ] E2E tests for new workflows

---

### Phase 6: Cleanup & Validation (Week 6-7)
**Risk: Low | Dependencies: All previous phases**

#### 6.1 Remove Deprecated Code

```typescript
// Remove from product-locations.ts:
// - Inventory Service sync in POST handler
// - PATCH /:id/quantity endpoint
// - quantity from all responses

// Remove from variant-locations.ts:
// - validateVariantStockPerWarehouse() function
// - quantity validation logic
// - quantity from responses

// Remove from product-uom-locations.ts:
// - validateUOMStockPerWarehouse() function
// - quantity validation logic
// - quantity from responses
```

#### 6.2 Data Validation Queries

```sql
-- Verify all data migrated correctly

-- 1. Check product locations have matching inventory
SELECT pl.productId, pl.warehouseId, inv.quantityAvailable
FROM product_locations pl
LEFT JOIN inventory inv ON pl.productId = inv.productId AND pl.warehouseId = inv.warehouseId
WHERE inv.id IS NULL;
-- Should return 0 rows

-- 2. Check variant locations have matching inventory
SELECT vl.variantId, vl.warehouseId, inv.quantityAvailable
FROM variant_locations vl
LEFT JOIN inventory inv ON vl.variantId = inv.variantId AND vl.warehouseId = inv.warehouseId
WHERE inv.id IS NULL;
-- Should return 0 rows

-- 3. Check all expiration dates migrated
SELECT p.id, p.expirationDate, b.expirationDate AS batchExpiration
FROM products p
LEFT JOIN inventory_batches b ON p.id = b.productId
WHERE p.expirationDate IS NOT NULL AND b.id IS NULL;
-- Should return 0 rows

-- 4. Verify stock totals match
SELECT
  'product_locations' as source,
  SUM(quantity) as total
FROM product_locations
UNION ALL
SELECT
  'inventory' as source,
  SUM(quantityAvailable) as total
FROM inventory
WHERE variantId IS NULL AND uomId IS NULL;
-- Totals should match
```

#### 6.3 Deliverables
- [ ] Remove deprecated code
- [ ] Remove unused sync logic
- [ ] Run validation queries
- [ ] Performance testing
- [ ] Documentation update

---

### Phase 7: Documentation & Training (Week 7-8)
**Risk: Low | Dependencies: All previous phases**

#### 7.1 Documentation Updates

- [ ] Update ARCHITECTURE.md with new bounded context diagram
- [ ] Update API documentation
- [ ] Update DDD_HEXAGONAL_BOUNDARY_REVIEW.md status
- [ ] Create migration guide for external integrations
- [ ] Update BUSINESS_RULES.md

#### 7.2 Breaking Changes Summary

| Breaking Change | Migration Path |
|----------------|----------------|
| `products.minimumStock` removed | Use `inventory.minimumStock` |
| `products.expirationDate` removed | Use `inventoryBatches.expirationDate` |
| `productUOMs.stock` removed | Use `GET /api/inventory/uom/:id` |
| `productVariants.stock` removed | Use `GET /api/inventory/variant/:id` |
| `productLocations.quantity` removed | Use `GET /api/inventory/:productId/:warehouseId` |
| `variantLocations.quantity` removed | Use `GET /api/inventory/variant/:variantId/:warehouseId` |
| `productUOMLocations.quantity` removed | Use `GET /api/inventory/uom/:uomId` |

---

## Risk Mitigation

### Rollback Strategy

**Phase 1-2 Rollback:**
- Keep original columns until Phase 4
- Dual-write to both services during migration
- Can revert to Product Service as source of truth

**Phase 3-4 Rollback:**
- Re-add columns via migration
- Restore data from Inventory Service backup
- Restore frontend to previous version

### Data Integrity Checks

```typescript
// Run before and after each migration phase
async function validateDataIntegrity() {
  const checks = [
    {
      name: 'Total stock consistency',
      query: async () => {
        const productStock = await productDb.query(`SELECT SUM(quantity) FROM product_locations`);
        const inventoryStock = await inventoryDb.query(`SELECT SUM(quantityAvailable) FROM inventory WHERE variantId IS NULL`);
        return productStock === inventoryStock;
      }
    },
    {
      name: 'Location count matches',
      query: async () => {
        const productLocCount = await productDb.query(`SELECT COUNT(*) FROM product_locations`);
        const inventoryCount = await inventoryDb.query(`SELECT COUNT(*) FROM inventory WHERE variantId IS NULL AND uomId IS NULL`);
        return productLocCount === inventoryCount;
      }
    },
    // ... more checks
  ];

  for (const check of checks) {
    const passed = await check.query();
    console.log(`${check.name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }
}
```

---

## Timeline Summary

| Week | Phase | Key Deliverables | Risk |
|------|-------|------------------|------|
| 1 | Phase 1: Schema Prep | New inventory columns, APIs | Low |
| 2-3 | Phase 2: Data Migration | Migration scripts, data moved | Medium |
| 3-4 | Phase 3: API Updates | Updated endpoints, deprecations | Medium |
| 4-5 | Phase 4: Schema Cleanup | Drop old columns | High |
| 5-6 | Phase 5: Frontend Updates | UI changes | Medium |
| 6-7 | Phase 6: Validation | Testing, cleanup | Low |
| 7-8 | Phase 7: Documentation | Docs, training | Low |

---

## Success Criteria

- [ ] All stock data in Inventory Service (single source of truth)
- [ ] Product Service contains only catalog information
- [ ] All APIs return correct data
- [ ] All frontend screens work correctly
- [ ] No data loss during migration
- [ ] Performance maintained or improved
- [ ] All tests passing
- [ ] Documentation complete

---

## Appendix: API Reference

### Inventory Service New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/variant/:variantId` | Get stock for variant |
| GET | `/api/inventory/variant/:variantId/:warehouseId` | Get stock for variant at warehouse |
| GET | `/api/inventory/uom/:uomId` | Get stock for UOM |
| POST | `/api/inventory/adjust` | Adjust stock (enhanced with variant/UOM) |

### Product Service Deprecated Endpoints

| Method | Endpoint | Replacement |
|--------|----------|-------------|
| PATCH | `/api/product-locations/:id/quantity` | `POST /api/inventory/adjust` |
| PATCH | `/api/variant-locations/:id/quantity` | `POST /api/inventory/adjust` |
| PATCH | `/api/product-uom-locations/:id/quantity` | `POST /api/inventory/adjust` |

---

**Document Status**: Complete
**Author**: Claude
**Date**: 2025-12-08
**Version**: 1.0
