import { zValidator } from '@hono/zod-validator';
import { and, eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateId } from '../../../shared/utils/helpers';
import {
  productLocations,
  productUOMLocations,
  productUOMs,
  productVariants,
  products,
} from '../../db/schema';

type Bindings = {
  DB: D1Database;
  INVENTORY_SERVICE: Fetcher;
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
  stock: z.number().optional().default(0), // DEPRECATED: Use Inventory Service for stock data (GET /api/products/:id/stock)
  baseUnit: z.string().default('PCS'),
  wholesaleThreshold: z.number().default(100),
  minimumOrderQuantity: z.number().default(1),
  minimumStock: z.number().optional().nullable(),
  rating: z.number().default(0),
  reviews: z.number().default(0),
  availableForRetail: z.boolean().default(true),
  availableForWholesale: z.boolean().default(true),
  status: z
    .enum(['online sales', 'offline sales', 'omnichannel sales', 'inactive', 'discontinued'])
    .default('offline sales'),
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

  const query = db.select().from(products);

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

  const allProducts =
    conditions.length > 0 ? await query.where(and(...conditions)).all() : await query.all();

  return c.json({
    products: allProducts,
    total: allProducts.length,
  });
});

// GET /api/products/:id - Get product by ID with variants and UOMs
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const product = await db.select().from(products).where(eq(products.id, id)).get();

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
  const uoms = await db.select().from(productUOMs).where(eq(productUOMs.productId, id)).all();

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

// GET /api/products/:id/stock - Get product stock from Inventory Service (DDD compliant)
app.get('/:id/stock', async (c) => {
  const productId = c.req.param('id');

  try {
    // Delegate to Inventory Service for stock data (single source of truth)
    const response = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/product/${productId}/total-stock`)
    );

    if (response.ok) {
      return c.json(await response.json());
    }
    if (response.status === 404) {
      // Product exists in Product Service but no inventory records yet
      return c.json({
        productId,
        totalStock: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouses: [],
      });
    }
    return c.json({ error: 'Failed to fetch stock from Inventory Service' }, 500);
  } catch (error) {
    console.error('Error fetching stock from Inventory Service:', error);
    return c.json({ error: 'Failed to fetch stock data' }, 500);
  }
});

// GET /api/products/:id/low-stock - Get product low stock status from Inventory Service (DDD compliant)
app.get('/:id/low-stock', async (c) => {
  const productId = c.req.param('id');

  try {
    // Delegate to Inventory Service for low stock status (single source of truth)
    const response = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/product/${productId}/low-stock-status`)
    );

    if (response.ok) {
      return c.json(await response.json());
    }
    return c.json({ error: 'Failed to fetch low stock status from Inventory Service' }, 500);
  } catch (error) {
    console.error('Error fetching low stock status from Inventory Service:', error);
    return c.json({ error: 'Failed to fetch low stock status' }, 500);
  }
});

