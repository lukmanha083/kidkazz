import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { productBundles, bundleItems } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const bundleItemSchema = z.object({
  productId: z.string(),
  productSKU: z.string(),
  productName: z.string(),
  barcode: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const createBundleSchema = z.object({
  bundleName: z.string().min(1),
  bundleSKU: z.string().min(1),
  barcode: z.string().optional().nullable(),
  bundleDescription: z.string().optional().nullable(),
  bundleImage: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(), // Warehouse where bundle is assembled
  bundlePrice: z.number().positive(),
  discountPercentage: z.number().min(0).max(100),
  status: z.enum(['active', 'inactive']).default('active'),
  availableStock: z.number().int().min(0).default(0),
  items: z.array(bundleItemSchema).min(1, 'Bundle must contain at least one product'),
});

const updateBundleSchema = createBundleSchema.partial().omit({ items: true });

// GET /api/bundles - List all bundles
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);

  const allBundles = await db.select().from(productBundles).all();

  return c.json({
    bundles: allBundles,
    total: allBundles.length,
  });
});

// GET /api/bundles/:id - Get bundle by ID with items
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const bundle = await db
    .select()
    .from(productBundles)
    .where(eq(productBundles.id, id))
    .get();

  if (!bundle) {
    return c.json({ error: 'Bundle not found' }, 404);
  }

  // Get bundle items
  const items = await db
    .select()
    .from(bundleItems)
    .where(eq(bundleItems.bundleId, id))
    .all();

  return c.json({
    bundle,
    items,
  });
});

// GET /api/bundles/:id/available-stock - Calculate virtual bundle stock based on component availability
app.get('/:id/available-stock', async (c) => {
  const bundleId = c.req.param('id');
  const queryWarehouseId = c.req.query('warehouseId'); // Optional: calculate for specific warehouse
  const db = drizzle(c.env.DB);

  // Get bundle details
  const bundle = await db
    .select()
    .from(productBundles)
    .where(eq(productBundles.id, bundleId))
    .get();

  if (!bundle) {
    return c.json({ error: 'Bundle not found' }, 404);
  }

  // DDD: Bundles are assembled in specific warehouses
  // Use query param if provided, otherwise use bundle's assembly warehouse
  const warehouseId = queryWarehouseId || bundle.warehouseId;

  // Get bundle items (components)
  const items = await db
    .select()
    .from(bundleItems)
    .where(eq(bundleItems.bundleId, bundleId))
    .all();

  if (items.length === 0) {
    return c.json({
      bundleId,
      bundleName: bundle.bundleName,
      bundleSKU: bundle.bundleSKU,
      warehouseId: warehouseId || 'all',
      availableStock: 0,
      limitingComponent: null,
      componentAvailability: [],
      message: 'Bundle has no components',
    });
  }

  let minAvailableBundles = Infinity;
  let limitingComponent: { productId: string; productName: string; available: number; required: number } | null = null;
  const componentAvailability = [];

  // Check availability of each component
  for (const item of items) {
    try {
      // Query Inventory Service for component stock
      const stockUrl = warehouseId
        ? `http://inventory-service/api/inventory/${item.productId}/${warehouseId}`
        : `http://inventory-service/api/inventory/product/${item.productId}/total-stock`;

      const invResponse = await c.env.INVENTORY_SERVICE.fetch(new Request(stockUrl));

      if (invResponse.ok) {
        const invData = await invResponse.json() as {
          quantityAvailable?: number;
          totalAvailable?: number;
          totalStock?: number;
        };

        // Extract available quantity based on response type
        const availableQty = warehouseId
          ? (invData.quantityAvailable || 0)
          : (invData.totalAvailable || invData.totalStock || 0);

        // Calculate how many bundles can be made from this component
        const maxBundlesFromComponent = Math.floor(availableQty / item.quantity);

        componentAvailability.push({
          productId: item.productId,
          productName: item.productName,
          productSKU: item.productSKU,
          requiredPerBundle: item.quantity,
          availableStock: availableQty,
          maxBundles: maxBundlesFromComponent,
        });

        // Track the limiting component (bottleneck)
        if (maxBundlesFromComponent < minAvailableBundles) {
          minAvailableBundles = maxBundlesFromComponent;
          limitingComponent = {
            productId: item.productId,
            productName: item.productName,
            available: availableQty,
            required: item.quantity,
          };
        }
      } else {
        // Component not found in inventory
        componentAvailability.push({
          productId: item.productId,
          productName: item.productName,
          productSKU: item.productSKU,
          requiredPerBundle: item.quantity,
          availableStock: 0,
          maxBundles: 0,
        });

        minAvailableBundles = 0;
        if (!limitingComponent) {
          limitingComponent = {
            productId: item.productId,
            productName: item.productName,
            available: 0,
            required: item.quantity,
          };
        }
      }
    } catch (error) {
      console.error(`Failed to check inventory for component ${item.productId}:`, error);
      componentAvailability.push({
        productId: item.productId,
        productName: item.productName,
        productSKU: item.productSKU,
        requiredPerBundle: item.quantity,
        availableStock: 0,
        maxBundles: 0,
        error: 'Failed to fetch inventory',
      });
      minAvailableBundles = 0;
    }
  }

  const availableStock = minAvailableBundles === Infinity ? 0 : minAvailableBundles;

  return c.json({
    bundleId,
    bundleName: bundle.bundleName,
    bundleSKU: bundle.bundleSKU,
    warehouseId: warehouseId || 'all',
    availableStock,
    limitingComponent,
    componentAvailability,
    message: availableStock > 0
      ? `${availableStock} bundles can be assembled`
      : limitingComponent
      ? `Limited by ${limitingComponent.productName} (need ${limitingComponent.required}, have ${limitingComponent.available})`
      : 'Insufficient components',
  });
});

