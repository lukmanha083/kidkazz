# Accounting Business Rules Documentation

## Overview

This document describes all business rules implemented in the Accounting Service. The accounting system follows double-entry bookkeeping principles and is designed to maintain financial data integrity.

---

## Fundamental Accounting Principles

### Golden Rule: Double-Entry Bookkeeping

**CRITICAL RULE**: For every journal entry, **DEBITS MUST EQUAL CREDITS**. This is non-negotiable.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOUBLE-ENTRY BOOKKEEPING RULE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Every transaction MUST have:                                               │
│   ✓ At least one DEBIT entry                                                │
│   ✓ At least one CREDIT entry                                               │
│   ✓ Total DEBITS = Total CREDITS                                            │
│                                                                              │
│   This maintains the accounting equation:                                    │
│                                                                              │
│        ASSETS = LIABILITIES + EQUITY                                         │
│                                                                              │
│   Violation of this rule will result in:                                     │
│   ✗ Journal entry rejection                                                 │
│   ✗ Out-of-balance financial statements                                     │
│   ✗ Failed audit                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation**: See Rule 7 for detailed validation logic.

---

### Rule 0: Accrual Accounting Method

**Rule**: The system uses **Accrual Accounting** as the accounting method, NOT cash basis accounting.

**Business Rationale**:
- Provides more accurate picture of financial position
- Required by GAAP/IFRS for most businesses
- Matches revenue with related expenses in the same period
- Better for decision-making and financial analysis

**Accrual vs Cash Basis**:

| Aspect | Accrual Accounting (Used) | Cash Basis (NOT Used) |
|--------|---------------------------|----------------------|
| Revenue Recognition | When earned (goods delivered/service performed) | When cash received |
| Expense Recognition | When incurred (obligation created) | When cash paid |
| Accounts Receivable | Yes - tracks money owed to business | No |
| Accounts Payable | Yes - tracks money owed by business | No |
| Financial Accuracy | More accurate | Less accurate |
| Complexity | Higher | Lower |

**Key Principles**:

1. **Revenue Recognition**: Revenue is recorded when earned, regardless of when payment is received
   ```typescript
   // Order delivered on Jan 15, payment received on Feb 1
   // Revenue recognized: Jan 15 (when earned)

   // Journal Entry on Jan 15:
   // Debit: Accounts Receivable  Rp 1,000,000
   // Credit: Sales Revenue       Rp 1,000,000

   // Journal Entry on Feb 1 (payment received):
   // Debit: Cash/Bank            Rp 1,000,000
   // Credit: Accounts Receivable Rp 1,000,000
   ```

2. **Expense Recognition (Matching Principle)**: Expenses are recorded when incurred, matched with related revenue
   ```typescript
   // Inventory purchased on Jan 10, sold on Jan 20, payment on Feb 5
   // COGS recognized: Jan 20 (when inventory sold, matching with revenue)

   // Journal Entry on Jan 10 (purchase on credit):
   // Debit: Inventory            Rp 500,000
   // Credit: Accounts Payable    Rp 500,000

   // Journal Entry on Jan 20 (sale):
   // Debit: Cost of Goods Sold   Rp 500,000
   // Credit: Inventory           Rp 500,000

   // Journal Entry on Feb 5 (payment):
   // Debit: Accounts Payable     Rp 500,000
   // Credit: Cash/Bank           Rp 500,000
   ```

3. **Prepaid Expenses**: Expenses paid in advance are recognized over the period they benefit
   ```typescript
   // Annual insurance Rp 12,000,000 paid on Jan 1
   // Monthly expense recognition: Rp 1,000,000/month

   // Journal Entry on Jan 1:
   // Debit: Prepaid Insurance    Rp 12,000,000
   // Credit: Cash/Bank           Rp 12,000,000

   // Monthly Journal Entry (Jan 31, Feb 28, etc.):
   // Debit: Insurance Expense    Rp 1,000,000
   // Credit: Prepaid Insurance   Rp 1,000,000
   ```

4. **Accrued Expenses**: Expenses incurred but not yet paid are recorded
   ```typescript
   // Salaries for Jan (Rp 10,000,000) paid on Feb 5
   // Expense recognized: Jan 31 (when incurred)

   // Journal Entry on Jan 31:
   // Debit: Salary Expense       Rp 10,000,000
   // Credit: Salaries Payable    Rp 10,000,000

   // Journal Entry on Feb 5 (payment):
   // Debit: Salaries Payable     Rp 10,000,000
   // Credit: Cash/Bank           Rp 10,000,000
   ```

5. **Unearned Revenue**: Payment received before service/goods delivered is a liability
   ```typescript
   // Customer pays Rp 5,000,000 deposit on Jan 5
   // Goods delivered on Jan 25

   // Journal Entry on Jan 5 (deposit received):
   // Debit: Cash/Bank            Rp 5,000,000
   // Credit: Unearned Revenue    Rp 5,000,000

   // Journal Entry on Jan 25 (goods delivered):
   // Debit: Unearned Revenue     Rp 5,000,000
   // Credit: Sales Revenue       Rp 5,000,000
   ```

**Implementation Notes**:
- All automated journal entries from Order Service follow accrual method
- Revenue is recognized on `OrderCompleted` event, not `PaymentReceived`
- COGS is recognized when inventory is shipped, not when purchased
- Month-end adjusting entries handle prepaid/accrued items

**System Integration**:
```typescript
// Order Service → Accounting Service event handling

// On OrderCompleted (goods shipped):
// - Recognize revenue
// - Recognize COGS
// - Create Accounts Receivable (if not COD)

// On PaymentReceived:
// - Reduce Accounts Receivable
// - Increase Cash/Bank

// On PurchaseReceived:
// - Increase Inventory
// - Create Accounts Payable

// On PurchasePayment:
// - Reduce Accounts Payable
// - Reduce Cash/Bank
```

---

## Chart of Accounts Rules

### Rule 1: Account Code Format

**Rule**: Account code must be a unique 4-digit numeric code.

**Business Rationale**:
- Standardized format for easy identification and sorting
- Follows industry-standard chart of accounts numbering
- Enables hierarchical grouping by range (1000-1999 for Assets, etc.)

**Implementation**:
```typescript
export class AccountCode {
  constructor(public value: string) {
    if (!/^\d{4}$/.test(value)) {
      throw new Error('Account code must be 4 digits');
    }
  }
}
```

**Account Code Ranges**:
```
1000-1999: Assets
  1000-1099: Current Assets (Cash, Bank, Receivables)
  1100-1199: Fixed Assets (Equipment, Property)
  1200-1299: Non-current Assets

2000-2999: Liabilities
  2000-2099: Current Liabilities (Payables, Short-term Debt)
  2100-2199: Long-term Liabilities (Loans, Mortgages)

3000-3999: Equity
  3000-3099: Owner's Equity
  3100-3199: Retained Earnings

4000-4999: Revenue
  4000-4099: Sales Revenue
  4100-4199: Other Income

5000-5999: Cost of Goods Sold (COGS)

6000-7999: Expenses
  6000-6999: Operating Expenses
  7000-7999: Other Expenses
```

**Error Message**: "Account code must be 4 digits"

---

