# Accounting Service - Phase 10b: Cash Management Implementation

## Overview

This document describes the implementation of the Cash Management module for the KidKazz ERP accounting service. The module provides bank reconciliation, cash flow statement (indirect method per PSAK 2), cash position reporting, and cash forecasting capabilities.

**PR**: #215
**Tests**: 305 passing
**Database**: Cloudflare D1 (Remote)

---

## Features Implemented

| Feature | Business Rule | Description |
|---------|---------------|-------------|
| Bank Accounts | - | Bank account configuration linked to COA |
| Bank Statements | Rule 20-22 | Statement import with duplicate detection |
| Bank Reconciliation | Rule 20-22 | Match transactions, reconciling items, adjustments |
| Cash Flow Statement | Rule 28, 34 | Indirect method per PSAK 2 |
| Cash Position Report | Rule 30 | Real-time cash position across all accounts |
| Cash Forecast Report | Rule 31, 35 | 30-day projection with threshold alerts |

---

## Phase 10b.1: Database Schema

### New Tables

```sql
-- Bank Accounts (links to COA)
CREATE TABLE bank_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,  -- FK to accounts (COA)
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL,  -- OPERATING | PAYROLL | SAVINGS | FOREIGN_CURRENCY
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_reconciled_date TEXT,
  last_reconciled_balance REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

-- Unique indexes for data integrity
CREATE UNIQUE INDEX idx_bank_accounts_account_id_uniq ON bank_accounts(account_id);
CREATE UNIQUE INDEX idx_bank_accounts_number_uniq ON bank_accounts(account_number);

-- Bank Statements (imported statement headers)
CREATE TABLE bank_statements (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  statement_date TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  opening_balance REAL NOT NULL,
  closing_balance REAL NOT NULL,
  total_debits REAL NOT NULL DEFAULT 0,
  total_credits REAL NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IMPORTED',
  imported_at TEXT NOT NULL,
  imported_by TEXT
);

-- Bank Transactions (statement lines with fingerprints)
CREATE TABLE bank_transactions (
  id TEXT PRIMARY KEY,
  statement_id TEXT NOT NULL REFERENCES bank_statements(id),
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  transaction_date TEXT NOT NULL,
  value_date TEXT,
  description TEXT NOT NULL,
  reference TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL,  -- DEBIT | CREDIT
  check_number TEXT,
  fingerprint TEXT NOT NULL UNIQUE,  -- SHA-256 for duplicate detection
  match_status TEXT NOT NULL DEFAULT 'UNMATCHED',
  matched_journal_line_id TEXT,
  matched_at TEXT,
  matched_by TEXT,
  created_at TEXT NOT NULL
);

-- Bank Reconciliations
CREATE TABLE bank_reconciliations (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  fiscal_year INTEGER NOT NULL,
  fiscal_month INTEGER NOT NULL,
  statement_ending_balance REAL NOT NULL,
  book_ending_balance REAL NOT NULL,
  adjusted_bank_balance REAL,
  adjusted_book_balance REAL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  matched_transactions INTEGER NOT NULL DEFAULT 0,
  unmatched_transactions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  completed_at TEXT,
  completed_by TEXT,
  approved_at TEXT,
  approved_by TEXT
);

-- Reconciliation Items (outstanding checks, deposits in transit, adjustments)
CREATE TABLE reconciliation_items (
  id TEXT PRIMARY KEY,
  reconciliation_id TEXT NOT NULL REFERENCES bank_reconciliations(id),
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_date TEXT NOT NULL,
  reference TEXT,
  is_cleared INTEGER NOT NULL DEFAULT 0,
  requires_journal_entry INTEGER NOT NULL DEFAULT 0,
  journal_entry_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

-- Cash Threshold Configuration
CREATE TABLE cash_threshold_config (
  id TEXT PRIMARY KEY,
  warning_threshold REAL NOT NULL DEFAULT 300000000,
  critical_threshold REAL NOT NULL DEFAULT 275000000,
  emergency_threshold REAL NOT NULL DEFAULT 250000000,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
```

---

## Phase 10b.2: Bank Account Entity

### Entity

