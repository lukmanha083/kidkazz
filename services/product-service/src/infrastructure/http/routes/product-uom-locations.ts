import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { productUOMLocations, productUOMs, products, productLocations } from '../../db/schema';
import { generateId } from '../../../shared/utils/helpers';

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const createUOMLocationSchema = z.object({
  productUOMId: z.string(),
  warehouseId: z.string(),
  rack: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  aisle: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
});

const updateUOMLocationSchema = createUOMLocationSchema.partial().omit({ productUOMId: true });

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

// GET /api/product-uom-locations - List all product UOM locations with optional filters
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const productUOMId = c.req.query('productUOMId');
  const warehouseId = c.req.query('warehouseId');
  const productId = c.req.query('productId');

  let query = db.select().from(productUOMLocations);

  // Apply filters
  const conditions = [];
  if (productUOMId) {
    conditions.push(eq(productUOMLocations.productUOMId, productUOMId));
  }
  if (warehouseId) {
    conditions.push(eq(productUOMLocations.warehouseId, warehouseId));
  }

  // If filtering by productId, need to join with productUOMs table
  if (productId) {
    const uoms = await db
      .select()
      .from(productUOMs)
      .where(eq(productUOMs.productId, productId))
      .all();

    const uomIds = uoms.map(uom => uom.id);
    if (uomIds.length > 0) {
      // Get locations for all UOMs of this product
      const locations = await db
        .select()
        .from(productUOMLocations)
        .all();

      const filteredLocations = locations.filter(loc => uomIds.includes(loc.productUOMId));
      return c.json({
        locations: filteredLocations,
        total: filteredLocations.length,
      });
    } else {
      return c.json({
        locations: [],
        total: 0,
      });
    }
  }

  const locations = conditions.length > 0
    ? await query.where(and(...conditions)).all()
    : await query.all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// GET /api/product-uom-locations/:id - Get UOM location by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const location = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!location) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  return c.json(location);
});

// GET /api/product-uom-locations/uom/:productUOMId - Get all locations for a product UOM
app.get('/uom/:productUOMId', async (c) => {
  const productUOMId = c.req.param('productUOMId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.productUOMId, productUOMId))
    .all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// GET /api/product-uom-locations/warehouse/:warehouseId - Get all UOM locations in a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const warehouseId = c.req.param('warehouseId');
  const db = drizzle(c.env.DB);

  const locations = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.warehouseId, warehouseId))
    .all();

  return c.json({
    locations,
    total: locations.length,
  });
});

// POST /api/product-uom-locations - Create new UOM location
app.post('/', zValidator('json', createUOMLocationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // Verify productUOM exists
  const productUOM = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.id, data.productUOMId))
    .get();

  if (!productUOM) {
    return c.json({ error: 'Product UOM not found' }, 404);
  }

  // Check if location already exists for this productUOM + warehouse combination
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

  // Validate stock consistency per warehouse
  const validationError = await validateUOMStockPerWarehouse(
    db,
    productUOM.productId,
    data.warehouseId,
    data.productUOMId,
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

  // DDD FIX: Create/update inventory record with UOM conversion
  // Convert UOM quantity to base units (e.g., 10 BOX6 = 60 PCS)
  try {
    // Get product details for minimumStock
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productUOM.productId))
      .get();

    // Calculate quantity in base units
    const quantityInBaseUnits = data.quantity * productUOM.conversionFactor;

    // Check if inventory record already exists
    const inventoryCheckResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/${productUOM.productId}/${data.warehouseId}`)
    );

    if (inventoryCheckResponse.status === 404) {
      // Inventory record doesn't exist, create it
      const adjustResponse = await c.env.INVENTORY_SERVICE.fetch(
        new Request('http://inventory-service/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productUOM.productId,
            warehouseId: data.warehouseId,
            quantity: quantityInBaseUnits,
            movementType: 'adjustment',
            reason: 'Product UOM location created',
            notes: `Initial stock from ${productUOM.uomName} location (${data.quantity} × ${productUOM.conversionFactor} = ${quantityInBaseUnits} base units)`,
          }),
        })
      );

      if (adjustResponse.ok) {
        const invData = await adjustResponse.json();
        const inventoryId = invData.inventory?.id;

        // Set minimumStock if product has it defined
        if (inventoryId && product?.minimumStock) {
          await c.env.INVENTORY_SERVICE.fetch(
            new Request(`http://inventory-service/api/inventory/${inventoryId}/minimum-stock`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ minimumStock: product.minimumStock }),
            })
          );
        }
        console.log(`✅ Created inventory record for product ${productUOM.productId} at warehouse ${data.warehouseId} (${quantityInBaseUnits} base units from ${data.quantity} ${productUOM.uomName})`);
      }
    } else if (inventoryCheckResponse.ok) {
      // Inventory exists, add to the existing quantity
      await c.env.INVENTORY_SERVICE.fetch(
        new Request('http://inventory-service/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productUOM.productId,
            warehouseId: data.warehouseId,
            quantity: quantityInBaseUnits,
            movementType: 'in',
            reason: 'Product UOM location added',
            notes: `Stock added from ${productUOM.uomName} location (${data.quantity} × ${productUOM.conversionFactor} = ${quantityInBaseUnits} base units)`,
          }),
        })
      );
      console.log(`✅ Added ${quantityInBaseUnits} base units to inventory for product ${productUOM.productId} at warehouse ${data.warehouseId}`);
    }
  } catch (invError) {
    console.error('❌ Failed to create/update inventory record from UOM location:', invError);
    // Don't fail the entire request if inventory sync fails
  }

  return c.json(created, 201);
});

