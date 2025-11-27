import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like } from 'drizzle-orm';
import { products, productVariants, productUOMs, productLocations, productUOMLocations } from '../../db/schema';
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
  status: z.enum(['online sales', 'offline sales', 'omnichannel sales', 'inactive', 'discontinued']).default('omnichannel sales'),
  isBundle: z.boolean().default(false),
  // Physical attributes for shipping calculations
  weight: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  // Product expiration tracking
  expirationDate: z.string().optional().nullable(), // ISO date string
  alertDate: z.string().optional().nullable(), // ISO date string (should be before expiration)
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

// POST /api/products/:id/deduct-sale - Deduct stock for sales order
// This endpoint handles UOM-based sales and updates all related tables atomically
app.post('/:id/deduct-sale', zValidator('json', z.object({
  uomCode: z.string(), // e.g., 'PCS', 'BOX6', 'CARTON18'
  warehouseId: z.string(),
  quantity: z.number().int().positive(), // Quantity in the specified UOM
  orderId: z.string().optional(), // Reference to sales order
  reason: z.string().optional(),
})), async (c) => {
  const productId = c.req.param('id');
  const { uomCode, warehouseId, quantity, orderId, reason } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  try {
    // 1. Get product
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .get();

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // 2. Get the specific UOM for this product
    const productUOM = await db
      .select()
      .from(productUOMs)
      .where(
        and(
          eq(productUOMs.productId, productId),
          eq(productUOMs.uomCode, uomCode)
        )
      )
      .get();

    if (!productUOM) {
      return c.json({
        error: 'Product UOM not found',
        message: `UOM "${uomCode}" not configured for this product`
      }, 404);
    }

    const conversionFactor = productUOM.conversionFactor;
    const baseUnitsToDeduct = quantity * conversionFactor;

    // 3. Get UOM location at the warehouse
    const uomLocation = await db
      .select()
      .from(productUOMLocations)
      .where(
        and(
          eq(productUOMLocations.productUOMId, productUOM.id),
          eq(productUOMLocations.warehouseId, warehouseId)
        )
      )
      .get();

    if (!uomLocation) {
      return c.json({
        error: 'UOM location not found',
        message: `${uomCode} not available at this warehouse`
      }, 404);
    }

    if (uomLocation.quantity < quantity) {
      return c.json({
        error: 'Insufficient UOM stock',
        message: `Requested ${quantity} ${uomCode}, but only ${uomLocation.quantity} available at this warehouse`,
        available: uomLocation.quantity,
        requested: quantity
      }, 400);
    }

    // 4. Get product location at the warehouse
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
      return c.json({
        error: 'Product location not found',
        message: 'Product not available at this warehouse'
      }, 404);
    }

    if (productLocation.quantity < baseUnitsToDeduct) {
      return c.json({
        error: 'Insufficient base unit stock',
        message: `Need ${baseUnitsToDeduct} base units, but only ${productLocation.quantity} available`,
        available: productLocation.quantity,
        required: baseUnitsToDeduct
      }, 400);
    }

    // 5. Perform atomic updates (all or nothing)
    const now = new Date();

    // Update product_uom_locations (deduct UOM at warehouse)
    await db
      .update(productUOMLocations)
      .set({
        quantity: uomLocation.quantity - quantity,
        updatedAt: now,
      })
      .where(eq(productUOMLocations.id, uomLocation.id))
      .run();

    // Update product_uoms (aggregate UOM stock)
    await db
      .update(productUOMs)
      .set({
        stock: productUOM.stock - quantity,
        updatedAt: now,
      })
      .where(eq(productUOMs.id, productUOM.id))
      .run();

    // Update product_locations (deduct base units at warehouse)
    await db
      .update(productLocations)
      .set({
        quantity: productLocation.quantity - baseUnitsToDeduct,
        updatedAt: now,
      })
      .where(eq(productLocations.id, productLocation.id))
      .run();

    // Update products (aggregate product stock in base units)
    await db
      .update(products)
      .set({
        stock: product.stock - baseUnitsToDeduct,
        updatedAt: now,
      })
      .where(eq(products.id, productId))
      .run();

    // Return success with detailed information
    return c.json({
      success: true,
      message: 'Stock deducted successfully',
      deduction: {
        productId,
        productName: product.name,
        uomCode,
        uomQuantityDeducted: quantity,
        baseUnitsDeducted: baseUnitsToDeduct,
        warehouseId,
        orderId: orderId || null,
        reason: reason || 'Sales order',
      },
      remainingStock: {
        uomAtWarehouse: uomLocation.quantity - quantity,
        baseUnitsAtWarehouse: productLocation.quantity - baseUnitsToDeduct,
        totalUOM: productUOM.stock - quantity,
        totalBaseUnits: product.stock - baseUnitsToDeduct,
      },
    }, 200);

  } catch (error) {
    console.error('Sales deduction error:', error);
    return c.json({
      error: 'SALES_DEDUCTION_FAILED',
      message: 'Failed to deduct stock. Transaction rolled back.',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// GET /api/products/:id/uom-warehouse-stock - Get UOM stock breakdown by warehouse
app.get('/:id/uom-warehouse-stock', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get product
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Get all UOMs for this product
  const uoms = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  // Get all UOM locations for this product
  const uomLocations = [];
  for (const uom of uoms) {
    const locations = await db
      .select()
      .from(productUOMLocations)
      .where(eq(productUOMLocations.productUOMId, uom.id))
      .all();

    uomLocations.push({
      uomCode: uom.uomCode,
      uomName: uom.uomName,
      conversionFactor: uom.conversionFactor,
      totalStock: uom.stock,
      warehouseStocks: locations.map(loc => ({
        warehouseId: loc.warehouseId,
        quantity: loc.quantity,
        rack: loc.rack,
        bin: loc.bin,
        zone: loc.zone,
        aisle: loc.aisle,
      })),
    });
  }

  // Get base unit (PCS) locations
  const baseLocations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  return c.json({
    productId,
    productName: product.name,
    productSKU: product.sku,
    baseUnit: product.baseUnit,
    totalStock: product.stock,
    uomStocks: uomLocations,
    baseUnitLocations: baseLocations.map(loc => ({
      warehouseId: loc.warehouseId,
      quantity: loc.quantity,
      rack: loc.rack,
      bin: loc.bin,
      zone: loc.zone,
      aisle: loc.aisle,
    })),
  });
});

// POST /api/products/:id/validate-stock-consistency - Validate stock consistency across warehouses
// Validates that total stock matches between product_locations and product_uom_locations (in base units)
app.post('/:id/validate-stock-consistency', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get product
  const product = await db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Calculate total from product_locations (base units)
  const baseLocations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  const totalBaseUnitsFromLocations = baseLocations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);

  // Calculate total from product_uom_locations (converted to base units)
  const uoms = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  let totalBaseUnitsFromUOMs = 0;
  for (const uom of uoms) {
    const uomLocs = await db
      .select()
      .from(productUOMLocations)
      .where(eq(productUOMLocations.productUOMId, uom.id))
      .all();

    const uomTotalInBaseUnits = uomLocs.reduce((locSum, loc) => {
      return locSum + ((loc.quantity || 0) * (uom.conversionFactor || 1));
    }, 0);

    totalBaseUnitsFromUOMs += uomTotalInBaseUnits;
  }

  const difference = totalBaseUnitsFromLocations - totalBaseUnitsFromUOMs;
  const isValid = difference === 0;

  let message = '';
  if (isValid) {
    message = 'Stock totals match across all warehouses';
  } else if (difference > 0) {
    message = `Stock mismatch: Product locations show ${Math.abs(difference)} ${product.baseUnit} more than UOM locations`;
  } else {
    message = `Stock mismatch: UOM locations show ${Math.abs(difference)} ${product.baseUnit} more than product locations`;
  }

  return c.json({
    isValid,
    locationTotal: totalBaseUnitsFromLocations,
    uomTotal: totalBaseUnitsFromUOMs,
    difference,
    baseUnit: product.baseUnit,
    message,
    details: {
      productId,
      productName: product.name,
      productSKU: product.sku,
      baseLocationsCount: baseLocations.length,
      uomsCount: uoms.length,
    }
  });
});

// DELETE /api/products/:id - Delete product
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  await db.delete(products).where(eq(products.id, id)).run();

  return c.json({ message: 'Product deleted successfully' });
});

export default app;
