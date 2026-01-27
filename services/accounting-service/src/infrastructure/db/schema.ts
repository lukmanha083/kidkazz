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
    // Unique constraint on journal_entry_id + line_sequence
    entryLineSeqIdx: uniqueIndex('idx_jl_entry_line_seq').on(table.journalEntryId, table.lineSequence),
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

// =====================================================
// Asset Accounting Tables
// =====================================================

/**
 * Asset Categories table
 * Defines categories with default depreciation settings
 */
export const assetCategories = sqliteTable(
  'asset_categories',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    // Default Depreciation Settings
    defaultUsefulLifeMonths: integer('default_useful_life_months').notNull(),
    defaultDepreciationMethod: text('default_depreciation_method', {
      enum: ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION'],
    }).notNull(),
    defaultSalvageValuePercent: real('default_salvage_value_percent').notNull().default(0),
    // Accounting Accounts
    assetAccountId: text('asset_account_id').notNull(),
    accumulatedDepreciationAccountId: text('accumulated_depreciation_account_id').notNull(),
    depreciationExpenseAccountId: text('depreciation_expense_account_id').notNull(),
    gainLossOnDisposalAccountId: text('gain_loss_on_disposal_account_id').notNull(),
    // Tax Settings (Indonesian PSAK 16)
    taxUsefulLifeMonths: integer('tax_useful_life_months'),
    taxDepreciationMethod: text('tax_depreciation_method', {
      enum: ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION'],
    }),
    taxAssetGroup: text('tax_asset_group', {
      enum: ['GROUP_1', 'GROUP_2', 'GROUP_3', 'GROUP_4', 'NON_PERMANENT', 'PERMANENT'],
    }),
    // Status
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    // Audit
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex('idx_asset_categories_code').on(table.code),
  })
);

/**
 * Fixed Assets table
 * Main asset register
 */
export const fixedAssets = sqliteTable(
  'fixed_assets',
  {
    id: text('id').primaryKey(),
    assetNumber: text('asset_number').notNull().unique(),
    // Basic Information
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id').notNull().references(() => assetCategories.id),
    // Physical Identification
    serialNumber: text('serial_number'),
    barcode: text('barcode').unique(),
    manufacturer: text('manufacturer'),
    model: text('model'),
    // Location & Assignment
    locationId: text('location_id'),
    departmentId: text('department_id'),
    assignedToUserId: text('assigned_to_user_id'),
    // Acquisition Details
    acquisitionDate: text('acquisition_date').notNull(),
    acquisitionMethod: text('acquisition_method', {
      enum: ['PURCHASE', 'LEASE', 'DONATION', 'TRANSFER', 'CONSTRUCTION'],
    }).notNull(),
    acquisitionCost: real('acquisition_cost').notNull(),
    purchaseOrderId: text('purchase_order_id'),
    supplierId: text('supplier_id'),
    invoiceNumber: text('invoice_number'),
    // Depreciation Settings
    usefulLifeMonths: integer('useful_life_months').notNull(),
    salvageValue: real('salvage_value').notNull().default(0),
    depreciationMethod: text('depreciation_method', {
      enum: ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION'],
    }).notNull(),
    depreciationStartDate: text('depreciation_start_date').notNull(),
    // Current Values
    accumulatedDepreciation: real('accumulated_depreciation').notNull().default(0),
    bookValue: real('book_value').notNull(),
    lastDepreciationDate: text('last_depreciation_date'),
    // Status
    status: text('status', {
      enum: ['DRAFT', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED', 'WRITTEN_OFF', 'SUSPENDED'],
    }).notNull().default('DRAFT'),
    // Disposal Information
    disposalDate: text('disposal_date'),
    disposalMethod: text('disposal_method', {
      enum: ['SALE', 'SCRAP', 'DONATION', 'TRADE_IN', 'THEFT', 'DESTRUCTION'],
    }),
    disposalValue: real('disposal_value'),
    disposalReason: text('disposal_reason'),
    gainLossOnDisposal: real('gain_loss_on_disposal'),
    // Insurance & Warranty
    insurancePolicyNumber: text('insurance_policy_number'),
    insuranceExpiryDate: text('insurance_expiry_date'),
    warrantyExpiryDate: text('warranty_expiry_date'),
    // Physical Verification
    lastVerifiedAt: text('last_verified_at'),
    lastVerifiedBy: text('last_verified_by'),
    // Audit
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (table) => ({
    categoryIdx: index('idx_fixed_assets_category').on(table.categoryId),
    statusIdx: index('idx_fixed_assets_status').on(table.status),
    locationIdx: index('idx_fixed_assets_location').on(table.locationId),
    barcodeIdx: index('idx_fixed_assets_barcode').on(table.barcode),
    numberIdx: index('idx_fixed_assets_number').on(table.assetNumber),
  })
);

/**
 * Depreciation Schedules table
 * Monthly depreciation records per asset
 */
export const depreciationSchedules = sqliteTable(
  'depreciation_schedules',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id').notNull().references(() => fixedAssets.id),
    // Period
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    // Amounts
    openingBookValue: real('opening_book_value').notNull(),
    depreciationAmount: real('depreciation_amount').notNull(),
    closingBookValue: real('closing_book_value').notNull(),
    accumulatedDepreciation: real('accumulated_depreciation').notNull(),
    // Status
    status: text('status', {
      enum: ['SCHEDULED', 'CALCULATED', 'POSTED', 'REVERSED'],
    }).notNull().default('SCHEDULED'),
    // Journal Reference
    journalEntryId: text('journal_entry_id'),
    // Timestamps
    calculatedAt: text('calculated_at').notNull(),
    postedAt: text('posted_at'),
  },
  (table) => ({
    assetIdx: index('idx_depreciation_asset').on(table.assetId),
    periodIdx: index('idx_depreciation_period').on(table.fiscalYear, table.fiscalMonth),
    statusIdx: index('idx_depreciation_status').on(table.status),
    assetPeriodIdx: uniqueIndex('idx_depreciation_asset_period').on(table.assetId, table.fiscalYear, table.fiscalMonth),
  })
);

/**
 * Asset Movements table
 * Tracks location/assignment changes
 */
export const assetMovements = sqliteTable(
  'asset_movements',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id').notNull().references(() => fixedAssets.id),
    // Movement Type
    movementType: text('movement_type', {
      enum: ['TRANSFER', 'ASSIGNMENT', 'DISPOSAL', 'REVALUATION', 'IMPAIRMENT'],
    }).notNull(),
    // Location Change
    fromLocationId: text('from_location_id'),
    toLocationId: text('to_location_id'),
    // Department Change
    fromDepartmentId: text('from_department_id'),
    toDepartmentId: text('to_department_id'),
    // Assignment Change
    fromUserId: text('from_user_id'),
    toUserId: text('to_user_id'),
    // Details
    movementDate: text('movement_date').notNull(),
    reason: text('reason'),
    notes: text('notes'),
    // Audit
    performedBy: text('performed_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    assetIdx: index('idx_movements_asset').on(table.assetId),
    dateIdx: index('idx_movements_date').on(table.movementDate),
  })
);

