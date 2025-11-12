import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { products, pricingTiers, productImages, categories } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Env } from '../index';

const productsRoutes = new Hono<{ Bindings: Env }>();

// GET /api/products - List all active products
productsRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(desc(products.createdAt));

  return c.json({ products: allProducts });
});

// GET /api/products/:id - Get product details with pricing tiers
productsRoutes.get('/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Get pricing tiers
  const tiers = await db
    .select()
    .from(pricingTiers)
    .where(eq(pricingTiers.productId, id))
    .orderBy(pricingTiers.minQuantity);

  // Get images
  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(productImages.displayOrder);

  // Get category
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, product.categoryId))
    .limit(1);

  return c.json({
    product,
    pricingTiers: tiers,
    images,
    category,
  });
});

export { productsRoutes };
