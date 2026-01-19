# Payroll Module Journal Entry

## Overview

This document describes the **Payroll Module** that automates journal entry creation for employee payroll processing. This module covers approximately **30+ accounts** and is the highest-impact automation for reducing manual journal entries.

**Key Features:**
- Monthly payroll processing with automatic journal entries
- BPJS (Kesehatan & Ketenagakerjaan) handling
- PPh 21 withholding calculation
- THR (Tunjangan Hari Raya) processing
- Employee allowances (Tunjangan)
- Bonus and commission processing

---

## 1. Accounts Covered

### Expense Accounts (Debit)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 6010 | Beban Gaji Pokok | Basic Salary Expense | Monthly base salary |
| 6011 | Gaji - Manajemen | Salary - Management | Management salaries |
| 6012 | Gaji - Staff Kantor | Salary - Office Staff | Office staff salaries |
| 6013 | Gaji - Staff Toko | Salary - Store Staff | Store staff salaries |
| 6014 | Gaji - Staff Gudang | Salary - Warehouse Staff | Warehouse staff salaries |
| 6015 | Gaji - Driver | Salary - Drivers | Driver salaries |
| 6020 | Tunjangan Karyawan | Employee Allowances | General allowances |
| 6021 | Tunjangan Makan | Meal Allowance | Meal allowance |
| 6022 | Tunjangan Transport | Transportation Allowance | Transport allowance |
| 6023 | Tunjangan Kesehatan | Health Allowance | Health allowance |
| 6024 | Tunjangan Komunikasi | Communication Allowance | Phone/communication allowance |
| 6030 | THR (Tunjangan Hari Raya) | Holiday Allowance (THR) | Annual religious holiday bonus |
| 6040 | Bonus Karyawan | Employee Bonuses | Performance/year-end bonuses |
| 6050 | Komisi Sales | Sales Commissions | Sales commission payments |
| 6060 | BPJS Kesehatan - Perusahaan | BPJS Health - Company | Company contribution (4%) |
| 6061 | BPJS Ketenagakerjaan - Perusahaan | BPJS Employment - Company | Company contribution |
| 6070 | Beban Pelatihan | Training Expenses | Employee training |
| 6080 | Beban Rekrutmen | Recruitment Expenses | Hiring costs |
| 6090 | Beban Lembur | Overtime Expenses | Overtime payments |

### Liability Accounts (Credit)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 2130 | Hutang PPh 21 | Income Tax Art. 21 Payable | Employee income tax withholding |
| 2210 | Hutang Gaji | Salaries Payable | Net salary to pay |
| 2211 | Hutang Gaji Pokok | Basic Salary Payable | Basic salary unpaid |
| 2212 | Hutang THR | Holiday Allowance Payable | THR accrual/unpaid |
| 2213 | Hutang Bonus | Bonus Payable | Bonus accrual/unpaid |
| 2214 | Hutang Komisi Sales | Sales Commission Payable | Commission accrual/unpaid |
| 2220 | Hutang BPJS Kesehatan | BPJS Health Payable | BPJS Health (Company + Employee) |
| 2221 | Hutang BPJS Ketenagakerjaan | BPJS Employment Payable | BPJS Employment (Company + Employee) |

---

## 2. BPJS Contribution Rates (2024)

### BPJS Kesehatan (Health Insurance)

| Component | Rate | Paid By |
|-----------|------|---------|
| Company Contribution | 4% of salary | Employer |
| Employee Contribution | 1% of salary | Employee (withheld) |
| **Total** | **5%** | |

**Maximum Salary Basis**: Rp 12,000,000/month

### BPJS Ketenagakerjaan (Employment Insurance)

| Program | Company | Employee | Total |
|---------|---------|----------|-------|
| JKK (Jaminan Kecelakaan Kerja) | 0.24% - 1.74% | - | 0.24% - 1.74% |
| JKM (Jaminan Kematian) | 0.30% | - | 0.30% |
| JHT (Jaminan Hari Tua) | 3.70% | 2.00% | 5.70% |
| JP (Jaminan Pensiun) | 2.00% | 1.00% | 3.00% |