### Rule 2: Account Uniqueness

**Rule**: Account code must be unique across all accounts.

**Business Rationale**: Prevents duplicate accounts and ensures accurate financial reporting.

**Implementation**:
```typescript
const existingAccount = await repository.findByCode(input.code);
if (existingAccount) {
  throw new Error(`Account with code ${input.code} already exists`);
}
```

**Error Message**: "Account with code XXXX already exists"

---

### Rule 3: Detail Account vs Header Account

**Rule**: Only detail accounts (isDetailAccount = true) can have transactions posted to them. Header accounts are for grouping purposes only.

**Business Rationale**:
- Header accounts aggregate sub-account balances
- Prevents posting to summary-level accounts
- Maintains proper hierarchical reporting

**Implementation**:
```typescript
public canPost(): boolean {
  return this.isDetailAccount && this.status === 'Active';
}

// In JournalLine validation
if (!account.canPost()) {
  throw new Error('Cannot post to header account. Select a detail account.');
}
```

**Error Message**: "Cannot post to header account. Select a detail account."

---

### Rule 4: System Account Protection

**Rule**: System accounts (isSystemAccount = true) cannot be deleted or have their account type changed.

**Business Rationale**:
- Protects critical accounts like Retained Earnings
- Ensures system-generated entries always have valid targets
- Prevents accidental corruption of financial structure

**System Accounts**:
- Retained Earnings (3100)
- Suspense Account (if configured)
- Inter-company accounts

**Implementation**:
```typescript
public canDelete(): boolean {
  if (this.isSystemAccount) {
    return false;
  }
  // Also check for existing transactions
  return !this.hasTransactions();
}

public canChangeType(): boolean {
  return !this.isSystemAccount;
}
```

**Error Message**: "Cannot delete or modify system account"

---

### Rule 5: Account Deletion Restrictions

**Rule**: Accounts with existing transactions cannot be deleted.

**Business Rationale**:
- Maintains referential integrity
- Preserves audit trail
- Prevents orphaned journal entries

**Implementation**:
```typescript
const transactionCount = await repository.countTransactionsByAccountId(accountId);
if (transactionCount > 0) {
  throw new Error('Cannot delete account with existing transactions. Deactivate instead.');
}
```

**Solution**: Use account deactivation (status = 'Inactive') instead of deletion.

**Error Message**: "Cannot delete account with existing transactions. Deactivate instead."

---

### Rule 6: Active Account Requirement for Posting

**Rule**: Only active accounts can receive new transactions.

**Business Rationale**: Prevents posting to accounts that are no longer in use.

**Implementation**:
```typescript
if (account.status !== 'Active') {
  throw new Error('Cannot post to inactive account');
}
```

**Error Message**: "Cannot post to inactive account"

---

## Journal Entry Rules

### Rule 7: Balanced Entry Requirement (Fundamental)

**Rule**: Total debits must equal total credits in every journal entry. This is the fundamental principle of double-entry bookkeeping.

**Business Rationale**:
- Ensures accounting equation (Assets = Liabilities + Equity) remains balanced
- Prevents errors in financial statements
- Industry-standard requirement

**Implementation**:
```typescript
public validate(): void {
  const totalDebits = this.lines
    .filter(l => l.direction === 'Debit')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCredits = this.lines
    .filter(l => l.direction === 'Credit')
    .reduce((sum, l) => sum + l.amount, 0);

  // Use tolerance for floating-point precision
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Debits (${totalDebits}) must equal credits (${totalCredits})`
    );
  }
}
```

**Frontend Validation**:
```typescript
const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
// Show balance indicator in UI
// Block submission if not balanced
```

**Error Message**: "Debits must equal credits"

---

### Rule 8: Minimum Journal Lines

**Rule**: Every journal entry must have at least 2 lines (one debit, one credit minimum).

**Business Rationale**:
- Fundamental requirement of double-entry bookkeeping
- Every transaction affects at least two accounts

**Implementation**:
```typescript
if (this.lines.length < 2) {
  throw new Error('Journal entry must have at least 2 lines');
}

const hasDebit = this.lines.some(l => l.direction === 'Debit');
const hasCredit = this.lines.some(l => l.direction === 'Credit');

if (!hasDebit || !hasCredit) {
  throw new Error('Journal entry must have at least one debit and one credit line');
}
```

**Error Message**: "Journal entry must have at least one debit and one credit line"

---

### Rule 9: Positive Amount Requirement

**Rule**: All journal line amounts must be positive. Direction (Debit/Credit) determines the nature of the entry, not negative amounts.

**Business Rationale**:
- Prevents confusion between negative amounts and direction
- Simplifies validation and reporting
- Industry-standard practice

**Implementation**:
```typescript
export class JournalLine {
  constructor(
    public accountId: string,
    public direction: 'Debit' | 'Credit',
    public amount: number,
    public memo?: string
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
  }
}
```

**Error Message**: "Amount must be positive"

---

### Rule 10: Journal Entry Immutability (Posted Entries)

**Rule**: Posted journal entries cannot be edited or deleted. They can only be voided with a reason.

**Business Rationale**:
- Maintains audit trail integrity
- Prevents tampering with financial records
- Regulatory compliance requirement
- Supports forensic accounting

**Implementation**:
```typescript
public canEdit(): boolean {
  return this.status === 'Draft';
}

public canDelete(): boolean {
  return this.status === 'Draft';
}

// Posted entries can only be voided
public void(userId: string, reason: string): void {
  if (this.status !== 'Posted') {
    throw new Error('Can only void posted entries');
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error('Void reason is required');
  }

  this.status = 'Voided';
  this.voidedBy = userId;
  this.voidedAt = new Date();
  this.voidReason = reason;

  // Reverse account balances
  this.addDomainEvent(new JournalEntryVoided(this));
}
```

**Solution for Errors**:
1. Void the incorrect entry (with reason)
2. Create a new correct entry

**Error Message**: "Cannot edit or delete posted entry. Void it instead."

---

### Rule 11: Void Reason Requirement

**Rule**: When voiding a journal entry, a reason must be provided.

**Business Rationale**:
- Audit trail requirement
- Explains why the entry was voided
- Supports internal controls

**Implementation**:
```typescript
public void(userId: string, reason: string): void {
  if (!reason || reason.trim().length < 3) {
    throw new Error('Void reason is required (minimum 3 characters)');
  }
  // ... void logic
}
```

**Error Message**: "Void reason is required (minimum 3 characters)"

---

### Rule 12: Entry Date Validation

**Rule**: Journal entry date must be within a valid fiscal period that is not closed.

**Business Rationale**:
- Prevents backdating entries to closed periods
- Ensures period-end integrity
- Supports audit requirements

**Implementation**:
```typescript
const fiscalPeriod = await fiscalPeriodService.getByDate(entryDate);

if (!fiscalPeriod) {
  throw new Error('Entry date is outside any valid fiscal period');
}

if (fiscalPeriod.status === 'Closed') {
  throw new Error('Cannot post to closed fiscal period');
}
```

**Error Message**: "Cannot post to closed fiscal period"

---

### Rule 13: Draft Status Before Posting

**Rule**: Only draft entries can be posted. Already posted or voided entries cannot be reposted.

**Business Rationale**: Prevents duplicate posting of the same entry.

**Implementation**:
```typescript
public canPost(): boolean {
  return this.status === 'Draft';
}

