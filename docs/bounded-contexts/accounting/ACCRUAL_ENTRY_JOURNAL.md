# Accrual Entry Journal

## Overview

This document describes the **Accrual Entry Form** that automates journal entry creation for period-end accrual adjustments. Accruals ensure expenses and revenues are recorded in the correct accounting period, regardless of cash payment timing.

**Key Features:**
- Month-end expense accruals
- Utility bill accruals (estimated)
- Accrual reversal on payment
- Recurring accrual templates
- Multi-location allocation support

---

## 1. Accounts Covered

### Expense Accounts (Debit on Accrual)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 6120 | Beban Listrik | Electricity Expense | Electricity accrual |
| 6130 | Beban Air | Water Expense | Water accrual |
| 6140 | Beban Telepon | Telephone Expense | Phone accrual |
| 6150 | Beban Internet | Internet Expense | Internet accrual |
| 6xxx | Various Expenses | Various | Other accrued expenses |

### Liability Accounts (Credit on Accrual)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 2230 | Hutang Listrik & Air | Utilities Payable | Electricity & water accrual |
| 2240 | Hutang Telepon & Internet | Telecom Payable | Phone & internet accrual |
| 2250 | Beban Akrual Lainnya | Other Accrued Expenses | Other accruals |

---

## 2. Types of Accruals

### Operating Expense Accruals

| Type | Typical Expenses | Timing |
|------|------------------|--------|
| **Utilities** | Electricity, water, gas | Monthly |
| **Telecommunications** | Phone, internet | Monthly |
| **Rent** | Office/store rent (if paid in arrears) | Monthly |
| **Professional Services** | Accounting, legal fees | As incurred |
| **Maintenance** | Equipment maintenance contracts | Monthly |

### Revenue Accruals (Less Common)

| Type | Description | Timing |
|------|-------------|--------|
| **Interest Receivable** | Interest earned but not received | Monthly |
| **Service Revenue** | Services delivered but not billed | As incurred |

---

## 3. User Interface Design

### Accrual Entry Form

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📅 Accrual Entry (Jurnal Akrual)                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Entry Type *                                                                │
│  ┌─────────────────────┐ ┌─────────────────────┐                            │
│  │  📝 New Accrual     │ │  ↩️ Reverse Accrual │                            │
│  │  (Akrual Baru)      │ │  (Balik Akrual)     │                            │
│  └─────────────────────┘ └─────────────────────┘                            │
│                                                                              │
│  Accrual Category *                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Select accrual type...                                           ▼  │  │
│  │ ○ Listrik & Air (Utilities - 2230)                                     │  │
│  │ ○ Telepon & Internet (Telecommunications - 2240)                       │  │
│  │ ○ Beban Akrual Lainnya (Other - 2250)                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [If Utilities Selected]                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ UTILITY ACCRUAL DETAILS                                                  ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Utility Type       Expense Account           Estimated Amount          ││
│  │  ┌───────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    ││
│  │  │ ✓ Listrik     │  │ 6120 Beban Listrik  │  │ Rp      2,500,000   │    ││
│  │  │ ✓ Air         │  │ 6130 Beban Air      │  │ Rp        350,000   │    ││
│  │  └───────────────┘  └─────────────────────┘  └─────────────────────┘    ││
│  │                                                                          ││
│  │  ⓘ Estimate based on previous month's actual                            ││
│  │    Previous: Listrik Rp 2,450,000 | Air Rp 320,000                       ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ LOCATION ALLOCATION (Optional)                                           ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  [ ] Allocate across multiple locations                                  ││
│  │                                                                          ││
│  │  [If checked]                                                            ││
│  │  Location                          │ Percentage │ Amount                 ││
│  │  ──────────────────────────────────┼────────────┼──────────────────      ││
│  │  Kantor Pusat                      │    40%     │ Rp 1,140,000           ││
│  │  Toko 1 - Kelapa Gading            │    35%     │ Rp   997,500           ││
│  │  Gudang Utama                      │    25%     │ Rp   712,500           ││
│  │  ──────────────────────────────────┼────────────┼──────────────────      ││
│  │  TOTAL                             │   100%     │ Rp 2,850,000           ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Accrual Period *                                                            │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │ January                 ▼  │  │ 2026                     ▼  │           │
│  └─────────────────────────────┘  └─────────────────────────────┘           │
│                                                                              │
│  Entry Date *                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 2026-01-31 (Period End)                                            📅  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Description                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Akrual beban utilitas bulan Januari 2026                               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [ ] Create recurring accrual (same amount each month)                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────────┐             │
│  │       Cancel           │  │     ✅ Post Accrual Entry      │             │
│  └────────────────────────┘  └────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Journal Entry Patterns

### 4.1 Utility Accrual (Month-End)

**When**: Last day of month, before receiving actual bill

**Journal Entry:**

