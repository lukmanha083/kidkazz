# Loan Entry Form Journal

## Overview

This document describes the **Loan Entry Form** that automates journal entry creation for bank loans, working capital credit, and related financing transactions. This form simplifies the recording of loan drawdowns, principal repayments, and interest expenses.

**Key Features:**
- Loan drawdown recording
- Principal and interest payment tracking
- Working capital credit (KMK) management
- Bank overdraft handling
- Automatic interest expense calculation

---

## 1. Accounts Covered

### Asset Accounts (Debit on Drawdown)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 1020 | Bank BCA - Operasional | BCA Bank - Operating | Loan proceeds received |
| 1024 | Bank Mandiri - Operasional | Mandiri Bank - Operating | Loan proceeds received |

### Liability Accounts (Credit on Drawdown, Debit on Repayment)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 2310 | Pinjaman Bank Jangka Pendek | Short-term Bank Loan | Loans < 12 months |
| 2315 | Cerukan Bank (Overdraft) | Bank Overdraft | Overdraft facility |
| 2320 | Kredit Modal Kerja (KMK) | Working Capital Credit Line | Revolving credit |
| 2410 | Hutang Bank Jangka Panjang | Long-term Bank Loan | Loans > 12 months |

### Expense Accounts (Debit on Interest Payment)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 7110 | Beban Bunga Pinjaman | Loan Interest Expense | Interest on bank loans |
| 7120 | Beban Bunga Leasing | Lease Interest Expense | Finance lease interest |

---

## 2. Loan Types and Classification

### Short-term Loans (< 12 months)

| Loan Type | Account Code | Description |
|-----------|--------------|-------------|
| **Short-term Bank Loan** | 2310 | Fixed-term loan < 1 year |
| **Bank Overdraft** | 2315 | Automatic overdraft facility |
| **Working Capital Credit (KMK)** | 2320 | Revolving credit line |

### Long-term Loans (> 12 months)

| Loan Type | Account Code | Description |
|-----------|--------------|-------------|
| **Long-term Bank Loan** | 2410 | Fixed-term loan > 1 year |
| **Finance Lease** | 2420 | Equipment/vehicle lease |

---

## 3. User Interface Design

### Loan Entry Form

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  💰 Loan Transaction Entry (Transaksi Pinjaman)                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Transaction Type *                                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │  📥 Drawdown    │ │  📤 Repayment   │ │  💵 Interest    │                │
│  │  (Pencairan)    │ │  (Pembayaran)   │ │  (Bunga)        │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                              │
│  Loan Type *                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Select loan type...                                              ▼  │  │
│  │ ○ Pinjaman Bank Jangka Pendek (2310)                                   │  │
│  │ ○ Cerukan Bank / Overdraft (2315)                                      │  │
│  │ ○ Kredit Modal Kerja / KMK (2320)                                      │  │
│  │ ○ Pinjaman Bank Jangka Panjang (2410)                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [If existing loan]                                                          │
│  Loan Reference *                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Select existing loan...                                          ▼  │  │
│  │ ○ LOAN-2025-001 - KMK BCA - Rp 500,000,000 (Balance: Rp 350,000,000)  │  │
│  │ ○ LOAN-2025-002 - Term Loan Mandiri - Rp 200,000,000                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Amount (IDR) *                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Rp                                                    100,000,000      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [If Drawdown - New Loan]                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ NEW LOAN DETAILS                                                         ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Loan Amount (Principal)     Interest Rate (% p.a.)                      ││
│  │  ┌─────────────────────────┐ ┌─────────────────────────┐                ││
│  │  │ Rp       500,000,000    │ │         9.50             │                ││
│  │  └─────────────────────────┘ └─────────────────────────┘                ││
│  │                                                                          ││
│  │  Loan Term (Months)          Start Date                                  ││
│  │  ┌─────────────────────────┐ ┌─────────────────────────┐                ││
│  │  │            12           │ │ 2026-01-15          📅  │                ││
│  │  └─────────────────────────┘ └─────────────────────────┘                ││
│  │                                                                          ││
│  │  Bank Account *                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │ Bank BCA - Operasional (1020)                                   ▼  │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [If Repayment]                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ REPAYMENT BREAKDOWN                                                      ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Principal Amount           Interest Amount                              ││
│  │  ┌─────────────────────────┐ ┌─────────────────────────┐                ││
│  │  │ Rp        41,666,667    │ │ Rp         3,958,333    │                ││
│  │  └─────────────────────────┘ └─────────────────────────┘                ││
│  │                                                                          ││
│  │  Total Payment: Rp 45,625,000                                            ││
│  │                                                                          ││
│  │  Payment From *                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │ Bank BCA - Operasional (1020)                                   ▼  │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Transaction Date *           Reference                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐   │
│  │ 2026-01-15          📅  │  │ LOAN-BCA-2026-001                       │   │
│  └─────────────────────────┘  └─────────────────────────────────────────┘   │
│                                                                              │
│  Description                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Pencairan KMK BCA untuk modal kerja Q1 2026                            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────────┐             │
│  │       Cancel           │  │     ✅ Save Transaction        │             │
│  └────────────────────────┘  └────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Journal Entry Patterns

