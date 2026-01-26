import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Chart of Accounts table
 * Stores all GL accounts with hierarchy support
 * Based on Indonesian Trading COA (PSAK-compliant)
 */
export const chartOfAccounts = sqliteTable(
  'chart_of_accounts',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(), // Indonesian name
    nameEn: text('name_en'), // English name
    description: text('description'),
    accountType: text('account_type', {
      enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense'],
    }).notNull(),
    // Account category for detailed classification
    accountCategory: text('account_category', {
      enum: [
        'CURRENT_ASSET',
        'FIXED_ASSET',
        'OTHER_NON_CURRENT_ASSET',
        'CURRENT_LIABILITY',
        'LONG_TERM_LIABILITY',
        'EQUITY',
        'REVENUE',
        'COGS',
        'OPERATING_EXPENSE',
        'OTHER_INCOME_EXPENSE',
        'TAX',
      ],
    }).notNull(),
    normalBalance: text('normal_balance', { enum: ['Debit', 'Credit'] }).notNull(),
    parentAccountId: text('parent_account_id'),
    level: integer('level').notNull().default(0),
    isDetailAccount: integer('is_detail_account', { mode: 'boolean' }).notNull().default(true),
    isSystemAccount: integer('is_system_account', { mode: 'boolean' }).notNull().default(false),
    financialStatementType: text('financial_statement_type', {
      enum: ['BALANCE_SHEET', 'INCOME_STATEMENT'],
    }).notNull(),
    status: text('status', { enum: ['Active', 'Inactive', 'Archived'] })
      .notNull()
      .default('Active'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    codeIdx: index('idx_coa_code').on(table.code),
    accountTypeIdx: index('idx_coa_account_type').on(table.accountType),
    accountCategoryIdx: index('idx_coa_account_category').on(table.accountCategory),
    parentIdx: index('idx_coa_parent').on(table.parentAccountId),
    statusIdx: index('idx_coa_status').on(table.status),
    levelIdx: index('idx_coa_level').on(table.level),
    financialStatementIdx: index('idx_coa_financial_statement').on(table.financialStatementType),
  })
);

/**
 * Journal Entries header table
 * Stores journal entry metadata
 */
export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    entryNumber: text('entry_number').notNull().unique(),
    entryDate: text('entry_date').notNull(),
    description: text('description').notNull(),
    reference: text('reference'),
    notes: text('notes'),
    entryType: text('entry_type', {
      enum: ['Manual', 'System', 'Recurring', 'Adjusting', 'Closing'],
    })
      .notNull()
      .default('Manual'),
    status: text('status', { enum: ['Draft', 'Posted', 'Voided'] })
      .notNull()
      .default('Draft'),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    // Source tracking for system-generated entries
    sourceService: text('source_service'),
    sourceReferenceId: text('source_reference_id'),
    // Audit fields
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    postedBy: text('posted_by'),
    postedAt: text('posted_at'),
    voidedBy: text('voided_by'),
    voidedAt: text('voided_at'),
    voidReason: text('void_reason'),
    updatedAt: text('updated_at').notNull(),
    // Soft delete
    deletedAt: text('deleted_at'),
    deletedBy: text('deleted_by'),
    deleteReason: text('delete_reason'),
  },
  (table) => ({
    entryNumberIdx: index('idx_je_entry_number').on(table.entryNumber),
    entryDateIdx: index('idx_je_entry_date').on(table.entryDate),
    statusIdx: index('idx_je_status').on(table.status),
    entryTypeIdx: index('idx_je_entry_type').on(table.entryType),
    fiscalPeriodIdx: index('idx_je_fiscal_period').on(table.fiscalYear, table.fiscalMonth),
    sourceIdx: index('idx_je_source').on(table.sourceService, table.sourceReferenceId),
    createdByIdx: index('idx_je_created_by').on(table.createdBy),
    deletedIdx: index('idx_je_deleted').on(table.deletedAt),
  })
);

/**
 * Journal Lines table
 * Stores individual debit/credit postings
 */
export const journalLines = sqliteTable(
  'journal_lines',
  {
    id: text('id').primaryKey(),
    journalEntryId: text('journal_entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    lineSequence: integer('line_sequence').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: 'restrict' }),
    direction: text('direction', { enum: ['Debit', 'Credit'] }).notNull(),
    amount: real('amount').notNull(),
    memo: text('memo'),
    // GL Segmentation for analytics
    salesPersonId: text('sales_person_id'),
    warehouseId: text('warehouse_id'),
    salesChannel: text('sales_channel', {
      enum: ['POS', 'Online', 'B2B', 'Marketplace', 'Wholesale'],
    }),
    customerId: text('customer_id'),
    vendorId: text('vendor_id'),
    productId: text('product_id'),
  },
  (table) => ({
    journalEntryIdx: index('idx_jl_journal_entry').on(table.journalEntryId),
    accountIdx: index('idx_jl_account').on(table.accountId),
    directionIdx: index('idx_jl_direction').on(table.direction),
    salesPersonIdx: index('idx_jl_sales_person').on(table.salesPersonId),
    warehouseIdx: index('idx_jl_warehouse').on(table.warehouseId),
    salesChannelIdx: index('idx_jl_sales_channel').on(table.salesChannel),
    customerIdx: index('idx_jl_customer').on(table.customerId),
    vendorIdx: index('idx_jl_vendor').on(table.vendorId),
  })
);

/**
 * Account Balances table (materialized view for performance)
 * Pre-calculated balances per account per fiscal period
 */
export const accountBalances = sqliteTable(
  'account_balances',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => chartOfAccounts.id),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    openingBalance: real('opening_balance').notNull().default(0),
    debitTotal: real('debit_total').notNull().default(0),
    creditTotal: real('credit_total').notNull().default(0),
    closingBalance: real('closing_balance').notNull().default(0),
    lastUpdatedAt: text('last_updated_at').notNull(),
  },
  (table) => ({
    accountPeriodIdx: uniqueIndex('idx_ab_account_period').on(table.accountId, table.fiscalYear, table.fiscalMonth),
    fiscalPeriodIdx: index('idx_ab_fiscal_period').on(table.fiscalYear, table.fiscalMonth),
  })
);

/**
 * Fiscal Periods table
 * Tracks fiscal period status (open/closed)
 */
export const fiscalPeriods = sqliteTable(
  'fiscal_periods',
  {
    id: text('id').primaryKey(),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    status: text('status', { enum: ['Open', 'Closed', 'Locked'] })
      .notNull()
      .default('Open'),
    closedAt: text('closed_at'),
    closedBy: text('closed_by'),
    reopenedAt: text('reopened_at'),
    reopenedBy: text('reopened_by'),
    reopenReason: text('reopen_reason'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    yearMonthIdx: uniqueIndex('idx_fp_year_month').on(table.fiscalYear, table.fiscalMonth),
    statusIdx: index('idx_fp_status').on(table.status),
  })
);

// Type exports for use in repositories
export type ChartOfAccountsRecord = typeof chartOfAccounts.$inferSelect;
export type JournalEntryRecord = typeof journalEntries.$inferSelect;
export type JournalLineRecord = typeof journalLines.$inferSelect;
export type AccountBalanceRecord = typeof accountBalances.$inferSelect;
export type FiscalPeriodRecord = typeof fiscalPeriods.$inferSelect;
