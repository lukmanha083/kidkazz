import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Shipments table
 * Tracks shipment orders sent to JET
 */
export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),

  // Order reference
  orderId: text('order_id').unique().notNull(),

  // JET tracking
  jetOrderId: text('jet_order_id').unique(),
  jetAwbNumber: text('jet_awb_number'), // Air Waybill number
  jetCourierCode: text('jet_courier_code'), // e.g., 'jne', 'jnt', 'sicepat'
  jetServiceCode: text('jet_service_code'), // e.g., 'reg', 'yes', 'oke'

  // Shipment details
  status: text('status').notNull(), // 'pending' | 'booked' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed'

  // Sender information
  senderName: text('sender_name').notNull(),
  senderPhone: text('sender_phone').notNull(),
  senderAddress: text('sender_address').notNull(), // JSON string

  // Recipient information
  recipientName: text('recipient_name').notNull(),
  recipientPhone: text('recipient_phone').notNull(),
  recipientAddress: text('recipient_address').notNull(), // JSON string

  // Package details
  weight: real('weight').notNull(), // in grams
  length: real('length'), // in cm
  width: real('width'), // in cm
  height: real('height'), // in cm

  // Pricing
  shippingCost: real('shipping_cost').notNull(),
  insuranceCost: real('insurance_cost').default(0),
  codAmount: real('cod_amount').default(0), // Cash on Delivery amount

  // Items
  itemsDescription: text('items_description'),
  itemsValue: real('items_value'),

  // Tracking
  estimatedDeliveryDate: integer('estimated_delivery_date', { mode: 'timestamp' }),
  pickedUpAt: integer('picked_up_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),

  // Error handling
  failureReason: text('failure_reason'),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Shipping rates cache
 * Caches rate calculations from JET to avoid repeated API calls
 */
export const shippingRates = sqliteTable('shipping_rates', {
  id: text('id').primaryKey(),

  // Location hash for caching
  originCityId: text('origin_city_id').notNull(),
  destinationCityId: text('destination_city_id').notNull(),
  weight: real('weight').notNull(),

  // Courier service
  courierCode: text('courier_code').notNull(),
  serviceName: text('service_name').notNull(),
  serviceDescription: text('service_description'),

  // Pricing
  cost: real('cost').notNull(),
  etdMin: integer('etd_min'), // Estimated delivery in days (minimum)
  etdMax: integer('etd_max'), // Estimated delivery in days (maximum)

  // Cache metadata
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Tracking history table
 * Stores tracking updates from JET webhooks
 */
export const trackingHistory = sqliteTable('tracking_history', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id')
    .notNull()
    .references(() => shipments.id, { onDelete: 'cascade' }),

  status: text('status').notNull(),
  statusDescription: text('status_description'),
  location: text('location'),
  notes: text('notes'),

  receivedBy: text('received_by'), // Name of person who received package
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Types inferred from the schema
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = typeof shippingRates.$inferInsert;

export type TrackingHistory = typeof trackingHistory.$inferSelect;
export type InsertTrackingHistory = typeof trackingHistory.$inferInsert;
