import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like } from 'drizzle-orm';
import { products, productVariants, productUOMs, productLocations } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createProductSchema = z.object({
  barcode: z.string(),
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.number(),
  retailPrice: z.number().optional().nullable(),
  wholesalePrice: z.number().optional().nullable(),
  stock: z.number().default(0),
  baseUnit: z.string().default('PCS'),
  wholesaleThreshold: z.number().default(100),
  minimumOrderQuantity: z.number().default(1),
  minimumStock: z.number().optional().nullable(),
  rating: z.number().default(0),
  reviews: z.number().default(0),
  availableForRetail: z.boolean().default(true),
  availableForWholesale: z.boolean().default(true),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  isBundle: z.boolean().default(false),
  // Physical attributes for shipping calculations
  weight: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
});

const updateProductSchema = createProductSchema.partial();

// GET /api/products - List all products
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const status = c.req.query('status');
  const category = c.req.query('category');
  const search = c.req.query('search');

  let query = db.select().from(products);

  // Apply filters
  const conditions = [];
  if (status) {
    conditions.push(eq(products.status, status));
  }
  if (category) {
    conditions.push(eq(products.categoryId, category));
  }
  if (search) {
    conditions.push(like(products.name, `%${search}%`));
  }

  const allProducts = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

  return c.json({
    products: allProducts,
    total: allProducts.length,
  });
});

// GET /api/products/:id - Get product by ID with variants and UOMs
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Get variants
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .all();

  // Get UOMs
  const uoms = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, id))
    .all();

  // Get locations
  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, id))
    .all();

  return c.json({
    ...product,
    variants,
    productUOMs: uoms,
    productLocations: locations,
  });
});

// GET /api/products/sku/:sku - Get product by SKU
app.get('/sku/:sku', async (c) => {
  const sku = c.req.param('sku');
  const db = drizzle(c.env.DB);

  const product = await db
    .select()
    .from(products)
    .where(eq(products.sku, sku))
    .get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  return c.json(product);
});

// POST /api/products - Create new product
app.post('/', zValidator('json', createProductSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Check if SKU already exists (Business Rule #3: SKU must be unique)
  const existingProductWithSku = await db
    .select()
    .from(products)
    .where(eq(products.sku, data.sku))
    .get();

  if (existingProductWithSku) {
    return c.json({
      error: 'SKU_ALREADY_EXISTS',
      message: `Product with SKU "${data.sku}" already exists. Product SKUs must be unique.`,
      existingProduct: {
        id: existingProductWithSku.id,
        name: existingProductWithSku.name,
        sku: existingProductWithSku.sku,
      },
    }, 400);
  }

  // Check if barcode already exists
  const existingProductWithBarcode = await db
    .select()
    .from(products)
    .where(eq(products.barcode, data.barcode))
    .get();

  if (existingProductWithBarcode) {
    return c.json({
      error: 'BARCODE_ALREADY_EXISTS',
      message: `Product with barcode "${data.barcode}" already exists. Product barcodes must be unique.`,
      existingProduct: {
        id: existingProductWithBarcode.id,
        name: existingProductWithBarcode.name,
        barcode: existingProductWithBarcode.barcode,
      },
    }, 400);
  }

  const now = new Date();
  const newProduct = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };

  try {
    await db.insert(products).values(newProduct).run();
    return c.json(newProduct, 201);
  } catch (error) {
    console.error('Product Service Error:', error);
    return c.json({
      error: 'DATABASE_ERROR',
      message: 'Failed to create product. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// PUT /api/products/:id - Update product
app.put('/:id', zValidator('json', updateProductSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Check if SKU is being updated and if the new SKU already exists (Business Rule #3)
  if (data.sku && data.sku !== existing.sku) {
    const existingProductWithSku = await db
      .select()
      .from(products)
      .where(eq(products.sku, data.sku))
      .get();

    if (existingProductWithSku) {
      return c.json({
        error: 'SKU_ALREADY_EXISTS',
        message: `Product with SKU "${data.sku}" already exists. Product SKUs must be unique.`,
        existingProduct: {
          id: existingProductWithSku.id,
          name: existingProductWithSku.name,
          sku: existingProductWithSku.sku,
        },
      }, 400);
    }
  }

  // Check if barcode is being updated and if the new barcode already exists
  if (data.barcode && data.barcode !== existing.barcode) {
    const existingProductWithBarcode = await db
      .select()
      .from(products)
      .where(eq(products.barcode, data.barcode))
      .get();

    if (existingProductWithBarcode) {
      return c.json({
        error: 'BARCODE_ALREADY_EXISTS',
        message: `Product with barcode "${data.barcode}" already exists. Product barcodes must be unique.`,
        existingProduct: {
          id: existingProductWithBarcode.id,
          name: existingProductWithBarcode.name,
          barcode: existingProductWithBarcode.barcode,
        },
      }, 400);
    }
  }

  try {
    await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .run();

    const updated = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .get();

    return c.json(updated);
  } catch (error) {
    console.error('Product Service Error:', error);
    return c.json({
      error: 'DATABASE_ERROR',
      message: 'Failed to update product. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// PATCH /api/products/:id/price - Update product price
app.patch('/:id/price', zValidator('json', z.object({
  priceType: z.enum(['retail', 'wholesale', 'base']),
  newPrice: z.number(),
})), async (c) => {
  const id = c.req.param('id');
  const { priceType, newPrice } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const updateData: any = { updatedAt: new Date() };
  if (priceType === 'retail') {
    updateData.retailPrice = newPrice;
  } else if (priceType === 'wholesale') {
    updateData.wholesalePrice = newPrice;
  } else {
    updateData.price = newPrice;
  }

  await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .run();

  return c.json({ message: 'Price updated successfully' });
});

// PATCH /api/products/:id/stock - Update product stock
app.patch('/:id/stock', zValidator('json', z.object({
  stock: z.number(),
})), async (c) => {
  const id = c.req.param('id');
  const { stock } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!existing) {
    return c.json({ error: 'Product not found' }, 404);
  }

  await db
    .update(products)
    .set({ stock, updatedAt: new Date() })
    .where(eq(products.id, id))
    .run();

  return c.json({ message: 'Stock updated successfully' });
});

// DELETE /api/products/:id - Delete product
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(products).where(eq(products.id, id)).run();

  return c.json({ message: 'Product deleted successfully' });
});

export default app;