// PUT /api/product-uom-locations/:id - Update UOM location
app.put('/:id', zValidator('json', updateUOMLocationSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'UOM location not found' }, 404);
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

  // DDD FIX: Sync inventory if quantity changed
  if (data.quantity !== undefined && updated) {
    try {
      // Get productUOM for conversion factor
      const productUOM = await db
        .select()
        .from(productUOMs)
        .where(eq(productUOMs.id, updated.productUOMId))
        .get();

      if (productUOM) {
        // Calculate new quantity in base units
        const quantityInBaseUnits = data.quantity * productUOM.conversionFactor;

        await c.env.INVENTORY_SERVICE.fetch(
          new Request('http://inventory-service/api/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: productUOM.productId,
              warehouseId: updated.warehouseId,
              quantity: quantityInBaseUnits,
              movementType: 'adjustment',
              reason: 'Product UOM location quantity updated',
              notes: `Quantity adjusted from ${productUOM.uomName} location (${data.quantity} × ${productUOM.conversionFactor} = ${quantityInBaseUnits} base units)`,
            }),
          })
        );
        console.log(`✅ Synced inventory for product ${productUOM.productId} at warehouse ${updated.warehouseId} (${quantityInBaseUnits} base units)`);
      }
    } catch (invError) {
      console.error('❌ Failed to sync inventory on UOM location update:', invError);
    }
  }

  return c.json(updated);
});

// PATCH /api/product-uom-locations/:id/quantity - Update UOM location quantity
app.patch('/:id/quantity', zValidator('json', z.object({ quantity: z.number().int().min(0) })), async (c) => {
  const id = c.req.param('id');
  const { quantity } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  // Get productUOM for conversion factor and validation
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

  // DDD FIX: Sync inventory when quantity changes
  try {

    if (productUOM) {
      // Calculate new quantity in base units
      const quantityInBaseUnits = quantity * productUOM.conversionFactor;

      await c.env.INVENTORY_SERVICE.fetch(
        new Request('http://inventory-service/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productUOM.productId,
            warehouseId: existingLocation.warehouseId,
            quantity: quantityInBaseUnits,
            movementType: 'adjustment',
            reason: 'Product UOM location quantity patched',
            notes: `Quantity patched from ${productUOM.uomName} location (${quantity} × ${productUOM.conversionFactor} = ${quantityInBaseUnits} base units)`,
          }),
        })
      );
      console.log(`✅ Synced inventory for product ${productUOM.productId} via PATCH (${quantityInBaseUnits} base units)`);
    }
  } catch (invError) {
    console.error('❌ Failed to sync inventory on UOM quantity patch:', invError);
  }

  return c.json({ message: 'Quantity updated successfully' });
});

// DELETE /api/product-uom-locations/:id - Delete UOM location
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const existingLocation = await db
    .select()
    .from(productUOMLocations)
    .where(eq(productUOMLocations.id, id))
    .get();

  if (!existingLocation) {
    return c.json({ error: 'UOM location not found' }, 404);
  }

  await db.delete(productUOMLocations).where(eq(productUOMLocations.id, id)).run();

  return c.json({ message: 'UOM location deleted successfully' });
});

export default app;
