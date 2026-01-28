import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
    entryLineSeqIdx: uniqueIndex('idx_jl_entry_line_seq').on(
      table.journalEntryId,
      table.lineSequence
    ),
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
    accountPeriodIdx: uniqueIndex('idx_ab_account_period').on(
      table.accountId,
      table.fiscalYear,
      table.fiscalMonth
    ),
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
    categoryId: text('category_id')
      .notNull()
      .references(() => assetCategories.id),
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
    })
      .notNull()
      .default('DRAFT'),
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
    assetId: text('asset_id')
      .notNull()
      .references(() => fixedAssets.id),
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
    })
      .notNull()
      .default('SCHEDULED'),
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
    assetPeriodIdx: uniqueIndex('idx_depreciation_asset_period').on(
      table.assetId,
      table.fiscalYear,
      table.fiscalMonth
    ),
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
    assetId: text('asset_id')
      .notNull()
      .references(() => fixedAssets.id),
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
    assetId: text('asset_id')
      .notNull()
      .references(() => fixedAssets.id),
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
    })
      .notNull()
      .default('SCHEDULED'),
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
    })
      .notNull()
      .default('CALCULATED'),
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

// =====================================================
// Cash Management Tables
// =====================================================

/**
 * Bank Accounts table
 * Links bank accounts to GL accounts for reconciliation
 */
export const bankAccounts = sqliteTable(
  'bank_accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: 'restrict' }),
    bankName: text('bank_name').notNull(),
    accountNumber: text('account_number').notNull(),
    accountType: text('account_type', {
      enum: ['OPERATING', 'PAYROLL', 'SAVINGS', 'FOREIGN_CURRENCY'],
    }).notNull(),
    currency: text('currency').notNull().default('IDR'),
    status: text('status', { enum: ['Active', 'Inactive', 'Closed'] })
      .notNull()
      .default('Active'),
    lastReconciledDate: text('last_reconciled_date'),
    lastReconciledBalance: real('last_reconciled_balance'),
    // Audit
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    // Unique constraints to prevent duplicate bank accounts
    accountIdUniq: uniqueIndex('idx_bank_accounts_account_id_uniq').on(table.accountId),
    accountNumberUniq: uniqueIndex('idx_bank_accounts_number_uniq').on(table.accountNumber),
    bankNameIdx: index('idx_bank_accounts_bank_name').on(table.bankName),
    statusIdx: index('idx_bank_accounts_status').on(table.status),
    accountTypeIdx: index('idx_bank_accounts_type').on(table.accountType),
  })
);

/**
 * Bank Statements table
 * Imported bank statement headers
 */
export const bankStatements = sqliteTable(
  'bank_statements',
  {
    id: text('id').primaryKey(),
    bankAccountId: text('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'restrict' }),
    statementDate: text('statement_date').notNull(),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    openingBalance: real('opening_balance').notNull(),
    closingBalance: real('closing_balance').notNull(),
    totalDebits: real('total_debits').notNull().default(0),
    totalCredits: real('total_credits').notNull().default(0),
    transactionCount: integer('transaction_count').notNull().default(0),
    // Import tracking
    importSource: text('import_source'),
    importedAt: text('imported_at').notNull(),
    importedBy: text('imported_by'),
    // Audit
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    bankAccountIdx: index('idx_bank_statements_account').on(table.bankAccountId),
    statementDateIdx: index('idx_bank_statements_date').on(table.statementDate),
    periodIdx: index('idx_bank_statements_period').on(table.periodStart, table.periodEnd),
  })
);

/**
 * Bank Transactions table
 * Individual statement lines with fingerprints for duplicate detection
 */
