import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, ne } from 'drizzle-orm';
import { uoms, productUOMs, products, productLocations, productUOMLocations } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createUOMSchema = z.object({
  code: z.string(),
  name: z.string(),
  conversionFactor: z.number(),
  isBaseUnit: z.boolean().default(false),
});

const createProductUOMSchema = z.object({
  productId: z.string(),
  uomCode: z.string(),
  uomName: z.string(),
  barcode: z.string(),
  conversionFactor: z.number(),
  stock: z.number().default(0),
  isDefault: z.boolean().default(false),
});

const updateProductUOMSchema = z.object({
  uomCode: z.string().optional(),
  uomName: z.string().optional(),
  barcode: z.string().optional(),
  conversionFactor: z.number().optional(),
  stock: z.number().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Helper function to validate UOM stock doesn't exceed product stock at a specific warehouse
 * Returns error message if validation fails, null if valid
 *
 * This validates WAREHOUSE-SPECIFIC stock (not global stock), ensuring that for each warehouse,
 * the total UOM stock (in base units) matches the product location stock (in base units).
 */
async function validateUOMStockPerWarehouse(
  db: any,
  productId: string,
  warehouseId: string,
  productUOMId: string,
  uomCode: string,
  conversionFactor: number,
  newQuantity: number,
  isUpdate: boolean = false
): Promise<string | null> {
  // Get product to access baseUnit
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) {
    return 'Product not found';
  }

  const baseUnit = product.baseUnit || 'PCS';

  // Get product location stock at this warehouse (base units)
  const productLocation = await db
    .select()
    .from(productLocations)
    .where(
      and(
        eq(productLocations.productId, productId),
        eq(productLocations.warehouseId, warehouseId)
      )
    )
    .get();

  if (!productLocation) {
    return `Product location not found for warehouse. Please create product location first.`;
  }

  const warehouseBaseStock = productLocation.quantity || 0;

  // Get all product UOMs for this product
  const allProductUOMs = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  // Calculate total UOM stock at this warehouse (in base units)
  let totalUOMStockAtWarehouse = 0;

  for (const pUom of allProductUOMs) {
    // Get UOM location at this warehouse
    const uomLocation = await db
      .select()
      .from(productUOMLocations)
      .where(
        and(
          eq(productUOMLocations.productUOMId, pUom.id),
          eq(productUOMLocations.warehouseId, warehouseId)
        )
      )
      .get();

    if (uomLocation) {
      // If this is the UOM being updated, use new quantity
      if (pUom.id === productUOMId && isUpdate) {
        totalUOMStockAtWarehouse += newQuantity * conversionFactor;
      } else {
        totalUOMStockAtWarehouse += (uomLocation.quantity || 0) * pUom.conversionFactor;
      }
    }
  }

  // If creating new UOM location (not updating), add the new quantity
  if (!isUpdate) {
    totalUOMStockAtWarehouse += newQuantity * conversionFactor;
  }

  // Validate: total UOM stock at warehouse should not exceed warehouse base stock
  if (totalUOMStockAtWarehouse > warehouseBaseStock) {
    return `Stock validation failed for warehouse: Total UOM stock at this warehouse would be ${totalUOMStockAtWarehouse} ${baseUnit}, but product location stock is only ${warehouseBaseStock} ${baseUnit}. Please adjust product location stock first or reduce UOM quantities.`;
  }

  return null; // Valid
}

/**
 * Legacy global validation function (deprecated - use per-warehouse validation instead)
 * Kept for backward compatibility but should not be used for new features
 *
 * @deprecated Use validateUOMStockPerWarehouse instead
 */
async function validateUOMStockTotal(
  db: any,
  productId: string,
  conversionFactor: number,
  uomIdToExclude?: string,
  newStock?: number
): Promise<string | null> {
  // Get product's total stock
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) {
    return 'Product not found';
  }

  const baseUnit = product.baseUnit || 'PCS';

  // Get all UOMs for this product
  const allUOMs = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  // Calculate total UOM stock in base units
  let totalUOMStock = 0;
  for (const uom of allUOMs) {
    if (uom.id === uomIdToExclude) {
      // Use new stock for the UOM being updated
      totalUOMStock += (newStock ?? 0) * conversionFactor;
    } else {
      totalUOMStock += uom.stock * uom.conversionFactor;
    }
  }

  // Add new UOM stock if it's a new UOM (no uomIdToExclude)
  if (!uomIdToExclude && newStock !== undefined) {
    totalUOMStock += newStock * conversionFactor;
  }

  if (totalUOMStock > product.stock) {
    return `Total UOM stock (${totalUOMStock} ${baseUnit}) exceeds product stock (${product.stock} ${baseUnit}). Please adjust product stock first or reduce UOM quantities.`;
  }

  return null; // Valid
}