```typescript
// src/domain/entities/bank-account.entity.ts
export class BankAccount {
  constructor(
    public readonly id: string,
    public accountId: string,      // FK to Chart of Accounts
    public bankName: string,
    public accountNumber: string,
    public accountType: BankAccountType,
    public currency: string,
    public status: BankAccountStatus,
    public lastReconciledDate?: Date,
    public lastReconciledBalance?: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public createdBy?: string,
    public updatedBy?: string
  ) {}

  static create(props: CreateBankAccountProps): BankAccount {
    return new BankAccount(
      crypto.randomUUID(),
      props.accountId,
      props.bankName,
      props.accountNumber,
      props.accountType,
      props.currency || 'IDR',
      BankAccountStatus.ACTIVE,
      undefined,
      undefined,
      new Date(),
      new Date(),
      props.createdBy
    );
  }

  markReconciled(balance: number, date: Date): void {
    this.lastReconciledDate = date;
    this.lastReconciledBalance = balance;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = BankAccountStatus.INACTIVE;
    this.updatedAt = new Date();
  }
}
```

### Value Objects

```typescript
// src/domain/value-objects/bank-account.vo.ts
export enum BankAccountType {
  OPERATING = 'OPERATING',
  PAYROLL = 'PAYROLL',
  SAVINGS = 'SAVINGS',
  FOREIGN_CURRENCY = 'FOREIGN_CURRENCY',
}

export enum BankAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}
```

---

## Phase 10b.3: Bank Transaction & Fingerprinting

### Duplicate Detection

```typescript
// src/domain/entities/bank-transaction.entity.ts
export class BankTransaction {
  // ... properties

  /**
   * Generate fingerprint for duplicate detection
   * Uses SHA-256 hash of key transaction fields
   */
  generateFingerprint(): string {
    const data = [
      this.bankAccountId,
      this.transactionDate.toISOString().split('T')[0],
      this.amount.toFixed(2),
      this.reference || '',
      this.description.substring(0, 50),
    ].join('|');

    // SHA-256 hash (first 32 chars)
    return createHash('sha256').update(data).digest('hex').substring(0, 32);
  }
}
```

---

## Phase 10b.4: Bank Reconciliation

### Workflow

1. **Create** - Initialize reconciliation for a bank account and period
2. **Import Statement** - Import bank statement with auto-duplicate detection
3. **Start** - Begin reconciliation process
4. **Match Transactions** - Manual or auto-match bank transactions to journal entries
5. **Add Reconciling Items** - Outstanding checks, deposits in transit, bank fees
6. **Calculate** - Compute adjusted bank and book balances
7. **Complete** - Validate balances match
8. **Approve** - Final approval, updates bank account last reconciled date

### Business Rules

| Rule | Description |
|------|-------------|
| Rule 20 | Adjusted Bank Balance must equal Adjusted Book Balance |
| Rule 21 | All bank accounts must be reconciled before period close |
| Rule 22 | Bank fees and interest auto-generate journal entries |

### API Endpoints

```
POST   /api/v1/reconciliations                       - Create reconciliation
GET    /api/v1/reconciliations/:id                   - Get reconciliation
POST   /api/v1/reconciliations/:id/start             - Start reconciliation
POST   /api/v1/reconciliations/:id/import-statement  - Import bank statement
GET    /api/v1/reconciliations/:id/unmatched         - Get unmatched transactions
POST   /api/v1/reconciliations/:id/match             - Match transaction to JE
POST   /api/v1/reconciliations/:id/auto-match        - Auto-match transactions
POST   /api/v1/reconciliations/:id/items             - Add reconciling item
POST   /api/v1/reconciliations/:id/calculate         - Calculate adjusted balances
POST   /api/v1/reconciliations/:id/complete          - Complete reconciliation
POST   /api/v1/reconciliations/:id/approve           - Approve reconciliation
```

---

## Phase 10b.5: Cash Flow Statement (Indirect Method)

### Structure per PSAK 2 (Rule 28)

```
OPERATING ACTIVITIES
  Net Income
  + Depreciation & Amortization
  - Gains on Asset Disposal
  + Losses on Asset Disposal
  +/- Working Capital Changes
    - Increase in Accounts Receivable
    + Decrease in Accounts Receivable
    + Increase in Accounts Payable
    - Decrease in Accounts Payable
    + Increase in Other Current Liabilities
    - Decrease in Other Current Liabilities
  ────────────────────────────────────────
  = Net Cash from Operating Activities

INVESTING ACTIVITIES
  - Capital Expenditures (asset purchases)
  + Proceeds from Asset Sales
  ────────────────────────────────────────
  = Net Cash from Investing Activities

FINANCING ACTIVITIES
  + New Loans / Capital Injections
  - Loan Repayments
  - Dividends Paid
  ────────────────────────────────────────
  = Net Cash from Financing Activities

────────────────────────────────────────
NET CHANGE IN CASH
+ Cash at Beginning of Period
────────────────────────────────────────
= Cash at End of Period

RECONCILIATION CHECK (Rule 34):
  Net Change must equal actual cash account change
```

### Service Implementation