// POST /api/bundles - Create new bundle with items
app.post('/', zValidator('json', createBundleSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const now = new Date();
  const bundleId = generateId();

  // Create bundle
  const newBundle = {
    id: bundleId,
    bundleName: data.bundleName,
    bundleSKU: data.bundleSKU,
    barcode: data.barcode || null,
    bundleDescription: data.bundleDescription || null,
    bundleImage: data.bundleImage || null,
    warehouseId: data.warehouseId || null, // Warehouse where bundle is assembled
    bundlePrice: data.bundlePrice,
    discountPercentage: data.discountPercentage,
    status: data.status,
    availableStock: data.availableStock,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(productBundles).values(newBundle).run();

  // Create bundle items
  if (data.items && data.items.length > 0) {
    const items = data.items.map(item => ({
      id: generateId(),
      bundleId: bundleId,
      productId: item.productId,
      productSKU: item.productSKU,
      productName: item.productName,
      barcode: item.barcode,
      quantity: item.quantity,
      price: item.price,
      createdAt: now,
    }));

    await db.insert(bundleItems).values(items).run();
  }

  // Return created bundle with items
  const items = await db
    .select()
    .from(bundleItems)
    .where(eq(bundleItems.bundleId, bundleId))
    .all();

  return c.json({
    bundle: newBundle,
    items,
  }, 201);
});

// PUT /api/bundles/:id - Update bundle
app.put('/:id', zValidator('json', updateBundleSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(productBundles)
    .where(eq(productBundles.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Bundle not found' }, 404);
  }

  await db
    .update(productBundles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(productBundles.id, id))
    .run();

  const updated = await db
    .select()
    .from(productBundles)
    .where(eq(productBundles.id, id))
    .get();

  return c.json(updated);
});

// PUT /api/bundles/:id/items - Update bundle items
app.put('/:id/items', zValidator('json', z.object({
  items: z.array(bundleItemSchema).min(1),
})), async (c) => {
  const id = c.req.param('id');
  const { items: newItems } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(productBundles)
    .where(eq(productBundles.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Bundle not found' }, 404);
  }

  // Delete existing items
  await db.delete(bundleItems).where(eq(bundleItems.bundleId, id)).run();

  // Insert new items
  const now = new Date();
  const items = newItems.map(item => ({
    id: generateId(),
    bundleId: id,
    productId: item.productId,
    productSKU: item.productSKU,
    productName: item.productName,
    barcode: item.barcode,
    quantity: item.quantity,
    price: item.price,
    createdAt: now,
  }));

  await db.insert(bundleItems).values(items).run();

  // Return updated items
  const updatedItems = await db
    .select()
    .from(bundleItems)
    .where(eq(bundleItems.bundleId, id))
    .all();

  return c.json({ items: updatedItems });
});

// PATCH /api/bundles/:id/stock - Update bundle stock
// NOTE: This route is deprecated after DDD Phase 4 refactoring
// Virtual bundles no longer have their own stock - stock is calculated from components
// Physical bundles (Phase 8) will have stock in Inventory Service
/* DEPRECATED - Commented out during DDD refactoring
app.patch('/:id/stock', zValidator('json', z.object({
  availableStock: z.number().int().min(0),
})), async (c) => {
  const id = c.req.param('id');
  const { availableStock } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  await db
    .update(productBundles)
    .set({ availableStock, updatedAt: new Date() })
    .where(eq(productBundles.id, id))
    .run();

  return c.json({ message: 'Stock updated successfully' });
});
*/

// DELETE /api/bundles/:id - Delete bundle
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Delete bundle items first (cascade should handle this, but being explicit)
  await db.delete(bundleItems).where(eq(bundleItems.bundleId, id)).run();

  // Delete bundle
  await db.delete(productBundles).where(eq(productBundles.id, id)).run();

  return c.json({ message: 'Bundle deleted successfully' });
});

export default app;
