# Automated Journal Entry Gap Analysis

## Overview

This document analyzes which COA accounts are covered by automatic journal entry forms versus which require manual double-entry journal input. The goal is to **minimize manual journal entry** to reduce human errors in account selection.

**Analysis Date**: January 2026
**Reference**: [INDONESIAN_TRADING_COA.md](./INDONESIAN_TRADING_COA.md)

---

## Coverage Summary

| Category | Accounts | Automated | Manual | Coverage |
|----------|----------|-----------|--------|----------|
| Assets (1xxx) | 55 | 50 | 5 | 91% |
| Liabilities (2xxx) | 42 | 20 | 22 | 48% |
| Equity (3xxx) | 10 | 6 | 4 | 60% |
| Revenue (4xxx) | 25 | 25 | 0 | 100% |
| COGS (5xxx) | 25 | 25 | 0 | 100% |
| Operating Expense (6xxx) | 85 | 55 | 30 | 65% |
| Other Inc/Exp (7xxx) | 12 | 8 | 4 | 67% |
| Tax (8xxx) | 5 | 0 | 5 | 0% |
| **TOTAL** | **259** | **189** | **70** | **73%** |

---

## Fully Automated (No Manual Entry Needed)

### Assets (1xxx)

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 1000-1039 | Cash & Bank | Fund Transfer, Expense Entry, Income Receipt, Sales, A/P Payment |
| 1100-1159 | Trade Receivables | Sales Journal, A/R Collection Entry |
| 1200-1260 | Inventory | Purchase Entry, Stock Opname, Sales COGS |
| 1300-1370 | Prepaid Expenses | Capital & Prepaid Expense Entry |
| 1400-1491 | Fixed Assets | Capital & Prepaid Expense Entry (including depreciation) |
| 1531-1541 | Software & Leasehold | Capital & Prepaid Expense Entry |

### Liabilities (2xxx)

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 2010-2012 | Trade Payables | Purchase Entry, A/P Payment Entry |
| 2030-2040 | Customer Advances | Sales Journal (credit sale flow) |
| 2110-2120 | PPn (VAT) | Sales Journal (output), Purchase Entry (input) |
| 2330-2332 | Credit Card Payable | Credit Card Expense Workflow |

### Equity (3xxx)

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 3100-3120 | Paid-in Capital | Owner Equity Transaction Entry |
| 3200-3220 | Retained Earnings | Year-end closing (planned) |
| 3500 | Owner's Drawings | Owner Equity Transaction Entry |

### Revenue (4xxx) - 100% Automated

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 4000-4055 | Sales Revenue | Sales Journal Entry |
| 4100-4130 | Sales Deductions | Sales Journal Entry (returns, discounts) |
| 4200-4240 | Other Operating Revenue | Income Receipt Entry |

### COGS (5xxx) - 100% Automated

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 5000-5130 | Purchases & Deductions | Inventory Purchase Entry |
| 5200-5240 | Inventory Adjustments | Stock Opname Journal Entry |
| 5300-5350 | COGS by Channel | Sales Journal Entry |

### Operating Expenses (6xxx) - Partially Automated

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 6100-6190 | Rent & Utilities | Automatic Expense Journal Entry, Prepaid Expense |
| 6200-6291 | Depreciation & Amortization | Capital & Prepaid Expense (auto depreciation) |
| 6300-6373 | Marketing & Sales | Automatic Expense Journal Entry |
| 6400-6440 | Shipping & Logistics | Automatic Expense Journal Entry |
| 6500-6595 | Administrative & General | Automatic Expense Journal Entry |
| 6600-6640 | Insurance & Security | Automatic Expense Journal Entry |
| 6700-6750 | Maintenance & Repairs | Automatic Expense Journal Entry |
| 6810-6830 | Loss Expenses | Stock Opname (inventory), A/R Collection (bad debt) |
| 6900-6990 | Other Operating | Automatic Expense Entry, Fund Transfer (bank charges) |

### Other Income/Expense (7xxx)

| COA Range | Category | Automated By |
|-----------|----------|--------------|
| 7000-7060 | Other Income | Income Receipt Entry |
| 7110-7120 | Interest Expense | Credit Card Expense Workflow |

---

## Not Automated - Requires Manual Entry or New Module

### HIGH PRIORITY - Build Automation

#### 1. Payroll Module (Covers 30+ Accounts)

**Accounts Affected:**

| COA Code | Account Name | Transaction Type |
|----------|--------------|------------------|
| 6010-6015 | Gaji (Management, Office, Store, Warehouse, Driver) | Salary Expense |
| 6020-6024 | Tunjangan (Makan, Transport, Kesehatan, Komunikasi) | Allowances |
| 6030 | THR (Tunjangan Hari Raya) | Holiday Allowance |
| 6040 | Bonus Karyawan | Employee Bonus |
| 6050 | Komisi Sales | Sales Commission |
| 6060-6061 | BPJS (Kesehatan, Ketenagakerjaan) | Company BPJS |
| 6070-6090 | Pelatihan, Rekrutmen, Lembur | HR Expenses |
| 2130 | Hutang PPh 21 | PPh 21 Payable |
| 2210-2214 | Hutang Gaji, THR, Bonus, Komisi | Salary Payables |
| 2220-2221 | Hutang BPJS (Kesehatan, Ketenagakerjaan) | BPJS Payables |