```typescript
// src/domain/services/CashFlowCalculationService.ts
export class CashFlowCalculationService {
  calculate(input: CashFlowInput): CashFlowStatement {
    // Operating Activities (Indirect Method)
    const operatingCash =
      input.netIncome +
      input.depreciation +
      input.amortization -
      input.gainOnAssetDisposal +
      input.lossOnAssetDisposal +
      input.workingCapitalChanges.accountsReceivable +
      input.workingCapitalChanges.accountsPayable +
      input.workingCapitalChanges.inventory +
      input.workingCapitalChanges.otherCurrentAssets +
      input.workingCapitalChanges.otherCurrentLiabilities;

    // Investing Activities
    const investingCash =
      input.capitalExpenditures +      // Negative (outflow)
      input.proceedsFromAssetSales;    // Positive (inflow)

    // Financing Activities
    const financingCash =
      input.newLoans +
      input.capitalInjections +
      input.loanRepayments +           // Negative (outflow)
      input.dividendsPaid;             // Negative (outflow)

    const netChange = operatingCash + investingCash + financingCash;
    const endingCash = input.beginningCash + netChange;

    return {
      operating: { /* ... */ },
      investing: { /* ... */ },
      financing: { /* ... */ },
      netChangeInCash: netChange,
      beginningCash: input.beginningCash,
      endingCash,
      reconciliation: {
        calculatedEndingCash: endingCash,
        actualEndingCash: input.actualEndingCash,
        difference: endingCash - input.actualEndingCash,
        isReconciled: Math.abs(endingCash - input.actualEndingCash) < 0.01,
      },
    };
  }
}
```

### API Endpoint

```
GET /api/v1/reports/cash-flow-statement?fiscalYear=2025&fiscalMonth=1
```

---

## Phase 10b.6: Cash Position Report

### Structure

```typescript
interface CashPositionReport {
  asOfDate: string;
  totalCashPosition: number;
  categories: {
    cashOnHand: {
      total: number;
      accounts: CashAccountDetail[];  // Codes 1010-1014
    };
    bankAccounts: {
      total: number;
      accounts: CashAccountDetail[];  // Codes 1020-1027
    };
    cashEquivalents: {
      total: number;
      accounts: CashAccountDetail[];  // Codes 1030-1031
    };
  };
  thresholdStatus: {
    level: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    warningThreshold: number;
    criticalThreshold: number;
    emergencyThreshold: number;
  };
}
```

### API Endpoint

```
GET /api/v1/reports/cash-position
```

---

## Phase 10b.7: Cash Forecast Report

### 30-Day Projection (Rule 31)

```typescript
interface CashForecastReport {
  generatedAt: string;
  forecastDays: number;
  currentCashPosition: number;
  weeklyProjections: WeeklyProjection[];
  alerts: ThresholdAlert[];
}

interface WeeklyProjection {
  weekNumber: number;
  startDate: string;
  endDate: string;
  startingCash: number;
  expectedCollections: number;      // From AR aging
  scheduledPayments: number;        // From AP aging
  recurringPayments: number;        // Payroll, rent, utilities
  projectedSalesInflow: number;     // Avg daily sales * 7
  endingCash: number;
}
```

### Threshold Alerts (Rule 35)

| Level | Threshold | Action |
|-------|-----------|--------|
| Normal | > Rp 300M | No alert |
| Warning | < Rp 300M | Yellow indicator |
| Critical | < Rp 275M | Orange alert, notify management |
| Emergency | < Rp 250M | Red alert, immediate action required |

### API Endpoint

```
GET /api/v1/reports/cash-forecast?days=30
```

---

## Phase 10b.8: Bank Account Management API

### Endpoints

```
GET    /api/v1/bank-accounts              - List all bank accounts
GET    /api/v1/bank-accounts/active       - List active bank accounts
GET    /api/v1/bank-accounts/:id          - Get bank account by ID
POST   /api/v1/bank-accounts              - Create bank account
PUT    /api/v1/bank-accounts/:id          - Update bank account
DELETE /api/v1/bank-accounts/:id          - Deactivate bank account
```

### Create Bank Account Request

```json
{
  "accountId": "acc-xxx-xxx",
  "bankName": "BCA",
  "accountNumber": "1234567890",
  "accountType": "OPERATING",
  "currency": "IDR"
}
```

---

## Key Implementation Details

### Atomic Upserts (Race Condition Prevention)

```typescript
// bank-account.repository.ts
async save(bankAccount: BankAccount): Promise<void> {
  try {
    await this.db
      .insert(bankAccounts)
      .values({ /* ... */ })
      .onConflictDoUpdate({
        target: bankAccounts.id,
        set: { /* updated fields */ },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      if (message.includes('account_number')) {
        throw new Error(`Bank account number already exists`);
      }
      if (message.includes('account_id')) {
        throw new Error(`COA account already linked to another bank account`);
      }
    }
    throw error;
  }
}
```

