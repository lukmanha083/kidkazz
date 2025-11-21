import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, ne } from 'drizzle-orm';
import { uoms, productUOMs, products } from '../../db/schema';
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
 * Helper function to validate UOM stock doesn't exceed product stock
 * Returns error message if validation fails, null if valid
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
    return `Total UOM stock (${totalUOMStock} base units) exceeds product stock (${product.stock} units). Please adjust product stock first or reduce UOM quantities.`;
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

export default app;
