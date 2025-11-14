import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Payments table
 * Stores payment transactions for orders
 */
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),

  // Order reference
  orderId: text('order_id').notNull(),

  // Payment details
  amount: real('amount').notNull(),
  currency: text('currency').default('IDR').notNull(),
  status: text('status').notNull(), // 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

  // Payment method
  method: text('method').notNull(), // 'bank_transfer' | 'e_wallet' | 'credit_card' | 'qris'

  // Xendit integration
  xenditInvoiceId: text('xendit_invoice_id').unique(),
  xenditInvoiceUrl: text('xendit_invoice_url'),
  xenditExternalId: text('xendit_external_id').unique(),

  // Payment metadata
  payerEmail: text('payer_email'),
  payerName: text('payer_name'),
  description: text('description'),

  // Status tracking
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  expiredAt: integer('expired_at', { mode: 'timestamp' }),
  failureReason: text('failure_reason'),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Payment events table
 * Stores webhook events from Xendit
 */
export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),

  eventType: text('event_type').notNull(),
  eventData: text('event_data').notNull(), // JSON string

  processedAt: integer('processed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Refunds table
 * Tracks refund transactions
 */
export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),

  amount: real('amount').notNull(),
  reason: text('reason'),
  status: text('status').notNull(), // 'pending' | 'completed' | 'failed'

  xenditRefundId: text('xendit_refund_id').unique(),

  processedAt: integer('processed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Types inferred from the schema
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type InsertPaymentEvent = typeof paymentEvents.$inferInsert;

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = typeof refunds.$inferInsert;