```typescript
{
  entryNumber: "ACC-2026-01-001",
  entryDate: "2026-01-31",
  entryType: "Accrual",
  description: "Utility Accrual - January 2026",
  reference: "ACCR-UTIL-2026-01",
  sourceService: "accrual",
  isReversing: true,  // Auto-reverse flag
  reversalDate: "2026-02-01",  // Reverse on first day of next month
  lines: [
    // DEBIT: Electricity expense
    {
      accountCode: "6120",
      accountName: "Beban Listrik",
      direction: "Debit",
      amount: 2500000,
      warehouseId: "wh-hq-001",
      memo: "Estimated electricity - January 2026"
    },
    // DEBIT: Water expense
    {
      accountCode: "6130",
      accountName: "Beban Air",
      direction: "Debit",
      amount: 350000,
      warehouseId: "wh-hq-001",
      memo: "Estimated water - January 2026"
    },
    // CREDIT: Utilities payable
    {
      accountCode: "2230",
      accountName: "Hutang Listrik & Air",
      direction: "Credit",
      amount: 2850000,
      memo: "Accrued utilities payable"
    }
  ]
}
```

### 4.2 Accrual Reversal (Beginning of Next Month)

**When**: First day of next month (automatic reversal)

**Journal Entry:**

```typescript
{
  entryNumber: "ACC-2026-02-001",
  entryDate: "2026-02-01",
  entryType: "AccrualReversal",
  description: "Reversal: Utility Accrual - January 2026",
  reference: "REV-ACCR-UTIL-2026-01",
  sourceService: "accrual",
  reversalOf: "ACC-2026-01-001",
  lines: [
    // CREDIT: Reverse electricity expense
    {
      accountCode: "6120",
      accountName: "Beban Listrik",
      direction: "Credit",
      amount: 2500000,
      warehouseId: "wh-hq-001",
      memo: "Reversal - Estimated electricity"
    },
    // CREDIT: Reverse water expense
    {
      accountCode: "6130",
      accountName: "Beban Air",
      direction: "Credit",
      amount: 350000,
      warehouseId: "wh-hq-001",
      memo: "Reversal - Estimated water"
    },
    // DEBIT: Reverse utilities payable
    {
      accountCode: "2230",
      accountName: "Hutang Listrik & Air",
      direction: "Debit",
      amount: 2850000,
      memo: "Reversal - Accrued utilities"
    }
  ]
}
```

### 4.3 Telecommunications Accrual

**When**: Month-end for phone and internet

**Journal Entry:**

```typescript
{
  entryNumber: "ACC-2026-01-002",
  entryDate: "2026-01-31",
  entryType: "Accrual",
  description: "Telecom Accrual - January 2026",
  reference: "ACCR-TELCO-2026-01",
  sourceService: "accrual",
  isReversing: true,
  reversalDate: "2026-02-01",
  lines: [
    // DEBIT: Phone expense
    {
      accountCode: "6140",
      accountName: "Beban Telepon",
      direction: "Debit",
      amount: 800000,
      memo: "Estimated phone - January 2026"
    },
    // DEBIT: Internet expense
    {
      accountCode: "6150",
      accountName: "Beban Internet",
      direction: "Debit",
      amount: 1500000,
      memo: "Estimated internet - January 2026"
    },
    // CREDIT: Telecom payable
    {
      accountCode: "2240",
      accountName: "Hutang Telepon & Internet",
      direction: "Credit",
      amount: 2300000,
      memo: "Accrued telecom payable"
    }
  ]
}
```

### 4.4 Other Accrued Expenses

**Scenario**: Accruing professional service fee

**Journal Entry:**

```typescript
{
  entryNumber: "ACC-2026-01-003",
  entryDate: "2026-01-31",
  entryType: "Accrual",
  description: "Accrual - Accounting Service Fee January 2026",
  reference: "ACCR-PROF-2026-01",
  sourceService: "accrual",
  isReversing: true,
  reversalDate: "2026-02-01",
  lines: [
    // DEBIT: Professional fee expense
    {
      accountCode: "6581",
      accountName: "Beban Akuntan",
      direction: "Debit",
      amount: 5000000,
      memo: "Accounting service fee - January 2026"
    },
    // CREDIT: Other accrued expenses
    {
      accountCode: "2250",
      accountName: "Beban Akrual Lainnya",
      direction: "Credit",
      amount: 5000000,
      memo: "Accrued professional fee"
    }
  ]
}
```

### 4.5 Multi-Location Utility Accrual

**Scenario**: Allocate electricity across 3 locations

**Journal Entry:**

```typescript
{
  entryNumber: "ACC-2026-01-004",
  entryDate: "2026-01-31",
  entryType: "Accrual",
  description: "Multi-Location Electricity Accrual - January 2026",
  reference: "ACCR-ELEC-ML-2026-01",
  sourceService: "accrual",
  isReversing: true,
  reversalDate: "2026-02-01",
  lines: [
    // DEBIT: Split by location
    {
      accountCode: "6120",
      accountName: "Beban Listrik",
      direction: "Debit",
      amount: 2000000,
      warehouseId: "wh-hq-001",
      memo: "Electricity - Head Office (40%)"
    },
    {
      accountCode: "6120",
      accountName: "Beban Listrik",
      direction: "Debit",
      amount: 1750000,
      warehouseId: "store-001",
      memo: "Electricity - Toko 1 (35%)"
    },
    {
      accountCode: "6120",
      accountName: "Beban Listrik",
      direction: "Debit",
      amount: 1250000,
      warehouseId: "wh-main",
      memo: "Electricity - Gudang (25%)"
    },
    // CREDIT: Total payable
    {
      accountCode: "2230",
      accountName: "Hutang Listrik & Air",
      direction: "Credit",
      amount: 5000000,
      memo: "Accrued electricity"
    }
  ]
}
```