### 4.1 Loan Drawdown (New Loan)

**When**: Receiving loan proceeds from bank

**Journal Entry:**

```typescript
{
  entryNumber: "LOAN-2026-01-001",
  entryDate: "2026-01-15",
  entryType: "LoanDrawdown",
  description: "KMK Drawdown - BCA Working Capital Credit",
  reference: "LOAN-BCA-2026-001",
  sourceService: "loan",
  lines: [
    // DEBIT: Bank account (receiving funds)
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 500000000,
      memo: "Loan proceeds - KMK BCA"
    },
    // CREDIT: Loan liability
    {
      accountCode: "2320",
      accountName: "Kredit Modal Kerja (KMK)",
      direction: "Credit",
      amount: 500000000,
      memo: "KMK facility drawdown"
    }
  ]
}
```

### 4.2 Loan Repayment (Principal + Interest)

**When**: Making loan payment (typically monthly)

**Journal Entry:**

```typescript
{
  entryNumber: "LOAN-2026-02-002",
  entryDate: "2026-02-15",
  entryType: "LoanRepayment",
  description: "KMK Monthly Payment - February 2026",
  reference: "PAY-LOAN-BCA-2026-02",
  sourceService: "loan",
  lines: [
    // DEBIT: Reduce loan liability (principal)
    {
      accountCode: "2320",
      accountName: "Kredit Modal Kerja (KMK)",
      direction: "Debit",
      amount: 41666667,
      memo: "Principal repayment"
    },
    // DEBIT: Interest expense
    {
      accountCode: "7110",
      accountName: "Beban Bunga Pinjaman",
      direction: "Debit",
      amount: 3958333,
      memo: "Interest expense (9.5% p.a.)"
    },
    // CREDIT: Bank account (payment)
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 45625000,
      memo: "Loan payment"
    }
  ]
}
```

### 4.3 Interest-Only Payment (Auto-Debit via Bank Statement)

**When**: Bank auto-debits interest from giro account (common for KMK revolving)

**Note**: This is typically identified through **Bank Statement Reconciliation** rather than manual entry. See Section 8 for the automated workflow.

**Journal Entry:**

```typescript
{
  entryNumber: "LOAN-2026-02-003",
  entryDate: "2026-02-28",
  entryType: "InterestPayment",
  description: "KMK Interest Payment - February 2026 (Auto-Debit)",
  reference: "INT-KMK-2026-02",
  sourceService: "bank-reconciliation",  // Created via reconciliation
  bankStatementRef: "STMT-BCA-2026-02-28-0015",
  lines: [
    // DEBIT: Interest expense
    {
      accountCode: "7110",
      accountName: "Beban Bunga Pinjaman",
      direction: "Debit",
      amount: 3958333,
      memo: "Monthly interest on KMK (Rp 500M x 9.5% / 12)"
    },
    // CREDIT: Bank account
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 3958333,
      memo: "Auto-debit interest payment"
    }
  ]
}
```