**Notes:**
- JKK rate depends on risk classification (trading company typically 0.24%)
- JP maximum salary basis: Rp 9,559,600/month (2024)
- JHT has no salary cap

---

## 3. User Interface Design

### Payroll Entry Form

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📋 Monthly Payroll Processing (Proses Gaji Bulanan)                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Payroll Period *                                                            │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │ January                 ▼  │  │ 2026                     ▼  │           │
│  └─────────────────────────────┘  └─────────────────────────────┘           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ EMPLOYEE SELECTION                                                        ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  [x] Select All Employees  (15 employees)                                ││
│  │                                                                          ││
│  │  Or filter by:                                                           ││
│  │  Department: ┌────────────────────────────────────┐                      ││
│  │              │ All Departments                 ▼  │                      ││
│  │              └────────────────────────────────────┘                      ││
│  │  Location:   ┌────────────────────────────────────┐                      ││
│  │              │ All Locations                   ▼  │                      ││
│  │              └────────────────────────────────────┘                      ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ PAYROLL SUMMARY                                                           ││
│  ├───────────────────────────────────────────────┬──────────────────────────┤│
│  │ Component                                     │ Amount (IDR)             ││
│  ├───────────────────────────────────────────────┼──────────────────────────┤│
│  │ Total Gross Salary                            │      125,000,000         ││
│  │ + Total Allowances                            │       18,500,000         ││
│  │ + Total Overtime                              │        5,200,000         ││
│  ├───────────────────────────────────────────────┼──────────────────────────┤│
│  │ = Gross Pay                                   │      148,700,000         ││
│  ├───────────────────────────────────────────────┼──────────────────────────┤│
│  │ - PPh 21 Withholding                          │       (8,250,000)        ││
│  │ - BPJS Kesehatan (Employee 1%)                │       (1,487,000)        ││
│  │ - BPJS Ketenagakerjaan (Employee 3%)          │       (4,461,000)        ││
│  ├───────────────────────────────────────────────┼──────────────────────────┤│
│  │ = Net Pay (Take Home)                         │      134,502,000         ││
│  ├───────────────────────────────────────────────┼──────────────────────────┤│
│  │ + BPJS Kesehatan (Company 4%)                 │        5,948,000         ││
│  │ + BPJS Ketenagakerjaan (Company 6.24%)        │        9,278,880         ││
│  ├───────────────────────────────────────────────┼──────────────────────────┤│
│  │ = Total Payroll Cost                          │      163,926,880         ││
│  └───────────────────────────────────────────────┴──────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ TAX & SOCIAL SECURITY OPTIONS (All Optional)                             ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  [x] Include PPh 21 Calculation                                          ││
│  │      ⓘ Withhold employee income tax                                      ││
│  │                                                                          ││
│  │  [x] Include BPJS Kesehatan                                              ││
│  │      ⓘ Company 4% + Employee 1% contribution                             ││
│  │                                                                          ││
│  │  [x] Include BPJS Ketenagakerjaan                                        ││
│  │      ⓘ JKK, JKM, JHT, JP contributions                                   ││
│  │                                                                          ││
│  │  Note: Uncheck if handled separately or not applicable                   ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Payment Method *                                                            │
│  ┌─────────────────┐ ┌─────────────────┐                                    │
│  │   💵 Cash       │ │   🏦 Bank       │ (BCA - Gaji)                       │
│  └─────────────────┘ └─────────────────┘                                    │
│                                                                              │
│  Payment Date *                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 2026-01-25                                                         📅  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────────┐             │
│  │   Preview Journals     │  │     ✅ Process Payroll         │             │
│  └────────────────────────┘  └────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Journal Entry Patterns

### 4.1 Monthly Payroll Journal (Accrual)

**When**: End of month (payroll accrual)

**Journal Entry:**