public post(userId: string): void {
  if (!this.canPost()) {
    throw new Error('Only draft entries can be posted');
  }

  this.validate(); // Ensure balanced

  this.status = 'Posted';
  this.postedBy = userId;
  this.postedAt = new Date();

  this.addDomainEvent(new JournalEntryPosted(this));
}
```

**Error Message**: "Only draft entries can be posted"

---

## Fiscal Period Rules

### Rule 14: Sequential Period Closing

**Rule**: Fiscal periods must be closed in sequence. Cannot close a period if previous periods are still open.

**Business Rationale**:
- Ensures completeness of prior periods
- Prevents gaps in financial records
- Supports proper year-end closing

**Implementation**:
```typescript
public closePeriod(period: FiscalPeriod): void {
  const previousPeriod = period.previous();

  if (previousPeriod && previousPeriod.status !== 'Closed') {
    throw new Error(
      `Cannot close ${period.toString()}. Previous period ${previousPeriod.toString()} is still open.`
    );
  }

  period.status = 'Closed';
  period.closedAt = new Date();
}
```

**Error Message**: "Cannot close period. Previous period is still open."

---

### Rule 15: Reopen Period Restrictions

**Rule**: Once closed, a fiscal period can only be reopened by authorized users with proper justification.

**Business Rationale**:
- Maintains period integrity
- Requires proper authorization
- Audit trail for period reopening

**Implementation**:
```typescript
public reopenPeriod(period: FiscalPeriod, reason: string, authorizedBy: string): void {
  // Check authorization
  if (!userService.hasPermission(authorizedBy, 'reopen_fiscal_period')) {
    throw new Error('User not authorized to reopen fiscal periods');
  }

  if (!reason || reason.length < 10) {
    throw new Error('Detailed reason required to reopen fiscal period');
  }

  period.status = 'Open';
  period.reopenedAt = new Date();
  period.reopenedBy = authorizedBy;
  period.reopenReason = reason;

  this.addDomainEvent(new FiscalPeriodReopened(period, reason, authorizedBy));
}
```

**Error Message**: "User not authorized to reopen fiscal periods"

---

## Financial Statement Rules

### Rule 16: Balance Sheet Equation

**Rule**: Balance Sheet must always balance: Assets = Liabilities + Equity

**Business Rationale**:
- Fundamental accounting equation
- Any imbalance indicates an error
- Validates data integrity

**Implementation**:
```typescript
public generateBalanceSheet(asOf: Date): BalanceSheet {
  const assets = this.getAccountTypeBalance('Asset', asOf);
  const liabilities = this.getAccountTypeBalance('Liability', asOf);
  const equity = this.getAccountTypeBalance('Equity', asOf);

  const isBalanced = Math.abs(assets - (liabilities + equity)) < 0.01;

  if (!isBalanced) {
    console.warn('Balance sheet is out of balance. Data integrity issue detected.');
  }

  return {
    assets,
    liabilities,
    equity,
    isBalanced,
    asOfDate: asOf
  };
}
```

**Validation**: The system should warn but still generate the report, as the imbalance indicates a data issue that needs investigation.

---

### Rule 17: Normal Balance Direction

**Rule**: Each account type has a normal balance direction:
- **Debit Normal**: Assets, Expenses, COGS
- **Credit Normal**: Liabilities, Equity, Revenue

**Business Rationale**:
- Determines how increases/decreases affect the account
- Essential for correct balance calculations
- Industry-standard accounting principle

**Implementation**:
```typescript
const NORMAL_BALANCE: Record<AccountType, 'Debit' | 'Credit'> = {
  Asset: 'Debit',
  Liability: 'Credit',
  Equity: 'Credit',
  Revenue: 'Credit',
  COGS: 'Debit',
  Expense: 'Debit'
};

public getBalance(account: Account): number {
  const normalBalance = NORMAL_BALANCE[account.accountType];

  // For debit-normal accounts: Debits increase, Credits decrease
  // For credit-normal accounts: Credits increase, Debits decrease
  if (normalBalance === 'Debit') {
    return this.totalDebits - this.totalCredits;
  } else {
    return this.totalCredits - this.totalDebits;
  }
}
```

---

## Money and Currency Rules

### Rule 18: Non-Negative Money Amounts

**Rule**: Money values cannot be negative.

**Business Rationale**:
- Negative amounts are handled by direction (Debit/Credit)
- Prevents confusion in reports
- Simplifies calculations

**Implementation**:
```typescript
export class Money {
  constructor(
    public amount: number,
    public currency: string = 'IDR'
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Amount must be a finite number');
    }
  }
}
```

**Error Message**: "Amount cannot be negative"

---

### Rule 19: Currency Consistency

**Rule**: All lines in a journal entry must use the same currency, or proper exchange rates must be applied.

**Business Rationale**:
- Ensures accurate financial reporting
- Multi-currency requires explicit exchange rate handling

**Implementation**:
```typescript
public validate(): void {
  const currencies = [...new Set(this.lines.map(l => l.currency))];

  if (currencies.length > 1) {
    // Multi-currency entry - verify exchange rates are provided
    if (!this.exchangeRate) {
      throw new Error('Exchange rate required for multi-currency entry');
    }
  }
}
```

**Error Message**: "Exchange rate required for multi-currency entry"

---

## Reconciliation Rules

### Rule 20: Bank Reconciliation Requirement

**Rule**: Bank accounts MUST be reconciled monthly against bank statements before closing the fiscal period.

**Business Rationale**:
- Identifies discrepancies between book balance and bank balance
- Detects errors, fraud, or unauthorized transactions
- Ensures accurate cash position reporting
- Required for audit compliance

**Reconciliation Items**:
```
┌─────────────────────────────────────────────────────────────┐
│                    BANK RECONCILIATION                       │
├─────────────────────────────────────────────────────────────┤
│ Bank Statement Balance                        Rp XX,XXX,XXX │
│ + Deposits in Transit (recorded but not yet  │              │
│   cleared by bank)                            Rp X,XXX,XXX  │
│ - Outstanding Checks (issued but not yet     │              │
│   presented to bank)                          Rp X,XXX,XXX  │
│ + Bank Errors (if any)                        Rp X,XXX,XXX  │
│ ─────────────────────────────────────────────────────────── │
│ Adjusted Bank Balance                         Rp XX,XXX,XXX │
│                                                              │
│ Book Balance (GL)                             Rp XX,XXX,XXX │
│ + Interest Income (not yet recorded)          Rp X,XXX,XXX  │
│ - Bank Charges (not yet recorded)             Rp X,XXX,XXX  │
│ + Collections by Bank                         Rp X,XXX,XXX  │
│ - NSF Checks (returned)                       Rp X,XXX,XXX  │
│ + Book Errors (if any)                        Rp X,XXX,XXX  │
│ ─────────────────────────────────────────────────────────── │
│ Adjusted Book Balance                         Rp XX,XXX,XXX │
│                                                              │
│ Adjusted Bank Balance MUST = Adjusted Book Balance          │
└─────────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface BankReconciliation {
  id: string
  bankAccountId: string
  fiscalPeriod: FiscalPeriod
  statementDate: Date
  statementBalance: number
  bookBalance: number
  adjustedBankBalance: number
  adjustedBookBalance: number
  status: 'Draft' | 'Completed' | 'Approved'
  reconciliationItems: ReconciliationItem[]
  completedAt?: Date
  completedBy?: string
  approvedAt?: Date
  approvedBy?: string
}