---

## 5. API Design

### 5.1 Create Accrual Entry

```
POST /api/accounting/accruals
```

**Request Schema:**

```typescript
interface CreateAccrualRequest {
  accrualCategory: 'UTILITIES' | 'TELECOM' | 'OTHER';
  accrualPeriod: {
    month: number;
    year: number;
  };
  entryDate: string;

  // For UTILITIES
  utilities?: {
    electricity?: number;
    water?: number;
    gas?: number;
  };

  // For TELECOM
  telecom?: {
    phone?: number;
    internet?: number;
  };

  // For OTHER
  otherAccrual?: {
    expenseAccountId: string;
    amount: number;
    description: string;
  };

  // Location allocation
  locationAllocations?: {
    warehouseId: string;
    percentage: number;
  }[];

  // Reversal settings
  autoReverse: boolean;
  reversalDate?: string;  // Defaults to first day of next month

  // Recurring
  isRecurring?: boolean;

  description?: string;
}
```

### 5.2 Get Accrual Suggestions

```
GET /api/accounting/accruals/suggestions?period=2026-01
```

**Response:**

```typescript
interface AccrualSuggestionsResponse {
  suggestions: {
    category: string;
    expenseAccount: string;
    suggestedAmount: number;
    basis: 'PREVIOUS_MONTH' | 'AVERAGE_3_MONTHS' | 'BUDGET';
    previousAmounts: {
      period: string;
      amount: number;
    }[];
  }[];
}
```

### 5.3 Reverse Accrual

```
POST /api/accounting/accruals/:accrualId/reverse
```

### 5.4 Get Accrual Summary

```
GET /api/accounting/accruals/summary?year=2026
```

---

## 6. Business Rules

### Rule 1: Accrual Timing
- Accruals recorded on last day of accounting period
- Reversals posted on first day of next period
- Cannot accrue for future periods

### Rule 2: Estimation Basis
- Base estimates on historical data (previous 3 months average)
- Compare with budget if available
- Flag significant variances (>20%) for review

### Rule 3: Auto-Reversal
- All period-end accruals should auto-reverse
- Reversal date = first day of next month
- Actual expense recorded when bill received

### Rule 4: Reconciliation
- Compare accrual vs. actual expense monthly
- Large variances indicate estimation problems
- Adjust future accrual estimates accordingly

### Rule 5: Recurring Accruals
- Can set up recurring templates for regular accruals
- Templates copied each month with same amounts
- Amounts can be adjusted before posting

### Rule 6: Location Tracking
- Allocate shared expenses by location
- Percentages must sum to 100%
- Enables P&L by location analysis

---

## 7. Accrual vs. Actual Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ACCRUAL VS ACTUAL EXPENSE FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  JANUARY 2026                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ JAN 31: Accrual Entry                                               │   │
│  │   DR  6120 Beban Listrik           2,500,000                        │   │
│  │   CR  2230 Hutang Listrik & Air                 2,500,000           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FEBRUARY 2026                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FEB 1: Auto-Reversal                                                │   │
│  │   DR  2230 Hutang Listrik & Air    2,500,000                        │   │
│  │   CR  6120 Beban Listrik                        2,500,000           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FEB 5: Actual Bill Received (Rp 2,450,000)                          │   │
│  │   DR  6120 Beban Listrik           2,450,000                        │   │
│  │   CR  1020 Bank BCA                             2,450,000           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  NET EFFECT:                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ January Expense:   Rp 2,500,000 (accrued)                           │   │
│  │ February Expense:  Rp   (50,000) (reversal net of actual)           │   │
│  │                                                                     │   │
│  │ If actual = accrual: Perfect match                                  │   │
│  │ If actual < accrual: Slight reversal reduces Feb expense            │   │
│  │ If actual > accrual: Slight addition increases Feb expense          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Monthly Accrual Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MONTH-END ACCRUAL CHECKLIST                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  □ Review previous month's accrual vs. actual variances                     │
│                                                                             │
│  □ Prepare accrual estimates:                                               │
│    □ Electricity (based on prior month + seasonal adjustment)               │
│    □ Water                                                                  │
│    □ Phone                                                                  │
│    □ Internet                                                               │
│    □ Professional fees (if any outstanding)                                 │
│                                                                             │
│  □ Verify location allocations                                              │
│                                                                             │
│  □ Post accrual entries on last day of month                                │
│                                                                             │
│  □ Confirm auto-reversal is set for first day of next month                 │
│                                                                             │
│  □ Document any significant estimation changes                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Actual expense recording
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
- [Gap Analysis](./AUTOMATED_JOURNAL_ENTRY_GAP_ANALYSIS.md) - Coverage analysis

---

**Document Version**: 1.0
**Created**: January 2026
**Maintained By**: Development Team