```typescript
{
  entryNumber: "PAY-2026-01-001",
  entryDate: "2026-01-31",
  entryType: "Payroll",
  description: "Payroll Accrual - January 2026",
  sourceService: "payroll",
  lines: [
    // DEBIT: Salary Expenses
    {
      accountCode: "6011",
      accountName: "Gaji - Manajemen",
      direction: "Debit",
      amount: 35000000,
      departmentId: "dept-mgt",
      memo: "Management salaries"
    },
    {
      accountCode: "6012",
      accountName: "Gaji - Staff Kantor",
      direction: "Debit",
      amount: 40000000,
      warehouseId: "wh-hq-001",
      memo: "Office staff salaries"
    },
    {
      accountCode: "6013",
      accountName: "Gaji - Staff Toko",
      direction: "Debit",
      amount: 30000000,
      warehouseId: "store-001",
      memo: "Store staff salaries"
    },
    {
      accountCode: "6014",
      accountName: "Gaji - Staff Gudang",
      direction: "Debit",
      amount: 20000000,
      warehouseId: "wh-main",
      memo: "Warehouse staff salaries"
    },
    // DEBIT: Allowances
    {
      accountCode: "6021",
      accountName: "Tunjangan Makan",
      direction: "Debit",
      amount: 7500000,
      memo: "Meal allowances"
    },
    {
      accountCode: "6022",
      accountName: "Tunjangan Transport",
      direction: "Debit",
      amount: 6000000,
      memo: "Transportation allowances"
    },
    {
      accountCode: "6024",
      accountName: "Tunjangan Komunikasi",
      direction: "Debit",
      amount: 5000000,
      memo: "Communication allowances"
    },
    // DEBIT: Overtime
    {
      accountCode: "6090",
      accountName: "Beban Lembur",
      direction: "Debit",
      amount: 5200000,
      memo: "Overtime payments"
    },
    // DEBIT: Company BPJS Contributions
    {
      accountCode: "6060",
      accountName: "BPJS Kesehatan - Perusahaan",
      direction: "Debit",
      amount: 5948000,
      memo: "BPJS Health - Company 4%"
    },
    {
      accountCode: "6061",
      accountName: "BPJS Ketenagakerjaan - Perusahaan",
      direction: "Debit",
      amount: 9278880,
      memo: "BPJS Employment - Company 6.24%"
    },

    // CREDIT: Liabilities
    {
      accountCode: "2210",
      accountName: "Hutang Gaji",
      direction: "Credit",
      amount: 134502000,
      memo: "Net salary payable"
    },
    {
      accountCode: "2130",
      accountName: "Hutang PPh 21",
      direction: "Credit",
      amount: 8250000,
      memo: "PPh 21 withholding"
    },
    {
      accountCode: "2220",
      accountName: "Hutang BPJS Kesehatan",
      direction: "Credit",
      amount: 7435000,
      memo: "BPJS Health (Company 4% + Employee 1%)"
    },
    {
      accountCode: "2221",
      accountName: "Hutang BPJS Ketenagakerjaan",
      direction: "Credit",
      amount: 13739880,
      memo: "BPJS Employment (Company 6.24% + Employee 3%)"
    }
  ]
}
```

### 4.2 Salary Payment Journal

**When**: Salary payment date (25th of month)

**Journal Entry:**

```typescript
{
  entryNumber: "PAY-2026-01-002",
  entryDate: "2026-01-25",
  entryType: "Payment",
  description: "Salary Payment - January 2026",
  sourceService: "payroll",
  lines: [
    // DEBIT: Clear salary payable
    {
      accountCode: "2210",
      accountName: "Hutang Gaji",
      direction: "Debit",
      amount: 134502000,
      memo: "Salary payment to employees"
    },
    // CREDIT: Bank/Cash payment
    {
      accountCode: "1021",
      accountName: "Bank BCA - Gaji",
      direction: "Credit",
      amount: 134502000,
      memo: "Bank transfer - Payroll"
    }
  ]
}
```

### 4.3 BPJS Payment Journal

**When**: 10th of following month

**Journal Entry:**