interface ReconciliationItem {
  type: 'DepositInTransit' | 'OutstandingCheck' | 'BankCharge' |
        'InterestIncome' | 'NSFCheck' | 'BankError' | 'BookError' | 'Other'
  description: string
  amount: number
  adjustsBank: boolean  // true = adjusts bank balance, false = adjusts book balance
  journalEntryId?: string  // For items requiring journal entry
}
```

**Validation**:
```typescript
public validateReconciliation(): void {
  const tolerance = 0.01;  // 1 cent tolerance for rounding

  if (Math.abs(this.adjustedBankBalance - this.adjustedBookBalance) > tolerance) {
    throw new Error(
      `Reconciliation does not balance. ` +
      `Bank: ${this.adjustedBankBalance}, Book: ${this.adjustedBookBalance}`
    );
  }
}
```

**Error Message**: "Bank reconciliation does not balance. Review reconciling items."

---

### Rule 21: Reconciliation Before Period Close

**Rule**: All bank accounts MUST have completed and approved reconciliation before the fiscal period can be closed.

**Business Rationale**:
- Ensures cash accounts are accurate
- Prevents closing with unreconciled differences
- Maintains audit trail integrity

**Implementation**:
```typescript
public async canCloseFiscalPeriod(period: FiscalPeriod): Promise<void> {
  const bankAccounts = await this.accountRepo.findByType('Asset', 'Bank');

  for (const account of bankAccounts) {
    const reconciliation = await this.reconciliationRepo.findByAccountAndPeriod(
      account.id,
      period
    );

    if (!reconciliation) {
      throw new Error(
        `Bank account ${account.name} has no reconciliation for period ${period}`
      );
    }

    if (reconciliation.status !== 'Approved') {
      throw new Error(
        `Bank reconciliation for ${account.name} is not approved`
      );
    }
  }
}
```

**Error Message**: "Cannot close period. Bank reconciliation pending for: [account name]"

---

### Rule 22: Reconciliation Adjusting Entries

**Rule**: Reconciliation items that affect the book balance (bank charges, interest income, etc.) MUST generate adjusting journal entries.

**Business Rationale**:
- Keeps GL in sync with bank
- Records previously unknown transactions
- Maintains balanced books

**Implementation**:
```typescript
// Example: Recording bank charges discovered during reconciliation
async recordReconciliationAdjustments(
  reconciliation: BankReconciliation
): Promise<void> {
  const bookAdjustments = reconciliation.reconciliationItems
    .filter(item => !item.adjustsBank && !item.journalEntryId);

  for (const item of bookAdjustments) {
    const entry = await this.createAdjustingEntry(item);
    item.journalEntryId = entry.id;
  }
}

// Bank charges journal entry:
// Debit: Bank Charges Expense    Rp 50,000
// Credit: Bank - BCA             Rp 50,000