### Date Boundary Math (Year Transitions)

```typescript
// Correctly handles year boundaries (e.g., Jan 2025 - 3 months = Oct 2024)
const thresholdDate = new Date(now);
thresholdDate.setMonth(thresholdDate.getMonth() - 3);
const thresholdYear = thresholdDate.getFullYear();
const thresholdMonth = thresholdDate.getMonth() + 1;
```

### Authentication Guards

```typescript
// All state-changing endpoints validate userId
fiscalPeriodRoutes.post('/:id/close', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }
  // ... handler logic
});
```

---

## Testing

### Test Coverage

| Category | Tests |
|----------|-------|
| Bank Account Entity | 12 |
| Bank Transaction Entity | 8 |
| Bank Reconciliation Entity | 15 |
| Cash Flow Calculation Service | 10 |
| Repository Tests | 20 |
| Integration Tests | 25 |
| **Total** | **305** |

### Running Tests

```bash
cd services/accounting-service
pnpm test                    # Run all tests
pnpm test:unit              # Unit tests only
pnpm test -- --grep "Cash"  # Run cash-related tests
```

---

## Deployment

```bash
# Deploy to Cloudflare Workers
cd services/accounting-service
pnpm run deploy

# Verify deployment
curl https://accounting-service.{your-domain}.workers.dev/api/v1/reports/cash-position
```

---

## Files Created/Modified

### New Files

| File | Description |
|------|-------------|
| `src/domain/entities/bank-account.entity.ts` | Bank account entity |
| `src/domain/entities/bank-statement.entity.ts` | Bank statement entity |
| `src/domain/entities/bank-transaction.entity.ts` | Bank transaction with fingerprint |
| `src/domain/entities/bank-reconciliation.entity.ts` | Reconciliation aggregate |
| `src/domain/repositories/bank-account.repository.ts` | Repository interface |
| `src/domain/repositories/bank-statement.repository.ts` | Repository interface |
| `src/domain/repositories/bank-transaction.repository.ts` | Repository interface |
| `src/domain/repositories/bank-reconciliation.repository.ts` | Repository interface |
| `src/domain/services/CashFlowCalculationService.ts` | Cash flow calculator |
| `src/domain/services/CashPositionService.ts` | Cash position aggregator |
| `src/domain/services/CashForecastService.ts` | 30-day forecast calculator |
| `src/infrastructure/repositories/bank-account.repository.ts` | Drizzle implementation |
| `src/infrastructure/repositories/bank-statement.repository.ts` | Drizzle implementation |
| `src/infrastructure/repositories/bank-transaction.repository.ts` | Drizzle implementation |
| `src/infrastructure/repositories/bank-reconciliation.repository.ts` | Drizzle implementation |
| `src/infrastructure/http/routes/bank-accounts.routes.ts` | Bank account API |
| `src/infrastructure/http/routes/reconciliation.routes.ts` | Reconciliation API |
| `src/application/commands/bank-account.commands.ts` | Command handlers |
| `src/application/commands/reconciliation.commands.ts` | Command handlers |
| `src/application/queries/cash-flow-statement.queries.ts` | Query handler |
| `src/application/queries/cash-position.queries.ts` | Query handler |
| `src/application/queries/cash-forecast.queries.ts` | Query handler |
| `src/application/dtos/bank-account.dto.ts` | DTOs and Zod schemas |
| `src/application/dtos/reconciliation.dto.ts` | DTOs and Zod schemas |

### Modified Files

| File | Changes |
|------|---------|
| `src/infrastructure/db/schema.ts` | Added 6 new tables |
| `src/infrastructure/http/routes/reports.routes.ts` | Added cash flow, position, forecast endpoints |
| `src/domain/entities/index.ts` | Export new entities |
| `src/domain/repositories/index.ts` | Export new interfaces |
| `src/domain/services/index.ts` | Export new services |
| `src/infrastructure/repositories/index.ts` | Export implementations |
| `src/application/commands/index.ts` | Export handlers |
| `src/application/queries/index.ts` | Export handlers |
| `src/index.ts` | Mount new routes |

---

## Related Documentation

- [Phases 1-4: Core Accounting](./phases-1-4-core-accounting.md)
- [Phases 5-9: Asset Accounting](./phases-5-9-asset-accounting.md)
- [Business Rules](../../../docs/bounded-contexts/accounting/BUSINESS_RULES.md)

---

**Last Updated**: 2026-01-28