```typescript
{
  entryNumber: "PAY-2026-02-003",
  entryDate: "2026-02-10",
  entryType: "Payment",
  description: "BPJS Payment - Period January 2026",
  sourceService: "payroll",
  lines: [
    // DEBIT: Clear BPJS payables
    {
      accountCode: "2220",
      accountName: "Hutang BPJS Kesehatan",
      direction: "Debit",
      amount: 7435000,
      memo: "BPJS Health payment"
    },
    {
      accountCode: "2221",
      accountName: "Hutang BPJS Ketenagakerjaan",
      direction: "Debit",
      amount: 13739880,
      memo: "BPJS Employment payment"
    },
    // CREDIT: Bank payment
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 21174880,
      memo: "Bank transfer - BPJS"
    }
  ]
}
```

### 4.4 PPh 21 Payment Journal

**When**: 10th of following month

**Journal Entry:**

```typescript
{
  entryNumber: "PAY-2026-02-004",
  entryDate: "2026-02-10",
  entryType: "Payment",
  description: "PPh 21 Payment - Period January 2026",
  sourceService: "payroll",
  lines: [
    // DEBIT: Clear PPh 21 payable
    {
      accountCode: "2130",
      accountName: "Hutang PPh 21",
      direction: "Debit",
      amount: 8250000,
      memo: "PPh 21 tax payment"
    },
    // CREDIT: Bank payment
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 8250000,
      memo: "Bank transfer - PPh 21"
    }
  ]
}
```

### 4.5 THR Payment Journal

**When**: Before religious holiday (Lebaran/Christmas)

**Journal Entry:**

```typescript
{
  entryNumber: "PAY-2026-03-005",
  entryDate: "2026-03-15",
  entryType: "Payroll",
  description: "THR Payment - Lebaran 2026",
  sourceService: "payroll",
  lines: [
    // DEBIT: THR Expense
    {
      accountCode: "6030",
      accountName: "THR (Tunjangan Hari Raya)",
      direction: "Debit",
      amount: 125000000,
      memo: "THR - One month salary"
    },
    // CREDIT: Bank payment
    {
      accountCode: "1021",
      accountName: "Bank BCA - Gaji",
      direction: "Credit",
      amount: 125000000,
      memo: "THR payment to employees"
    }
  ]
}
```

### 4.6 Sales Commission Journal

**When**: Monthly (with payroll or separately)

**Journal Entry:**

```typescript
{
  entryNumber: "PAY-2026-01-006",
  entryDate: "2026-01-31",
  entryType: "Payroll",
  description: "Sales Commission - January 2026",
  sourceService: "payroll",
  lines: [
    // DEBIT: Commission expense (tracked by store)
    {
      accountCode: "6050",
      accountName: "Komisi Sales",
      direction: "Debit",
      amount: 15000000,
      warehouseId: "store-001",
      memo: "Sales commission - Toko 1"
    },
    {
      accountCode: "6050",
      accountName: "Komisi Sales",
      direction: "Debit",
      amount: 12000000,
      warehouseId: "store-002",
      memo: "Sales commission - Toko 2"
    },
    // CREDIT: Commission payable or direct payment
    {
      accountCode: "2214",
      accountName: "Hutang Komisi Sales",
      direction: "Credit",
      amount: 27000000,
      memo: "Commission payable"
    }
  ]
}
```

---

## 5. API Design

### 5.1 Process Payroll Endpoint

```
POST /api/accounting/payroll/process
```

**Request Schema:**

```typescript
interface ProcessPayrollRequest {
  period: {
    month: number;      // 1-12
    year: number;       // 2026
  };
  employeeFilter?: {
    departmentIds?: string[];
    locationIds?: string[];
    employeeIds?: string[];
  };
  paymentMethod: 'CASH' | 'BANK';
  paymentBankAccount?: string;  // Required if BANK
  paymentDate: string;          // ISO date
  includeAllowances: boolean;
  includeOvertime: boolean;
  saveAsDraft?: boolean;
}
```

