import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { variantLocations, productVariants, products, productLocations } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createLocationSchema = z.object({
  variantId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
});

const updateLocationSchema = createLocationSchema.partial().omit({ variantId: true });

/**
 * Helper function to validate variant stock doesn't exceed product stock at a specific warehouse
 * Returns error message if validation fails, null if valid
 *
 * This validates WAREHOUSE-SPECIFIC stock (not global stock), ensuring that for each warehouse,
 * the total variant stock matches the product location stock.
 */
async function validateVariantStockPerWarehouse(
  db: any,
  productId: string,
  warehouseId: string,
  variantIdToUpdate: string,
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

  // Get all variants for this product
  const allVariants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .all();

  // Calculate total variant stock at this warehouse
  let totalVariantStockAtWarehouse = 0;

  for (const variant of allVariants) {
    // Get variant location at this warehouse
    const variantLocation = await db
      .select()
      .from(variantLocations)
      .where(
        and(
          eq(variantLocations.variantId, variant.id),
          eq(variantLocations.warehouseId, warehouseId)
        )
      )
      .get();

    if (variantLocation) {
      // If this is the variant being updated, use new quantity
      if (variant.id === variantIdToUpdate && isUpdate) {
        totalVariantStockAtWarehouse += newQuantity;
      } else {
        totalVariantStockAtWarehouse += variantLocation.quantity || 0;
      }
    }
  }

  // If creating new variant location (not updating), add the new quantity
  if (!isUpdate) {
    totalVariantStockAtWarehouse += newQuantity;
  }

  // Validate: total variant stock at warehouse should not exceed warehouse base stock
  if (totalVariantStockAtWarehouse > warehouseBaseStock) {
    return `Stock validation failed for warehouse: Total variant stock at this warehouse would be ${totalVariantStockAtWarehouse} ${baseUnit}, but product location stock is only ${warehouseBaseStock} ${baseUnit}. Please adjust product location stock first or reduce variant quantities.`;
  }

  return null; // Valid
}

// GET /api/variant-locations - List all variant locations
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const variantId = c.req.query('variantId');
  const warehouseId = c.req.query('warehouseId');

  let query = db.select().from(variantLocations);

  // Apply filters
  const conditions = [];
  if (variantId) {
    conditions.push(eq(variantLocations.variantId, variantId));
  }
  if (warehouseId) {
    conditions.push(eq(variantLocations.warehouseId, warehouseId));
  }

  const locations = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

  return c.json({
    variantLocations: locations,
    total: locations.length,
  });
});

// GET /api/variant-locations/:id - Get location by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const location = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!location) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  return c.json(location);
});

// GET /api/variant-locations/variant/:variantId - Get all locations for a variant
app.get('/variant/:variantId', async (c) => {
  const variantId = c.req.param('variantId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.variantId, variantId))
    .all();

  return c.json({
    variantLocations: locations,
    total: locations.length,
  });
});

// GET /api/variant-locations/warehouse/:warehouseId - Get all variant locations in a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.warehouseId, warehouseId))
    .all();

  return c.json({
    variantLocations: locations,
    total: locations.length,
  });
});

// POST /api/variant-locations - Create new location
app.post('/', zValidator('json', createLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Check if location already exists for this variant + warehouse combination
  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(
      and(
        eq(variantLocations.variantId, data.variantId),
        eq(variantLocations.warehouseId, data.warehouseId)
      )
    )
    .get();

  if (existingLocation) {
    return c.json(
      {
        error: 'Location already exists for this variant in this warehouse. Use PUT to update.',
      },
      400
    );
  }

  // Get variant to access productId for validation
  const variant = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, data.variantId))
    .get();

  if (!variant) {
    return c.json({ error: 'Variant not found' }, 404);
  }

  // Validate stock consistency per warehouse
  const validationError = await validateVariantStockPerWarehouse(
    db,
    variant.productId,
    data.warehouseId,
    data.variantId,
    data.quantity,
    false // isUpdate = false (creating new)
  );

  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const now = new Date();
  const newLocation = {
    id: generateId(),
    variantId: data.variantId,
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

  await db.insert(variantLocations).values(newLocation).run();

  const created = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, newLocation.id))
    .get();

  // Note: Variant locations are SUBDIVISIONS of product location stock, not additions.
  // They do NOT update inventory - only product locations update inventory.
  // The validation above ensures variant total doesn't exceed product location stock.

  return c.json(created, 201);
});

// PUT /api/variant-locations/:id - Update location
app.put('/:id', zValidator('json', updateLocationSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  // Get variant to access productId for validation
  const variant = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, existingLocation.variantId))
    .get();

  if (!variant) {
    return c.json({ error: 'Variant not found' }, 404);
  }

  // Validate stock consistency per warehouse if quantity is being updated
  if (data.quantity !== undefined) {
    const validationError = await validateVariantStockPerWarehouse(
      db,
      variant.productId,
      data.warehouseId || existingLocation.warehouseId,
      existingLocation.variantId,
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
    .update(variantLocations)
    .set(updateData)
    .where(eq(variantLocations.id, id))
    .run();

  const updated = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  // Note: Variant locations are SUBDIVISIONS of product location stock, not additions.
  // They do NOT update inventory - only product locations update inventory.
  // The validation above ensures variant total doesn't exceed product location stock.

  return c.json(updated);
});

// PATCH /api/variant-locations/:id/quantity - Update location quantity
app.patch('/:id/quantity', zValidator('json', z.object({ quantity: z.number().int().min(0) })), async (c) => {
  const id = c.req.param('id');
  const { quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  // Get variant to access productId for validation
  const variant = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, existingLocation.variantId))
    .get();

  if (!variant) {
    return c.json({ error: 'Variant not found' }, 404);
  }

  // Validate stock consistency per warehouse
  const validationError = await validateVariantStockPerWarehouse(
    db,
    variant.productId,
    existingLocation.warehouseId,
    existingLocation.variantId,
    quantity,
    true // isUpdate = true
  );

  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  await db
    .update(variantLocations)
    .set({
      quantity,
      updatedAt: new Date(),
    })
    .where(eq(variantLocations.id, id))
    .run();

  // Note: Variant locations are SUBDIVISIONS of product location stock, not additions.
  // They do NOT update inventory - only product locations update inventory.
  // The validation above ensures variant total doesn't exceed product location stock.

  return c.json({ message: 'Quantity updated successfully' });
});

// DELETE /api/variant-locations/:id - Delete location
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(variantLocations)
    .where(eq(variantLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'Variant location not found' }, 404);
  }

  await db.delete(variantLocations).where(eq(variantLocations.id, id)).run();

  return c.json({ message: 'Variant location deleted successfully' });
});

export default app;