/**
 * Asset Maintenance table
 * Maintenance records and scheduling
 */
export const assetMaintenance = sqliteTable(
  'asset_maintenance',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id').notNull().references(() => fixedAssets.id),
    // Maintenance Details
    maintenanceType: text('maintenance_type', {
      enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'UPGRADE', 'OVERHAUL'],
    }).notNull(),
    description: text('description').notNull(),
    // Schedule
    scheduledDate: text('scheduled_date'),
    performedDate: text('performed_date'),
    nextScheduledDate: text('next_scheduled_date'),
    // Cost
    cost: real('cost').notNull().default(0),
    isCapitalized: integer('is_capitalized', { mode: 'boolean' }).notNull().default(false),
    extendsUsefulLifeMonths: integer('extends_useful_life_months').default(0),
    // Vendor
    vendorId: text('vendor_id'),
    vendorName: text('vendor_name'),
    invoiceNumber: text('invoice_number'),
    // Status
    status: text('status', {
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    }).notNull().default('SCHEDULED'),
    // Notes
    notes: text('notes'),
    // Audit
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    assetIdx: index('idx_maintenance_asset').on(table.assetId),
    statusIdx: index('idx_maintenance_status').on(table.status),
    scheduledIdx: index('idx_maintenance_scheduled').on(table.scheduledDate),
  })
);

/**
 * Depreciation Runs table
 * Batch depreciation tracking
 */
export const depreciationRuns = sqliteTable(
  'depreciation_runs',
  {
    id: text('id').primaryKey(),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    // Summary
    totalAssets: integer('total_assets').notNull(),
    assetsDepreciated: integer('assets_depreciated').notNull(),
    assetsSkipped: integer('assets_skipped').notNull(),
    totalDepreciation: real('total_depreciation').notNull(),
    // Status
    status: text('status', {
      enum: ['CALCULATED', 'POSTED', 'REVERSED'],
    }).notNull().default('CALCULATED'),
    // Journal Reference
    journalEntryId: text('journal_entry_id'),
    // Timestamps
    calculatedAt: text('calculated_at').notNull(),
    postedAt: text('posted_at'),
    postedBy: text('posted_by'),
  },
  (table) => ({
    periodIdx: uniqueIndex('idx_depreciation_runs_period').on(table.fiscalYear, table.fiscalMonth),
  })
);

// Type exports for use in repositories
export type ChartOfAccountsRecord = typeof chartOfAccounts.$inferSelect;
export type JournalEntryRecord = typeof journalEntries.$inferSelect;
export type JournalLineRecord = typeof journalLines.$inferSelect;
export type AccountBalanceRecord = typeof accountBalances.$inferSelect;
export type FiscalPeriodRecord = typeof fiscalPeriods.$inferSelect;

// Asset Accounting type exports
export type AssetCategoryRecord = typeof assetCategories.$inferSelect;
export type FixedAssetRecord = typeof fixedAssets.$inferSelect;
export type DepreciationScheduleRecord = typeof depreciationSchedules.$inferSelect;
export type AssetMovementRecord = typeof assetMovements.$inferSelect;
export type AssetMaintenanceRecord = typeof assetMaintenance.$inferSelect;
export type DepreciationRunRecord = typeof depreciationRuns.$inferSelect;