### 4.4 Bank Overdraft Usage

**When**: Using overdraft facility (negative bank balance)

**Journal Entry:**

```typescript
{
  entryNumber: "LOAN-2026-01-004",
  entryDate: "2026-01-20",
  entryType: "OverdraftUsage",
  description: "Bank Overdraft Usage - BCA",
  sourceService: "loan",
  lines: [
    // DEBIT: Bank account (temporarily positive)
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 50000000,
      memo: "Overdraft facility usage"
    },
    // CREDIT: Overdraft liability
    {
      accountCode: "2315",
      accountName: "Cerukan Bank (Overdraft)",
      direction: "Credit",
      amount: 50000000,
      memo: "Overdraft drawn"
    }
  ]
}
```

### 4.5 Long-term Loan Reclassification

**When**: End of year - reclassify current portion of long-term debt

**Journal Entry:**

```typescript
{
  entryNumber: "ADJ-2026-12-001",
  entryDate: "2026-12-31",
  entryType: "Reclassification",
  description: "Reclassify Current Portion of Long-term Debt",
  sourceService: "loan",
  lines: [
    // DEBIT: Reduce long-term liability
    {
      accountCode: "2410",
      accountName: "Hutang Bank Jangka Panjang",
      direction: "Debit",
      amount: 100000000,
      memo: "Current portion due within 12 months"
    },
    // CREDIT: Increase short-term liability
    {
      accountCode: "2310",
      accountName: "Pinjaman Bank Jangka Pendek",
      direction: "Credit",
      amount: 100000000,
      memo: "Current portion of long-term debt"
    }
  ]
}
```

---

## 5. API Design

### 5.1 Create Loan Transaction

```
POST /api/accounting/loans/transaction
```

**Request Schema:**

```typescript
interface LoanTransactionRequest {
  transactionType: 'DRAWDOWN' | 'REPAYMENT' | 'INTEREST_ONLY';
  loanType: 'SHORT_TERM' | 'OVERDRAFT' | 'KMK' | 'LONG_TERM';

  // For new loan (DRAWDOWN)
  newLoan?: {
    principalAmount: number;
    interestRate: number;      // Annual percentage
    termMonths: number;
    startDate: string;
    bankAccountId: string;
  };

  // For existing loan (REPAYMENT/INTEREST)
  existingLoanId?: string;

  amount: number;

  // For repayment breakdown
  repayment?: {
    principalAmount: number;
    interestAmount: number;
  };

  paymentBankAccountId?: string;
  transactionDate: string;
  reference?: string;
  description?: string;
}
```

### 5.2 Get Loan Summary

```
GET /api/accounting/loans/summary
```

**Response:**

```typescript
interface LoanSummaryResponse {
  loans: {
    id: string;
    reference: string;
    type: string;
    originalAmount: number;
    currentBalance: number;
    interestRate: number;
    maturityDate: string;
    monthlyPayment: number;
    status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
  }[];
  totals: {
    totalDebt: number;
    shortTermDebt: number;
    longTermDebt: number;
    monthlyInterestExpense: number;
  };
}
```

### 5.3 Get Loan Schedule

```
GET /api/accounting/loans/:loanId/schedule
```

---

## 6. Business Rules

### Rule 1: Loan Classification
- Loans with maturity < 12 months → Short-term (2310, 2315, 2320)
- Loans with maturity > 12 months → Long-term (2410)
- Current portion of long-term debt must be reclassified at year-end

### Rule 2: Interest Calculation
- Interest calculated on outstanding balance
- Accrual basis: recognize interest expense monthly
- Payment timing may differ from accrual

### Rule 3: Overdraft Handling
- Overdraft creates automatic liability when bank balance goes negative
- Interest typically calculated daily on outstanding balance

### Rule 4: KMK (Working Capital Credit)
- Revolving facility - can draw and repay multiple times
- Track available credit limit vs. utilized amount
- Interest-only payment option available

### Rule 5: Audit Trail
- All loan transactions linked to loan master record
- Track balance changes over time
- Cannot delete, only void/reverse

---