// Interest income journal entry:
// Debit: Bank - BCA              Rp 100,000
// Credit: Interest Income        Rp 100,000
```

---

### Rule 23: Accounts Receivable Reconciliation

**Rule**: Accounts Receivable subsidiary ledger MUST be reconciled to the GL control account monthly.

**Business Rationale**:
- Ensures customer balances match GL total
- Identifies posting errors
- Supports accurate aging reports

**Implementation**:
```typescript
async reconcileAccountsReceivable(asOfDate: Date): Promise<ARReconciliation> {
  // Sum of all customer balances from subsidiary ledger
  const subsidiaryTotal = await this.customerRepo.getTotalOutstandingBalance(asOfDate);

  // GL control account balance
  const glBalance = await this.accountRepo.getBalance(ACCOUNTS.ACCOUNTS_RECEIVABLE, asOfDate);

  const difference = subsidiaryTotal - glBalance;

  return {
    asOfDate,
    subsidiaryTotal,
    glBalance,
    difference,
    isReconciled: Math.abs(difference) < 0.01
  };
}
```

**Reconciliation Process**:
1. Run AR Aging Report (subsidiary ledger)
2. Compare total to GL control account
3. Investigate and resolve differences
4. Document reconciliation

---

### Rule 24: Accounts Payable Reconciliation

**Rule**: Accounts Payable subsidiary ledger MUST be reconciled to the GL control account monthly.

**Business Rationale**:
- Ensures vendor balances match GL total
- Identifies posting errors
- Supports accurate cash planning

**Implementation**:
```typescript
async reconcileAccountsPayable(asOfDate: Date): Promise<APReconciliation> {
  // Sum of all vendor balances from subsidiary ledger
  const subsidiaryTotal = await this.vendorRepo.getTotalOutstandingBalance(asOfDate);

  // GL control account balance
  const glBalance = await this.accountRepo.getBalance(ACCOUNTS.ACCOUNTS_PAYABLE, asOfDate);

  const difference = subsidiaryTotal - glBalance;

  return {
    asOfDate,
    subsidiaryTotal,
    glBalance,
    difference,
    isReconciled: Math.abs(difference) < 0.01
  };
}
```

---

### Rule 25: Inventory Reconciliation

**Rule**: Inventory subsidiary ledger (from Inventory Service) MUST be reconciled to the Inventory GL account monthly.

**Business Rationale**:
- Ensures inventory valuation is accurate
- Identifies discrepancies before financial close
- Critical for COGS accuracy

**Integration**:
```typescript
async reconcileInventory(asOfDate: Date): Promise<InventoryReconciliation> {
  // Get total inventory value from Inventory Service
  const inventoryServiceTotal = await this.inventoryServiceClient
    .getTotalInventoryValue(asOfDate);

  // GL Inventory account balance
  const glBalance = await this.accountRepo.getBalance(ACCOUNTS.INVENTORY, asOfDate);

  const difference = inventoryServiceTotal - glBalance;

  return {
    asOfDate,
    inventoryServiceTotal,
    glBalance,
    difference,
    isReconciled: Math.abs(difference) < 0.01,
    varianceItems: await this.identifyVariances(asOfDate)
  };
}
```

**Variance Investigation**:
- Timing differences (inventory received, not yet invoiced)
- Posting errors
- Stock adjustments not reflected in GL
- Cost method differences

---

## Event-Driven Rules

### Rule 26: Journal Entry Events

**Rule**: The following events must be published for journal entries:
- `JournalEntryCreated` - When draft is created
- `JournalEntryPosted` - When entry is posted
- `JournalEntryVoided` - When entry is voided

**Business Rationale**:
- Enables real-time ledger updates
- Triggers account balance recalculations
- Supports audit logging
- Enables integration with other services

**Implementation**:
```typescript
public post(userId: string): void {
  // ... validation and status update

  this.addDomainEvent(new JournalEntryPosted({
    entryId: this.id,
    entryNumber: this.entryNumber,
    entryDate: this.entryDate,
    lines: this.lines.map(l => ({
      accountId: l.accountId,
      direction: l.direction,
      amount: l.amount
    })),
    postedBy: userId,
    postedAt: new Date()
  }));
}
```

---

### Rule 27: Order Completion Accounting

**Rule**: When an order is completed (OrderCompleted event), automatic journal entries should be created:
- Debit: Accounts Receivable (or Cash for COD)
- Credit: Sales Revenue
- Debit: COGS
- Credit: Inventory

**Business Rationale**:
- Automates routine accounting entries
- Reduces manual data entry errors
- Ensures all sales are recorded

**Implementation**:
```typescript
// Event Handler
async handleOrderCompleted(event: OrderCompleted): Promise<void> {
  const entry = await this.journalEntryService.createEntry(
    event.completedAt,
    `Sale - Order #${event.orderId}`,
    [
      {
        accountId: ACCOUNTS.ACCOUNTS_RECEIVABLE,
        direction: 'Debit',
        amount: event.totalAmount
      },
      {
        accountId: ACCOUNTS.SALES_REVENUE,
        direction: 'Credit',
        amount: event.totalAmount - event.taxAmount
      },
      {
        accountId: ACCOUNTS.SALES_TAX_PAYABLE,
        direction: 'Credit',
        amount: event.taxAmount
      }
    ]
  );

  // Auto-post system-generated entries
  await this.journalEntryService.postEntry(entry.id, 'SYSTEM');
}
```

---

## Cash Flow Rules

### Rule 28: Cash Flow Statement Method

**Rule**: Cash Flow Statement MUST be generated using the **Indirect Method**, starting from Net Income and adjusting for non-cash items.

**Business Rationale**:
- Indirect method is more commonly used and easier to prepare from accrual-based records
- Reconciles accrual-based Net Income to actual cash generated
- Required by Indonesian PSAK 2 (Statement of Cash Flows)

**Indirect Method Structure**:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CASH FLOW STATEMENT (Indirect Method)                      │
│                    Period: January 1 - December 31, 2025                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  OPERATING ACTIVITIES                                                         │
│  ────────────────────────────────────────────────────────────────────────    │
│  Net Income                                              Rp  50,000,000      │
│                                                                               │
│  Adjustments for non-cash items:                                              │
│    + Depreciation Expense                                Rp  12,000,000      │
│    + Amortization Expense                                Rp   2,000,000      │
│    + Loss on Asset Disposal                              Rp   1,000,000      │
│    - Gain on Asset Sale                                  Rp  (2,000,000)     │
│                                                                               │
│  Changes in working capital:                                                  │
│    - Increase in Accounts Receivable                     Rp (10,000,000)     │
│    - Increase in Inventory                               Rp  (5,000,000)     │
│    + Decrease in Prepaid Expenses                        Rp   1,000,000      │
│    + Increase in Accounts Payable                        Rp   8,000,000      │
│    + Increase in Accrued Expenses                        Rp   3,000,000      │
│  ────────────────────────────────────────────────────────────────────────    │
│  Net Cash from Operating Activities                      Rp  60,000,000      │
│                                                                               │
│  INVESTING ACTIVITIES                                                         │
│  ────────────────────────────────────────────────────────────────────────    │
│    - Purchase of Fixed Assets                            Rp (25,000,000)     │
│    + Proceeds from Asset Sale                            Rp   5,000,000      │
│    - Purchase of Investments                             Rp (10,000,000)     │
│  ────────────────────────────────────────────────────────────────────────    │
│  Net Cash from Investing Activities                      Rp (30,000,000)     │
│                                                                               │
│  FINANCING ACTIVITIES                                                         │
│  ────────────────────────────────────────────────────────────────────────    │
│    + Proceeds from Bank Loan                             Rp  20,000,000      │
│    - Loan Repayment                                      Rp  (5,000,000)     │
│    - Dividend Paid                                       Rp (10,000,000)     │
│    + Owner Capital Injection                             Rp  15,000,000      │
│  ────────────────────────────────────────────────────────────────────────    │
│  Net Cash from Financing Activities                      Rp  20,000,000      │
│                                                                               │
│  ════════════════════════════════════════════════════════════════════════    │
│  NET INCREASE IN CASH                                    Rp  50,000,000      │
│  Cash at Beginning of Period                             Rp  30,000,000      │
│  ────────────────────────────────────────────────────────────────────────    │
│  CASH AT END OF PERIOD                                   Rp  80,000,000      │
│  ════════════════════════════════════════════════════════════════════════    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface CashFlowStatement {
  periodFrom: Date
  periodTo: Date

  // Operating Activities
  netIncome: number
  adjustments: CashFlowAdjustment[]
  workingCapitalChanges: WorkingCapitalChange[]
  netCashFromOperating: number

  // Investing Activities
  investingItems: CashFlowItem[]
  netCashFromInvesting: number

  // Financing Activities
  financingItems: CashFlowItem[]
  netCashFromFinancing: number

  // Summary
  netIncreaseInCash: number
  cashAtBeginning: number
  cashAtEnd: number
}

interface CashFlowAdjustment {
  description: string
  amount: number  // Positive = add back, Negative = subtract
  type: 'Depreciation' | 'Amortization' | 'GainLoss' | 'Other'
}

interface WorkingCapitalChange {
  accountName: string
  accountType: 'CurrentAsset' | 'CurrentLiability'
  changeAmount: number  // Positive = increase, Negative = decrease
  cashImpact: number    // Impact on cash (opposite for assets, same for liabilities)
}
```

---

### Rule 29: Cash Flow Activity Classification

**Rule**: All cash transactions MUST be classified into one of three categories: Operating, Investing, or Financing.

**Classification Rules**:

| Activity | Includes | Examples |
|----------|----------|----------|
| **Operating** | Day-to-day business operations | Cash from customers, payments to suppliers, salaries, rent, utilities, taxes |
| **Investing** | Long-term asset transactions | Purchase/sale of equipment, property, investments, loans to others |
| **Financing** | Capital structure changes | Bank loans, loan repayments, owner investments, dividends, stock issuance |

**Account Classification Mapping**:
```typescript
const CASH_FLOW_CLASSIFICATION: Record<string, CashFlowCategory> = {
  // Operating Activities
  '1100': 'Operating',  // Accounts Receivable
  '1200': 'Operating',  // Inventory
  '1300': 'Operating',  // Prepaid Expenses
  '2100': 'Operating',  // Accounts Payable
  '2200': 'Operating',  // Accrued Expenses
  '2300': 'Operating',  // Taxes Payable
  '4000': 'Operating',  // Revenue accounts
  '5000': 'Operating',  // COGS
  '6000': 'Operating',  // Operating Expenses

  // Investing Activities
  '1400': 'Investing',  // Fixed Assets
  '1500': 'Investing',  // Accumulated Depreciation
  '1600': 'Investing',  // Long-term Investments

  // Financing Activities
  '2400': 'Financing',  // Short-term Loans
  '2500': 'Financing',  // Long-term Debt
  '3000': 'Financing',  // Owner's Equity
  '3100': 'Financing',  // Retained Earnings
  '3200': 'Financing',  // Dividends
}
```

