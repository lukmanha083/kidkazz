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

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Products table
 * Simplified for MVP - matches Product domain entity
 */
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  description: text('description').notNull(),

  // Pricing
  retailPrice: real('retail_price'), // Nullable for wholesale-only products
  wholesalePrice: real('wholesale_price').notNull(), // Base wholesale price

  // Availability
  availableForRetail: integer('available_for_retail', { mode: 'boolean' }).notNull(),
  availableForWholesale: integer('available_for_wholesale', { mode: 'boolean' }).notNull(),

  // Wholesale settings
  minimumOrderQuantity: integer('minimum_order_quantity').notNull().default(1),

  // Status
  status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'discontinued'

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
  updatedAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Product Bundles table
 * Bundled product packages with discounts
 */
export const productBundles = sqliteTable('product_bundles', {
  id: text('id').primaryKey(),
  bundleName: text('bundle_name').notNull(),
  bundleSKU: text('bundle_sku').unique().notNull(),
  bundleDescription: text('bundle_description'),
  bundleImage: text('bundle_image'),

  // Pricing
  bundlePrice: real('bundle_price').notNull(), // Final bundle price
  discountPercentage: real('discount_percentage').notNull(), // Discount %

  // Availability
  status: text('status').default('active').notNull(), // 'active' | 'inactive'
  availableStock: integer('available_stock').default(0).notNull(),

  // Dates
  startDate: text('start_date'), // ISO date string
  endDate: text('end_date'), // ISO date string

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