## 7. Interest Calculation Methods

### Simple Interest

```typescript
function calculateSimpleInterest(
  principal: number,
  annualRate: number,
  months: number
): number {
  return principal * (annualRate / 100) * (months / 12);
}
```

### Monthly Interest on Outstanding Balance

```typescript
function calculateMonthlyInterest(
  outstandingBalance: number,
  annualRate: number
): number {
  return outstandingBalance * (annualRate / 100) / 12;
}
```

### Amortization Schedule

```typescript
function calculateAmortization(
  principal: number,
  annualRate: number,
  termMonths: number
): AmortizationSchedule[] {
  const monthlyRate = (annualRate / 100) / 12;
  const monthlyPayment = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  let balance = principal;
  const schedule: AmortizationSchedule[] = [];

  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    balance -= principalPayment;

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest,
      balance: Math.max(0, balance)
    });
  }

  return schedule;
}
```

---

## 8. Bank Reconciliation Workflow for Auto-Debit Interest

### Overview

Most bank loans (especially KMK/Working Capital Credit) have interest auto-debited from the giro account monthly. Instead of manual entry, these can be **automatically detected** through bank statement reconciliation.

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              BANK RECONCILIATION - LOAN INTEREST AUTO-DETECTION             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. IMPORT BANK STATEMENT (Two Methods)                                     │
│                                                                             │
│     METHOD A: Direct Bank API (Recommended)                                 │
│     ┌─────────────────┐                                                     │
│     │ 🔗 Bank API     │  Supported banks:                                   │
│     │ Auto-Fetch      │  - BCA API (Corporate Internet Banking)             │
│     └────────┬────────┘  - Mandiri Cash Management API                      │
│              │           - BRI API                                          │
│              │           - CIMB Niaga API                                   │
│              │                                                              │
│              │  ✓ Real-time sync                                            │
│              │  ✓ Structured data (no parsing needed)                       │
│              │  ✓ Automatic daily/hourly fetch                              │
│              │                                                              │
│     ─────────┼─────────────────────────────────────────────────────────     │
│              │                                                              │
│     METHOD B: PDF Upload + AI Extraction                                    │
│     ┌─────────────────┐                                                     │
│     │ 📄 Upload PDF   │  Process:                                           │
│     │ Bank Statement  │  1. Upload PDF statement                            │
│     └────────┬────────┘  2. Send to Reducto.ai for extraction               │
│              │           3. Convert to structured markdown/JSON             │
│              │           4. Parse into transaction lines                    │
│              │                                                              │
│              │  ✓ Works with any bank                                       │
│              │  ✓ Handles scanned documents                                 │
│              │  ✓ AI-powered table extraction                               │
│              │                                                              │
│              ▼                                                              │
│  2. PATTERN RECOGNITION                                                     │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ System scans for loan-related keywords:                          │    │
│     │                                                                   │    │
│     │ Interest Keywords:           Principal Keywords:                  │    │
│     │ ├─ "BUNGA"                   ├─ "ANGSURAN"                       │    │
│     │ ├─ "BUNGA KMK"               ├─ "POKOK PINJAMAN"                 │    │
│     │ ├─ "INTEREST"                ├─ "PRINCIPAL"                      │    │
│     │ ├─ "INT PINJAMAN"            └─ "CICILAN"                        │    │
│     │ └─ "BEBAN BUNGA"                                                 │    │
│     │                                                                   │    │
│     │ Also matches:                                                     │    │
│     │ ├─ Loan reference numbers (e.g., "KMK-001234")                   │    │
│     │ └─ Recurring amounts on similar dates                            │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│              │                                                              │
│              ▼                                                              │
│  3. AUTO-MATCH WITH LOAN RECORDS                                            │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ Bank Statement Line:                                             │    │
│     │ Date: 2026-02-28 | Desc: "BUNGA KMK 001234" | Amount: -3,958,333│    │
│     │                          ↓                                       │    │
│     │ Matched Loan:                                                    │    │
│     │ LOAN-BCA-2026-001 | KMK BCA | Rate: 9.5% | Balance: Rp 500M     │    │
│     │                          ↓                                       │    │
│     │ Expected Interest: Rp 500M × 9.5% ÷ 12 = Rp 3,958,333 ✓        │    │
│     │ Variance: Rp 0 (Exact Match)                                    │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│              │                                                              │
│              ▼                                                              │
│  4. SUGGEST JOURNAL ENTRIES                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ Suggested Entry:                                                 │    │
│     │ ┌───────────────────────────────────────────────────────────┐   │    │
│     │ │ DR  7110 Beban Bunga Pinjaman     Rp 3,958,333            │   │    │
│     │ │ CR  1020 Bank BCA - Operasional                Rp 3,958,333│   │    │
│     │ └───────────────────────────────────────────────────────────┘   │    │
│     │                                                                  │    │
│     │ Confidence: HIGH (98%) - Amount matches expected interest        │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│              │                                                              │
│              ▼                                                              │
│  5. USER REVIEW & APPROVE                                                   │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ [✓] Accept  [ ] Modify  [ ] Skip                                │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│              │                                                              │
│              ▼                                                              │
│  6. POST JOURNAL ENTRY                                                      │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │ Journal Entry Posted                                             │    │
│     │ Entry #: LOAN-2026-02-003                                        │    │
│     │ Bank Statement Line: RECONCILED ✓                                │    │
│     │ Loan Balance Updated: Rp 500,000,000 (no change - interest only)│    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bank Statement Import UI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🏦 Bank Reconciliation - Loan Interest Detection                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Account: Bank BCA - Operasional (1020)     Period: February 2026      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ DETECTED LOAN TRANSACTIONS                                               ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Date       │ Description              │ Amount      │ Match    │ Action ││
│  │  ───────────┼──────────────────────────┼─────────────┼──────────┼─────── ││
│  │  2026-02-28 │ BUNGA KMK 001234         │ -3,958,333  │ ✓ HIGH   │ [✓]   ││
│  │             │ → Matched: KMK BCA       │             │ 98%      │        ││
│  │             │ → Expected: 3,958,333    │             │          │        ││
│  │  ───────────┼──────────────────────────┼─────────────┼──────────┼─────── ││
│  │  2026-02-15 │ ANGSURAN KMK 001234      │ -45,625,000 │ ✓ HIGH   │ [✓]   ││
│  │             │ → Principal: 41,666,667  │             │ 95%      │        ││
│  │             │ → Interest:   3,958,333  │             │          │        ││
│  │  ───────────┼──────────────────────────┼─────────────┼──────────┼─────── ││
│  │  2026-02-10 │ ADM REKENING GIRO        │ -15,000     │ ? LOW    │ [ ]   ││
│  │             │ → Not loan related       │             │ 20%      │        ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────────────────┐                 │
│  │  Skip All Unmatched │  │  ✅ Create Selected Entries    │                 │
│  └────────────────────┘  └────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Matching Algorithm

