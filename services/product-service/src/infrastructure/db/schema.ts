import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Categories table
 * Hierarchical product categories for admin dashboard
 */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  status: text('status').default('active').notNull(), // 'active' | 'inactive'

  // Subcategory support
  parentId: text('parent_id'), // Reference to parent category (self-referential)

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Units of Measure (UOM) table
 * Standard units like PCS, BOX, CARTON, etc.
 */
export const uoms = sqliteTable('uoms', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(), // e.g., 'PCS', 'BOX6', 'CARTON18'
  name: text('name').notNull(), // e.g., 'Pieces', 'Box of 6', 'Carton (18 PCS)'
  conversionFactor: integer('conversion_factor').notNull(), // How many base units this contains
  isBaseUnit: integer('is_base_unit', { mode: 'boolean' }).default(false),
  baseUnitCode: text('base_unit_code'), // For custom UOMs, references the base unit code (e.g., 'PCS', 'KG', 'L')

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Products table
 * Main product catalog with admin dashboard features
 */
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  barcode: text('barcode').unique().notNull(), // Primary barcode (for PCS UOM)
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  description: text('description'),
  image: text('image'),

  // Category
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),

  // Pricing (in Rupiah - IDR)
  price: real('price').notNull(), // Base/retail price
  retailPrice: real('retail_price'), // Retail price (nullable for wholesale-only)
  wholesalePrice: real('wholesale_price'), // Wholesale price

  // Stock
  stock: integer('stock').default(0).notNull(),
  minimumStock: integer('minimum_stock'), // Minimum stock threshold for alert reports

  // Base unit
  baseUnit: text('base_unit').default('PCS').notNull(),

  // Wholesale settings
  wholesaleThreshold: integer('wholesale_threshold').default(100), // Minimum qty for wholesale pricing
  minimumOrderQuantity: integer('minimum_order_quantity').default(1),

  // Physical Attributes (for shipping cost calculation)
  weight: real('weight'), // in kg
  length: real('length'), // in cm (panjang)
  width: real('width'), // in cm (lebar)
  height: real('height'), // in cm (tinggi)

  // Ratings & Reviews
  rating: real('rating').default(0),
  reviews: integer('reviews').default(0),

  // Availability
  availableForRetail: integer('available_for_retail', { mode: 'boolean' }).default(true),
  availableForWholesale: integer('available_for_wholesale', { mode: 'boolean' }).default(true),

  // Status
  status: text('status').default('omnichannel sales'), // 'online sales' | 'offline sales' | 'omnichannel sales' | 'inactive' | 'discontinued'
  isBundle: integer('is_bundle', { mode: 'boolean' }).default(false),

  // Product Expiration and Alert
  expirationDate: text('expiration_date'), // ISO date string - product expiration date
  alertDate: text('alert_date'), // ISO date string - alert/notification date (must be before expiration date)

  // Accounting Integration (links to Accounting Service Chart of Accounts)
  revenueAccountId: text('revenue_account_id'), // Revenue account for sales
  revenueAccountCode: text('revenue_account_code'), // e.g., "4010" - Product Sales
  cogsAccountId: text('cogs_account_id'), // COGS account
  cogsAccountCode: text('cogs_account_code'), // e.g., "5010" - Cost of Product Sales
  inventoryAccountId: text('inventory_account_id'), // Inventory asset account
  inventoryAccountCode: text('inventory_account_code'), // e.g., "1010" - Finished Goods
  deferredCogsAccountId: text('deferred_cogs_account_id'), // For advanced revenue recognition

  // Costing
  costPrice: real('cost_price'), // Actual cost (vs selling price)
  costingMethod: text('costing_method', {
    enum: ['FIFO', 'LIFO', 'Average', 'Standard']
  }).default('Average'),

  // Tax
  taxable: integer('taxable', { mode: 'boolean' }).default(true),
  taxCategoryId: text('tax_category_id'),

  // GL Segmentation (optional for multi-department/location tracking)
  glSegment1: text('gl_segment1'), // Department
  glSegment2: text('gl_segment2'), // Location
  glSegment3: text('gl_segment3'), // Project

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

/**
 * Product UOMs table
 * Links products to their alternative units of measure with stock tracking
 */
