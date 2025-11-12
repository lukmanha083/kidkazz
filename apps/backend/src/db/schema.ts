import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'supplier', 'buyer'] }).notNull().default('buyer'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  status: text('status', { enum: ['active', 'inactive', 'pending'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  businessLicense: text('business_license'),
  taxId: text('tax_id'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country').notNull().default('US'),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// PRODUCTS & INVENTORY
// ============================================

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: text('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  supplierId: text('supplier_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  shortDescription: text('short_description'),

  // Pricing
  basePrice: real('base_price').notNull(),
  currency: text('currency').notNull().default('USD'),

  // Inventory
  stockQuantity: integer('stock_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(10),

  // Wholesale specific
  minimumOrderQuantity: integer('minimum_order_quantity').notNull().default(1),
  packagingUnit: text('packaging_unit').notNull().default('unit'), // unit, box, pallet, etc.
  unitsPerPackage: integer('units_per_package').notNull().default(1),

  // Product details
  weight: real('weight'), // in kg
  dimensions: text('dimensions'), // JSON: {length, width, height}

  // Status
  status: text('status', { enum: ['draft', 'active', 'inactive', 'discontinued'] }).notNull().default('draft'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),

  // SEO
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: text('alt'),
  displayOrder: integer('display_order').notNull().default(0),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// PRICING TIERS (Bulk Pricing)
// ============================================

export const pricingTiers = sqliteTable('pricing_tiers', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity'), // null means no upper limit
  pricePerUnit: real('price_per_unit').notNull(),
  discountPercent: real('discount_percent').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Custom pricing for specific buyers
export const customPricing = sqliteTable('custom_pricing', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  buyerId: text('buyer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pricePerUnit: real('price_per_unit').notNull(),
  minimumOrderQuantity: integer('minimum_order_quantity'),
  validFrom: integer('valid_from', { mode: 'timestamp' }),
  validUntil: integer('valid_until', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// ORDERS & CHECKOUT
// ============================================

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  buyerId: text('buyer_id').notNull().references(() => users.id),

  // Order totals
  subtotal: real('subtotal').notNull(),
  taxAmount: real('tax_amount').notNull().default(0),
  shippingAmount: real('shipping_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull(),
  currency: text('currency').notNull().default('USD'),

  // Status
  status: text('status', {
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
  }).notNull().default('pending'),
  paymentStatus: text('payment_status', {
    enum: ['pending', 'paid', 'failed', 'refunded', 'partial']
  }).notNull().default('pending'),

  // Payment info (Xendit integration)
  paymentMethod: text('payment_method', {
    enum: ['qris', 'virtual_account', 'manual', 'cod']
  }), // null for unpaid orders
  paymentProvider: text('payment_provider').default('xendit'), // xendit, stripe, manual
  paymentProviderId: text('payment_provider_id'), // Xendit QR ID or VA ID
  paymentDetails: text('payment_details'), // JSON: QR string, VA number, bank_code, etc.
  paymentExpiresAt: integer('payment_expires_at', { mode: 'timestamp' }),
  paidAt: integer('paid_at', { mode: 'timestamp' }),

  // Shipping info
  shippingAddress: text('shipping_address').notNull(), // JSON
  billingAddress: text('billing_address').notNull(), // JSON
  shippingMethod: text('shipping_method'),
  trackingNumber: text('tracking_number'),

  // Dates
  orderDate: integer('order_date', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  shippedAt: integer('shipped_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),

  // Additional info
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),

  sku: text('sku').notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  discountAmount: real('discount_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// QUOTES & RFQ (Request for Quote)
// ============================================

export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  buyerId: text('buyer_id').notNull().references(() => users.id),
  supplierId: text('supplier_id').references(() => users.id),

  status: text('status', {
    enum: ['pending', 'responded', 'accepted', 'rejected', 'expired']
  }).notNull().default('pending'),

  message: text('message'),
  response: text('response'),

  totalAmount: real('total_amount'),
  currency: text('currency').notNull().default('USD'),

  validUntil: integer('valid_until', { mode: 'timestamp' }),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const quoteItems = sqliteTable('quote_items', {
  id: text('id').primaryKey(),
  quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),

  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  requestedPrice: real('requested_price'),
  offeredPrice: real('offered_price'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// ADMIN & ANALYTICS
// ============================================

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(), // e.g., 'product', 'order', 'user'
  resourceId: text('resource_id'),
  details: text('details'), // JSON
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