**Implementation**:
```typescript
function classifyCashTransaction(
  debitAccount: Account,
  creditAccount: Account
): CashFlowCategory {
  // If cash account is involved, classify based on the other account
  if (isCashAccount(debitAccount)) {
    return CASH_FLOW_CLASSIFICATION[creditAccount.code] || 'Operating';
  }
  if (isCashAccount(creditAccount)) {
    return CASH_FLOW_CLASSIFICATION[debitAccount.code] || 'Operating';
  }

  // Non-cash transaction
  return 'NonCash';
}
```

---

### Rule 30: Cash Position Report

**Rule**: Cash Position Report MUST show real-time cash balances across all cash and bank accounts.

**Business Rationale**:
- Provides immediate visibility into available cash
- Essential for daily cash management decisions
- Supports cash forecasting and planning

**Report Structure**:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CASH POSITION REPORT                                  │
│                         As of: January 16, 2025 14:30 WIB                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  CASH ON HAND                                                                 │
│  ────────────────────────────────────────────────────────────────────────    │
│  Petty Cash - HQ                                         Rp   5,000,000      │
│  Petty Cash - Warehouse 1                                Rp   2,000,000      │
│  POS Cash Drawer - Store 1                               Rp   3,500,000      │
│  POS Cash Drawer - Store 2                               Rp   2,800,000      │
│  ────────────────────────────────────────────────────────────────────────    │
│  Total Cash on Hand                                      Rp  13,300,000      │
│                                                                               │
│  BANK ACCOUNTS                                                                │
│  ────────────────────────────────────────────────────────────────────────    │
│  BCA - Operating Account (1234567890)                    Rp 150,000,000      │
│  BCA - Payroll Account (0987654321)                      Rp  25,000,000      │
│  BRI - Savings (1122334455)                              Rp  80,000,000      │
│  CIMB Niaga - USD Account ($5,000 × 15,500)              Rp  77,500,000      │
│  ────────────────────────────────────────────────────────────────────────    │
│  Total Bank Balances                                     Rp 332,500,000      │
│                                                                               │
│  ════════════════════════════════════════════════════════════════════════    │
│  TOTAL CASH POSITION                                     Rp 345,800,000      │
│  ════════════════════════════════════════════════════════════════════════    │
│                                                                               │
│  RECONCILIATION STATUS                                                        │
│  ────────────────────────────────────────────────────────────────────────    │
│  BCA - Operating: Last reconciled Jan 15, 2025 ✓                             │
│  BCA - Payroll: Last reconciled Jan 15, 2025 ✓                               │
│  BRI - Savings: Last reconciled Jan 10, 2025 ⚠️ (5 days ago)                 │
│  CIMB Niaga: Last reconciled Jan 14, 2025 ✓                                  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface CashPositionReport {
  asOfDateTime: Date

  cashOnHand: CashAccount[]
  totalCashOnHand: number

  bankAccounts: BankAccount[]
  totalBankBalances: number

  totalCashPosition: number

  reconciliationStatus: ReconciliationStatus[]
}

interface CashAccount {
  accountId: string
  accountName: string
  location?: string
  balance: number
  currency: string
}

interface BankAccount {
  accountId: string
  bankName: string
  accountNumber: string
  accountType: 'Operating' | 'Payroll' | 'Savings' | 'ForeignCurrency'
  balance: number
  currency: string
  exchangeRate?: number  // For foreign currency
  balanceInIDR: number
}
```

**API Endpoint**: `GET /api/accounting/reports/cash-position`

---

### Rule 31: Cash Forecast Report

**Rule**: Cash Forecast Report MUST project future cash position based on AR/AP aging and scheduled payments.

**Business Rationale**:
- Predicts cash shortfalls before they occur
- Enables proactive cash management
- Supports payment prioritization decisions

**Forecast Structure**:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CASH FORECAST REPORT                                │
│                    Projection Period: Next 30 Days                            │
│                    Base Date: January 16, 2025                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  CURRENT CASH POSITION                                   Rp 345,800,000      │
│                                                                               │
│  EXPECTED CASH INFLOWS                                                        │
│  ────────────────────────────────────────────────────────────────────────    │
│  Week 1 (Jan 17-23):                                                          │
│    AR Collections (due this week)                        Rp  45,000,000      │
│    Expected POS Sales (avg)                              Rp  35,000,000      │
│  Week 2 (Jan 24-30):                                                          │
│    AR Collections                                        Rp  38,000,000      │
│    Expected POS Sales                                    Rp  35,000,000      │
│  Week 3 (Jan 31 - Feb 6):                                                     │
│    AR Collections                                        Rp  52,000,000      │
│    Expected POS Sales                                    Rp  35,000,000      │
│  Week 4 (Feb 7-13):                                                           │
│    AR Collections                                        Rp  28,000,000      │
│    Expected POS Sales                                    Rp  35,000,000      │
│  ────────────────────────────────────────────────────────────────────────    │
│  Total Expected Inflows                                  Rp 303,000,000      │
│                                                                               │
│  EXPECTED CASH OUTFLOWS                                                       │
│  ────────────────────────────────────────────────────────────────────────    │
│  Week 1 (Jan 17-23):                                                          │
│    AP Payments Due                                       Rp (55,000,000)     │
│    Payroll (Jan 25)                                      Rp      -           │
│    Loan Payment                                          Rp  (5,000,000)     │
│  Week 2 (Jan 24-30):                                                          │
│    AP Payments Due                                       Rp (42,000,000)     │
│    Payroll (Jan 25)                                      Rp (85,000,000)     │
│    Utilities                                             Rp  (8,000,000)     │
│  Week 3 (Jan 31 - Feb 6):                                                     │
│    AP Payments Due                                       Rp (38,000,000)     │
│    Rent Payment                                          Rp (25,000,000)     │
│  Week 4 (Feb 7-13):                                                           │
│    AP Payments Due                                       Rp (30,000,000)     │
│    Tax Payment (Feb 10)                                  Rp (15,000,000)     │
│  ────────────────────────────────────────────────────────────────────────    │
│  Total Expected Outflows                                 Rp(303,000,000)     │
│                                                                               │
│  ════════════════════════════════════════════════════════════════════════    │
│  PROJECTED CASH POSITION                                                      │
│  ────────────────────────────────────────────────────────────────────────    │
│  End of Week 1                                           Rp 365,800,000      │
│  End of Week 2                                           Rp 210,800,000  ⚠️  │
│  End of Week 3                                           Rp 234,800,000      │
│  End of Week 4                                           Rp 252,800,000      │
│  ════════════════════════════════════════════════════════════════════════    │
│                                                                               │
│  ⚠️ ALERTS                                                                    │
│  - Week 2: Cash dips below Rp 250,000,000 (minimum threshold)                │
│  - Recommendation: Accelerate AR collection or delay non-critical AP          │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface CashForecast {
  baseDate: Date
  projectionDays: number
  currentCashPosition: number
  minimumCashThreshold: number

  weeklyProjections: WeeklyProjection[]

  alerts: CashAlert[]
}

interface WeeklyProjection {
  weekNumber: number
  periodStart: Date
  periodEnd: Date

  // Inflows
  arCollections: number
  expectedSales: number
  otherInflows: number
  totalInflows: number

  // Outflows
  apPayments: number
  payroll: number
  loanPayments: number
  utilities: number
  rent: number
  taxes: number
  otherOutflows: number
  totalOutflows: number

  // Net
  netCashFlow: number
  endingCashPosition: number

  // Status
  belowThreshold: boolean
}

interface CashAlert {
  week: number
  type: 'BelowThreshold' | 'NegativeBalance' | 'LargeOutflow'
  message: string
  recommendation: string
}
```

