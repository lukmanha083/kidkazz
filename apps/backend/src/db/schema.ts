import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'supplier', 'wholesale_buyer', 'retail_buyer'] }).notNull().default('retail_buyer'),
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
  basePrice: real('base_price').notNull(), // Base wholesale price
  currency: text('currency').notNull().default('USD'),

  // Retail/Wholesale Availability
  availableForRetail: integer('available_for_retail', { mode: 'boolean' }).notNull().default(true),
  availableForWholesale: integer('available_for_wholesale', { mode: 'boolean' }).notNull().default(true),

  // Retail Pricing (for retail customers)
  retailPrice: real('retail_price'), // Can be null if not available for retail
  retailDiscountPercent: real('retail_discount_percent').default(0),

  // Inventory
  stockQuantity: integer('stock_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(10),

  // Wholesale specific
  minimumOrderQuantity: integer('minimum_order_quantity').notNull().default(1), // MOQ for wholesale only
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
// WAREHOUSE & INVENTORY MANAGEMENT
// ============================================

export const warehouses = sqliteTable('warehouses', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  postalCode: text('postal_code').notNull(),
  phone: text('phone').notNull(),
  manager: text('manager').notNull(),
  rack: text('rack'),
  bin: text('bin'),
  status: text('status', { enum: ['Active', 'Inactive'] }).notNull().default('Active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  productSKU: text('product_sku').notNull(),
  variantName: text('variant_name').notNull(),
  variantSKU: text('variant_sku').notNull().unique(),
  variantType: text('variant_type', { enum: ['Color', 'Size', 'Material', 'Style'] }).notNull(),
  price: real('price').notNull(),
  stock: integer('stock').notNull().default(0),
  status: text('status', { enum: ['Active', 'Inactive'] }).notNull().default('Active'),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const warehouseStock = sqliteTable('warehouse_stock', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(0),
  rack: text('rack'),
  bin: text('bin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const stockTransfers = sqliteTable('stock_transfers', {
  id: text('id').primaryKey(),
  transferNumber: text('transfer_number').notNull().unique(),
  sourceWarehouseId: text('source_warehouse_id').notNull().references(() => warehouses.id),
  destinationWarehouseId: text('destination_warehouse_id').notNull().references(() => warehouses.id),
  totalItems: integer('total_items').notNull(),
  status: text('status', { enum: ['Completed', 'Pending', 'Cancelled'] }).notNull().default('Pending'),
  transferredBy: text('transferred_by').notNull(),
  transferDate: integer('transfer_date', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const stockTransferItems = sqliteTable('stock_transfer_items', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull().references(() => stockTransfers.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// ============================================
// ACCOUNTING & FINANCE
// ============================================

// Chart of Accounts - Defines all accounts used in the system
export const chartOfAccounts = sqliteTable('chart_of_accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // 4-digit code (e.g., 1000, 2000)
  name: text('name').notNull(), // Account name (e.g., "Cash", "Accounts Payable")
  accountType: text('account_type', {
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense']
  }).notNull(),
  accountSubType: text('account_sub_type'), // e.g., "Current Asset", "Fixed Asset"
  parentAccountId: text('parent_account_id').references((): any => chartOfAccounts.id, { onDelete: 'set null' }),
  description: text('description'),
  taxType: text('tax_type'), // Tax treatment (e.g., "Taxable", "Non-taxable")
  isSystemAccount: integer('is_system_account', { mode: 'boolean' }).notNull().default(false), // System-managed accounts
  isDetailAccount: integer('is_detail_account', { mode: 'boolean' }).notNull().default(true), // Can have transactions
  status: text('status', { enum: ['Active', 'Inactive', 'Archived'] }).notNull().default('Active'),
  currency: text('currency').notNull().default('IDR'),
  normalBalance: text('normal_balance', { enum: ['Debit', 'Credit'] }).notNull(), // Normal balance for this account type
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Journal Entries - Header for all accounting transactions
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  entryNumber: text('entry_number').notNull().unique(), // JE-2024-0001
  entryDate: integer('entry_date', { mode: 'timestamp' }).notNull(), // Transaction date
  description: text('description').notNull(),
  reference: text('reference'), // External reference (invoice #, receipt #, etc.)
  entryType: text('entry_type', {
    enum: ['Manual', 'System', 'Recurring', 'Adjusting', 'Closing']
  }).notNull().default('Manual'),
  status: text('status', { enum: ['Draft', 'Posted', 'Voided'] }).notNull().default('Draft'),
  sourceModule: text('source_module'), // e.g., "Sales", "Purchase", "Inventory"
  sourceId: text('source_id'), // ID from source module (order_id, invoice_id, etc.)
  fiscalYear: integer('fiscal_year').notNull(),
  fiscalPeriod: integer('fiscal_period').notNull(), // Month (1-12)
  createdBy: text('created_by').notNull().references(() => users.id),
  postedBy: text('posted_by').references(() => users.id),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  voidedBy: text('voided_by').references(() => users.id),
  voidedAt: integer('voided_at', { mode: 'timestamp' }),
  voidReason: text('void_reason'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Journal Lines - Individual debit/credit entries
export const journalLines = sqliteTable('journal_lines', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(), // Order of lines in the entry
  accountId: text('account_id').notNull().references(() => chartOfAccounts.id),
  direction: text('direction', { enum: ['Debit', 'Credit'] }).notNull(),
  amount: real('amount').notNull(), // Always positive, direction determines debit/credit
  currency: text('currency').notNull().default('IDR'),
  exchangeRate: real('exchange_rate').notNull().default(1.0),
  amountInBaseCurrency: real('amount_in_base_currency').notNull(), // amount * exchangeRate
  description: text('description'), // Line-specific description
  taxAmount: real('tax_amount').default(0),
  taxCode: text('tax_code'),
  dimension1: text('dimension1'), // For dimensional analysis (department, project, etc.)
  dimension2: text('dimension2'),
  dimension3: text('dimension3'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Account Balances - Materialized view for performance (updated by triggers or batch jobs)
export const accountBalances = sqliteTable('account_balances', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => chartOfAccounts.id, { onDelete: 'cascade' }),
  fiscalYear: integer('fiscal_year').notNull(),
  fiscalPeriod: integer('fiscal_period').notNull(),
  openingBalance: real('opening_balance').notNull().default(0),
  debitAmount: real('debit_amount').notNull().default(0),
  creditAmount: real('credit_amount').notNull().default(0),
  closingBalance: real('closing_balance').notNull().default(0),
  currency: text('currency').notNull().default('IDR'),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Fiscal Periods - Define fiscal year and periods
export const fiscalPeriods = sqliteTable('fiscal_periods', {
  id: text('id').primaryKey(),
  fiscalYear: integer('fiscal_year').notNull(),
  periodNumber: integer('period_number').notNull(), // 1-12 for monthly, 1-4 for quarterly
  periodName: text('period_name').notNull(), // e.g., "January 2024", "Q1 2024"
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['Open', 'Closed', 'Locked'] }).notNull().default('Open'),
  closedBy: text('closed_by').references(() => users.id),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Budget Entries - For budget vs actual reporting
export const budgetEntries = sqliteTable('budget_entries', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => chartOfAccounts.id),
  fiscalYear: integer('fiscal_year').notNull(),
  fiscalPeriod: integer('fiscal_period').notNull(),
  budgetAmount: real('budget_amount').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Tax Codes - For tax handling
export const taxCodes = sqliteTable('tax_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  rate: real('rate').notNull(), // Tax rate as percentage
  taxType: text('tax_type', { enum: ['Sales', 'Purchase', 'Both'] }).notNull(),
  accountId: text('account_id').references(() => chartOfAccounts.id), // Tax payable/receivable account
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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