export const bankTransactions = sqliteTable(
  'bank_transactions',
  {
    id: text('id').primaryKey(),
    bankStatementId: text('bank_statement_id')
      .notNull()
      .references(() => bankStatements.id, { onDelete: 'cascade' }),
    bankAccountId: text('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'restrict' }),
    transactionDate: text('transaction_date').notNull(),
    postDate: text('post_date'),
    description: text('description').notNull(),
    reference: text('reference'),
    amount: real('amount').notNull(),
    transactionType: text('transaction_type', {
      enum: ['DEBIT', 'CREDIT'],
    }).notNull(),
    runningBalance: real('running_balance'),
    // Duplicate detection fingerprint
    fingerprint: text('fingerprint').notNull(),
    // Matching status
    matchStatus: text('match_status', {
      enum: ['UNMATCHED', 'MATCHED', 'EXCLUDED'],
    })
      .notNull()
      .default('UNMATCHED'),
    matchedJournalLineId: text('matched_journal_line_id'),
    matchedAt: text('matched_at'),
    matchedBy: text('matched_by'),
    // Audit
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    bankStatementIdx: index('idx_bank_transactions_statement').on(table.bankStatementId),
    bankAccountIdx: index('idx_bank_transactions_account').on(table.bankAccountId),
    transactionDateIdx: index('idx_bank_transactions_date').on(table.transactionDate),
    fingerprintIdx: uniqueIndex('idx_bank_transactions_fingerprint').on(table.fingerprint),
    matchStatusIdx: index('idx_bank_transactions_match_status').on(table.matchStatus),
    matchedJournalIdx: index('idx_bank_transactions_matched_journal').on(
      table.matchedJournalLineId
    ),
  })
);

/**
 * Bank Reconciliations table
 * Reconciliation records per period
 */
export const bankReconciliations = sqliteTable(
  'bank_reconciliations',
  {
    id: text('id').primaryKey(),
    bankAccountId: text('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'restrict' }),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    // Balances
    statementEndingBalance: real('statement_ending_balance').notNull(),
    bookEndingBalance: real('book_ending_balance').notNull(),
    // Adjusted balances
    adjustedBankBalance: real('adjusted_bank_balance'),
    adjustedBookBalance: real('adjusted_book_balance'),
    // Reconciliation counts
    totalTransactions: integer('total_transactions').notNull().default(0),
    matchedTransactions: integer('matched_transactions').notNull().default(0),
    unmatchedTransactions: integer('unmatched_transactions').notNull().default(0),
    // Status workflow
    status: text('status', {
      enum: ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED'],
    })
      .notNull()
      .default('DRAFT'),
    // Workflow timestamps
    completedAt: text('completed_at'),
    completedBy: text('completed_by'),
    approvedAt: text('approved_at'),
    approvedBy: text('approved_by'),
    // Notes
    notes: text('notes'),
    // Audit
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    bankAccountIdx: index('idx_bank_reconciliations_account').on(table.bankAccountId),
    fiscalPeriodIdx: index('idx_bank_reconciliations_period').on(
      table.fiscalYear,
      table.fiscalMonth
    ),
    statusIdx: index('idx_bank_reconciliations_status').on(table.status),
    accountPeriodIdx: uniqueIndex('idx_bank_reconciliations_account_period').on(
      table.bankAccountId,
      table.fiscalYear,
      table.fiscalMonth
    ),
  })
);

/**
 * Reconciliation Items table
 * Outstanding checks, deposits in transit, adjustments
 */
export const reconciliationItems = sqliteTable(
  'reconciliation_items',
  {
    id: text('id').primaryKey(),
    reconciliationId: text('reconciliation_id')
      .notNull()
      .references(() => bankReconciliations.id, { onDelete: 'cascade' }),
    itemType: text('item_type', {
      enum: [
        'OUTSTANDING_CHECK',
        'DEPOSIT_IN_TRANSIT',
        'BANK_FEE',
        'BANK_INTEREST',
        'NSF_CHECK',
        'ADJUSTMENT',
      ],
    }).notNull(),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    transactionDate: text('transaction_date').notNull(),
    reference: text('reference'),
    // Whether this item requires a journal entry
    requiresJournalEntry: integer('requires_journal_entry', { mode: 'boolean' })
      .notNull()
      .default(false),
    journalEntryId: text('journal_entry_id'),
    // Status
    status: text('status', {
      enum: ['PENDING', 'CLEARED', 'VOIDED'],
    })
      .notNull()
      .default('PENDING'),
    clearedAt: text('cleared_at'),
    clearedInReconciliationId: text('cleared_in_reconciliation_id'),
    // Audit
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by'),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    reconciliationIdx: index('idx_reconciliation_items_reconciliation').on(table.reconciliationId),
    itemTypeIdx: index('idx_reconciliation_items_type').on(table.itemType),
    statusIdx: index('idx_reconciliation_items_status').on(table.status),
    transactionDateIdx: index('idx_reconciliation_items_date').on(table.transactionDate),
  })
);

