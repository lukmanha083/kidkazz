import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like } from 'drizzle-orm';
import { products, productVariants, productUOMs } from '../../db/schema';
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

  return c.json({
    ...product,
    variants,
    productUOMs: uoms,
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

  const now = new Date();
  const newProduct = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };

  await db.insert(products).values(newProduct).run();

  return c.json(newProduct, 201);
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