```typescript
interface BankStatementLine {
  date: string;
  description: string;
  amount: number;  // Negative for debits
  reference?: string;
}

interface LoanMatchResult {
  loanId: string;
  matchType: 'INTEREST' | 'PRINCIPAL' | 'COMBINED' | 'UNKNOWN';
  confidence: number;  // 0-100
  suggestedEntry: JournalEntry;
  variance?: number;
}

function matchLoanTransaction(
  line: BankStatementLine,
  activeLoans: Loan[]
): LoanMatchResult | null {

  // Step 1: Keyword detection
  const interestKeywords = ['BUNGA', 'INTEREST', 'INT PINJAMAN', 'BEBAN BUNGA'];
  const principalKeywords = ['ANGSURAN', 'POKOK', 'PRINCIPAL', 'CICILAN'];

  const descUpper = line.description.toUpperCase();
  const isInterest = interestKeywords.some(k => descUpper.includes(k));
  const isPrincipal = principalKeywords.some(k => descUpper.includes(k));

  // Step 2: Match against active loans
  for (const loan of activeLoans) {
    // Check if loan reference in description
    if (loan.referenceNumber && descUpper.includes(loan.referenceNumber)) {
      const expectedInterest = calculateMonthlyInterest(
        loan.currentBalance,
        loan.interestRate
      );

      // Interest-only match
      if (isInterest && !isPrincipal) {
        const variance = Math.abs(Math.abs(line.amount) - expectedInterest);
        const confidence = variance < 1000 ? 98 : variance < 10000 ? 85 : 60;

        return {
          loanId: loan.id,
          matchType: 'INTEREST',
          confidence,
          variance,
          suggestedEntry: createInterestJournalEntry(loan, Math.abs(line.amount), line)
        };
      }

      // Combined principal + interest (installment)
      if (isPrincipal || (!isInterest && !isPrincipal)) {
        // Try to match with expected installment
        const expectedInstallment = loan.monthlyPayment;
        if (expectedInstallment) {
          const variance = Math.abs(Math.abs(line.amount) - expectedInstallment);
          const confidence = variance < 1000 ? 95 : variance < 50000 ? 75 : 50;

          return {
            loanId: loan.id,
            matchType: 'COMBINED',
            confidence,
            variance,
            suggestedEntry: createInstallmentJournalEntry(loan, Math.abs(line.amount), line)
          };
        }
      }
    }
  }

  // Step 3: Fuzzy match by amount pattern
  // Look for recurring amounts on similar dates
  // ...

  return null;
}
```