**Response Schema:**

```typescript
interface ProcessPayrollResponse {
  success: boolean;
  data: {
    payrollId: string;
    period: string;
    status: 'Draft' | 'Posted';
    summary: {
      employeeCount: number;
      grossPay: number;
      deductions: {
        pph21: number;
        bpjsKesehatan: number;
        bpjsKetenagakerjaan: number;
      };
      netPay: number;
      companyContributions: {
        bpjsKesehatan: number;
        bpjsKetenagakerjaan: number;
      };
      totalCost: number;
    };
    journalEntries: {
      accrualEntryId: string;
      paymentEntryId?: string;
    };
  };
}
```

### 5.2 Get Payroll Summary

```
GET /api/accounting/payroll/summary?month=1&year=2026
```

### 5.3 Process THR Payment

```
POST /api/accounting/payroll/thr
```

---

## 6. Business Rules

### Rule 1: Payroll Period Lock
- Payroll can only be processed once per period per employee
- Previous period must be closed before processing new period
- Cannot modify posted payroll entries

### Rule 2: BPJS and Tax Components are OPTIONAL
- **PPh 21**: Optional - some employees may be below PTKP threshold or company handles separately
- **BPJS Kesehatan**: Optional - not all businesses are registered as BPJS employers
- **BPJS Ketenagakerjaan**: Optional - may be handled through separate payroll system
- Form validation allows processing payroll with only basic salary and allowances
- If enabled, system calculates based on current rates

### Rule 3: BPJS Caps (When Enabled)
- BPJS Kesehatan: Maximum salary basis Rp 12,000,000
- Jaminan Pensiun: Maximum salary basis Rp 9,559,600

### Rule 4: PPh 21 Calculation (When Enabled)
- Use TER (Tarif Efektif Rata-rata) method for monthly calculation
- Apply progressive tax rates (5%, 15%, 25%, 30%, 35%)
- Consider PTKP (Penghasilan Tidak Kena Pajak) status

### Rule 5: THR Timing
- Must be paid minimum 7 days before religious holiday
- Proportional THR for employees < 12 months

### Rule 6: Location Tracking
- Salary expenses tracked by employee's assigned location
- Enables P&L by location analysis

### Rule 7: Audit Trail
- All payroll entries linked to source payroll record
- Employee-level detail available for audit
- Cannot delete, only void/reverse

---

## 7. Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYROLL PROCESSING WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. MONTHLY PAYROLL (End of Month)                                          │
│     ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────┐      │
│     │ Calculate   │ → │ Generate        │ → │ Post Accrual        │      │
│     │ Gross Pay   │    │ Deductions      │    │ Journal Entry       │      │
│     └─────────────┘    └─────────────────┘    └─────────────────────┘      │
│                                                                             │
│  2. SALARY PAYMENT (25th of Month)                                          │
│     ┌─────────────┐    ┌─────────────────────┐                             │
│     │ Bank        │ → │ Post Payment         │                             │
│     │ Transfer    │    │ Journal Entry        │                             │
│     └─────────────┘    └─────────────────────┘                             │
│                                                                             │
│  3. TAX & BPJS PAYMENT (10th of Following Month)                            │
│     ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────┐      │
│     │ PPh 21      │ → │ BPJS            │ → │ Post Payment         │      │
│     │ Payment     │    │ Payment         │    │ Journal Entries      │      │
│     └─────────────┘    └─────────────────┘    └─────────────────────┘      │
│                                                                             │
│  4. THR PAYMENT (Before Holiday)                                            │
│     ┌─────────────┐    ┌─────────────────────┐                             │
│     │ Calculate   │ → │ Post THR             │                             │
│     │ THR         │    │ Journal Entry        │                             │
│     └─────────────┘    └─────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Operating expenses
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
- [Gap Analysis](./AUTOMATED_JOURNAL_ENTRY_GAP_ANALYSIS.md) - Coverage analysis

---

**Document Version**: 1.0
**Created**: January 2026
**Maintained By**: Development Team
