import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Chart of Accounts table
 * Hierarchical account structure following double-entry bookkeeping
 */
export const chartOfAccounts = sqliteTable('chart_of_accounts', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(), // 4-digit code (e.g., "1000", "4010")
  name: text('name').notNull(),
  description: text('description'),

  // Account Type and Classification
  accountType: text('account_type', {
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense'],
  }).notNull(),
  normalBalance: text('normal_balance', {
    enum: ['Debit', 'Credit'],
  }).notNull(),

  // Financial Statement Classification
  // BALANCE_SHEET: Assets (1000-1999), Liabilities (2000-2999), Equity (3000-3999)
  // INCOME_STATEMENT: Revenue (4000-4999), COGS (5000-5999), Expenses (6000-8999)
  financialStatementType: text('financial_statement_type', {
    enum: ['BALANCE_SHEET', 'INCOME_STATEMENT'],
  }).notNull(),

  currency: text('currency').default('IDR').notNull(),

  // Hierarchy (for sub-accounts)
  parentAccountId: text('parent_account_id').references((): any => chartOfAccounts.id, {
    onDelete: 'restrict',
  }),
  level: integer('level').default(0).notNull(), // 0 = top level, 1 = sub, 2 = sub-sub
  isDetailAccount: integer('is_detail_account', { mode: 'boolean' }).default(true).notNull(), // Can post transactions?
  isSystemAccount: integer('is_system_account', { mode: 'boolean' }).default(false).notNull(), // Protected from deletion

  // Status
  status: text('status', {
    enum: ['Active', 'Inactive', 'Archived'],
  })
    .default('Active')
    .notNull(),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

/**
 * Journal Entries table (Header)
 * Represents a complete financial transaction
 */
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  entryNumber: text('entry_number').unique().notNull(), // Auto-generated: "JE-2025-0001"

  // Entry Details
  entryDate: integer('entry_date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  reference: text('reference'), // Invoice #, PO #, Order #, etc.
  notes: text('notes'),

  // Type and Status
  entryType: text('entry_type', {
    enum: ['Manual', 'System', 'Recurring', 'Adjusting', 'Closing'],
  })
    .default('Manual')
    .notNull(),
  status: text('status', {
    enum: ['Draft', 'Posted', 'Voided'],
  })
    .default('Draft')
    .notNull(),

  // Source tracking (which service/module created this entry)
  sourceService: text('source_service'), // 'order-service', 'inventory-service', 'manual'
  sourceReferenceId: text('source_reference_id'), // ID from source service

  // Audit trail
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  postedBy: text('posted_by'),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  voidedBy: text('voided_by'),
  voidedAt: integer('voided_at', { mode: 'timestamp' }),
  voidReason: text('void_reason'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),

  // Soft delete fields (financial records - never hard delete)
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedBy: text('deleted_by'),
  deleteReason: text('delete_reason'),
});

/**
 * Journal Lines table (Individual Debit/Credit Postings)
 * Each line represents one account being debited or credited
 */
export const journalLines = sqliteTable('journal_lines', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id')
    .notNull()
    .references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => chartOfAccounts.id, { onDelete: 'restrict' }),

  // Amount and Direction
  direction: text('direction', {
    enum: ['Debit', 'Credit'],
  }).notNull(),
  amount: real('amount').notNull(), // Always positive, direction determines +/-

  // Line description
  memo: text('memo'),

  // GL Segmentation (for advanced tracking)
  // Segment 1: Sales Person ID (commission tracking)
  salesPersonId: text('sales_person_id'),

  // Segment 2: Warehouse ID (location tracking)
  warehouseId: text('warehouse_id'),

  // Segment 3: Sales Channel (POS, Online, B2B, Marketplace)
  salesChannel: text('sales_channel', {
    enum: ['POS', 'Online', 'B2B', 'Marketplace', 'Wholesale'],
  }),

  // Additional tracking fields
  customerId: text('customer_id'), // Reference to customer (for A/R tracking)
  vendorId: text('vendor_id'), // Reference to vendor (for A/P tracking)
  productId: text('product_id'), // Reference to product (for product-level reporting)

  // Line sequence (for display order)
  lineNumber: integer('line_number').default(0).notNull(),

  // Audit
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Account Balances table (Materialized View for Performance)
 * Stores pre-calculated balances per account per fiscal period
 */
export const accountBalances = sqliteTable('account_balances', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => chartOfAccounts.id, { onDelete: 'cascade' }),

  // Fiscal Period
  fiscalYear: integer('fiscal_year').notNull(),
  fiscalMonth: integer('fiscal_month').notNull(), // 1-12

  // Balances
  openingBalance: real('opening_balance').default(0).notNull(),
  debitTotal: real('debit_total').default(0).notNull(),
  creditTotal: real('credit_total').default(0).notNull(),
  closingBalance: real('closing_balance').default(0).notNull(),

  // Timestamps
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull(),
});

// Type exports
export type Account = typeof chartOfAccounts.$inferSelect;
export type InsertAccount = typeof chartOfAccounts.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = typeof journalLines.$inferInsert;

export type AccountBalance = typeof accountBalances.$inferSelect;
export type InsertAccountBalance = typeof accountBalances.$inferInsert;
