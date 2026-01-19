# PPh Final UMKM Tax Entry

## Overview

This document describes the **PPh Final UMKM Entry Form** that automates journal entry creation for monthly PPh Final UMKM (0.5% of gross revenue) tax calculation and payment. This applies to businesses with annual gross revenue ≤ Rp 4.8 billion.

**Key Features:**
- Automatic calculation of 0.5% tax on monthly gross revenue
- Tax accrual at month-end
- Tax payment recording (due 15th of following month)
- Exemption for revenue < Rp 500 million (annual)

---

## 1. Accounts Covered

### Expense Account (Debit)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 8040 | Beban PPh Final UMKM | PPh Final UMKM Expense (0.5%) | Monthly tax expense accrual |

### Liability Account (Credit on Accrual, Debit on Payment)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 2135 | Hutang PPh Final UMKM | PPh Final UMKM Payable | Tax payable before remittance |

### Asset Account (Credit on Payment)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 1020 | Bank BCA - Operasional | BCA Bank - Operating | Tax payment |

---

## 2. PPh Final UMKM Rules (PP 55/2022)

### Eligibility

| Criteria | Requirement |
|----------|-------------|
| Annual Gross Revenue | ≤ Rp 4.8 billion |
| Business Types | Trading, services, manufacturing (UMKM) |
| Tax Rate | 0.5% of gross revenue |
| Exemption | First Rp 500 million/year is tax-free |

### Validity Period

| Entity Type | Duration |
|-------------|----------|
| Individual (WP OP) | Until 2029 |
| CV, Firma, Koperasi | 4 years from registration |
| PT (Perseroan Terbatas) | 4 years from registration |

### Tax Calculation

```
PPh Final UMKM = Gross Revenue × 0.5%
```

**Important Notes:**
- Calculated monthly based on that month's gross revenue
- Cumulative tracking to apply Rp 500M exemption
- Once annual revenue exceeds Rp 500M, all subsequent revenue is taxed

---

## 3. User Interface Design

### PPh Final UMKM Entry Form

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🧾 PPh Final UMKM Entry (Pencatatan PPh Final 0.5%)                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Transaction Type *                                                          │
│  ┌─────────────────────┐ ┌─────────────────────┐                            │
│  │  📊 Tax Accrual     │ │  💳 Tax Payment     │                            │
│  │  (Akrual Pajak)     │ │  (Pembayaran)       │                            │
│  └─────────────────────┘ └─────────────────────┘                            │
│                                                                              │
│  Period *                                                                    │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │ January                 ▼  │  │ 2026                     ▼  │           │
│  └─────────────────────────────┘  └─────────────────────────────┘           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ REVENUE SUMMARY - JANUARY 2026                                           ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Gross Revenue (Peredaran Bruto)                                         ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │ Rp                                               850,000,000       │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  │  ⓘ Auto-calculated from Sales Journal (4000-4055) for this period       ││
│  │    Click "Recalculate" to refresh from accounting data                   ││
│  │                                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │  📈 YTD Revenue Tracking (Kumulatif Tahun Berjalan)                │  ││
│  │  ├────────────────────────────────────────────────────────────────────┤  ││
│  │  │                                                                    │  ││
│  │  │  YTD Revenue Before This Period:       Rp             0           │  ││
│  │  │  This Period Revenue:                  Rp   850,000,000           │  ││
│  │  │  ────────────────────────────────────────────────────             │  ││
│  │  │  YTD Revenue After This Period:        Rp   850,000,000           │  ││
│  │  │                                                                    │  ││
│  │  │  Exemption Limit:                      Rp   500,000,000           │  ││
│  │  │  ────────────────────────────────────────────────────             │  ││
│  │  │  Taxable Revenue This Period:          Rp   350,000,000           │  ││
│  │  │                                                                    │  ││
│  │  │  ⓘ First Rp 500M of annual revenue is exempt from PPh Final       │  ││
│  │  │                                                                    │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ TAX CALCULATION                                                          ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Taxable Revenue:                         Rp   350,000,000              ││
│  │  Tax Rate:                                           0.5%               ││
│  │  ────────────────────────────────────────────────────                   ││
│  │  PPh Final UMKM:                          Rp     1,750,000              ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [If Tax Payment]                                                            │
│  Payment Account *                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                                       ▼  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  NTPN (Nomor Transaksi Penerimaan Negara)                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 1234567890ABCDEF                                                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Transaction Date *                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 2026-01-31                                                         📅  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────────┐             │
│  │       Cancel           │  │     ✅ Record Tax Entry        │             │
│  └────────────────────────┘  └────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Journal Entry Patterns

### 4.1 Monthly Tax Accrual (Month-End)

**When**: End of each month

