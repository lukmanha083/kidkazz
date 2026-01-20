import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Orders table
 * Stores both retail (B2C) and wholesale (B2B) orders
 */
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').unique().notNull(),

  // Customer information
  userId: text('user_id').notNull(),
  customerType: text('customer_type').notNull(), // 'retail' | 'wholesale'

  // Order details
  status: text('status').notNull(), // 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  totalAmount: real('total_amount').notNull(),
  currency: text('currency').default('IDR').notNull(),

  // Payment
  paymentStatus: text('payment_status').notNull(), // 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: text('payment_method'),

  // Shipping
  shippingAddress: text('shipping_address').notNull(), // JSON string
  shippingMethod: text('shipping_method'),
  shippingCost: real('shipping_cost').default(0),

  // Metadata
  notes: text('notes'),
  metadata: text('metadata'), // JSON string for additional data

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
});

/**
 * Order items table
 * Line items for each order
 */
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),

  // Product information
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  sku: text('sku').notNull(),

  // Pricing
  unitPrice: real('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').default(0),

  // Wholesale-specific
  discountPercentage: real('discount_percentage').default(0),

  // Status
  status: text('status').default('pending').notNull(), // 'pending' | 'reserved' | 'confirmed' | 'cancelled'

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Order status history table
 * Tracks all status changes for audit trail
 */
export const orderStatusHistory = sqliteTable('order_status_history', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),

  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  reason: text('reason'),
  notes: text('notes'),

  changedBy: text('changed_by'),
  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull(),
});

// Types inferred from the schema
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;
