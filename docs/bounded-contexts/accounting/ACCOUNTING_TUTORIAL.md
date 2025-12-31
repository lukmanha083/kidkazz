# Accounting Module Tutorial

This comprehensive guide shows you how to build a complete accounting system with Chart of Accounts, Journal Entries, Ledger, and Financial Statements.

## Table of Contents
1. [System Overview](#system-overview)
2. [Backend Setup](#backend-setup)
3. [Frontend Components](#frontend-components)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

## System Overview

### Architecture

The accounting system follows double-entry bookkeeping principles:

```
Chart of Accounts (COA)
    ↓
Journal Entries (Header)
    ↓
Journal Lines (Debit/Credit)
    ↓
General Ledger (Aggregated)
    ↓
Financial Statements (Reports)
```

### Key Features

- ✅ Chart of Accounts with hierarchical structure
- ✅ Double-entry journal entries with validation
- ✅ General Ledger with running balances
- ✅ Income Statement (Profit & Loss)
- ✅ Balance Sheet
- ✅ Audit trail with posting/voiding
- ✅ Multi-currency support
- ✅ Fiscal period management

## Backend Setup

### 1. Database Migration

The schema has been added to `apps/backend/src/db/schema.ts`. Apply migrations:

```bash
cd apps/backend

# Local development
npx wrangler d1 migrations create kidkazz_db add_accounting_tables
npx wrangler d1 migrations apply kidkazz_db --local

# Production
npx wrangler d1 migrations apply kidkazz_db
```

### 2. Seed Initial Chart of Accounts

Create `migrations/seed_chart_of_accounts.sql`:

```sql
-- Assets (1000-1999)
INSERT INTO chart_of_accounts (id, code, name, accountType, accountSubType, normalBalance, isDetailAccount, status, currency, createdAt, updatedAt)
VALUES
  ('ACC-1000', '1000', 'Cash and Cash Equivalents', 'Asset', 'Current Asset', 'Debit', 0, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1010', '1010', 'Petty Cash', 'Asset', 'Current Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1020', '1020', 'Bank - BCA', 'Asset', 'Current Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1030', '1030', 'Bank - Mandiri', 'Asset', 'Current Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

  ('ACC-1100', '1100', 'Accounts Receivable', 'Asset', 'Current Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1200', '1200', 'Inventory', 'Asset', 'Current Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1300', '1300', 'Prepaid Expenses', 'Asset', 'Current Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

  ('ACC-1500', '1500', 'Fixed Assets', 'Asset', 'Fixed Asset', 'Debit', 0, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1510', '1510', 'Equipment', 'Asset', 'Fixed Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1520', '1520', 'Furniture and Fixtures', 'Asset', 'Fixed Asset', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-1530', '1530', 'Accumulated Depreciation', 'Asset', 'Fixed Asset', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

-- Liabilities (2000-2999)
  ('ACC-2000', '2000', 'Current Liabilities', 'Liability', 'Current Liability', 'Credit', 0, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-2010', '2010', 'Accounts Payable', 'Liability', 'Current Liability', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-2020', '2020', 'Sales Tax Payable', 'Liability', 'Current Liability', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-2030', '2030', 'Payroll Liabilities', 'Liability', 'Current Liability', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

  ('ACC-2100', '2100', 'Long-term Liabilities', 'Liability', 'Long-term Liability', 'Credit', 0, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-2110', '2110', 'Long-term Loans', 'Liability', 'Long-term Liability', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

-- Equity (3000-3999)
  ('ACC-3000', '3000', 'Owner\'s Equity', 'Equity', 'Equity', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-3100', '3100', 'Retained Earnings', 'Equity', 'Equity', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-3200', '3200', 'Owner Draws', 'Equity', 'Equity', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

-- Revenue (4000-4999)
  ('ACC-4000', '4000', 'Revenue', 'Revenue', 'Operating Revenue', 'Credit', 0, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-4010', '4010', 'Sales Revenue', 'Revenue', 'Operating Revenue', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-4020', '4020', 'Service Revenue', 'Revenue', 'Operating Revenue', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-4100', '4100', 'Other Income', 'Revenue', 'Other Income', 'Credit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

-- COGS (5000-5999)
  ('ACC-5000', '5000', 'Cost of Goods Sold', 'COGS', 'COGS', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

-- Expenses (6000-7999)
  ('ACC-6000', '6000', 'Operating Expenses', 'Expense', 'Operating Expense', 'Debit', 0, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6010', '6010', 'Salaries and Wages', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6020', '6020', 'Rent Expense', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6030', '6030', 'Utilities Expense', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6040', '6040', 'Marketing and Advertising', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6050', '6050', 'Office Supplies', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6060', '6060', 'Insurance Expense', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6070', '6070', 'Depreciation Expense', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),
  ('ACC-6080', '6080', 'Bank Fees', 'Expense', 'Operating Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch()),

  ('ACC-7000', '7000', 'Other Expenses', 'Expense', 'Other Expense', 'Debit', 1, 'Active', 'IDR', unixepoch(), unixepoch());
```

Run the seed:

```bash
# Local
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/your-db.sqlite < migrations/seed_chart_of_accounts.sql

# Production
npx wrangler d1 execute kidkazz_db --file=./migrations/seed_chart_of_accounts.sql
```

### 3. Test API Endpoints

```bash
# Get all accounts
curl http://localhost:8787/api/accounting/accounts

# Get active accounts only
curl http://localhost:8787/api/accounting/accounts/active

# Create journal entry
curl -X POST http://localhost:8787/api/accounting/journal-entries \
  -H "Content-Type: application/json" \
  -d '{
    "entryDate": "2024-11-18",
    "description": "Initial cash deposit",
    "reference": "DEP-001",
    "createdBy": "user-123",
    "lines": [
      {
        "accountId": "ACC-1020",
        "direction": "Debit",
        "amount": 10000000,
        "description": "Cash deposit to BCA"
      },
      {
        "accountId": "ACC-3000",
        "direction": "Credit",
        "amount": 10000000,
        "description": "Owner capital contribution"
      }
    ]
  }'

# Generate Income Statement
curl "http://localhost:8787/api/accounting/reports/income-statement?from=2024-01-01&to=2024-12-31"

# Generate Balance Sheet
curl "http://localhost:8787/api/accounting/reports/balance-sheet?asOf=2024-11-18"
```

## Frontend Components

### File Structure

```
apps/erp-dashboard/src/routes/dashboard/accounting/
├── index.tsx                    # Dashboard overview
├── chart-of-accounts.tsx       # COA management
├── journal-entries.tsx         # Journal entry list
├── journal-entry-form.tsx      # Create/edit journal entry
├── ledger.tsx                  # General ledger viewer
└── reports/
    ├── income-statement.tsx    # P&L report
    └── balance-sheet.tsx       # Balance sheet
```

### Component Examples

Due to length constraints, here are the component templates. Use them as a starting point:

#### 1. Chart of Accounts Component

**File:** `apps/erp-dashboard/src/routes/dashboard/accounting/chart-of-accounts.tsx`

**Key Features:**
- List all accounts grouped by type
- Create/Edit/Delete accounts
- Filter by account type and status
- Hierarchical display (parent-child)
- Validation: Prevent deletion if account has transactions

**UI Structure:**
```
[Filter: Type] [Filter: Status] [Search] [+ Add Account]

Assets (1000-1999)
  1000 - Cash and Cash Equivalents (Header)
    1010 - Petty Cash [$1,000]
    1020 - Bank - BCA [$50,000]
  1100 - Accounts Receivable [$25,000]

Liabilities (2000-2999)
  ...
```

#### 2. Journal Entry Form Component

**File:** `apps/erp-dashboard/src/routes/dashboard/accounting/journal-entry-form.tsx`

**Key Features:**
- Multi-line entry with add/remove lines
- Account selector (dropdown/autocomplete)
- Auto-calculate total debits/credits
- Show balance indicator (must be 0)
- Save as Draft or Post immediately
- Copy from previous entry

**UI Structure:**
```
Entry Date: [____]  Reference: [____]
Description: [________________________]

Lines:
┌──────────────┬────────┬─────────┬─────────┬───────┐
│ Account      │ Desc   │  Debit  │ Credit  │ [Del] │
├──────────────┼────────┼─────────┼─────────┼───────┤
│ 1020-Bank BCA│ Deposit│ 1000000 │         │  [X]  │
│ 3000-Equity  │ Capital│         │ 1000000 │  [X]  │
└──────────────┴────────┴─────────┴─────────┴───────┘

              Total:   1000000    1000000   ✓ Balanced

[+ Add Line]  [Save Draft]  [Post Entry]
```

#### 3. General Ledger Component

**File:** `apps/erp-dashboard/src/routes/dashboard/accounting/ledger.tsx`

**Key Features:**
- Select account to view
- Date range filter
- Show running balance
- Click entry to view full journal entry
- Export to CSV/PDF

**UI Structure:**
```
Account: [1020 - Bank - BCA ▼]
Period: [2024-01-01] to [2024-12-31]  [Apply]

Opening Balance:                     $0

┌─────────┬──────────┬─────────────┬────────┬────────┬─────────┐
│  Date   │ Entry #  │ Description │ Debit  │ Credit │ Balance │
├─────────┼──────────┼─────────────┼────────┼────────┼─────────┤
│ 01/15   │ JE-001   │ Initial dep │  10000 │        │  10000  │
│ 01/20   │ JE-005   │ Payment     │        │   2000 │   8000  │
│ 02/01   │ JE-012   │ Deposit     │   5000 │        │  13000  │
└─────────┴──────────┴─────────────┴────────┴────────┴─────────┘

Closing Balance:                  $13,000
```

#### 4. Income Statement Component

**File:** `apps/erp-dashboard/src/routes/dashboard/accounting/reports/income-statement.tsx`

**Key Features:**
- Period selector (MTD, QTD, YTD, Custom)
- Hierarchical account display
- Percentage calculations
- Export functionality
- Compare periods (Budget vs Actual)

**UI Structure:**
```
INCOME STATEMENT
For the Period: January 1, 2024 - November 18, 2024

REVENUE
  Sales Revenue                    $150,000
  Service Revenue                   $50,000
  Other Income                       $5,000
                                  ─────────
Total Revenue                      $205,000

COST OF GOODS SOLD
  Cost of Goods Sold                $80,000
                                  ─────────
GROSS PROFIT                       $125,000  (61%)

OPERATING EXPENSES
  Salaries and Wages                $40,000
  Rent Expense                      $12,000
  Utilities                          $3,000
  Marketing                          $8,000
  Other Operating Expenses          $10,000
                                  ─────────
Total Operating Expenses            $73,000
                                  ─────────
NET INCOME                          $52,000  (25%)
```

#### 5. Balance Sheet Component

**File:** `apps/erp-dashboard/src/routes/dashboard/accounting/reports/balance-sheet.tsx`

**Key Features:**
- As-of date selector
- Compare dates (Month-over-Month)
- Drill-down to account detail
- Export to PDF/Excel

**UI Structure:**
```
BALANCE SHEET
As of November 18, 2024

ASSETS
  Current Assets
    Cash and Cash Equivalents       $50,000
    Accounts Receivable             $25,000
    Inventory                       $30,000
  Total Current Assets             $105,000

  Fixed Assets
    Equipment                       $40,000
    Less: Accumulated Depreciation  ($8,000)
  Total Fixed Assets                $32,000
                                  ─────────
TOTAL ASSETS                       $137,000

LIABILITIES
  Current Liabilities
    Accounts Payable                $15,000
    Sales Tax Payable                $2,000
  Total Current Liabilities         $17,000

  Long-term Liabilities
    Long-term Loans                 $30,000
                                  ─────────
TOTAL LIABILITIES                   $47,000

EQUITY
  Owner's Equity                    $50,000
  Retained Earnings                 $40,000
                                  ─────────
TOTAL EQUITY                        $90,000

TOTAL LIABILITIES & EQUITY         $137,000  ✓
```

## Usage Examples

### Example 1: Recording a Sale

```typescript
// Sale of $1,500 with 10% tax
await accountingApi.journalEntries.create({
  entryDate: '2024-11-18',
  description: 'Sale to Customer ABC',
  reference: 'INV-001',
  createdBy: 'user-123',
  lines: [
    {
      accountId: 'ACC-1100', // Accounts Receivable
      direction: 'Debit',
      amount: 1650, // Including tax
    },
    {
      accountId: 'ACC-4010', // Sales Revenue
      direction: 'Credit',
      amount: 1500,
    },
    {
      accountId: 'ACC-2020', // Sales Tax Payable
      direction: 'Credit',
      amount: 150,
    },
  ],
});
```

### Example 2: Recording an Expense

```typescript
// Rent payment of $1,200
await accountingApi.journalEntries.create({
  entryDate: '2024-11-01',
  description: 'Monthly rent payment',
  reference: 'RENT-NOV',
  createdBy: 'user-123',
  lines: [
    {
      accountId: 'ACC-6020', // Rent Expense
      direction: 'Debit',
      amount: 1200,
    },
    {
      accountId: 'ACC-1020', // Bank - BCA
      direction: 'Credit',
      amount: 1200,
    },
  ],
});
```

### Example 3: Recording Purchase Inventory

```typescript
// Purchase inventory $5,000
await accountingApi.journalEntries.create({
  entryDate: '2024-11-10',
  description: 'Purchase inventory from Supplier XYZ',
  reference: 'PO-123',
  createdBy: 'user-123',
  lines: [
    {
      accountId: 'ACC-1200', // Inventory
      direction: 'Debit',
      amount: 5000,
    },
    {
      accountId: 'ACC-2010', // Accounts Payable
      direction: 'Credit',
      amount: 5000,
    },
  ],
});
```

## Best Practices

### 1. Data Validation

```typescript
// Always validate debits = credits
const validateJournalEntry = (lines: JournalLine[]): boolean => {
  const totalDebits = lines
    .filter(l => l.direction === 'Debit')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCredits = lines
    .filter(l => l.direction === 'Credit')
    .reduce((sum, l) => sum + l.amount, 0);

  return Math.abs(totalDebits - totalCredits) < 0.01; // Account for rounding
};
```

### 2. Immutability

```typescript
// Never delete posted entries - void them instead
const voidEntry = async (entryId: string) => {
  await accountingApi.journalEntries.void(
    entryId,
    currentUserId,
    'Entry voided due to error'
  );

  // Optionally create reversing entry
  // This creates a new entry with opposite signs
};
```

### 3. Audit Trail

```typescript
// Always track who created/modified entries
const journalEntry = {
  ...data,
  createdBy: currentUser.id,
  createdAt: new Date(),
  // System automatically tracks posted_by when posting
};
```

### 4. Error Handling

```typescript
try {
  const result = await accountingApi.journalEntries.create(data);
  toast.success('Journal entry created successfully');
} catch (error) {
  if (error.message.includes('Debits must equal credits')) {
    toast.error('Entry is not balanced. Please check amounts.');
  } else if (error.message.includes('Account not found')) {
    toast.error('Invalid account selected');
  } else {
    toast.error('Failed to create entry');
  }
}
```

### 5. Performance Optimization

```typescript
// Use account balances table for reporting instead of aggregating journal lines
// This table is updated when entries are posted

// Bad - Slow for large datasets
const balance = await db
  .select({ sum: sql`SUM(amount)` })
  .from(journalLines)
  .where(eq(journalLines.accountId, accountId));

// Good - Fast with materialized view
const balance = await db
  .select()
  .from(accountBalances)
  .where(and(
    eq(accountBalances.accountId, accountId),
    eq(accountBalances.fiscalYear, 2024),
    eq(accountBalances.fiscalPeriod, 11)
  ));
```

## Testing Checklist

- [ ] Create accounts of all types
- [ ] Create balanced journal entry
- [ ] Try creating unbalanced entry (should fail)
- [ ] Post a draft entry
- [ ] Void a posted entry
- [ ] View general ledger for an account
- [ ] Generate income statement for current year
- [ ] Generate balance sheet as of today
- [ ] Verify balance sheet equation (Assets = Liabilities + Equity)
- [ ] Test account filtering and search
- [ ] Test journal entry date range filtering
- [ ] Export reports to PDF/CSV
- [ ] Try deleting account with transactions (should fail)

## Next Steps

1. **Add Fiscal Period Closing**: Implement year-end close process
2. **Add Budgeting**: Budget vs Actual reports
3. **Add Multi-Currency**: Foreign exchange handling
4. **Add Account Reconciliation**: Bank reconciliation feature
5. **Add Recurring Entries**: Auto-generate monthly entries
6. **Add Approval Workflow**: Multi-level approval for entries
7. **Add Dimensional Analysis**: Department, project, location tracking
8. **Add Cash Flow Statement**: Operating, investing, financing activities

## Resources

- [Accounting Research Document](./ACCOUNTING_RESEARCH.md)
- [Backend API Routes](../apps/backend/src/routes/accounting.ts)
- [Database Schema](../apps/backend/src/db/schema.ts)
- [API Client](../apps/erp-dashboard/src/lib/api.ts)

---

**Questions?** Refer to the research document or check the inline code comments.