// GET /api/products/sku/:sku - Get product by SKU
app.get('/sku/:sku', async (c) => {
  const sku = c.req.param('sku');
  const db = drizzle(c.env.DB);

  const product = await db.select().from(products).where(eq(products.sku, sku)).get();

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
    return c.json(
      {
        error: 'SKU_ALREADY_EXISTS',
        message: `Product with SKU "${data.sku}" already exists. Product SKUs must be unique.`,
        existingProduct: {
          id: existingProductWithSku.id,
          name: existingProductWithSku.name,
          sku: existingProductWithSku.sku,
        },
      },
      400
    );
  }

  // Check if barcode already exists
  const existingProductWithBarcode = await db
    .select()
    .from(products)
    .where(eq(products.barcode, data.barcode))
    .get();

  if (existingProductWithBarcode) {
    return c.json(
      {
        error: 'BARCODE_ALREADY_EXISTS',
        message: `Product with barcode "${data.barcode}" already exists. Product barcodes must be unique.`,
        existingProduct: {
          id: existingProductWithBarcode.id,
          name: existingProductWithBarcode.name,
          barcode: existingProductWithBarcode.barcode,
        },
      },
      400
    );
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

    // Remove deprecated stock field from response (Phase 2C: Stock managed by Inventory Service)
    const { stock, ...productResponse } = newProduct;
    return c.json(productResponse, 201);
  } catch (error) {
    console.error('Product Service Error:', error);
    return c.json(
      {
        error: 'DATABASE_ERROR',
        message: 'Failed to create product. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// PUT /api/products/:id - Update product
app.put('/:id', zValidator('json', updateProductSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(products).where(eq(products.id, id)).get();

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
      return c.json(
        {
          error: 'SKU_ALREADY_EXISTS',
          message: `Product with SKU "${data.sku}" already exists. Product SKUs must be unique.`,
          existingProduct: {
            id: existingProductWithSku.id,
            name: existingProductWithSku.name,
            sku: existingProductWithSku.sku,
          },
        },
        400
      );
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
      return c.json(
        {
          error: 'BARCODE_ALREADY_EXISTS',
          message: `Product with barcode "${data.barcode}" already exists. Product barcodes must be unique.`,
          existingProduct: {
            id: existingProductWithBarcode.id,
            name: existingProductWithBarcode.name,
            barcode: existingProductWithBarcode.barcode,
          },
        },
        400
      );
    }
  }

  try {
    await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .run();

    const updated = await db.select().from(products).where(eq(products.id, id)).get();

    return c.json(updated);
  } catch (error) {
    console.error('Product Service Error:', error);
    return c.json(
      {
        error: 'DATABASE_ERROR',
        message: 'Failed to update product. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// PATCH /api/products/:id/price - Update product price
app.patch(
  '/:id/price',
  zValidator(
    'json',
    z.object({
      priceType: z.enum(['retail', 'wholesale', 'base']),
      newPrice: z.number(),
    })
  ),
  async (c) => {
    const id = c.req.param('id');
    const { priceType, newPrice } = c.req.valid('json');
    const db = drizzle(c.env.DB);

    const existing = await db.select().from(products).where(eq(products.id, id)).get();

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

    await db.update(products).set(updateData).where(eq(products.id, id)).run();

    return c.json({ message: 'Price updated successfully' });
  }
);

// PATCH /api/products/:id/stock - Update product stock
// NOTE: This route is deprecated after DDD Phase 4 refactoring
// Stock is now managed by Inventory Service - use /api/inventory endpoints instead
/* DEPRECATED - Commented out during DDD refactoring
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
*/

// POST /api/products/:id/deduct-sale - Deduct stock for sales order
// NOTE: This route is deprecated after DDD Phase 4 refactoring
// Stock deduction is now handled by Inventory Service - use /api/inventory/adjust instead
/* DEPRECATED - Commented out during DDD refactoring
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
*/

// GET /api/products/:id/uom-warehouse-stock - Get UOM stock breakdown by warehouse
// DDD: Product/UOM metadata from Product Service, stock data from Inventory Service
app.get('/:id/uom-warehouse-stock', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get product metadata only (no stock fields per DDD)
  const product = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      baseUnit: products.baseUnit,
    })
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Get UOM metadata only (no stock fields per DDD)
  const uoms = await db
    .select({
      id: productUOMs.id,
      uomCode: productUOMs.uomCode,
      uomName: productUOMs.uomName,
      conversionFactor: productUOMs.conversionFactor,
    })
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  // DDD: Fetch stock data from Inventory Service
  let inventoryData: {
    inventory?: Array<{ uomId?: string; quantityAvailable?: number; warehouseId?: string }>;
  } = { inventory: [] };
  try {
    const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory?productId=${productId}`)
    );
    if (inventoryResponse.ok) {
      inventoryData = (await inventoryResponse.json()) as typeof inventoryData;
    }
  } catch (error) {
    console.error('Failed to fetch inventory data:', error);
    // Continue with empty inventory - graceful degradation
  }

  // Build UOM stocks from inventory data
  const uomStocks = uoms.map((uom) => {
    // Filter inventory records for this UOM
    const uomInventory = inventoryData.inventory?.filter((inv) => inv.uomId === uom.id) || [];

    // Calculate total stock across warehouses
    const totalStock = uomInventory.reduce((sum, inv) => sum + (inv.quantityAvailable || 0), 0);

    // Group by warehouse
    const warehouseStocks = uomInventory.map((inv) => ({
      warehouseId: inv.warehouseId || '',
      quantity: inv.quantityAvailable || 0,
    }));

    return {
      uomCode: uom.uomCode,
      uomName: uom.uomName,
      conversionFactor: uom.conversionFactor,
      totalStock,
      warehouseStocks,
    };
  });

  // Get base unit inventory (no UOM specified)
  const baseUnitInventory = inventoryData.inventory?.filter((inv) => !inv.uomId) || [];

  const baseUnitLocations = baseUnitInventory.map((inv) => ({
    warehouseId: inv.warehouseId || '',
    quantity: inv.quantityAvailable || 0,
  }));

  // Calculate total stock
  const totalStock =
    inventoryData.inventory?.reduce((sum, inv) => sum + (inv.quantityAvailable || 0), 0) || 0;

  return c.json({
    productId: product.id,
    productName: product.name,
    productSKU: product.sku,
    baseUnit: product.baseUnit,
    totalStock,
    uomStocks,
    baseUnitLocations,
  });
});

// GET /api/products/:id/variant-warehouse-stock - Get variant stock breakdown by warehouse
// DDD: Product metadata from Product Service, stock data from Inventory Service
app.get('/:id/variant-warehouse-stock', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get product metadata only (no stock fields per DDD)
  const product = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
    })
    .from(products)
    .where(eq(products.id, productId))
    .get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Get variant metadata only (no stock fields per DDD)
  const variants = await db
    .select({
      id: productVariants.id,
      variantName: productVariants.variantName,
      variantSKU: productVariants.variantSKU,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .all();

  // DDD: Fetch stock data from Inventory Service
  let inventoryData: {
    inventory?: Array<{ variantId?: string; quantityAvailable?: number; warehouseId?: string }>;
  } = { inventory: [] };
  try {
    const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory?productId=${productId}`)
    );
    if (inventoryResponse.ok) {
      inventoryData = (await inventoryResponse.json()) as typeof inventoryData;
    }
  } catch (error) {
    console.error('Failed to fetch inventory data:', error);
    // Continue with empty inventory - graceful degradation
  }

  // Build variant stocks from inventory data
  const variantStocks = variants.map((variant) => {
    // Filter inventory records for this variant
    const variantInventory =
      inventoryData.inventory?.filter((inv) => inv.variantId === variant.id) || [];

    // Calculate total stock across warehouses
    const totalStock = variantInventory.reduce((sum, inv) => sum + (inv.quantityAvailable || 0), 0);

    // Group by warehouse
    const warehouseStocks = variantInventory.map((inv) => ({
      warehouseId: inv.warehouseId || '',
      quantity: inv.quantityAvailable || 0,
    }));

    return {
      variantId: variant.id,
      variantName: variant.variantName,
      variantSKU: variant.variantSKU,
      totalStock,
      warehouseStocks,
    };
  });

  // Calculate total product stock from all variants
  const totalStock = variantStocks.reduce((sum, v) => sum + v.totalStock, 0);

  return c.json({
    productId: product.id,
    productName: product.name,
    productSKU: product.sku,
    totalStock,
    variantStocks,
  });
});

// POST /api/products/:id/validate-stock-consistency - Validate stock consistency per warehouse
// NOTE: This route is deprecated after DDD Phase 4 refactoring
// Stock validation is now handled by Inventory Service
/* DEPRECATED - Commented out during DDD refactoring
// Validates that for EACH warehouse, product_locations stock matches product_uom_locations stock (in base units)
// This is the new per-warehouse validation approach (not global validation)
app.post('/:id/validate-stock-consistency', async (c) => {
  const productId = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get product
  const product = await db.select().from(products).where(eq(products.id, productId)).get();
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const baseUnit = product.baseUnit || 'PCS';

  // Get all warehouses where this product exists (from product_locations)
  const baseLocations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, productId))
    .all();

  // Get all product UOMs
  const uoms = await db
    .select()
    .from(productUOMs)
    .where(eq(productUOMs.productId, productId))
    .all();

  // Validate per warehouse
  const warehouseValidation = [];
  let overallValid = true;
  let totalLocationStock = 0;
  let totalUOMStock = 0;

  for (const baseLoc of baseLocations) {
    const warehouseId = baseLoc.warehouseId;
    const locationStock = baseLoc.quantity || 0;
    totalLocationStock += locationStock;

    // Calculate UOM stock at this warehouse (in base units)
    let uomStockAtWarehouse = 0;
    const uomDetails = [];

    for (const uom of uoms) {
      const uomLocs = await db
        .select()
        .from(productUOMLocations)
        .where(
          and(
            eq(productUOMLocations.productUOMId, uom.id),
            eq(productUOMLocations.warehouseId, warehouseId)
          )
        )
        .all();

      for (const uomLoc of uomLocs) {
        const baseUnits = (uomLoc.quantity || 0) * (uom.conversionFactor || 1);
        uomStockAtWarehouse += baseUnits;
        uomDetails.push({
          uomCode: uom.uomCode,
          uomName: uom.uomName,
          quantity: uomLoc.quantity,
          conversionFactor: uom.conversionFactor,
          baseUnits: baseUnits,
        });
      }
    }

    totalUOMStock += uomStockAtWarehouse;

    const difference = locationStock - uomStockAtWarehouse;
    const isValid = difference === 0;
    if (!isValid) {
      overallValid = false;
    }

    let status = 'valid';
    let statusMessage = '';
    if (difference > 0) {
      status = 'location_exceeds_uom';
      statusMessage = `Product location has ${Math.abs(difference)} ${baseUnit} more than UOM locations`;
    } else if (difference < 0) {
      status = 'uom_exceeds_location';
      statusMessage = `UOM locations have ${Math.abs(difference)} ${baseUnit} more than product location`;
    } else {
      statusMessage = 'Stock totals match';
    }

    warehouseValidation.push({
      warehouseId,
      locationStock,
      uomStock: uomStockAtWarehouse,
      difference,
      isValid,
      status,
      statusMessage,
      uomBreakdown: uomDetails,
    });
  }

  // Overall summary
  const globalDifference = totalLocationStock - totalUOMStock;
  let overallMessage = '';
  if (overallValid) {
    overallMessage = 'All warehouses have consistent stock totals';
  } else {
    overallMessage = `Stock mismatch detected in ${warehouseValidation.filter(w => !w.isValid).length} warehouse(s)`;
  }

  return c.json({
    isValid: overallValid,
    globalSummary: {
      totalLocationStock,
      totalUOMStock,
      globalDifference,
      baseUnit,
    },
    message: overallMessage,
    warehouseValidation,
    details: {
      productId,
      productName: product.name,
      productSKU: product.sku,
      warehouseCount: baseLocations.length,
      uomsCount: uoms.length,
    }
  });
});
*/

// DELETE /api/products/:id - Delete product with validation
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Get product info for error messages
  const product = await db.select().from(products).where(eq(products.id, id)).get();

  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // 1. ALWAYS check inventory first (regardless of locations)
  // DDD: Inventory is the source of truth for stock levels
  try {
    const inventoryResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory?productId=${id}`)
    );

    if (inventoryResponse.ok) {
      const inventoryData = (await inventoryResponse.json()) as {
        inventory?: Array<{ quantityAvailable?: number; [key: string]: any }>;
      };
      const totalStock =
        inventoryData.inventory?.reduce(
          (sum: number, inv) => sum + (inv.quantityAvailable || 0),
          0
        ) || 0;

      if (totalStock > 0) {
        return c.json(
          {
            error: `Cannot delete product "${product.name}" (SKU: ${product.sku})`,
            reason: 'Product has inventory',
            details: {
              totalStock,
              warehouses: inventoryData.inventory?.length || 0,
              suggestion: 'Transfer or adjust inventory to zero before deleting the product',
            },
          },
          400
        );
      }
    }
  } catch (invError) {
    console.error('Error checking inventory:', invError);
    return c.json(
      {
        error: 'Cannot verify product inventory status',
        reason: 'Inventory service unavailable',
        suggestion: 'Please ensure inventory is zero before deleting the product',
      },
      503
    );
  }

  // 2. Check product locations for non-zero quantities
  // NOTE: After DDD Phase 4, quantity field removed from productLocations
  // Stock validation is now done via Inventory Service (see check above)
  /* DEPRECATED - Commented out during DDD refactoring
  // CRITICAL: Even if inventory records don't exist (due to sync failures),
  // we must prevent deletion if product locations have stock allocated
  const locations = await db
    .select()
    .from(productLocations)
    .where(eq(productLocations.productId, id))
    .all();

  const totalLocationStock = locations.reduce(
    (sum, loc) => sum + (loc.quantity || 0),
    0
  );

  if (totalLocationStock > 0) {
    return c.json(
      {
        error: `Cannot delete product "${product.name}" (SKU: ${product.sku})`,
        reason: 'Product has stock allocated in locations',
        details: {
          totalLocationStock,
          locations: locations.length,
          locationDetails: locations.map(loc => ({
            warehouseId: loc.warehouseId,
            quantity: loc.quantity,
          })),
          suggestion: 'Remove or transfer all stock from product locations before deleting the product',
        },
      },
      400
    );
  }
  */

  // 3. Delete product (CASCADE will handle dependent data)
  // This will cascade to:
  // - productUOMs (and their productUOMLocations)
  // - productVariants (and their variantLocations)
  // - productLocations (already validated as zero quantity above)
  // - productBundles/bundleItems
  // - productImages, productVideos
  // - pricingTiers, customPricing
  await db.delete(products).where(eq(products.id, id)).run();

  // 4. Clean up ALL inventory records in Inventory Service (cross-service cascade delete)
  // NOTE: At this point inventory should be zero (validated above), but we still
  // call the cascade delete to clean up any orphaned inventory records
  let inventoryDeleted = false;
  let inventoryDeletedCount = 0;
  try {
    const deleteResponse = await c.env.INVENTORY_SERVICE.fetch(
      new Request(`http://inventory-service/api/inventory/product/${id}`, { method: 'DELETE' })
    );

    if (deleteResponse.ok) {
      const deleteResult = (await deleteResponse.json()) as {
        deletedInventoryRecords?: number;
      };
      inventoryDeleted = true;
      inventoryDeletedCount = deleteResult.deletedInventoryRecords || 0;
      console.log(`Deleted ${inventoryDeletedCount} inventory records for product ${id}`);
    } else {
      console.error(`Failed to delete inventory: ${deleteResponse.status}`);
    }
  } catch (err) {
    console.error(`Failed to delete inventory for product ${id}:`, err);
    // Continue - product is already deleted, inventory cleanup can be done manually if needed
  }

  return c.json({
    message: 'Product deleted successfully',
    // deletedLocations removed - was part of deprecated stock validation
    deletedInventoryRecords: inventoryDeletedCount,
    inventoryCleaned: inventoryDeleted,
  });
});

export default app;
