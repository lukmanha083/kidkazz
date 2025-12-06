import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, isNull, and } from 'drizzle-orm';
import { warehouses } from '../infrastructure/db/schema';
import { broadcastWarehouseUpdate } from '../infrastructure/broadcast';

type Bindings = {
  DB: D1Database;
  WAREHOUSE_UPDATES: DurableObjectNamespace;
  PRODUCT_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Helper to generate ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Validation schemas
const createWarehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('Indonesia'),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateWarehouseSchema = createWarehouseSchema.partial();

// GET /api/warehouses - List all warehouses (excluding soft-deleted)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const status = c.req.query('status');

  let query = db.select().from(warehouses);

  const allWarehouses = status
    ? await query.where(and(
        eq(warehouses.status, status),
        isNull(warehouses.deletedAt)
      )).all()
    : await query.where(isNull(warehouses.deletedAt)).all();

  return c.json({
    warehouses: allWarehouses,
    total: allWarehouses.length,
  });
});

// GET /api/warehouses/active - List active warehouses (excluding soft-deleted)
app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);

  const activeWarehouses = await db
    .select()
    .from(warehouses)
    .where(and(
      eq(warehouses.status, 'active'),
      isNull(warehouses.deletedAt)
    ))
    .all();

  return c.json({
    warehouses: activeWarehouses,
    total: activeWarehouses.length,
  });
});

// GET /api/warehouses/:id - Get warehouse by ID (excluding soft-deleted)
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const warehouse = await db
    .select()
    .from(warehouses)
    .where(and(
      eq(warehouses.id, id),
      isNull(warehouses.deletedAt)
    ))
    .get();

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json(warehouse);
});

// POST /api/warehouses - Create new warehouse
app.post('/', zValidator('json', createWarehouseSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const newWarehouse = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(warehouses).values(newWarehouse).run();

  // Broadcast real-time update via WebSocket
  await broadcastWarehouseUpdate(c.env, {
    type: 'warehouse_created',
    data: {
      warehouseId: newWarehouse.id,
      code: newWarehouse.code,
      name: newWarehouse.name,
      address: {
        street: newWarehouse.addressLine1,
        city: newWarehouse.city,
        state: newWarehouse.province,
        country: newWarehouse.country,
        postalCode: newWarehouse.postalCode,
      },
      isActive: newWarehouse.status === 'active',
      timestamp: new Date().toISOString(),
    },
  });

  return c.json(newWarehouse, 201);
});

// PUT /api/warehouses/:id - Update warehouse
app.put('/:id', zValidator('json', updateWarehouseSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(warehouses)
    .where(and(
      eq(warehouses.id, id),
      isNull(warehouses.deletedAt)
    ))
    .get();

  if (!existing) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  await db
    .update(warehouses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(warehouses.id, id))
    .run();

  const updated = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .get();

  // Broadcast real-time update via WebSocket
  if (updated) {
    await broadcastWarehouseUpdate(c.env, {
      type: 'warehouse_updated',
      data: {
        warehouseId: updated.id,
        code: updated.code,
        name: updated.name,
        address: {
          street: updated.addressLine1,
          city: updated.city,
          state: updated.province,
          country: updated.country,
          postalCode: updated.postalCode,
        },
        isActive: updated.status === 'active',
        timestamp: new Date().toISOString(),
      },
    });
  }

  return c.json(updated);
});

// DELETE /api/warehouses/:id - Delete warehouse with cascade cleanup
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // 1. Get warehouse before deletion
  const warehouse = await db
    .select()
    .from(warehouses)
    .where(and(
      eq(warehouses.id, id),
      isNull(warehouses.deletedAt)
    ))
    .get();

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found or already deleted' }, 404);
  }

  // 2. Get inventory report to check if warehouse can be deleted
  try {
    const reportResponse = await fetch(`http://localhost:${c.env.PORT || 8792}/api/inventory/warehouse/${id}/report`);

    if (reportResponse.ok) {
      const report = await reportResponse.json();

      // Validate that all stock is zero
      if (!report.canDelete || report.totalStock > 0) {
        return c.json({
          error: `Cannot delete warehouse "${warehouse.name}" (${warehouse.code})`,
          reason: 'Warehouse contains inventory',
          details: {
            totalStock: report.totalStock,
            productCount: report.productCount,
            suggestion: 'Transfer all inventory to another warehouse before deletion',
          },
          products: report.products,
        }, 400);
      }

      // 3. Cascade delete: Clean up inventory records (all at zero)
      const inventoryDeleteResponse = await fetch(`http://localhost:${c.env.PORT || 8792}/api/inventory/warehouse/${id}`, {
        method: 'DELETE',
      });

      let deletedInventoryRecords = 0;
      if (inventoryDeleteResponse.ok) {
        const inventoryResult = await inventoryDeleteResponse.json();
        deletedInventoryRecords = inventoryResult.deletedInventoryRecords || 0;
        console.log(`✅ Deleted ${deletedInventoryRecords} inventory records for warehouse ${id}`);
      }

      // 4. Cascade delete: Clean up product locations in Product Service
      let deletedProductLocations = 0;
      try {
        const productLocationsResponse = await c.env.PRODUCT_SERVICE.fetch(
          new Request(`http://product-service/api/product-locations/warehouse/${id}`, {
            method: 'DELETE',
          })
        );

        if (productLocationsResponse.ok) {
          const locationResult = await productLocationsResponse.json();
          deletedProductLocations = locationResult.deletedLocations || 0;
          console.log(`✅ Deleted ${deletedProductLocations} product locations for warehouse ${id}`);
        }
      } catch (err) {
        console.error(`Failed to delete product locations for warehouse ${id}:`, err);
        // Continue - we can manually clean up later if needed
      }

      // 5. Soft delete warehouse
      await db
        .update(warehouses)
        .set({
          deletedAt: new Date(),
          deletedBy: null, // TODO: Get from auth context when implemented
          status: 'inactive',
        })
        .where(eq(warehouses.id, id))
        .run();

      // Broadcast real-time update via WebSocket
      await broadcastWarehouseUpdate(c.env, {
        type: 'warehouse_deleted',
        data: {
          warehouseId: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          address: {
            street: warehouse.addressLine1,
            city: warehouse.city,
            state: warehouse.province,
            country: warehouse.country,
            postalCode: warehouse.postalCode,
          },
          isActive: false,
          timestamp: new Date().toISOString(),
        },
      });

      return c.json({
        message: `Warehouse "${warehouse.name}" deleted successfully`,
        deletedInventoryRecords,
        deletedProductLocations,
        cascadeCleanup: true,
      });
    } else {
      throw new Error('Failed to get warehouse inventory report');
    }
  } catch (error) {
    console.error('Error during warehouse deletion:', error);
    return c.json({
      error: 'Failed to delete warehouse',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }, 500);
  }
});

export default app;