export const productUOMs = sqliteTable('product_uoms', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  uomCode: text('uom_code').notNull(), // Reference to UOM code
  uomName: text('uom_name').notNull(), // Denormalized for performance
  barcode: text('barcode').unique().notNull(), // Unique barcode for this UOM
  conversionFactor: integer('conversion_factor').notNull(), // e.g., 6 for BOX6, 18 for CARTON18
  stock: integer('stock').default(0).notNull(), // Stock in this UOM
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Product Variants table
 * Product variations like color, size, material, style
 */
export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  productName: text('product_name').notNull(), // Denormalized
  productSKU: text('product_sku').notNull(), // Denormalized

  variantName: text('variant_name').notNull(), // e.g., 'Pink', 'Large', 'Cotton'
  variantSKU: text('variant_sku').unique().notNull(), // e.g., 'BB-001-PNK'
  variantType: text('variant_type').notNull(), // 'Color' | 'Size' | 'Material' | 'Style'

  price: real('price').notNull(), // Variant price
  stock: integer('stock').default(0).notNull(), // Variant stock
  status: text('status').default('active').notNull(), // 'active' | 'inactive'

  image: text('image'), // Optional variant image

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Product Bundles table
 * Bundled product packages with discounts
 * Note: Product bundles do not have expiration dates as per business requirements
 */
export const productBundles = sqliteTable('product_bundles', {
  id: text('id').primaryKey(),
  bundleName: text('bundle_name').notNull(),
  bundleSKU: text('bundle_sku').unique().notNull(),
  barcode: text('barcode'),
  bundleDescription: text('bundle_description'),
  bundleImage: text('bundle_image'),

  // Warehouse - where bundle is assembled
  warehouseId: text('warehouse_id'), // Reference to warehouse (foreign service)

  // Pricing
  bundlePrice: real('bundle_price').notNull(), // Final bundle price
  discountPercentage: real('discount_percentage').notNull(), // Discount %

  // Availability
  status: text('status').default('active').notNull(), // 'active' | 'inactive'
  availableStock: integer('available_stock').default(0).notNull(),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Bundle Items table
 * Products included in each bundle
 */
export const bundleItems = sqliteTable('bundle_items', {
  id: text('id').primaryKey(),
  bundleId: text('bundle_id')
    .notNull()
    .references(() => productBundles.id, { onDelete: 'cascade' }),

  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  productSKU: text('product_sku').notNull(), // Denormalized
  productName: text('product_name').notNull(), // Denormalized
  barcode: text('barcode').notNull(), // Denormalized
  quantity: integer('quantity').notNull(), // Quantity of this product in bundle
  price: real('price').notNull(), // Individual product price (for calculation)

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Pricing tiers table
 * Bulk pricing for wholesale (e.g., 100+ units = 15% discount)
 */
export const pricingTiers = sqliteTable('pricing_tiers', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  minQuantity: integer('min_quantity').notNull(), // Minimum quantity for this tier
  discountPercentage: real('discount_percentage').notNull(), // Discount percentage

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Custom pricing table
 * Special pricing for specific customers
 */
export const customPricing = sqliteTable('custom_pricing', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  userId: text('user_id').notNull(), // Customer ID
  customPrice: real('custom_price').notNull(), // Special price for this customer

  validFrom: integer('valid_from', { mode: 'timestamp' }),
  validUntil: integer('valid_until', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
});

/**
 * Product Images table
 * Image gallery support for products with multiple images
 */
export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),

  // Image organization
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),

  // Image transformations
  cropArea: text('crop_area'), // JSON: {x, y, width, height}

  // URLs for different sizes
  thumbnailUrl: text('thumbnail_url').notNull(),
  mediumUrl: text('medium_url').notNull(),
  largeUrl: text('large_url').notNull(),
  originalUrl: text('original_url').notNull(),

  // Timestamps
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Product Videos table
 * Support for multiple videos per product with two storage modes (R2 and Cloudflare Stream)
 */
export const productVideos = sqliteTable('product_videos', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  // File information
  filename: text('filename'), // R2 filename (for R2 mode)
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),

  // Video dimensions and duration
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'), // Duration in seconds

  // Video organization
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),

  // Storage mode: 'r2' or 'stream'
  storageMode: text('storage_mode').default('r2').notNull(), // 'r2' | 'stream'

  // Cloudflare Stream specific (for Stream mode)
  streamId: text('stream_id'), // Cloudflare Stream video UID
  streamStatus: text('stream_status'), // 'queued' | 'inprogress' | 'ready' | 'error'

  // URLs for different modes
  originalUrl: text('original_url'), // R2 original video URL
  hlsUrl: text('hls_url'), // Stream HLS manifest URL
  dashUrl: text('dash_url'), // Stream DASH manifest URL
  thumbnailUrl: text('thumbnail_url'), // Stream thumbnail URL
  downloadUrl: text('download_url'), // Download URL (both modes)

  // Timestamps
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Product Locations table
 * Tracks the physical location (rack and bin) of products in warehouses
 * This allows precise location tracking for inventory management
 */
export const productLocations = sqliteTable('product_locations', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  warehouseId: text('warehouse_id').notNull(), // Reference to warehouse (foreign service)
  rack: text('rack'), // Rack identifier (e.g., 'A1', 'B3', 'R-01')
  bin: text('bin'), // Bin identifier within rack (e.g., '01', 'A', 'TOP')

  // Optional additional location details
  zone: text('zone'), // Warehouse zone (e.g., 'Zone A', 'Cold Storage')
  aisle: text('aisle'), // Aisle number/identifier

  // Stock tracking at this specific location
  quantity: integer('quantity').default(0).notNull(), // Quantity at this location

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

/**
 * Variant Locations table
 * Tracks the physical location (rack and bin) of product variants in warehouses
 * Similar to productLocations but for variants
 */
export const variantLocations = sqliteTable('variant_locations', {
  id: text('id').primaryKey(),
  variantId: text('variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'cascade' }),

  warehouseId: text('warehouse_id').notNull(), // Reference to warehouse (foreign service)
  rack: text('rack'), // Rack identifier (e.g., 'A1', 'B3', 'R-01')
  bin: text('bin'), // Bin identifier within rack (e.g., '01', 'A', 'TOP')

  // Optional additional location details
  zone: text('zone'), // Warehouse zone (e.g., 'Zone A', 'Cold Storage')
  aisle: text('aisle'), // Aisle number/identifier

  // Stock tracking at this specific location
  quantity: integer('quantity').default(0).notNull(), // Quantity at this location

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

/**
 * Product UOM Locations table
 * Tracks the physical location and stock of product UOMs (BOX6, CARTON18, etc.) in warehouses
 * This allows multi-warehouse support for different packaging units
 *
 * Example:
 * - Product "Baby Bottle" BOX6 in Jakarta: 6 boxes = 36 PCS
 * - Product "Baby Bottle" BOX6 in Cilangkap: 4 boxes = 24 PCS
 */
export const productUOMLocations = sqliteTable('product_uom_locations', {
  id: text('id').primaryKey(),
  productUOMId: text('product_uom_id')
    .notNull()
    .references(() => productUOMs.id, { onDelete: 'cascade' }),

  warehouseId: text('warehouse_id').notNull(), // Reference to warehouse (foreign service)
  rack: text('rack'), // Rack identifier (e.g., 'A1', 'B3', 'R-01')
  bin: text('bin'), // Bin identifier within rack (e.g., '01', 'A', 'TOP')

  // Optional additional location details
  zone: text('zone'), // Warehouse zone (e.g., 'Zone A', 'Cold Storage')
  aisle: text('aisle'), // Aisle number/identifier

  // Stock tracking at this specific location (in this UOM unit)
  quantity: integer('quantity').default(0).notNull(), // Quantity in this UOM (e.g., 6 boxes, 2 cartons)

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// Types inferred from the schema
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export type UOM = typeof uoms.$inferSelect;
export type InsertUOM = typeof uoms.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type ProductUOM = typeof productUOMs.$inferSelect;
export type InsertProductUOM = typeof productUOMs.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

export type ProductBundle = typeof productBundles.$inferSelect;
export type InsertProductBundle = typeof productBundles.$inferInsert;

export type BundleItem = typeof bundleItems.$inferSelect;
export type InsertBundleItem = typeof bundleItems.$inferInsert;

export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = typeof pricingTiers.$inferInsert;

export type CustomPricing = typeof customPricing.$inferSelect;
export type InsertCustomPricing = typeof customPricing.$inferInsert;

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

export type ProductVideo = typeof productVideos.$inferSelect;
export type InsertProductVideo = typeof productVideos.$inferInsert;

export type ProductLocation = typeof productLocations.$inferSelect;
export type InsertProductLocation = typeof productLocations.$inferInsert;

export type VariantLocation = typeof variantLocations.$inferSelect;
export type InsertVariantLocation = typeof variantLocations.$inferInsert;

export type ProductUOMLocation = typeof productUOMLocations.$inferSelect;
export type InsertProductUOMLocation = typeof productUOMLocations.$inferInsert;
