import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Products table
 * Stores product catalog with dual pricing (retail + wholesale)
 */
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  description: text('description'),

  // Pricing
  retailPrice: real('retail_price'), // Null if not available for retail
  basePrice: real('base_price').notNull(), // Wholesale base price

  // Availability
  availableForRetail: integer('available_for_retail', { mode: 'boolean' }).default(false),
  availableForWholesale: integer('available_for_wholesale', { mode: 'boolean' }).default(true),

  // Wholesale settings
  minimumOrderQuantity: integer('minimum_order_quantity').default(1),

  // Status
  status: text('status').default('active'), // 'active' | 'inactive' | 'discontinued'

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
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
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = typeof pricingTiers.$inferInsert;

export type CustomPricing = typeof customPricing.$inferSelect;
export type InsertCustomPricing = typeof customPricing.$inferInsert;