**Reference**: [PAYROLL_MODULE_JOURNAL_ENTRY.md](./PAYROLL_MODULE_JOURNAL_ENTRY.md)

#### 2. Loan Entry Form (Bank Loans, Working Capital)

**Accounts Affected:**

| COA Code | Account Name | Transaction Type |
|----------|--------------|------------------|
| 2310 | Pinjaman Bank Jangka Pendek | Short-term Loan |
| 2315 | Cerukan Bank (Overdraft) | Bank Overdraft |
| 2320 | Kredit Modal Kerja (KMK) | Working Capital Credit |
| 2410 | Hutang Bank Jangka Panjang | Long-term Loan |
| 7110 | Beban Bunga Pinjaman | Loan Interest Expense |

**Reference**: [LOAN_ENTRY_JOURNAL.md](./LOAN_ENTRY_JOURNAL.md)

#### 3. PPh Final UMKM Tax Entry (Monthly 0.5%)

**Accounts Affected:**

| COA Code | Account Name | Transaction Type |
|----------|--------------|------------------|
| 8040 | Beban PPh Final UMKM | PPh Final Expense |
| 2135 | Hutang PPh Final UMKM | PPh Final Payable |

**Reference**: [PPH_FINAL_UMKM_ENTRY.md](./PPH_FINAL_UMKM_ENTRY.md)

#### 4. Asset Disposal Workflow (Enhance Existing)

**Accounts Affected:**

| COA Code | Account Name | Transaction Type |
|----------|--------------|------------------|
| 7040 | Pendapatan Penjualan Aset Tetap | Gain on Asset Sale |
| 7140 | Rugi Penjualan Aset Tetap | Loss on Asset Sale |
| 1400-1491 | Aset Tetap (All categories) | Asset Removal |
| 1421-1491 | Akumulasi Penyusutan | Depreciation Removal |

**Reference**: [ASSET_DISPOSAL_JOURNAL_ENTRY.md](./ASSET_DISPOSAL_JOURNAL_ENTRY.md)

#### 5. Accrual Entry Form (Period-End Adjustments)

**Accounts Affected:**

| COA Code | Account Name | Transaction Type |
|----------|--------------|------------------|
| 2230 | Hutang Listrik & Air | Accrued Utilities |
| 2240 | Hutang Telepon & Internet | Accrued Telecom |
| 2250 | Beban Akrual Lainnya | Other Accrued Expenses |

**Reference**: [ACCRUAL_ENTRY_JOURNAL.md](./ACCRUAL_ENTRY_JOURNAL.md)

---

### MEDIUM PRIORITY - Semi-Automation

| # | Transaction Type | Accounts Affected | Status |
|---|-----------------|-------------------|--------|
| 1 | Security Deposits | 1520-1522 | Add to Capital & Prepaid |
| 2 | FX Gain/Loss | 7030, 7130 | Create FX Adjustment Form |
| 3 | PPh 23 Withholding | 1342, 2131 | Add to Income Receipt |

### LOW PRIORITY - Keep Manual

| # | Transaction Type | Accounts | Why Manual is OK |
|---|-----------------|----------|------------------|
| 1 | Dividends | 3300 | Rare, board approval needed |
| 2 | OCI Adjustments | 3400-3410 | Complex, infrequent |
| 3 | Finance Lease | 2420 | Complex PSAK 73 calculations |
| 4 | Bonds Payable | 2440 | Very rare for trading company |
| 5 | Employee Benefits Liability | 2450 | Requires actuarial calculation |
| 6 | Deferred Tax | 8020-8030 | Year-end, accountant handles |
| 7 | Notes Payable | 2340 | Infrequent, complex terms |
| 8 | Related Party Loan | 2430 | Infrequent |

---

## Implementation Roadmap

### Phase 1: Payroll Module (Highest Impact)
- Covers ~30 accounts
- Increases automation from 73% to ~85%
- Reduces manual salary/BPJS entries

### Phase 2: Loan & Tax Entry Forms
- Loan Entry Form (5 accounts)
- PPh Final UMKM Entry (2 accounts)
- Increases automation to ~88%

### Phase 3: Period-End Automation
- Accrual Entry Form
- Asset Disposal Enhancement
- FX Adjustment Form
- Final automation ~92%

---

## Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Operating expenses
- [Automatic Income Receipt Entry](./AUTOMATIC_INCOME_RECEIPT_ENTRY.md) - Non-sales income
- [Sales Journal Entry](./SALES_JOURNAL_ENTRY.md) - Sales revenue & COGS
- [Capital & Prepaid Expense Entry](./CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md) - Fixed assets & prepaid
- [Owner Equity Transaction Entry](./OWNER_EQUITY_TRANSACTION_ENTRY.md) - Capital & drawings
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules

---

**Document Version**: 1.0
**Created**: January 2026
**Maintained By**: Development Team
