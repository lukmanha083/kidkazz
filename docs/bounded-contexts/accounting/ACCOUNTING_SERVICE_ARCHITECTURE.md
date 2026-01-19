# Accounting Service Architecture Design

## Overview

The Accounting Service is a microservice responsible for managing financial accounting operations following double-entry bookkeeping principles. It is designed using **Hexagonal Architecture** (Ports and Adapters) and **Domain-Driven Design** (DDD) patterns.

## Table of Contents

1. [Bounded Context](#bounded-context)
2. [Accounting Cycle Workflow](#accounting-cycle-workflow)
3. [Cash Flow Management](#cash-flow-management)
4. [Domain Model](#domain-model)
5. [Architecture Layers](#architecture-layers)
6. [Folder Structure](#folder-structure)
7. [Entity Relationships](#entity-relationships)
8. [Use Cases](#use-cases)
9. [API Endpoints](#api-endpoints)
10. [Event Publishing](#event-publishing)
11. [Asset Accounting Module](#asset-accounting-module)

---

## Bounded Context

The Accounting Service manages the **Accounting Bounded Context**:

**Ubiquitous Language:**
- **Account**: A financial account in the chart of accounts
- **Journal Entry**: A transaction with balanced debits and credits
- **Journal Line**: Individual debit or credit posting within an entry
- **Ledger**: Historical record of all transactions for an account
- **Fiscal Period**: Accounting period (month/year)
- **Trial Balance**: Summary of all account balances
- **Financial Statement**: Income statement or balance sheet

**Business Rules:**
1. Debits must always equal credits in a journal entry
2. Posted entries cannot be edited, only voided
3. Detail accounts can have transactions, header accounts cannot
4. System accounts cannot be deleted
5. Fiscal periods must be closed in sequence

---

## Accounting Cycle Workflow

The Accounting Service implements the **complete accounting cycle** - the standardized process for recording and reporting financial transactions within a fiscal period.

### Accounting Cycle Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         ACCOUNTING CYCLE (Monthly)                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   ┌─────────────────┐                                                            │
│   │  1. RECORD      │    Journal entries created from:                           │
│   │  TRANSACTIONS   │    • Manual entries (user-created)                         │
│   │                 │    • System entries (OrderCompleted, PurchaseReceived)     │
│   └────────┬────────┘    • Recurring entries (rent, salaries)                    │
│            │                                                                      │
│            ▼                                                                      │
│   ┌─────────────────┐                                                            │
│   │  2. POST TO     │    Posted entries update:                                  │
│   │  GENERAL LEDGER │    • Account balances                                      │
│   │                 │    • Running ledger history                                │
│   └────────┬────────┘                                                            │
│            │                                                                      │
│            ▼                                                                      │
│   ┌─────────────────┐    Reconcile at month-end:                                 │
│   │  3. RECONCILE   │    • Bank accounts vs statements                           │
│   │  ACCOUNTS       │    • AR subsidiary vs GL control                           │
│   │                 │    • AP subsidiary vs GL control                           │
│   └────────┬────────┘    • Inventory vs GL                                       │
│            │                                                                      │
│            ▼                                                                      │
│   ┌─────────────────┐                                                            │
│   │  4. GENERATE    │    Verify: Debits = Credits                                │
│   │  TRIAL BALANCE  │    Identify accounts that need adjustment                  │
│   │                 │                                                            │
│   └────────┬────────┘                                                            │
│            │                                                                      │
│            ▼                                                                      │
│   ┌─────────────────┐    Record end-of-period adjustments:                       │
│   │  5. ADJUSTING   │    • Prepaid expenses (insurance, rent)                    │
│   │  JOURNAL        │    • Accrued expenses (salaries, interest)                 │
│   │  ENTRIES        │    • Depreciation                                          │
│   └────────┬────────┘    • Unearned revenue recognition                          │
│            │                                                                      │
│            ▼                                                                      │
│   ┌─────────────────┐                                                            │
│   │  6. GENERATE    │    Financial reports:                                      │
│   │  FINANCIAL      │    • Income Statement (P&L)                                │
│   │  STATEMENTS     │    • Balance Sheet                                         │
│   └────────┬────────┘    • Cash Flow Statement                                   │
│            │                                                                      │
│            ▼                                                                      │
│   ┌─────────────────┐    Year-end only:                                          │
│   │  7. CLOSE THE   │    • Transfer Revenue/Expense to Retained Earnings         │
│   │  BOOKS          │    • Reset temporary accounts to zero                      │
│   │                 │    • Lock fiscal period                                    │
│   └─────────────────┘                                                            │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Record Transactions

Journal entries are the foundation of the accounting cycle.

**Entry Sources:**
```typescript
entryType: 'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing'
```

| Entry Type | Source | Example |
|------------|--------|---------|
| Manual | User-created | Owner investment, corrections |
| System | Event-driven | OrderCompleted → Revenue entry |
| Recurring | Scheduled | Monthly rent, loan payments |
| Adjusting | Month-end | Depreciation, prepaid expense allocation |
| Closing | Year-end | Transfer net income to retained earnings |

### Step 2: Post to General Ledger

When entries are posted, account balances are updated.

```typescript
// Entry status flow
Draft → Posted → (Voided if error)

// On post:
// 1. Validate debits = credits
// 2. Update account_balances table
// 3. Publish JournalEntryPosted event
```

### Step 3: Reconcile Accounts

Monthly reconciliation ensures data integrity.

**Reconciliation Types:**

| Type | Process | Frequency |
|------|---------|-----------|
| Bank Reconciliation | Compare GL to bank statement | Monthly |
| AR Reconciliation | Compare customer balances to GL control | Monthly |
| AP Reconciliation | Compare vendor balances to GL control | Monthly |
| Inventory Reconciliation | Compare Inventory Service to GL | Monthly |

**Bank Reconciliation Workflow:**
```
Bank Statement Balance
  + Deposits in Transit
  - Outstanding Checks
  ± Bank Errors
  = Adjusted Bank Balance

Book Balance (GL)
  + Interest Income
  - Bank Charges
  - NSF Checks
  ± Book Errors
  = Adjusted Book Balance

Adjusted Bank = Adjusted Book ✓
```

### Step 4: Generate Trial Balance

The trial balance verifies that all entries are balanced.

```typescript
interface TrialBalance {
  asOfDate: Date
  accounts: TrialBalanceAccount[]
  totalDebits: number
  totalCredits: number
  isBalanced: boolean  // Debits must equal Credits
}

interface TrialBalanceAccount {
  accountCode: string
  accountName: string
  debitBalance: number
  creditBalance: number
}
```

**API Endpoint:** `GET /api/accounting/reports/trial-balance?asOfDate=2025-01-31`

### Step 5: Adjusting Journal Entries

Record accruals and deferrals that span periods.

**Common Adjusting Entries:**

```typescript
// 1. Prepaid Expense Recognition (Monthly)
// Insurance paid annually, recognized monthly
// Debit: Insurance Expense         Rp 1,000,000
// Credit: Prepaid Insurance        Rp 1,000,000

// 2. Accrued Expense (Salaries earned but not yet paid)
// Debit: Salary Expense            Rp 10,000,000
// Credit: Salaries Payable         Rp 10,000,000

// 3. Depreciation (Monthly)
// Debit: Depreciation Expense      Rp 500,000
// Credit: Accumulated Depreciation Rp 500,000

// 4. Unearned Revenue Recognition
// Debit: Unearned Revenue          Rp 2,000,000
// Credit: Service Revenue          Rp 2,000,000
```

### Step 6: Generate Financial Statements

**Income Statement (P&L):**
```typescript
interface IncomeStatement {
  periodFrom: Date
  periodTo: Date
  revenue: RevenueSection
  costOfGoodsSold: COGSSection
  grossProfit: number
  operatingExpenses: ExpenseSection
  operatingIncome: number
  otherIncome: number
  otherExpenses: number
  netIncome: number
}
```

**Balance Sheet:**
```typescript
interface BalanceSheet {
  asOfDate: Date
  assets: AssetSection
  liabilities: LiabilitySection
  equity: EquitySection
  totalAssets: number
  totalLiabilitiesAndEquity: number
  isBalanced: boolean  // Assets = Liabilities + Equity
}
```

### Step 7: Close the Books

**Monthly Close:**
- Mark fiscal period as 'Closed'
- Prevent backdated entries
- Generate period-end reports

**Year-End Close:**
```typescript
// Closing entries transfer temporary accounts to Retained Earnings

// 1. Close Revenue accounts
// Debit: Sales Revenue             Rp 100,000,000
// Credit: Income Summary           Rp 100,000,000

// 2. Close Expense accounts
// Debit: Income Summary            Rp 80,000,000
// Credit: Operating Expenses       Rp 80,000,000

// 3. Close Income Summary (Net Income)
// Debit: Income Summary            Rp 20,000,000
// Credit: Retained Earnings        Rp 20,000,000
```

### Accounting Cycle API Endpoints

```
# Step 1 & 2: Record & Post Transactions
POST   /api/accounting/journal-entries              # Create entry
POST   /api/accounting/journal-entries/:id/post     # Post entry

# Step 3: Reconciliation
GET    /api/accounting/reconciliation/bank/:accountId     # Get bank reconciliation
POST   /api/accounting/reconciliation/bank                # Create/update reconciliation
POST   /api/accounting/reconciliation/bank/:id/approve    # Approve reconciliation
GET    /api/accounting/reconciliation/ar                  # AR reconciliation report
GET    /api/accounting/reconciliation/ap                  # AP reconciliation report
GET    /api/accounting/reconciliation/inventory           # Inventory reconciliation

# Step 4: Trial Balance
GET    /api/accounting/reports/trial-balance        # Generate trial balance

# Step 5: Adjusting Entries
POST   /api/accounting/journal-entries              # With entryType: 'Adjusting'
POST   /api/accounting/depreciation/run             # Run monthly depreciation

# Step 6: Financial Statements
GET    /api/accounting/reports/income-statement     # P&L report
GET    /api/accounting/reports/balance-sheet        # Balance sheet
GET    /api/accounting/reports/cash-flow            # Cash flow statement

# Step 7: Close the Books
POST   /api/accounting/fiscal-periods/:id/close     # Close fiscal period
POST   /api/accounting/year-end/close               # Year-end closing process
```

### Accounting Cycle Checklist

```
□ Step 1: All transactions recorded (manual + system entries)
□ Step 2: All entries posted to GL
□ Step 3: Bank accounts reconciled
□ Step 3: AR/AP subsidiary ledgers reconciled
□ Step 3: Inventory reconciled with Inventory Service
□ Step 4: Trial balance generated and balanced
□ Step 5: Adjusting entries posted (depreciation, accruals, deferrals)
□ Step 6: Adjusted trial balance balanced
□ Step 6: Income Statement generated
□ Step 6: Balance Sheet generated (Assets = Liabilities + Equity)
□ Step 7: Fiscal period closed
□ Step 7: (Year-end) Closing entries posted
□ Step 7: (Year-end) Retained Earnings updated
```

---

## Cash Flow Management

Since we use **Accrual Accounting**, revenue and expenses are recorded when earned/incurred, not when cash changes hands. The Cash Flow Management module answers the critical question: **"How much cash do we actually have?"**

### Why Cash Flow Management Matters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ACCRUAL vs CASH REALITY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INCOME STATEMENT (Accrual)           ACTUAL CASH                           │
│  ─────────────────────────            ─────────────                         │
│  Revenue:    Rp 100,000,000           Cash In:    Rp  60,000,000            │
│  - COGS:     Rp  60,000,000           Cash Out:   Rp  80,000,000            │
│  - Expenses: Rp  20,000,000           ─────────────                         │
│  ─────────────────────────            Net Cash:   Rp (20,000,000)  ⚠️       │
│  Net Profit: Rp  20,000,000  ✓                                              │
│                                                                              │
│  PROFITABLE but CASH NEGATIVE!                                               │
│  Why? Customers haven't paid yet (AR up), but we paid suppliers (AP down)   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cash Flow Reports

#### 1. Cash Flow Statement (Indirect Method)

Reconciles accrual-based Net Income to actual cash generated.

```
                    CASH FLOW STATEMENT
                    Period: January 2025
────────────────────────────────────────────────────────
OPERATING ACTIVITIES
  Net Income                              Rp 20,000,000
  + Depreciation                          Rp  5,000,000
  - Increase in AR                        Rp(40,000,000)
  + Increase in AP                        Rp 10,000,000
  ──────────────────────────────────────────────────────
  Net Cash from Operations                Rp (5,000,000)

INVESTING ACTIVITIES
  - Purchase of Equipment                 Rp(15,000,000)
  ──────────────────────────────────────────────────────
  Net Cash from Investing                 Rp(15,000,000)

FINANCING ACTIVITIES
  + Bank Loan                             Rp 30,000,000
  ──────────────────────────────────────────────────────
  Net Cash from Financing                 Rp 30,000,000

════════════════════════════════════════════════════════
NET INCREASE IN CASH                      Rp 10,000,000
Cash at Beginning                         Rp 50,000,000
────────────────────────────────────────────────────────
CASH AT END OF PERIOD                     Rp 60,000,000
```

**API Endpoint:** `GET /api/accounting/reports/cash-flow?from=2025-01-01&to=2025-01-31`

#### 2. Cash Position Report (Real-Time)

Shows current cash across all accounts.

```
               CASH POSITION REPORT
               As of: January 16, 2025 14:30
─────────────────────────────────────────────────────────
CASH ON HAND
  Petty Cash - HQ                        Rp   5,000,000
  POS Cash Drawer                        Rp   3,500,000
  ───────────────────────────────────────────────────────
  Total Cash on Hand                     Rp   8,500,000

BANK ACCOUNTS
  BCA - Operating (1234567890)           Rp 150,000,000
  BRI - Savings (1122334455)             Rp  80,000,000
  ───────────────────────────────────────────────────────
  Total Bank Balances                    Rp 230,000,000

═════════════════════════════════════════════════════════
TOTAL CASH POSITION                      Rp 238,500,000

Reconciliation Status:
  BCA: Last reconciled Jan 15 ✓
  BRI: Last reconciled Jan 10 ⚠️ (6 days ago)
```

**API Endpoint:** `GET /api/accounting/reports/cash-position`

#### 3. Cash Forecast Report

Projects future cash based on AR/AP aging and scheduled payments.

```
                CASH FORECAST (Next 4 Weeks)
─────────────────────────────────────────────────────────
Current Cash Position:                   Rp 238,500,000
Minimum Threshold:                       Rp 100,000,000

Week 1 (Jan 17-23):
  + AR Collections                       Rp  45,000,000
  + Expected Sales                       Rp  35,000,000
  - AP Payments                          Rp (55,000,000)
  - Loan Payment                         Rp  (5,000,000)
  Ending Cash:                           Rp 258,500,000 ✓

Week 2 (Jan 24-30):
  + AR Collections                       Rp  38,000,000
  + Expected Sales                       Rp  35,000,000
  - AP Payments                          Rp (42,000,000)
  - Payroll                              Rp (85,000,000)
  Ending Cash:                           Rp 204,500,000 ✓

Week 3 (Jan 31 - Feb 6):
  + AR Collections                       Rp  52,000,000
  + Expected Sales                       Rp  35,000,000
  - AP Payments                          Rp (38,000,000)
  - Rent                                 Rp (25,000,000)
  Ending Cash:                           Rp 228,500,000 ✓

Week 4 (Feb 7-13):
  + AR Collections                       Rp  28,000,000
  + Expected Sales                       Rp  35,000,000
  - AP Payments                          Rp (30,000,000)
  - Tax Payment                          Rp (15,000,000)
  Ending Cash:                           Rp 246,500,000 ✓

⚠️ ALERTS: None - All weeks above minimum threshold
```

**API Endpoint:** `GET /api/accounting/reports/cash-forecast?days=30`

### Cash Flow Domain Model

```typescript
// Cash Position Aggregate
interface CashPositionReport {
  asOfDateTime: Date
  cashOnHand: CashAccount[]
  bankAccounts: BankAccount[]
  totalCashPosition: number
  reconciliationStatus: ReconciliationStatus[]
}

// Cash Flow Statement
interface CashFlowStatement {
  periodFrom: Date
  periodTo: Date

  // Operating Activities
  netIncome: number
  nonCashAdjustments: Adjustment[]  // Depreciation, amortization
  workingCapitalChanges: WorkingCapitalChange[]  // AR, AP, Inventory
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

// Cash Forecast
interface CashForecast {
  baseDate: Date
  currentCashPosition: number
  minimumThreshold: number
  weeklyProjections: WeeklyProjection[]
  alerts: CashAlert[]
}
```

### Cash Flow API Endpoints

```
# Cash Flow Statement
GET  /api/accounting/reports/cash-flow              # Generate cash flow statement
     ?from=2025-01-01&to=2025-01-31

# Cash Position
GET  /api/accounting/reports/cash-position          # Real-time cash position

# Cash Forecast
GET  /api/accounting/reports/cash-forecast          # 30-day cash forecast
     ?days=30

# Cash Threshold Configuration
GET  /api/accounting/cash-threshold                 # Get threshold config
PUT  /api/accounting/cash-threshold                 # Update threshold

# Cash Flow Activity Classification
GET  /api/accounting/cash-flow/activity/:entryId   # Get activity classification
```

### Cash Threshold Alerts

System monitors cash position and alerts when below thresholds:

| Level | Threshold | Action |
|-------|-----------|--------|
| **Warning** | 120% of minimum | Monitor daily, review AR aging |
| **Critical** | 110% of minimum | Prioritize payments, accelerate collections |
| **Emergency** | Below minimum | Contact bank, delay non-critical payments |

**Event Published:** `CashThresholdBreached`

### Integration with Reconciliation

Cash Position Report includes reconciliation status from Step 3 (Reconcile Accounts) of the Accounting Cycle:

```typescript
// After bank reconciliation is completed
async function updateCashPosition(): Promise<void> {
  // 1. Get adjusted book balance from latest reconciliation
  const reconciledBalance = await getReconciledBankBalance(accountId);

  // 2. Update cash position report
  await refreshCashPosition();

  // 3. Check thresholds
  await checkCashThresholds();
}
```

### Business Rules Reference

See **Business Rules** document for detailed Cash Flow rules:
- Rule 28: Cash Flow Statement Method (Indirect)
- Rule 29: Cash Flow Activity Classification
- Rule 30: Cash Position Report
- Rule 31: Cash Forecast Report
- Rule 32: Cash Account Identification
- Rule 33: Working Capital Change Calculation
- Rule 34: Cash Flow Reconciliation
- Rule 35: Minimum Cash Threshold Alert

---

## Domain Model

### Aggregates

#### 1. **Account Aggregate**

```typescript
class Account {
  // Identity
  id: string
  code: string  // Unique 4-digit code (e.g., "1100")

  // Properties
  name: string
  description?: string
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'COGS' | 'Expense'
  normalBalance: 'Debit' | 'Credit'
  currency: string

  // Hierarchy
  parentAccountId: string | null
  level: number  // 0 = top level, 1 = sub-account, etc.
  isDetailAccount: boolean  // Can post transactions?
  isSystemAccount: boolean  // Protected from deletion

  // Status
  status: 'Active' | 'Inactive' | 'Archived'

  // Metadata
  createdAt: Date
  updatedAt: Date

  // Domain methods
  activate(): void
  deactivate(): void
  canDelete(): boolean
  canPost(): boolean
  addSubAccount(child: Account): void
}
```

#### 2. **JournalEntry Aggregate (Root)**

```typescript
class JournalEntry {
  // Identity
  id: string
  entryNumber: string  // Auto-generated: "JE-2025-0001"

  // Properties
  entryDate: Date
  description: string
  reference?: string  // Invoice #, PO #, etc.
  notes?: string

  // Type and status
  entryType: 'Manual' | 'System' | 'Recurring' | 'Adjusting' | 'Closing'
  status: 'Draft' | 'Posted' | 'Voided'

  // Aggregate members
  lines: JournalLine[]  // Minimum 2 lines

  // Metadata
  createdBy: string
  createdAt: Date
  postedBy?: string
  postedAt?: Date
  voidedBy?: string
  voidedAt?: Date
  voidReason?: string
  updatedAt: Date

  // Domain methods
  validate(): void  // Check debits = credits
  post(userId: string): void
  void(userId: string, reason: string): void
  canEdit(): boolean
  canPost(): boolean
  canVoid(): boolean
}

class JournalLine {
  accountId: string
  direction: 'Debit' | 'Credit'
  amount: number
  memo?: string

  // Validation
  validate(): void
}
```

### Value Objects

```typescript
class Money {
  constructor(
    public amount: number,
    public currency: string = 'USD'
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money
  subtract(other: Money): Money
  equals(other: Money): boolean
}

class AccountCode {
  constructor(public value: string) {
    if (!/^\d{4}$/.test(value)) {
      throw new Error('Account code must be 4 digits');
    }
  }
}

class FiscalPeriod {
  constructor(
    public year: number,
    public month: number
  ) {
    if (month < 1 || month > 12) {
      throw new Error('Invalid month');
    }
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  next(): FiscalPeriod
  previous(): FiscalPeriod
}
```

### Domain Services

```typescript
class JournalEntryService {
  constructor(
    private accountRepo: IAccountRepository,
    private entryRepo: IJournalEntryRepository
  ) {}

  async createEntry(
    date: Date,
    description: string,
    lines: Array<{ accountId: string; direction: string; amount: number }>
  ): Promise<JournalEntry> {
    // Validate accounts exist and are detail accounts
    // Create entry with auto-generated number
    // Validate debits = credits
    // Return draft entry
  }

  async postEntry(entryId: string, userId: string): Promise<void> {
    // Load entry
    // Validate entry can be posted
    // Update account balances (materialized view)
    // Publish JournalEntryPosted event
  }
}

class FinancialReportService {
  async generateIncomeStatement(from: Date, to: Date): Promise<IncomeStatement>
  async generateBalanceSheet(asOf: Date): Promise<BalanceSheet>
  async generateTrialBalance(asOf: Date): Promise<TrialBalance>
}
```

---

## Architecture Layers

### 1. Domain Layer (Core)

**Pure business logic, no external dependencies**

```
src/domain/
├── entities/
│   ├── account.entity.ts
│   ├── journal-entry.entity.ts
│   └── journal-line.entity.ts
├── value-objects/
│   ├── money.vo.ts
│   ├── account-code.vo.ts
│   └── fiscal-period.vo.ts
├── repositories/  (Interfaces only - PORTS)
│   ├── account.repository.ts
│   ├── journal-entry.repository.ts
│   └── ledger.repository.ts
└── services/
    ├── journal-entry.service.ts
    └── financial-report.service.ts
```

### 2. Application Layer

**Use cases and orchestration**

```
src/application/
├── commands/  (Write operations - CQRS)
│   ├── create-account.command.ts
│   ├── update-account.command.ts
│   ├── create-journal-entry.command.ts
│   ├── post-journal-entry.command.ts
│   └── void-journal-entry.command.ts
├── queries/  (Read operations - CQRS)
│   ├── get-account.query.ts
│   ├── list-accounts.query.ts
│   ├── get-ledger.query.ts
│   ├── generate-income-statement.query.ts
│   └── generate-balance-sheet.query.ts
├── events/  (Event handlers)
│   └── order-completed.handler.ts  (Future: create accounting entries from orders)
└── dtos/
    ├── create-account.dto.ts
    └── create-journal-entry.dto.ts
```

### 3. Infrastructure Layer (Adapters)

**External concerns and implementations**

```
src/infrastructure/
├── database/  (OUTPUT ADAPTER - implements repository interfaces)
│   ├── schema.ts  (Drizzle schema)
│   ├── account.repository.impl.ts
│   ├── journal-entry.repository.impl.ts
│   └── ledger.repository.impl.ts
├── http/  (INPUT ADAPTER - HTTP API)
│   ├── routes.ts
│   ├── controllers/
│   │   ├── account.controller.ts
│   │   ├── journal-entry.controller.ts
│   │   └── report.controller.ts
│   └── middleware/
│       └── error-handler.ts
└── events/  (OUTPUT ADAPTER - event publishing)
    ├── event-publisher.ts
    └── events/
        ├── journal-entry-posted.event.ts
        └── account-created.event.ts
```

---

## Folder Structure

Complete service structure:

```
services/accounting-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── account.entity.ts
│   │   │   ├── journal-entry.entity.ts
│   │   │   ├── journal-line.entity.ts
│   │   │   ├── account-balance.entity.ts
│   │   │   └── fiscal-period.entity.ts
│   │   ├── value-objects/
│   │   │   ├── money.vo.ts
│   │   │   ├── account-code.vo.ts
│   │   │   └── fiscal-period.vo.ts
│   │   ├── repositories/
│   │   │   ├── account.repository.ts
│   │   │   ├── journal-entry.repository.ts
│   │   │   ├── ledger.repository.ts
│   │   │   └── report.repository.ts
│   │   └── services/
│   │       ├── journal-entry.service.ts
│   │       └── financial-report.service.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-account.command.ts
│   │   │   ├── update-account.command.ts
│   │   │   ├── delete-account.command.ts
│   │   │   ├── create-journal-entry.command.ts
│   │   │   ├── post-journal-entry.command.ts
│   │   │   └── void-journal-entry.command.ts
│   │   ├── queries/
│   │   │   ├── get-account.query.ts
│   │   │   ├── list-accounts.query.ts
│   │   │   ├── get-journal-entry.query.ts
│   │   │   ├── list-journal-entries.query.ts
│   │   │   ├── get-ledger.query.ts
│   │   │   ├── generate-income-statement.query.ts
│   │   │   ├── generate-balance-sheet.query.ts
│   │   │   └── generate-trial-balance.query.ts
│   │   └── dtos/
│   │       ├── account.dto.ts
│   │       └── journal-entry.dto.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── schema.ts
│   │   │   ├── account.repository.impl.ts
│   │   │   ├── journal-entry.repository.impl.ts
│   │   │   ├── ledger.repository.impl.ts
│   │   │   └── report.repository.impl.ts
│   │   ├── http/
│   │   │   ├── routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── account.controller.ts
│   │   │   │   ├── journal-entry.controller.ts
│   │   │   │   └── report.controller.ts
│   │   │   └── middleware/
│   │   │       └── error-handler.ts
│   │   └── events/
│   │       ├── event-publisher.ts
│   │       └── events/
│   │           ├── journal-entry-posted.event.ts
│   │           ├── journal-entry-voided.event.ts
│   │           └── account-created.event.ts
│   └── index.ts  (Entry point - wires everything together)
├── migrations/
│   ├── 0001_create_chart_of_accounts.sql
│   ├── 0002_create_journal_entries.sql
│   ├── 0003_create_journal_lines.sql
│   ├── 0004_create_account_balances.sql
│   └── seed_default_accounts.sql
├── tests/
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

---

## Entity Relationships

```
┌─────────────────┐
│ Chart of        │
│ Accounts        │◄──────┐
│                 │       │ parent_account_id
│ - id            │       │ (hierarchy)
│ - code          │       │
│ - name          │       │
│ - accountType   │       │
│ - parentId  ────┼───────┘
└────────┬────────┘
         │ 1
         │
         │ *
         │
┌────────▼────────┐        ┌─────────────────┐
│ Account         │        │ Journal         │
│ Balances        │        │ Entries         │
│                 │        │                 │
│ - accountId ────┼───┐    │ - id            │
│ - fiscalPeriod  │   │    │ - entryNumber   │
│ - debitTotal    │   │    │ - entryDate     │
│ - creditTotal   │   │    │ - description   │
│ - balance       │   │    │ - status        │
└─────────────────┘   │    └────────┬────────┘
                      │             │ 1
                      │             │
                      │             │ *
                      │             │
                      │    ┌────────▼────────┐
                      │    │ Journal         │
                      │    │ Lines           │
                      │    │                 │
                      └────┤ - accountId     │
                           │ - direction     │
                           │ - amount        │
                           │ - memo          │
                           └─────────────────┘
```

---

## Use Cases

### Command Use Cases (Write)

1. **Create Account**
   - Input: Code, Name, Type, ParentId (optional)
   - Validation: Code unique, Parent exists, Type valid
   - Output: Account entity
   - Events: `AccountCreated`

2. **Post Journal Entry**
   - Input: Entry ID, User ID
   - Validation: Entry exists, Is draft, Debits = Credits
   - Side effects: Update account balances
   - Output: Posted entry
   - Events: `JournalEntryPosted`

3. **Void Journal Entry**
   - Input: Entry ID, User ID, Reason
   - Validation: Entry posted, Not already voided
   - Side effects: Reverse account balances
   - Output: Voided entry
   - Events: `JournalEntryVoided`

### Query Use Cases (Read)

1. **Get Ledger**
   - Input: Account ID, Date range
   - Output: List of transactions with running balance

2. **Generate Income Statement**
   - Input: From date, To date
   - Output: Revenue, COGS, Expenses, Net Income

3. **Generate Balance Sheet**
   - Input: As-of date
   - Output: Assets, Liabilities, Equity

---

## API Endpoints

### Accounts
```
GET    /api/accounting/accounts                    # List all accounts
GET    /api/accounting/accounts/active             # List active accounts
GET    /api/accounting/accounts/:id                # Get account by ID
POST   /api/accounting/accounts                    # Create account
PUT    /api/accounting/accounts/:id                # Update account
DELETE /api/accounting/accounts/:id                # Delete account
GET    /api/accounting/accounts/:id/balance        # Get account balance
GET    /api/accounting/accounts/tree               # Get hierarchical tree
```

### Journal Entries
```
GET    /api/accounting/journal-entries             # List entries
GET    /api/accounting/journal-entries/:id         # Get entry by ID
POST   /api/accounting/journal-entries             # Create entry (draft)
PUT    /api/accounting/journal-entries/:id         # Update entry (draft only)
POST   /api/accounting/journal-entries/:id/post    # Post entry
POST   /api/accounting/journal-entries/:id/void    # Void entry
```

### Ledger & Reports
```
GET    /api/accounting/ledger/:accountId           # Get account ledger
GET    /api/accounting/reports/income-statement    # Generate P&L
GET    /api/accounting/reports/balance-sheet       # Generate balance sheet
GET    /api/accounting/reports/trial-balance       # Generate trial balance
```

---

## Event Publishing

### Events Published

#### 1. **AccountCreated**
```json
{
  "type": "AccountCreated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "accountId": "acc-123",
    "code": "1100",
    "name": "Cash",
    "accountType": "Asset"
  }
}
```

#### 2. **JournalEntryPosted**
```json
{
  "type": "JournalEntryPosted",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "entryId": "je-456",
    "entryNumber": "JE-2025-0001",
    "entryDate": "2025-01-15",
    "lines": [
      { "accountId": "acc-123", "direction": "Debit", "amount": 1000 },
      { "accountId": "acc-456", "direction": "Credit", "amount": 1000 }
    ],
    "postedBy": "user-789"
  }
}
```

### Events Consumed

#### 1. **OrderCompleted** (from Order Service)
```json
{
  "type": "OrderCompleted",
  "data": {
    "orderId": "order-123",
    "customerId": "cust-456",
    "totalAmount": 1500.00,
    "items": [...]
  }
}
```

**Action:** Create accounting journal entry automatically:
- Debit: Accounts Receivable
- Credit: Revenue

---

## Dependency Injection Container

**File:** `src/index.ts`

```typescript
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import routes from './infrastructure/http/routes';

// Repository implementations
import { AccountRepositoryImpl } from './infrastructure/database/account.repository.impl';
import { JournalEntryRepositoryImpl } from './infrastructure/database/journal-entry.repository.impl';

// Domain services
import { JournalEntryService } from './domain/services/journal-entry.service';

// Commands
import { CreateAccountCommand } from './application/commands/create-account.command';
import { PostJournalEntryCommand } from './application/commands/post-journal-entry.command';

type Bindings = {
  DB: D1Database;
  ACCOUNTING_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Dependency injection
app.use('*', async (c, next) => {
  const db = drizzle(c.env.DB);

  // Create repositories
  const accountRepo = new AccountRepositoryImpl(db);
  const entryRepo = new JournalEntryRepositoryImpl(db);

  // Create domain services
  const entryService = new JournalEntryService(accountRepo, entryRepo);

  // Create commands
  const createAccountCmd = new CreateAccountCommand(accountRepo);
  const postEntryCmd = new PostJournalEntryCommand(entryRepo);

  // Attach to context
  c.set('accountRepo', accountRepo);
  c.set('entryRepo', entryRepo);
  c.set('entryService', entryService);
  c.set('createAccountCmd', createAccountCmd);
  c.set('postEntryCmd', postEntryCmd);

  await next();
});

// Mount routes
app.route('/', routes);

export default app;
```

---

## Testing Strategy

### 1. Domain Layer Tests (Pure Unit Tests)
```typescript
describe('JournalEntry', () => {
  it('should not allow posting with unbalanced lines', () => {
    const entry = new JournalEntry(/*...*/);
    entry.lines = [
      { accountId: '1', direction: 'Debit', amount: 100 },
      { accountId: '2', direction: 'Credit', amount: 50 }
    ];

    expect(() => entry.validate()).toThrow('Debits must equal credits');
  });
});
```

### 2. Application Layer Tests (Use Case Tests)
```typescript
describe('PostJournalEntryCommand', () => {
  it('should update account balances when posting', async () => {
    const mockRepo = createMockRepository();
    const command = new PostJournalEntryCommand(mockRepo);

    await command.execute('entry-123', 'user-456');

    expect(mockRepo.update).toHaveBeenCalled();
  });
});
```

### 3. Infrastructure Layer Tests (Integration Tests)
```typescript
describe('AccountRepositoryImpl', () => {
  it('should persist and retrieve account', async () => {
    const db = await createTestDatabase();
    const repo = new AccountRepositoryImpl(db);

    const account = new Account(/*...*/);
    await repo.save(account);

    const retrieved = await repo.findById(account.id);
    expect(retrieved).toEqual(account);
  });
});
```

---

## Migration Path from Monolithic Backend

1. ✅ Create service structure
2. ✅ Copy database schema to migrations
3. ✅ Implement domain entities
4. ✅ Implement repositories
5. ✅ Implement commands and queries
6. ✅ Create HTTP routes
7. ✅ Configure wrangler.toml
8. ✅ Update API gateway
9. ✅ Test integration
10. ✅ Migrate data (if needed)
11. ✅ Update frontend
12. ✅ Delete old backend code

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Testable domain logic
- ✅ Flexibility to change infrastructure
- ✅ Scalability via microservices
- ✅ Event-driven communication
- ✅ DDD best practices

---

## Asset Accounting Module

The Accounting Service includes an **Asset Accounting Module** for managing fixed assets and their depreciation. This module is integrated within the Accounting Service rather than being a separate microservice to optimize database usage (considering Cloudflare D1's 10GB limit).

### Module Overview

The Asset Accounting Module handles:
- **Fixed Asset Register**: Complete lifecycle management of company assets
- **Depreciation Calculation**: Multiple methods (Straight-line, Declining Balance, SYD, Units of Production)
- **Asset Categories**: POS equipment, warehouse equipment, vehicles, IT equipment, fixtures, furniture, building improvements
- **Asset Movements**: Transfers between locations/departments
- **Maintenance Tracking**: Scheduled and unscheduled maintenance records
- **Financial Integration**: Automatic journal entries for depreciation and disposal

### Key Features

| Feature | Description |
|---------|-------------|
| Asset Numbering | Auto-generated format: `FA-{CATEGORY}-{YYYYMM}-{SEQ}` |
| Capitalization Threshold | Rp 2,500,000 minimum to be classified as fixed asset |
| Depreciation Methods | Straight-line, Declining Balance, Sum-of-Years-Digits, Units of Production |
| Tax Compliance | Indonesian PSAK 16 and PMK 96/PMK.03/2009 |
| Asset Lifecycle | DRAFT → ACTIVE → FULLY_DEPRECIATED / DISPOSED |

### Data Separation Strategy

To prevent database bloat, historical asset data is synchronized with the Reporting Service:

```
┌──────────────────────────────────────┐     Events      ┌──────────────────────────────────┐
│       Accounting Service             │ ──────────────► │      Reporting Service           │
│       (OLTP - Transactional)         │                 │      (OLAP - Analytical)         │
├──────────────────────────────────────┤                 ├──────────────────────────────────┤
│ • Active assets                      │                 │ • Full asset history             │
│ • Current depreciation schedules     │                 │ • Historical depreciation        │
│ • Recent movements (current + 1 yr)  │                 │ • All movements                  │
│ • Active maintenance records         │                 │ • Complete maintenance history   │
└──────────────────────────────────────┘                 └──────────────────────────────────┘
```

### Integration Points

The Asset Accounting Module publishes events consumed by other services:

| Event | Consumer | Action |
|-------|----------|--------|
| `AssetRegistered` | Reporting Service | Store asset snapshot |
| `DepreciationPosted` | Reporting Service | Archive depreciation record |
| `AssetDisposed` | Reporting Service | Archive with disposal details |
| `AssetTransferred` | Inventory Service | Update location reference |

### Detailed Documentation

For complete implementation details, see:

- **[Asset Accounting Architecture](./ASSET_ACCOUNTING_ARCHITECTURE.md)** - Full architecture design, domain model, database schema
- **[Asset Accounting Business Rules](./ASSET_ACCOUNTING_BUSINESS_RULES.md)** - 34 business rules covering all asset operations
- **[Asset Accounting Implementation Plan](./ASSET_ACCOUNTING_IMPLEMENTATION_PLAN.md)** - 8-phase implementation roadmap

### Folder Structure Extension

The Asset Accounting Module extends the Accounting Service structure:

```
services/accounting-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── ... (existing)
│   │   │   ├── fixed-asset.entity.ts
│   │   │   ├── asset-category.entity.ts
│   │   │   ├── depreciation-schedule.entity.ts
│   │   │   ├── asset-movement.entity.ts
│   │   │   └── asset-maintenance.entity.ts
│   │   ├── services/
│   │   │   ├── ... (existing)
│   │   │   └── depreciation-calculator.service.ts
│   │   └── repositories/
│   │       ├── ... (existing)
│   │       ├── fixed-asset.repository.ts
│   │       ├── asset-category.repository.ts
│   │       └── depreciation-schedule.repository.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── ... (existing)
│   │   │   ├── register-asset.command.ts
│   │   │   ├── activate-asset.command.ts
│   │   │   ├── dispose-asset.command.ts
│   │   │   ├── transfer-asset.command.ts
│   │   │   └── run-depreciation.command.ts
│   │   └── queries/
│   │       ├── ... (existing)
│   │       ├── get-asset-register.query.ts
│   │       ├── get-depreciation-report.query.ts
│   │       └── get-asset-schedule.query.ts
│   └── infrastructure/
│       ├── http/
│       │   ├── routes/
│       │   │   ├── ... (existing)
│       │   │   └── assets.routes.ts
│       │   └── controllers/
│       │       ├── ... (existing)
│       │       └── asset.controller.ts
│       └── scheduled/
│           └── depreciation-cron.ts  # Monthly depreciation trigger
├── migrations/
│   ├── ... (existing)
│   ├── 0010_create_asset_categories.sql
│   ├── 0011_create_fixed_assets.sql
│   ├── 0012_create_depreciation_schedules.sql
│   ├── 0013_create_asset_movements.sql
│   └── 0014_create_asset_maintenance.sql
└── ...
```

### API Endpoints (Asset Module)

```
# Asset Categories
GET    /api/accounting/asset-categories              # List categories
POST   /api/accounting/asset-categories              # Create category
PUT    /api/accounting/asset-categories/:id          # Update category

# Fixed Assets
GET    /api/accounting/assets                        # List assets
GET    /api/accounting/assets/:id                    # Get asset details
POST   /api/accounting/assets                        # Register new asset
PUT    /api/accounting/assets/:id                    # Update asset
POST   /api/accounting/assets/:id/activate           # Activate asset
POST   /api/accounting/assets/:id/dispose            # Dispose asset
POST   /api/accounting/assets/:id/transfer           # Transfer asset

# Depreciation
GET    /api/accounting/assets/:id/depreciation       # Get depreciation schedule
POST   /api/accounting/depreciation/run              # Run monthly depreciation

# Maintenance
GET    /api/accounting/assets/:id/maintenance        # List maintenance records
POST   /api/accounting/assets/:id/maintenance        # Record maintenance

# Reports
GET    /api/accounting/reports/asset-register        # Asset register report
GET    /api/accounting/reports/depreciation          # Depreciation report
GET    /api/accounting/reports/asset-value           # Asset value summary
```