/**
 * Cash Threshold Configuration table
 * Warning/critical/emergency thresholds for cash alerts
 */
export const cashThresholdConfig = sqliteTable(
  'cash_threshold_config',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    // Threshold amounts (in IDR)
    warningThreshold: real('warning_threshold').notNull(),
    criticalThreshold: real('critical_threshold').notNull(),
    emergencyThreshold: real('emergency_threshold').notNull(),
    // Alert settings
    enableAlerts: integer('enable_alerts', { mode: 'boolean' }).notNull().default(true),
    alertEmailRecipients: text('alert_email_recipients'), // JSON array of emails
    // Active flag
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    // Audit
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    nameIdx: uniqueIndex('idx_cash_threshold_config_name').on(table.name),
    isActiveIdx: index('idx_cash_threshold_config_active').on(table.isActive),
  })
);

// =====================================================
// Event-Driven Integration Tables
// =====================================================

/**
 * Domain Events table (Outbox pattern)
 * Stores events to be published reliably
 */
export const domainEvents = sqliteTable(
  'domain_events',
  {
    id: text('id').primaryKey(),
    eventType: text('event_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    payload: text('payload').notNull(), // JSON
    occurredAt: text('occurred_at').notNull(),
    publishedAt: text('published_at'),
    status: text('status', { enum: ['pending', 'published', 'failed'] })
      .notNull()
      .default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    statusIdx: index('idx_domain_events_status').on(table.status),
    eventTypeIdx: index('idx_domain_events_type').on(table.eventType),
    aggregateIdx: index('idx_domain_events_aggregate').on(table.aggregateType, table.aggregateId),
    occurredAtIdx: index('idx_domain_events_occurred').on(table.occurredAt),
  })
);

/**
 * Processed Events table (Idempotency tracking)
 * Tracks events that have been processed to prevent duplicates
 */