**Forecast Data Sources**:
```typescript
async function generateCashForecast(days: number): Promise<CashForecast> {
  // 1. Get current cash position
  const currentCash = await getCashPosition();

  // 2. Get AR aging for expected collections
  const arAging = await getARAgingReport();

  // 3. Get AP aging for scheduled payments
  const apAging = await getAPAgingReport();

  // 4. Get recurring payments (payroll, rent, loans, utilities)
  const recurringPayments = await getRecurringPayments();

  // 5. Get average daily POS sales (last 30 days)
  const avgDailySales = await getAverageDailySales(30);

  // 6. Build weekly projections
  // ...
}
```

---

### Rule 32: Cash Account Identification

**Rule**: System MUST identify cash and cash equivalent accounts for cash flow reporting.

**Cash Account Codes** (typically 1000-1099):
```typescript
const CASH_ACCOUNTS = {
  // Cash on Hand
  '1010': { name: 'Petty Cash - HQ', type: 'CashOnHand' },
  '1011': { name: 'Petty Cash - Warehouse', type: 'CashOnHand' },
  '1015': { name: 'POS Cash Drawer', type: 'CashOnHand' },

  // Bank Accounts
  '1020': { name: 'BCA - Operating', type: 'BankAccount' },
  '1021': { name: 'BCA - Payroll', type: 'BankAccount' },
  '1022': { name: 'BRI - Savings', type: 'BankAccount' },
  '1025': { name: 'CIMB Niaga - USD', type: 'BankAccount', currency: 'USD' },

  // Cash Equivalents (< 3 months maturity)
  '1030': { name: 'Money Market Fund', type: 'CashEquivalent' },
  '1031': { name: 'Time Deposit (< 3 months)', type: 'CashEquivalent' },
}

function isCashAccount(accountCode: string): boolean {
  return accountCode >= '1010' && accountCode <= '1039';
}

function isCashEquivalent(accountCode: string): boolean {
  return accountCode >= '1030' && accountCode <= '1039';
}
```

---

### Rule 33: Working Capital Change Calculation

**Rule**: Working capital changes MUST be calculated as period-over-period balance changes for cash flow statement.

**Calculation Logic**:
```typescript
interface WorkingCapitalCalculation {
  accountCode: string
  accountName: string
  accountType: 'CurrentAsset' | 'CurrentLiability'
  beginningBalance: number
  endingBalance: number
  change: number  // Ending - Beginning
  cashImpact: number  // Impact on cash flow
}

function calculateWorkingCapitalCashImpact(
  accountType: 'CurrentAsset' | 'CurrentLiability',
  change: number
): number {
  if (accountType === 'CurrentAsset') {
    // Increase in current asset = USE of cash (negative)
    // Decrease in current asset = SOURCE of cash (positive)
    return -change;
  } else {
    // Increase in current liability = SOURCE of cash (positive)
    // Decrease in current liability = USE of cash (negative)
    return change;
  }
}

// Examples:
// AR increased by Rp 10,000,000 → Cash impact: -Rp 10,000,000 (used cash)
// Inventory decreased by Rp 5,000,000 → Cash impact: +Rp 5,000,000 (generated cash)
// AP increased by Rp 8,000,000 → Cash impact: +Rp 8,000,000 (preserved cash)
// Accrued expenses decreased by Rp 3,000,000 → Cash impact: -Rp 3,000,000 (used cash)
```

---

### Rule 34: Cash Flow Reconciliation

**Rule**: Net increase in cash from Cash Flow Statement MUST reconcile with actual change in cash account balances.

**Business Rationale**:
- Validates cash flow statement accuracy
- Identifies missing or misclassified transactions
- Required for audit compliance

**Reconciliation Check**:
```typescript
interface CashFlowReconciliation {
  periodFrom: Date
  periodTo: Date

  // From Cash Flow Statement
  netCashFromOperating: number
  netCashFromInvesting: number
  netCashFromFinancing: number
  netIncreaseInCash: number

  // From Balance Sheet
  cashAtBeginning: number
  cashAtEnd: number
  actualCashChange: number

  // Reconciliation
  difference: number
  isReconciled: boolean

  // If not reconciled, list unclassified items
  unclassifiedItems?: JournalEntry[]
}

function reconcileCashFlow(
  cashFlowStatement: CashFlowStatement,
  beginningCashBalance: number,
  endingCashBalance: number
): CashFlowReconciliation {
  const actualCashChange = endingCashBalance - beginningCashBalance;
  const statementCashChange = cashFlowStatement.netIncreaseInCash;

  const difference = Math.abs(actualCashChange - statementCashChange);
  const isReconciled = difference < 0.01;  // Allow 1 cent tolerance

  if (!isReconciled) {
    console.warn(
      `Cash Flow Statement does not reconcile. ` +
      `Statement: ${statementCashChange}, Actual: ${actualCashChange}`
    );
  }

  return {
    periodFrom: cashFlowStatement.periodFrom,
    periodTo: cashFlowStatement.periodTo,
    netCashFromOperating: cashFlowStatement.netCashFromOperating,
    netCashFromInvesting: cashFlowStatement.netCashFromInvesting,
    netCashFromFinancing: cashFlowStatement.netCashFromFinancing,
    netIncreaseInCash: statementCashChange,
    cashAtBeginning: beginningCashBalance,
    cashAtEnd: endingCashBalance,
    actualCashChange,
    difference,
    isReconciled
  };
}
```

---

### Rule 35: Minimum Cash Threshold Alert

**Rule**: System MUST alert when cash position falls below configured minimum threshold.

**Business Rationale**:
- Prevents cash shortfalls
- Enables proactive liquidity management
- Supports timely financing decisions

**Implementation**:
```typescript
interface CashThresholdConfig {
  minimumCashBalance: number  // e.g., Rp 250,000,000
  warningThreshold: number    // e.g., Rp 300,000,000 (20% above minimum)
  criticalThreshold: number   // e.g., Rp 275,000,000 (10% above minimum)
}

interface CashThresholdAlert {
  level: 'Warning' | 'Critical' | 'Emergency'
  currentBalance: number
  threshold: number
  shortfall: number
  message: string
  recommendations: string[]
  createdAt: Date
}

function checkCashThreshold(
  currentBalance: number,
  config: CashThresholdConfig
): CashThresholdAlert | null {
  if (currentBalance < config.minimumCashBalance) {
    return {
      level: 'Emergency',
      currentBalance,
      threshold: config.minimumCashBalance,
      shortfall: config.minimumCashBalance - currentBalance,
      message: `EMERGENCY: Cash below minimum threshold`,
      recommendations: [
        'Immediately contact bank for credit line',
        'Delay all non-critical payments',
        'Accelerate AR collections',
        'Consider owner capital injection'
      ],
      createdAt: new Date()
    };
  }

  if (currentBalance < config.criticalThreshold) {
    return {
      level: 'Critical',
      currentBalance,
      threshold: config.criticalThreshold,
      shortfall: config.criticalThreshold - currentBalance,
      message: `CRITICAL: Cash approaching minimum threshold`,
      recommendations: [
        'Review and prioritize upcoming payments',
        'Follow up on overdue receivables',
        'Prepare credit line if needed'
      ],
      createdAt: new Date()
    };
  }

  if (currentBalance < config.warningThreshold) {
    return {
      level: 'Warning',
      currentBalance,
      threshold: config.warningThreshold,
      shortfall: config.warningThreshold - currentBalance,
      message: `WARNING: Cash balance declining`,
      recommendations: [
        'Monitor daily cash position',
        'Review AR aging for collection opportunities'
      ],
      createdAt: new Date()
    };
  }

  return null;  // No alert needed
}
```

