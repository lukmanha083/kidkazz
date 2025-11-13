import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { products, productImages, categories } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Env } from '../index';

const retailRoutes = new Hono<{ Bindings: Env }>();

// GET /api/retail/products - List retail products only
retailRoutes.get('/products', async (c) => {
  const db = createDb(c.env.DB);

  const allProducts = await db
    .select()
    .from(products)
    .where(and(
      eq(products.status, 'active'),
      eq(products.availableForRetail, true)
    ))
    .orderBy(desc(products.createdAt));

  // Remove wholesale pricing information
  const retailProducts = allProducts.map(product => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    // Only retail pricing
    retailPrice: product.retailPrice,
    retailDiscountPercent: product.retailDiscountPercent,
    finalPrice: product.retailPrice
      ? product.retailPrice * (1 - (product.retailDiscountPercent || 0) / 100)
      : null,
    currency: product.currency,
    stockQuantity: product.stockQuantity,
    // Product details
    weight: product.weight,
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
    // DO NOT expose: basePrice, minimumOrderQuantity, pricingTiers
  }));

  return c.json({ products: retailProducts });
});

// GET /api/retail/products/:id - Get single retail product
retailRoutes.get('/products/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [product] = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      eq(products.availableForRetail, true)
    ))
    .limit(1);

  if (!product) {
    return c.json({ error: 'Product not found or not available for retail' }, 404);
  }

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

  // Return only retail-relevant information
  return c.json({
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      retailPrice: product.retailPrice,
      retailDiscountPercent: product.retailDiscountPercent,
      finalPrice: product.retailPrice
        ? product.retailPrice * (1 - (product.retailDiscountPercent || 0) / 100)
        : null,
      currency: product.currency,
      stockQuantity: product.stockQuantity,
      weight: product.weight,
      dimensions: product.dimensions,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
    },
    images,
    category,
  });
});

// GET /api/retail/categories - List categories with retail products
retailRoutes.get('/categories', async (c) => {
  const db = createDb(c.env.DB);

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.displayOrder);

  return c.json({ categories: allCategories });
});

export { retailRoutes };