// GET /api/uoms - List all UOMs
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allUOMs = await db.select().from(uoms).all();

  return c.json({
    uoms: allUOMs,
    total: allUOMs.length,
  });
});

// GET /api/uoms/:code - Get UOM by code
app.get('/:code', async (c) => {
  const code = c.req.param('code');
  const db = drizzle(c.env.DB);

  const uom = await db
    .select()
    .from(uoms)
    .where(eq(uoms.code, code))
    .get();

  if (!uom) {
    return c.json({ error: 'UOM not found' }, 404);
  }

  return c.json(uom);
});

// POST /api/uoms - Create new UOM
app.post('/', zValidator('json', createUOMSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const newUOM = {
    id: generateId(),
    ...data,
    createdAt: new Date(),
  };

  await db.insert(uoms).values(newUOM).run();

  return c.json(newUOM, 201);
});

// DELETE /api/uoms/:id - Delete UOM
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(uoms).where(eq(uoms.id, id)).run();

  return c.json({ message: 'UOM deleted successfully' });
});

// Product UOMs routes
// GET /api/uoms/products/:productId - Get all UOMs for a product
app.get('/products/:productId', async (c) => {
  const productId = c.req.param('productId');
  const db = drizzle(c.env.DB);

  const productUOMsList = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  return c.json({
    productUOMs: productUOMsList,
    total: productUOMsList.length,
  });
});

// POST /api/uoms/products - Add UOM to product
app.post('/products', zValidator('json', createProductUOMSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Validate that total UOM stock doesn't exceed product stock
  const validationError = await validateUOMStockTotal(
    db,
    data.productId,
    data.conversionFactor,
    undefined, // No UOM to exclude (this is a new UOM)
    data.stock
  );

  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const now = new Date();
  const newProductUOM = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(productUOMs).values(newProductUOM).run();

  return c.json(newProductUOM, 201);
});

// PUT /api/uoms/products/:id - Update product UOM
app.put('/products/:id', zValidator('json', updateProductUOMSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Get existing UOM to validate against
  const existingUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, id))
    .get();

  if (!existingUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Check barcode uniqueness if being updated
  if (data.barcode && data.barcode !== existingUOM.barcode) {
    const barcodeExists = await db
      .select()
      .from(productUOMs)
      .where(and(
        eq(productUOMs.barcode, data.barcode),
        ne(productUOMs.id, id)
      ))
      .get();

    if (barcodeExists) {
      return c.json({ error: 'Barcode already exists for another UOM' }, 400);
    }
  }

  // Validate stock if being updated
  if (data.stock !== undefined) {
    const conversionFactor = data.conversionFactor ?? existingUOM.conversionFactor;
    const validationError = await validateUOMStockTotal(
      db,
      existingUOM.productId,
      conversionFactor,
      id, // Exclude this UOM from calculation
      data.stock
    );

    if (validationError) {
      return c.json({ error: validationError }, 400);
    }
  }

  // Update the UOM
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  await db
    .update(productUOMs)
    .set(updateData)
    .where(eq(productUOMs.id, id))
    .run();

  // Fetch and return updated UOM
  const updatedUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, id))
    .get();

  return c.json(updatedUOM);
});

// PATCH /api/uoms/products/:id/stock - Update product UOM stock
app.patch('/products/:id/stock', zValidator('json', z.object({
  stock: z.number(),
})), async (c) => {
  const id = c.req.param('id');
  const { stock } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Get existing UOM for validation
  const existingUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, id))
    .get();

  if (!existingUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Validate stock
  const validationError = await validateUOMStockTotal(
    db,
    existingUOM.productId,
    existingUOM.conversionFactor,
    id,
    stock
  );

  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  await db
    .update(productUOMs)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productUOMs.id, id))
    .run();

  return c.json({ message: 'Stock updated successfully' });
});

// DELETE /api/uoms/products/:id - Remove UOM from product
app.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(productUOMs).where(eq(productUOMs.id, id)).run();

  return c.json({ message: 'Product UOM deleted successfully' });
});

// ============================================================================
// Product UOM Locations Routes (Warehouse-specific UOM stock management)
// ============================================================================

const createProductUOMLocationSchema = z.object({
  productUOMId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
});