**Scenario**: January 2026 - First month, revenue Rp 850M

```typescript
{
  entryNumber: "TAX-2026-01-001",
  entryDate: "2026-01-31",
  entryType: "TaxAccrual",
  description: "PPh Final UMKM Accrual - January 2026",
  reference: "PPHFINAL-2026-01",
  sourceService: "tax",
  lines: [
    // DEBIT: Tax expense
    {
      accountCode: "8040",
      accountName: "Beban PPh Final UMKM",
      direction: "Debit",
      amount: 1750000,
      memo: "PPh Final 0.5% on Rp 350M (Revenue Rp 850M - Exempt Rp 500M)"
    },
    // CREDIT: Tax payable
    {
      accountCode: "2135",
      accountName: "Hutang PPh Final UMKM",
      direction: "Credit",
      amount: 1750000,
      memo: "PPh Final payable - Due Feb 15, 2026"
    }
  ]
}
```

### 4.2 Tax Payment (15th of Following Month)

**When**: Payment due date (max 15th of following month)

```typescript
{
  entryNumber: "TAX-2026-02-002",
  entryDate: "2026-02-15",
  entryType: "TaxPayment",
  description: "PPh Final UMKM Payment - Period January 2026",
  reference: "NTPN-1234567890ABCDEF",
  sourceService: "tax",
  lines: [
    // DEBIT: Clear tax payable
    {
      accountCode: "2135",
      accountName: "Hutang PPh Final UMKM",
      direction: "Debit",
      amount: 1750000,
      memo: "PPh Final payment for January 2026"
    },
    // CREDIT: Bank account
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 1750000,
      memo: "Tax payment via e-Billing"
    }
  ]
}
```

### 4.3 Full Month Taxable (After Exemption Used)

**Scenario**: February 2026 - Exemption already used, full revenue taxable

```typescript
{
  entryNumber: "TAX-2026-02-003",
  entryDate: "2026-02-28",
  entryType: "TaxAccrual",
  description: "PPh Final UMKM Accrual - February 2026",
  reference: "PPHFINAL-2026-02",
  sourceService: "tax",
  lines: [
    // DEBIT: Tax expense (full 0.5%)
    {
      accountCode: "8040",
      accountName: "Beban PPh Final UMKM",
      direction: "Debit",
      amount: 4500000,
      memo: "PPh Final 0.5% on full revenue Rp 900M"
    },
    // CREDIT: Tax payable
    {
      accountCode: "2135",
      accountName: "Hutang PPh Final UMKM",
      direction: "Credit",
      amount: 4500000,
      memo: "PPh Final payable - Due Mar 15, 2026"
    }
  ]
}
```

### 4.4 No Tax Due (Under Exemption)

**Scenario**: Revenue still under Rp 500M annual exemption

```typescript
// No journal entry created
// System records zero tax due with explanation
{
  taxPeriod: "2026-01",
  grossRevenue: 400000000,
  ytdRevenue: 400000000,
  exemptionLimit: 500000000,
  taxableRevenue: 0,
  taxAmount: 0,
  status: "EXEMPT",
  note: "YTD revenue (Rp 400M) below annual exemption (Rp 500M)"
}
```

---

## 5. API Design

### 5.1 Calculate PPh Final

```
POST /api/accounting/tax/pph-final/calculate
```

**Request:**

```typescript
interface CalculatePPhFinalRequest {
  period: {
    month: number;  // 1-12
    year: number;   // 2026
  };
}
```

**Response:**

```typescript
interface CalculatePPhFinalResponse {
  success: boolean;
  data: {
    period: string;
    grossRevenue: number;
    ytdRevenueBefore: number;
    ytdRevenueAfter: number;
    exemptionLimit: number;
    exemptionUsed: number;
    taxableRevenue: number;
    taxRate: number;
    taxAmount: number;
    status: 'TAXABLE' | 'EXEMPT' | 'PARTIAL_EXEMPT';
    breakdown?: {
      exemptPortion: number;
      taxablePortion: number;
    };
  };
}
```

### 5.2 Record Tax Accrual

```
POST /api/accounting/tax/pph-final/accrue
```

**Request:**

```typescript
interface AccruePPhFinalRequest {
  period: {
    month: number;
    year: number;
  };
  grossRevenue?: number;  // Override if not auto-calculated
  entryDate?: string;     // Defaults to last day of month
}
```

### 5.3 Record Tax Payment

```
POST /api/accounting/tax/pph-final/pay
```

**Request:**

```typescript
interface PayPPhFinalRequest {
  period: {
    month: number;
    year: number;
  };
  paymentDate: string;
  paymentBankAccountId: string;
  ntpn?: string;  // NTPN from e-Billing
}
```

### 5.4 Get Tax Summary