export const processedEvents = sqliteTable(
  'processed_events',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    processedAt: text('processed_at').notNull(),
    result: text('result', { enum: ['success', 'failed', 'skipped'] }).notNull(),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    eventIdIdx: uniqueIndex('idx_processed_events_event_id').on(table.eventId),
    eventTypeIdx: index('idx_processed_events_type').on(table.eventType),
    resultIdx: index('idx_processed_events_result').on(table.result),
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

// Cash Management type exports
export type BankAccountRecord = typeof bankAccounts.$inferSelect;
export type BankStatementRecord = typeof bankStatements.$inferSelect;
export type BankTransactionRecord = typeof bankTransactions.$inferSelect;
export type BankReconciliationRecord = typeof bankReconciliations.$inferSelect;
export type ReconciliationItemRecord = typeof reconciliationItems.$inferSelect;
export type CashThresholdConfigRecord = typeof cashThresholdConfig.$inferSelect;

// =====================================================
// Multi-Currency Support Tables
// =====================================================

/**
 * Currencies table
 * Stores supported currencies with ISO 4217 codes
 */
export const currencies = sqliteTable(
  'currencies',
  {
    code: text('code').primaryKey(), // ISO 4217: USD, IDR, SGD
    name: text('name').notNull(),
    symbol: text('symbol').notNull(),
    decimalPlaces: integer('decimal_places').notNull().default(2),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    isBaseCurrency: integer('is_base_currency', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    activeIdx: index('idx_currencies_active').on(table.isActive),
    baseIdx: index('idx_currencies_base').on(table.isBaseCurrency),
  })
);

/**
 * Exchange Rates table
 * Historical exchange rates for currency conversion
 */
export const exchangeRates = sqliteTable(
  'exchange_rates',
  {
    id: text('id').primaryKey(),
    fromCurrency: text('from_currency')
      .notNull()
      .references(() => currencies.code, { onDelete: 'restrict' }),
    toCurrency: text('to_currency')
      .notNull()
      .references(() => currencies.code, { onDelete: 'restrict' }),
    rate: real('rate').notNull(),
    effectiveDate: text('effective_date').notNull(),
    source: text('source', { enum: ['manual', 'api', 'bank'] }),
    createdBy: text('created_by'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    fromIdx: index('idx_exchange_rates_from').on(table.fromCurrency),
    toIdx: index('idx_exchange_rates_to').on(table.toCurrency),
    dateIdx: index('idx_exchange_rates_date').on(table.effectiveDate),
    uniqueIdx: uniqueIndex('idx_exchange_rates_unique').on(
      table.fromCurrency,
      table.toCurrency,
      table.effectiveDate
    ),
  })
);

/**
 * Currency Revaluations table
 * Tracks month-end foreign currency revaluation
 */
export const currencyRevaluations = sqliteTable(
  'currency_revaluations',
  {
    id: text('id').primaryKey(),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    revaluationDate: text('revaluation_date').notNull(),
    status: text('status', { enum: ['draft', 'posted', 'reversed'] })
      .notNull()
      .default('draft'),
    totalUnrealizedGain: real('total_unrealized_gain').notNull().default(0),
    totalUnrealizedLoss: real('total_unrealized_loss').notNull().default(0),
    netGainLoss: real('net_gain_loss').notNull().default(0),
    journalEntryId: text('journal_entry_id'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    postedBy: text('posted_by'),
    postedAt: text('posted_at'),
  },
  (table) => ({
    periodIdx: index('idx_currency_revaluations_period').on(table.fiscalYear, table.fiscalMonth),
    statusIdx: index('idx_currency_revaluations_status').on(table.status),
  })
);

/**
 * Currency Revaluation Lines table
 * Individual account revaluation details
 */
export const currencyRevaluationLines = sqliteTable(
  'currency_revaluation_lines',
  {
    id: text('id').primaryKey(),
    revaluationId: text('revaluation_id')
      .notNull()
      .references(() => currencyRevaluations.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: 'restrict' }),
    currency: text('currency')
      .notNull()
      .references(() => currencies.code, { onDelete: 'restrict' }),
    foreignBalance: real('foreign_balance').notNull(),
    originalRate: real('original_rate').notNull(),
    newRate: real('new_rate').notNull(),
    originalBaseAmount: real('original_base_amount').notNull(),
    newBaseAmount: real('new_base_amount').notNull(),
    gainLoss: real('gain_loss').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    revaluationIdx: index('idx_revaluation_lines_revaluation').on(table.revaluationId),
    accountIdx: index('idx_revaluation_lines_account').on(table.accountId),
  })
);

// Event-Driven Integration type exports
export type DomainEventRecord = typeof domainEvents.$inferSelect;
export type ProcessedEventRecord = typeof processedEvents.$inferSelect;

// =====================================================
// Budget Management Tables
// =====================================================

/**
 * Budgets table
 */
export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    status: text('status', { enum: ['draft', 'approved', 'locked'] })
      .notNull()
      .default('draft'),
    approvedBy: text('approved_by'),
    approvedAt: text('approved_at'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    fiscalYearIdx: index('idx_budgets_fiscal_year').on(table.fiscalYear),
    statusIdx: index('idx_budgets_status').on(table.status),
    yearNameIdx: uniqueIndex('idx_budgets_year_name').on(table.fiscalYear, table.name),
  })
);

/**
 * Budget Lines table
 */
export const budgetLines = sqliteTable(
  'budget_lines',
  {
    id: text('id').primaryKey(),
    budgetId: text('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: 'restrict' }),
    fiscalMonth: integer('fiscal_month').notNull(),
    amount: real('amount').notNull().default(0),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    budgetIdx: index('idx_budget_lines_budget').on(table.budgetId),
    accountIdx: index('idx_budget_lines_account').on(table.accountId),
    uniqueIdx: uniqueIndex('idx_budget_lines_unique').on(
      table.budgetId,
      table.accountId,
      table.fiscalMonth
    ),
  })
);

/**
 * Budget Revisions table
 */