### Learning from History

The system improves over time by learning from:

1. **Confirmed matches**: When user approves a suggestion, pattern is reinforced
2. **User corrections**: When user modifies a suggestion, new pattern is learned
3. **Recurring patterns**: Same amount on same date each month = high confidence

```typescript
interface LoanTransactionPattern {
  bankDescription: string;   // Pattern to match
  loanId: string;           // Associated loan
  transactionType: 'INTEREST' | 'PRINCIPAL' | 'COMBINED';
  typicalAmount?: number;    // For variance detection
  typicalDay?: number;       // Day of month (e.g., 28)
  confirmationCount: number; // Times user confirmed
}

// Example learned patterns
const learnedPatterns: LoanTransactionPattern[] = [
  {
    bankDescription: "BUNGA KMK 001234",
    loanId: "loan-kmk-bca-001",
    transactionType: "INTEREST",
    typicalAmount: 3958333,
    typicalDay: 28,
    confirmationCount: 6  // High confidence after 6 months
  }
];
```

### Data Source Integration

#### Method A: Direct Bank API Integration

```typescript
interface BankAPIConfig {
  provider: 'BCA' | 'MANDIRI' | 'BRI' | 'CIMB';
  credentials: {
    corporateId: string;
    apiKey: string;
    apiSecret: string;
  };
  accountNumber: string;
  syncFrequency: 'HOURLY' | 'DAILY' | 'ON_DEMAND';
}

// Fetch transactions directly from bank API
async function fetchBankTransactions(
  config: BankAPIConfig,
  dateRange: { from: string; to: string }
): Promise<BankStatementLine[]> {

  switch (config.provider) {
    case 'BCA':
      // BCA API - Corporate Internet Banking
      return await bcaApi.getAccountStatement(
        config.credentials,
        config.accountNumber,
        dateRange
      );

    case 'MANDIRI':
      // Mandiri Cash Management API
      return await mandiriApi.getTransactions(
        config.credentials,
        config.accountNumber,
        dateRange
      );

    // ... other banks
  }
}
```

#### Method B: PDF Upload with Reducto.ai

