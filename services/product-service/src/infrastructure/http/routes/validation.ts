/**
 * Validation API Routes
 *
 * Real-time uniqueness checks for SKU, barcode, and warehouse codes
 * Used by admin dashboard for async validation with visual feedback
 *
 * @see Phase 5: Async Validation with Debouncing
 */

import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { products } from '../../db/schema';

type Bindings = {
  DB: D1Database;
  PRODUCT_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Zod validation schemas for query parameters
const skuValidationSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  excludeId: z.string().optional(),
});

const barcodeValidationSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
  excludeId: z.string().optional(),
});

const warehouseCodeValidationSchema = z.object({
  code: z.string().trim().min(1, 'Code is required'),
  excludeId: z.string().optional(),
});

/**
 * GET /api/validation/sku - Check if SKU is unique
 * Query params:
 *  - sku: string (required)
 *  - excludeId: string (optional) - Product ID to exclude from check (for edit mode)
 * Response: { isUnique: boolean }
 */
app.get('/sku', async (c) => {
  const rawQuery = {
    sku: c.req.query('sku'),
    excludeId: c.req.query('excludeId'),
  };

  // Validate query parameters with Zod
  const parseResult = skuValidationSchema.safeParse(rawQuery);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten().fieldErrors }, 400);
  }

  const { sku, excludeId } = parseResult.data;
  const db = drizzle(c.env.DB);

  // Build query conditions
  const conditions = excludeId
    ? and(eq(products.sku, sku), ne(products.id, excludeId))
    : eq(products.sku, sku);

  const existing = await db
    .select()
    .from(products)
    .where(conditions)
    .get();

  return c.json({ isUnique: !existing });
});

/**
 * GET /api/validation/barcode - Check if barcode is unique
 * Query params:
 *  - barcode: string (required)
 *  - excludeId: string (optional) - Product ID to exclude from check (for edit mode)
 * Response: { isUnique: boolean }
 */
app.get('/barcode', async (c) => {
  const rawQuery = {
    barcode: c.req.query('barcode'),
    excludeId: c.req.query('excludeId'),
  };

  // Validate query parameters with Zod
  const parseResult = barcodeValidationSchema.safeParse(rawQuery);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten().fieldErrors }, 400);
  }

  const { barcode, excludeId } = parseResult.data;
  const db = drizzle(c.env.DB);

  // Build query conditions
  const conditions = excludeId
    ? and(eq(products.barcode, barcode), ne(products.id, excludeId))
    : eq(products.barcode, barcode);

  const existing = await db
    .select()
    .from(products)
    .where(conditions)
    .get();

  return c.json({ isUnique: !existing });
});

/**
 * GET /api/validation/warehouse-code - Check if warehouse code is unique
 * Query params:
 *  - code: string (required)
 *  - excludeId: string (optional) - Warehouse ID to exclude from check (for edit mode)
 * Response: { isUnique: boolean }
 *
 * NOTE: Warehouse validation is kept here for completeness, but warehouses are managed
 * by the Inventory Service. This endpoint may need to proxy to Inventory Service in the future.
 */
app.get('/warehouse-code', async (c) => {
  const rawQuery = {
    code: c.req.query('code'),
    excludeId: c.req.query('excludeId'),
  };

  // Validate query parameters with Zod
  const parseResult = warehouseCodeValidationSchema.safeParse(rawQuery);
  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten().fieldErrors }, 400);
  }

  // TODO: Proxy to Inventory Service when warehouse management is fully migrated
  // For now, return isUnique: true to allow warehouse creation
  // The actual uniqueness check will be done by the Inventory Service on creation

  return c.json({ isUnique: true });
});

export default app;