export const budgetRevisions = sqliteTable(
  'budget_revisions',
  {
    id: text('id').primaryKey(),
    budgetLineId: text('budget_line_id')
      .notNull()
      .references(() => budgetLines.id, { onDelete: 'cascade' }),
    previousAmount: real('previous_amount').notNull(),
    newAmount: real('new_amount').notNull(),
    reason: text('reason').notNull(),
    revisedBy: text('revised_by').notNull(),
    revisedAt: text('revised_at').notNull(),
  },
  (table) => ({
    lineIdx: index('idx_budget_revisions_line').on(table.budgetLineId),
    dateIdx: index('idx_budget_revisions_date').on(table.revisedAt),
  })
);

// Multi-Currency type exports
export type CurrencyRecord = typeof currencies.$inferSelect;
export type ExchangeRateRecord = typeof exchangeRates.$inferSelect;
export type CurrencyRevaluationRecord = typeof currencyRevaluations.$inferSelect;
export type CurrencyRevaluationLineRecord = typeof currencyRevaluationLines.$inferSelect;

// Budget type exports
export type BudgetRecord = typeof budgets.$inferSelect;
export type BudgetLineRecord = typeof budgetLines.$inferSelect;
export type BudgetRevisionRecord = typeof budgetRevisions.$inferSelect;

// =====================================================
// Audit Trail & Compliance Tables
// =====================================================

/**
 * Audit Logs table
 * Comprehensive audit trail for all entity changes
 */
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    timestamp: text('timestamp').notNull(),
    userId: text('user_id').notNull(),
    userName: text('user_name'),
    action: text('action', {
      enum: ['CREATE', 'UPDATE', 'DELETE', 'VOID', 'APPROVE', 'POST', 'CLOSE', 'REOPEN'],
    }).notNull(),
    entityType: text('entity_type').notNull(), // JournalEntry, Account, FiscalPeriod, etc.
    entityId: text('entity_id').notNull(),
    oldValues: text('old_values'), // JSON
    newValues: text('new_values'), // JSON
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: text('metadata'), // Additional context JSON
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    entityIdx: index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    userIdx: index('idx_audit_logs_user').on(table.userId),
    timestampIdx: index('idx_audit_logs_timestamp').on(table.timestamp),
    actionIdx: index('idx_audit_logs_action').on(table.action),
  })
);

/**
 * Tax Summary table
 * Period tax summaries for Indonesian tax compliance
 */
export const taxSummary = sqliteTable(
  'tax_summary',
  {
    id: text('id').primaryKey(),
    fiscalYear: integer('fiscal_year').notNull(),
    fiscalMonth: integer('fiscal_month').notNull(),
    taxType: text('tax_type', {
      enum: ['PPN', 'PPH21', 'PPH23', 'PPH4_2'],
    }).notNull(),
    grossAmount: real('gross_amount').notNull().default(0),
    taxAmount: real('tax_amount').notNull().default(0),
    netAmount: real('net_amount').notNull().default(0),
    transactionCount: integer('transaction_count').notNull().default(0),
    calculatedAt: text('calculated_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    periodIdx: index('idx_tax_summary_period').on(table.fiscalYear, table.fiscalMonth),
    typeIdx: index('idx_tax_summary_type').on(table.taxType),
    uniqueIdx: uniqueIndex('idx_tax_summary_unique').on(
      table.fiscalYear,
      table.fiscalMonth,
      table.taxType
    ),
  })
);

/**
 * Archived Data table
 * Tracks data archival for retention policy compliance
 */
export const archivedData = sqliteTable(
  'archived_data',
  {
    id: text('id').primaryKey(),
    archiveType: text('archive_type').notNull(), // journal_entries, audit_logs
    fiscalYear: integer('fiscal_year').notNull(),
    recordCount: integer('record_count').notNull(),
    archivePath: text('archive_path'), // Cloud storage path
    archivedAt: text('archived_at').notNull(),
    archivedBy: text('archived_by').notNull(),
    checksum: text('checksum').notNull(), // Data integrity verification
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    typeIdx: index('idx_archived_data_type').on(table.archiveType, table.fiscalYear),
    archivedAtIdx: index('idx_archived_data_at').on(table.archivedAt),
  })
);

// Audit Trail type exports
export type AuditLogRecord = typeof auditLogs.$inferSelect;
export type TaxSummaryRecord = typeof taxSummary.$inferSelect;
export type ArchivedDataRecord = typeof archivedData.$inferSelect;