**Events Published**:
```typescript
// When cash falls below threshold
{
  type: 'CashThresholdBreached',
  timestamp: '2025-01-16T14:30:00Z',
  data: {
    level: 'Critical',
    currentBalance: 260000000,
    threshold: 275000000,
    shortfall: 15000000
  }
}
```

---

## Validation Hierarchy

### Where Rules Are Enforced

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Validation (First Line of Defense)              │
│    - Format validation (4-digit account code)               │
│    - Real-time balance check (debits = credits)             │
│    - Required field validation                              │
│    - User gets immediate feedback                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API Layer Validation (Second Line)                       │
│    - Input schema validation (Zod)                          │
│    - Account existence check                                │
│    - Basic business rules                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Domain Layer Validation (Final Authority)                │
│    - Balance validation (debits = credits)                  │
│    - Account type validation                                │
│    - Fiscal period validation                               │
│    - THIS IS THE SOURCE OF TRUTH                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario 1: Recording a Sale

```typescript
// Sale of Rp 1,500,000 with 11% VAT
POST /api/accounting/journal-entries
{
  "entryDate": "2025-01-15",
  "description": "Sale to Customer ABC - Invoice INV-001",
  "reference": "INV-001",
  "createdBy": "user-123",
  "lines": [
    {
      "accountId": "ACC-1100", // Accounts Receivable
      "direction": "Debit",
      "amount": 1665000       // Including VAT
    },
    {
      "accountId": "ACC-4010", // Sales Revenue
      "direction": "Credit",
      "amount": 1500000
    },
    {
      "accountId": "ACC-2020", // VAT Payable
      "direction": "Credit",
      "amount": 165000
    }
  ]
}

// Total Debits: 1,665,000
// Total Credits: 1,500,000 + 165,000 = 1,665,000 ✅
```

### Scenario 2: Recording an Expense Payment

```typescript
// Monthly rent payment of Rp 5,000,000
POST /api/accounting/journal-entries
{
  "entryDate": "2025-01-01",
  "description": "Monthly rent payment - January 2025",
  "reference": "RENT-2025-01",
  "createdBy": "user-123",
  "lines": [
    {
      "accountId": "ACC-6020", // Rent Expense
      "direction": "Debit",
      "amount": 5000000
    },
    {
      "accountId": "ACC-1020", // Bank - BCA
      "direction": "Credit",
      "amount": 5000000
    }
  ]
}
```

### Scenario 3: Voiding an Incorrect Entry

```typescript
// Step 1: Void the incorrect entry
POST /api/accounting/journal-entries/:entryId/void
{
  "reason": "Incorrect amount posted. Customer ABC invoice was Rp 2,000,000 not Rp 1,500,000",
  "voidedBy": "user-123"
}

// Step 2: Create the correct entry
POST /api/accounting/journal-entries
{
  "entryDate": "2025-01-15",
  "description": "Sale to Customer ABC - Invoice INV-001 (Corrected)",
  "reference": "INV-001-REV",
  "createdBy": "user-123",
  "lines": [
    {
      "accountId": "ACC-1100", // Accounts Receivable
      "direction": "Debit",
      "amount": 2220000       // Corrected amount with VAT
    },
    {
      "accountId": "ACC-4010", // Sales Revenue
      "direction": "Credit",
      "amount": 2000000
    },
    {
      "accountId": "ACC-2020", // VAT Payable
      "direction": "Credit",
      "amount": 220000
    }
  ]
}
```

---

## Troubleshooting

### "Debits must equal credits"

**Cause**: Journal entry lines are not balanced.

**Solution**:
- Review all debit amounts and credit amounts
- Check for typos in amounts
- Use the UI balance indicator to verify before submission

### "Cannot post to header account"

**Cause**: Trying to post to a non-detail account.

**Solution**: Select a detail account (sub-account) instead of the header/parent account.

### "Cannot post to closed fiscal period"

**Cause**: Entry date falls within a closed fiscal period.

**Solution**:
- Change entry date to current open period, OR
- Request authorized user to reopen the period

### "Cannot edit or delete posted entry"

**Cause**: Attempting to modify a posted journal entry.

**Solution**: Void the entry and create a new correct entry.

### "Account with existing transactions cannot be deleted"

**Cause**: Account has journal lines posted to it.

**Solution**: Deactivate the account instead of deleting.

---

## Rule Testing

### Unit Tests for Domain Rules

```typescript
describe('JournalEntry', () => {
  it('should not allow posting with unbalanced lines', () => {
    const entry = JournalEntry.create({
      entryDate: new Date(),
      description: 'Test entry',
      lines: [
        { accountId: 'ACC-1', direction: 'Debit', amount: 100 },
        { accountId: 'ACC-2', direction: 'Credit', amount: 50 }
      ]
    });

    expect(() => entry.validate()).toThrow('Debits must equal credits');
  });

  it('should not allow editing posted entry', () => {
    const entry = JournalEntry.create({...});
    entry.post('user-1');

    expect(entry.canEdit()).toBe(false);
  });

  it('should require void reason', () => {
    const entry = JournalEntry.create({...});
    entry.post('user-1');

    expect(() => entry.void('user-1', '')).toThrow('Void reason is required');
  });
});

describe('Account', () => {
  it('should not allow posting to header account', () => {
    const account = Account.create({
      code: '1000',
      name: 'Cash',
      isDetailAccount: false
    });

    expect(account.canPost()).toBe(false);
  });

  it('should not allow deleting system account', () => {
    const account = Account.create({
      code: '3100',
      name: 'Retained Earnings',
      isSystemAccount: true
    });

    expect(account.canDelete()).toBe(false);
  });
});
```

---

## Rule Change Process

### How to Add/Modify Accounting Rules

1. **Document** the rule in this file first
2. **Implement** in domain layer (JournalEntry/Account/FiscalPeriod entity)
3. **Add** to use case if needed
4. **Update** frontend validation
5. **Write** tests for the rule
6. **Update** API documentation
7. **Notify** accounting team of business rule changes

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when new rules are added
**Related Docs**:
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md)
- [Accounting Tutorial](./ACCOUNTING_TUTORIAL.md)
- [Accounting Research](./ACCOUNTING_RESEARCH.md)