```
GET /api/accounting/tax/pph-final/summary?year=2026
```

**Response:**

```typescript
interface PPhFinalSummaryResponse {
  year: number;
  ytdGrossRevenue: number;
  exemptionUsed: number;
  exemptionRemaining: number;
  ytdTaxExpense: number;
  ytdTaxPaid: number;
  outstandingPayable: number;
  monthlyDetails: {
    month: number;
    grossRevenue: number;
    taxableRevenue: number;
    taxAmount: number;
    status: 'ACCRUED' | 'PAID' | 'EXEMPT';
    paymentDate?: string;
    ntpn?: string;
  }[];
}
```

---

## 6. Business Rules

### Rule 1: Exemption Tracking
- First Rp 500 million of annual gross revenue is exempt
- Exemption applied in chronological order (FIFO)
- Once YTD revenue exceeds Rp 500M, remaining is fully taxable
- Exemption resets on January 1st each year

### Rule 2: Gross Revenue Definition
- Sum of all sales revenue accounts (4000-4055)
- GROSS amount before discounts, returns, COGS
- Does NOT include:
  - Other income (7000-7099)
  - Interest income
  - Asset disposal gains

### Rule 3: Due Dates
- Tax calculated monthly
- Payment due by 15th of following month
- Late payment incurs 2% penalty per month

### Rule 4: Threshold Monitoring
- System must track annual gross revenue
- Alert when approaching Rp 4.8B threshold
- Above Rp 4.8B → must switch to Regular PPh regime

### Rule 5: Documentation
- Keep record of gross revenue calculation
- Store NTPN for each payment
- Maintain audit trail for tax reconciliation

---

## 7. Tax Calculation Logic

```typescript
interface TaxPeriodData {
  month: number;
  year: number;
  grossRevenue: number;
}

function calculatePPhFinalUMKM(
  currentPeriod: TaxPeriodData,
  ytdRevenueBefore: number
): TaxCalculationResult {
  const EXEMPTION_LIMIT = 500_000_000; // Rp 500 million
  const TAX_RATE = 0.005; // 0.5%

  const ytdRevenueAfter = ytdRevenueBefore + currentPeriod.grossRevenue;

  // Case 1: Still under exemption
  if (ytdRevenueAfter <= EXEMPTION_LIMIT) {
    return {
      taxableRevenue: 0,
      taxAmount: 0,
      status: 'EXEMPT',
      exemptionUsed: currentPeriod.grossRevenue,
      exemptionRemaining: EXEMPTION_LIMIT - ytdRevenueAfter
    };
  }

  // Case 2: Partially exempt (crossing threshold this month)
  if (ytdRevenueBefore < EXEMPTION_LIMIT) {
    const exemptPortion = EXEMPTION_LIMIT - ytdRevenueBefore;
    const taxablePortion = currentPeriod.grossRevenue - exemptPortion;

    return {
      taxableRevenue: taxablePortion,
      taxAmount: Math.round(taxablePortion * TAX_RATE),
      status: 'PARTIAL_EXEMPT',
      exemptionUsed: exemptPortion,
      exemptionRemaining: 0,
      breakdown: {
        exemptPortion,
        taxablePortion
      }
    };
  }

  // Case 3: Fully taxable (exemption already used)
  return {
    taxableRevenue: currentPeriod.grossRevenue,
    taxAmount: Math.round(currentPeriod.grossRevenue * TAX_RATE),
    status: 'TAXABLE',
    exemptionUsed: 0,
    exemptionRemaining: 0
  };
}
```

---

## 8. Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PPh FINAL UMKM MONTHLY WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. END OF MONTH - Tax Accrual                                              │
│     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│     │ Calculate       │ → │ Check           │ → │ Create Accrual  │      │
│     │ Gross Revenue   │    │ Exemption       │    │ Journal Entry   │      │
│     └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                                                             │
│  2. BEFORE 15TH - Tax Payment                                               │
│     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│     │ Generate        │ → │ Pay via         │ → │ Record Payment  │      │
│     │ e-Billing       │    │ Bank Transfer   │    │ with NTPN       │      │
│     └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                                                             │
│  3. YEAR-END - Summary                                                      │
│     ┌─────────────────┐    ┌─────────────────┐                             │
│     │ Reconcile       │ → │ Generate        │                             │
│     │ YTD Tax         │    │ Annual Report   │                             │
│     └─────────────────┘    └─────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Sales Journal Entry](./SALES_JOURNAL_ENTRY.md) - Revenue recognition
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
- [Gap Analysis](./AUTOMATED_JOURNAL_ENTRY_GAP_ANALYSIS.md) - Coverage analysis

---

**Document Version**: 1.0
**Created**: January 2026
**Maintained By**: Development Team
