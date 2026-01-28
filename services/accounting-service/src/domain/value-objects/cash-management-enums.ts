/**
 * Bank Account Type - Types of bank accounts
 */
export enum BankAccountType {
  OPERATING = 'OPERATING',
  PAYROLL = 'PAYROLL',
  SAVINGS = 'SAVINGS',
  FOREIGN_CURRENCY = 'FOREIGN_CURRENCY',
}

/**
 * Bank Account Status - Status of bank accounts
 */
export enum BankAccountStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  CLOSED = 'Closed',
}

/**
 * Bank Transaction Type - Debit or Credit
 */
export enum BankTransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

/**
 * Bank Transaction Match Status
 */
export enum BankTransactionMatchStatus {
  UNMATCHED = 'UNMATCHED',
  MATCHED = 'MATCHED',
  EXCLUDED = 'EXCLUDED',
}

/**
 * Bank Reconciliation Status - Workflow status
 */
export enum ReconciliationStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
}

/**
 * Reconciliation Item Type - Types of reconciling items
 */
export enum ReconciliationItemType {
  OUTSTANDING_CHECK = 'OUTSTANDING_CHECK',
  DEPOSIT_IN_TRANSIT = 'DEPOSIT_IN_TRANSIT',
  BANK_FEE = 'BANK_FEE',
  BANK_INTEREST = 'BANK_INTEREST',
  NSF_CHECK = 'NSF_CHECK',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Reconciliation Item Status
 */
export enum ReconciliationItemStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  VOIDED = 'VOIDED',
}

/**
 * Cash Alert Level - Threshold alert levels per Rule 35
 */
export enum CashAlertLevel {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING', // Below Rp 300M
  CRITICAL = 'CRITICAL', // Below Rp 275M
  EMERGENCY = 'EMERGENCY', // Below Rp 250M
}

/**
 * Cash Flow Activity Type - Per PSAK 2 (Rule 28)
 */
export enum CashFlowActivityType {
  OPERATING = 'OPERATING',
  INVESTING = 'INVESTING',
  FINANCING = 'FINANCING',
}