```typescript
interface PDFExtractionResult {
  success: boolean;
  transactions: BankStatementLine[];
  metadata: {
    bankName: string;
    accountNumber: string;
    statementPeriod: { from: string; to: string };
    openingBalance: number;
    closingBalance: number;
  };
  confidence: number;
}

// Extract transactions from PDF using Reducto.ai
async function extractFromPDF(
  pdfFile: File,
  bankAccountId: string
): Promise<PDFExtractionResult> {

  // 1. Upload to Reducto.ai
  const reductoResponse = await reductoApi.extract({
    file: pdfFile,
    extractionType: 'BANK_STATEMENT',
    outputFormat: 'JSON',
    options: {
      detectTables: true,
      extractDates: true,
      extractAmounts: true,
      language: 'id'  // Indonesian
    }
  });

  // 2. Parse Reducto output into our format
  const transactions = parseReductoOutput(reductoResponse);

  // 3. Validate extracted data
  const validation = validateExtractedTransactions(transactions);

  return {
    success: validation.isValid,
    transactions,
    metadata: reductoResponse.metadata,
    confidence: reductoResponse.confidence
  };
}

// Reducto.ai prompt for bank statement extraction
const REDUCTO_PROMPT = `
Extract all transactions from this Indonesian bank statement.
For each transaction, extract:
- Date (format: YYYY-MM-DD)
- Description (full text)
- Debit amount (if any)
- Credit amount (if any)
- Balance after transaction

Also extract:
- Bank name
- Account number
- Statement period
- Opening balance
- Closing balance

Output as JSON array.
`;
```

#### UI: Data Source Selection

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🏦 Import Bank Statement                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bank Account: Bank BCA - Operasional (1020)                                │
│                                                                              │
│  Import Method:                                                              │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────────┐    │
│  │  🔗 Fetch from Bank API         │ │  📄 Upload PDF Statement        │    │
│  │  (Recommended)                  │ │  (AI-Powered Extraction)        │    │
│  └─────────────────────────────────┘ └─────────────────────────────────┘    │
│                                                                              │
│  [If Bank API selected]                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  ✓ Connected to BCA Corporate API                                        ││
│  │  Last sync: 2026-01-19 08:00 WIB                                         ││
│  │                                                                          ││
│  │  Fetch Period:                                                           ││
│  │  ┌─────────────────────┐  to  ┌─────────────────────┐                   ││
│  │  │ 2026-01-01      📅  │      │ 2026-01-31      📅  │                   ││
│  │  └─────────────────────┘      └─────────────────────┘                   ││
│  │                                                                          ││
│  │  [ ] Auto-sync daily at 06:00 WIB                                        ││
│  │                                                                          ││
│  │  ┌────────────────────────────────┐                                      ││
│  │  │     🔄 Fetch Transactions      │                                      ││
│  │  └────────────────────────────────┘                                      ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [If PDF Upload selected]                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │                                                                    │  ││
│  │  │     📄 Drop PDF file here or click to browse                      │  ││
│  │  │                                                                    │  ││
│  │  │     Supported: PDF bank statements from any Indonesian bank       │  ││
│  │  │     Max size: 10MB                                                │  ││
│  │  │                                                                    │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  │  ⓘ We use Reducto.ai to extract transactions from your PDF.             ││
│  │    Processing typically takes 10-30 seconds.                             ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

```
# Method A: Fetch from Bank API
POST /api/accounting/bank-reconciliation/fetch
{ bankAccountId, dateFrom, dateTo }

# Method B: Upload PDF for AI extraction
POST /api/accounting/bank-reconciliation/upload-pdf
Content-Type: multipart/form-data
{ bankAccountId, file }

# Legacy: Import structured file (CSV/OFX)
POST /api/accounting/bank-reconciliation/import
Content-Type: multipart/form-data
{ bankAccountId, file, format: 'CSV' | 'OFX' | 'MT940' }

# Get loan transaction suggestions
GET /api/accounting/bank-reconciliation/loan-suggestions
?bankAccountId=acc-1020&period=2026-02

# Approve and create journal entries
POST /api/accounting/bank-reconciliation/loan-transactions/approve
{ suggestions: [{ suggestionId, approved: true, modifications?: {} }] }

# Mark as not loan-related (trains the system)
POST /api/accounting/bank-reconciliation/loan-transactions/skip
{ statementLineId, reason: 'NOT_LOAN_RELATED' }
```

---

## 9. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Operating expenses
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
- [Gap Analysis](./AUTOMATED_JOURNAL_ENTRY_GAP_ANALYSIS.md) - Coverage analysis

---

**Document Version**: 1.0
**Created**: January 2026
**Maintained By**: Development Team
