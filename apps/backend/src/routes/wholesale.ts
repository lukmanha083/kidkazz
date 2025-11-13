import { Hono } from 'hono';
import { createDb } from '../lib/db';
import { products, productImages, categories, pricingTiers } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { Env } from '../index';

const wholesaleRoutes = new Hono<{ Bindings: Env }>();

// GET /api/wholesale/products - List wholesale products only
wholesaleRoutes.get('/products', async (c) => {
  const db = createDb(c.env.DB);

  const allProducts = await db
    .select()
    .from(products)
    .where(and(
      eq(products.status, 'active'),
      eq(products.availableForWholesale, true)
    ))
    .orderBy(desc(products.createdAt));

  // Include wholesale pricing, exclude retail pricing
  const wholesaleProducts = allProducts.map(product => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    // Wholesale pricing
    basePrice: product.basePrice,
    minimumOrderQuantity: product.minimumOrderQuantity,
    packagingUnit: product.packagingUnit,
    unitsPerPackage: product.unitsPerPackage,
    currency: product.currency,
    stockQuantity: product.stockQuantity,
    // Product details
    weight: product.weight,
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
    // DO NOT expose: retailPrice, retailDiscountPercent
  }));

  return c.json({ products: wholesaleProducts });
});

// GET /api/wholesale/products/:id - Get wholesale product with tiered pricing
wholesaleRoutes.get('/products/:id', async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const [product] = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, id),
      eq(products.availableForWholesale, true)
    ))
    .limit(1);

  if (!product) {
    return c.json({ error: 'Product not found or not available for wholesale' }, 404);
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

  // Return wholesale-relevant information
  return c.json({
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      basePrice: product.basePrice,
      minimumOrderQuantity: product.minimumOrderQuantity,
      packagingUnit: product.packagingUnit,
      unitsPerPackage: product.unitsPerPackage,
      currency: product.currency,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      weight: product.weight,
      dimensions: product.dimensions,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
    },
    pricingTiers: tiers,
    images,
    category,
  });
});

// GET /api/wholesale/categories - List categories with wholesale products
wholesaleRoutes.get('/categories', async (c) => {
  const db = createDb(c.env.DB);

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.displayOrder);

  return c.json({ categories: allCategories });
});

export { wholesaleRoutes };