const updateProductUOMLocationSchema = createProductUOMLocationSchema.partial().omit({ productUOMId: true });

// GET /api/uoms/locations - Get all product UOM locations
app.get('/locations', async (c) => {
  const db = drizzle(c.env.DB);
  const productUOMId = c.req.query('productUOMId');
  const warehouseId = c.req.query('warehouseId');

  let query = db.select().from(productUOMLocations);

  const conditions = [];
  if (productUOMId) {
    conditions.push(eq(productUOMLocations.productUOMId, productUOMId));
  }
  if (warehouseId) {
    conditions.push(eq(productUOMLocations.warehouseId, warehouseId));
  }

  const locations = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// GET /api/uoms/locations/:id - Get product UOM location by ID
app.get('/locations/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const location = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!location) {
    return c.json({ error: 'Product UOM location not found' }, 404);
  }

  return c.json(location);
});

// POST /api/uoms/locations - Create new product UOM location
app.post('/locations', zValidator('json', createProductUOMLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Check if location already exists for this product UOM + warehouse combination
  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(
      and(
        eq(productUOMLocations.productUOMId, data.productUOMId),
        eq(productUOMLocations.warehouseId, data.warehouseId)
      )
    )
    .get();

  if (existingLocation) {
    return c.json(
      {
        error: 'UOM location already exists for this product UOM in this warehouse. Use PUT to update.',
      },
      400
    );
  }

  // Get product UOM to access product ID and conversion factor
  const productUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, data.productUOMId))
    .get();

  if (!productUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Validate stock consistency per warehouse
  const validationError = await validateUOMStockPerWarehouse(
    db,
    productUOM.productId,
    data.warehouseId,
    data.productUOMId,
    productUOM.uomCode,
    productUOM.conversionFactor,
    data.quantity,
    false // isUpdate = false (creating new)
  );

  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const now = new Date();
  const newLocation = {
    id: generateId(),
    productUOMId: data.productUOMId,
    warehouseId: data.warehouseId,
    rack: data.rack || null,
    bin: data.bin || null,
    zone: data.zone || null,
    aisle: data.aisle || null,
    quantity: data.quantity,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };

  await db.insert(productUOMLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, newLocation.id))
    .get();

  return c.json(created, 201);
});

// PUT /api/uoms/locations/:id - Update product UOM location
app.put('/locations/:id', zValidator('json', updateProductUOMLocationSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Product UOM location not found' }, 404);
  }

  // Get product UOM to access product ID and conversion factor
  const productUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, existingLocation.productUOMId))
    .get();

  if (!productUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Validate stock consistency per warehouse if quantity is being updated
  if (data.quantity !== undefined) {
    const validationError = await validateUOMStockPerWarehouse(
      db,
      productUOM.productId,
      data.warehouseId || existingLocation.warehouseId,
      existingLocation.productUOMId,
      productUOM.uomCode,
      productUOM.conversionFactor,
      data.quantity,
      true // isUpdate = true
    );

    if (validationError) {
      return c.json({ error: validationError }, 400);
    }
  }

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  await db
    .update(productUOMLocations)
    .set(updateData)
    .where(eq(productUOMLocations.id, id))
    .run();

  const updated = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  return c.json(updated);
});

// PATCH /api/uoms/locations/:id/quantity - Update product UOM location quantity
app.patch('/locations/:id/quantity', zValidator('json', z.object({ quantity: z.number().int().min(0) })), async (c) => {
  const id = c.req.param('id');
  const { quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Product UOM location not found' }, 404);
  }

  // Get product UOM to access product ID and conversion factor
  const productUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, existingLocation.productUOMId))
    .get();

  if (!productUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Validate stock consistency per warehouse
  const validationError = await validateUOMStockPerWarehouse(
    db,
    productUOM.productId,
    existingLocation.warehouseId,
    existingLocation.productUOMId,
    productUOM.uomCode,
    productUOM.conversionFactor,
    quantity,
    true // isUpdate = true
  );

  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  await db
    .update(productUOMLocations)
    .set({
      quantity,
      updatedAt: new Date(),
    })
    .where(eq(productUOMLocations.id, id))
    .run();

  return c.json({ message: 'Quantity updated successfully' });
});

// DELETE /api/uoms/locations/:id - Delete product UOM location
app.delete('/locations/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Product UOM location not found' }, 404);
  }

  await db.delete(productUOMLocations).where(eq(productUOMLocations.id, id)).run();

  return c.json({ message: 'Product UOM location deleted successfully' });
});

export default app;
