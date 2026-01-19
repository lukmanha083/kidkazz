# Chart of Accounts (COA) - Indonesian Trading Company

## Overview

This document defines the standard Chart of Accounts for Kidkazz, an Indonesian trading company with retail, wholesale, and restaurant operations. The COA follows Indonesian Financial Accounting Standards (PSAK) and is optimized for multi-channel sales operations.

**Key Features:**
- PSAK-compliant account structure
- Indonesian account names with English translations
- Explicit financial statement classification (Balance Sheet / Income Statement)
- PPn (VAT) accounts for Indonesian tax compliance
- Multi-channel sales tracking (POS, Online, Wholesale, B2B)
- Restaurant-compatible accounts (using product bundles for BOM)

---

## Account Numbering Convention

| Range | Category | Financial Statement | Normal Balance |
|-------|----------|---------------------|----------------|
| 1000-1999 | Aset (Assets) | Balance Sheet | Debit |
| 2000-2999 | Liabilitas (Liabilities) | Balance Sheet | Credit |
| 3000-3999 | Ekuitas (Equity) | Balance Sheet | Credit |
| 4000-4999 | Pendapatan (Revenue) | Income Statement | Credit |
| 5000-5999 | Harga Pokok Penjualan (COGS) | Income Statement | Debit |
| 6000-6999 | Beban Operasional (Operating Expenses) | Income Statement | Debit |
| 7000-7999 | Pendapatan/Beban Lain-lain (Other Income/Expenses) | Income Statement | Varies |
| 8000-8999 | Pajak (Tax Accounts) | Income Statement | Debit |

---

## Account Categories

Account categories provide explicit classification for financial reporting and analysis. Each account is assigned to one of these categories:

### Category Definitions

| Category Code | Indonesian Name | English Name | Description | Lifespan |
|---------------|-----------------|--------------|-------------|----------|
| `CURRENT_ASSET` | Aset Lancar | Current Asset | Assets expected to be used/converted within 12 months | < 12 months |
| `FIXED_ASSET` | Aset Tetap | Fixed Asset | Tangible assets with lifespan > 12 months | > 12 months |
| `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Other Non-Current Asset | Intangible assets, investments, deposits | > 12 months |
| `CURRENT_LIABILITY` | Liabilitas Lancar | Current Liability | Debts due within 12 months | < 12 months |
| `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Long-term Liability | Debts due after 12 months | > 12 months |
| `EQUITY` | Ekuitas | Equity/Capital | Owner's claims against assets | N/A |
| `REVENUE` | Pendapatan | Revenue/Income | Sales and other income | N/A |
| `COGS` | Harga Pokok Penjualan | Cost of Goods Sold | Direct costs of selling goods/services | N/A |
| `OPERATING_EXPENSE` | Beban Operasional | Operating Expense | Indirect business expenses | N/A |
| `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Other Income/Expense | Non-operating income and expenses | N/A |
| `TAX` | Pajak | Tax | Income tax accounts | N/A |

### Category to Account Range Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ACCOUNT CATEGORY MAPPING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BALANCE SHEET ACCOUNTS                                                      │
│  ═══════════════════════                                                     │
│                                                                              │
│  ASSETS (1000-1999)                                                          │
│  ├── CURRENT_ASSET (1000-1399)                                               │
│  │   ├── 1000-1099: Cash & Bank                                              │
│  │   ├── 1100-1199: Receivables                                              │
│  │   ├── 1200-1299: Inventory                                                │
│  │   └── 1300-1399: Prepaid Expenses                                         │
│  │                                                                           │
│  ├── FIXED_ASSET (1400-1499)                                                 │
│  │   ├── 1410: Land                                                          │
│  │   ├── 1420-1421: Buildings & Accum. Depreciation                          │
│  │   ├── 1430-1431: Vehicles & Accum. Depreciation                           │
│  │   ├── 1440-1491: Equipment & Furniture                                    │
│  │   └── (Contra accounts have Credit normal balance)                        │
│  │                                                                           │
│  └── OTHER_NON_CURRENT_ASSET (1500-1599)                                     │
│      ├── 1510: Long-term Investments                                         │
│      ├── 1520-1522: Security Deposits                                        │
│      └── 1530-1541: Intangible Assets & Leasehold Improvements               │
│                                                                              │
│  LIABILITIES (2000-2999)                                                     │
│  ├── CURRENT_LIABILITY (2000-2399)                                           │
│  │   ├── 2000-2099: Trade Payables                                           │
│  │   ├── 2100-2199: Tax Payables                                             │
│  │   ├── 2200-2299: Accrued Expenses                                         │
│  │   └── 2300-2399: Short-term Loans                                         │
│  │                                                                           │
│  └── LONG_TERM_LIABILITY (2400-2499)                                         │
│      ├── 2410: Long-term Bank Loan                                           │
│      ├── 2420: Finance Lease Liability                                       │
│      └── 2450: Employee Benefits Liability                                   │
│                                                                              │
│  EQUITY (3000-3999)                                                          │
│  └── EQUITY                                                                  │
│      ├── 3100-3120: Paid-in Capital                                          │
│      ├── 3200-3220: Retained Earnings                                        │
│      ├── 3300: Dividends (Contra - Debit balance)                            │
│      └── 3500: Owner's Drawings (Contra - Debit balance)                     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│  INCOME STATEMENT ACCOUNTS                                                   │
│  ═════════════════════════                                                   │
│                                                                              │
│  REVENUE (4000-4299)                                                         │
│  └── REVENUE                                                                 │
│      ├── 4000-4099: Sales Revenue                                            │
│      ├── 4100-4199: Sales Deductions (Contra - Debit balance)                │
│      └── 4200-4299: Other Operating Revenue                                  │
│                                                                              │
│  COGS (5000-5399)                                                            │
│  └── COGS                                                                    │
│      ├── 5000-5099: Purchases                                                │
│      ├── 5100-5199: Purchase Deductions (Credit balance)                     │
│      ├── 5200-5299: Inventory Adjustments                                    │
│      └── 5300-5399: COGS by Channel                                          │
│                                                                              │
│  OPERATING_EXPENSE (6000-6999)                                               │
│  └── OPERATING_EXPENSE                                                       │
│      ├── 6000-6099: Payroll & Employee Expenses                              │
│      ├── 6100-6199: Rent & Utilities                                         │
│      ├── 6200-6299: Depreciation & Amortization                              │
│      ├── 6300-6399: Marketing & Sales                                        │
│      ├── 6400-6499: Shipping & Logistics                                     │
│      ├── 6500-6599: Administrative & General                                 │
│      ├── 6600-6699: Insurance & Security                                     │
│      ├── 6700-6799: Maintenance & Repairs                                    │
│      ├── 6800-6899: Loss Expenses                                            │
│      └── 6900-6999: Other Operating Expenses                                 │
│                                                                              │
│  OTHER_INCOME_EXPENSE (7000-7199)                                            │
│  └── OTHER_INCOME_EXPENSE                                                    │
│      ├── 7000-7099: Other Income (Credit balance)                            │
│      └── 7100-7199: Other Expenses (Debit balance)                           │
│                                                                              │
│  TAX (8000-8999)                                                             │
│  └── TAX                                                                     │
│      └── 8000-8040: Income Tax Expense                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Chart of Accounts

### 1000-1999: ASET (Assets) - Balance Sheet

#### 1000-1099: Aset Lancar - Kas & Bank (Current Assets - Cash & Bank)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 1000 | **Kas & Bank** | Cash & Bank (Header) | `CURRENT_ASSET` | Aset Lancar | Debit | No |
| 1010 | Kas Kecil - Kantor Pusat | Petty Cash - Head Office | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1011 | Kas Kecil - Gudang | Petty Cash - Warehouse | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1012 | Kas Laci POS - Toko 1 | POS Cash Drawer - Store 1 | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1013 | Kas Laci POS - Toko 2 | POS Cash Drawer - Store 2 | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1014 | Kas Laci POS - Toko 3 | POS Cash Drawer - Store 3 | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1020 | Bank BCA - Operasional | BCA Bank - Operating | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1021 | Bank BCA - Gaji | BCA Bank - Payroll | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1022 | Bank BRI - Tabungan | BRI Bank - Savings | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1023 | Bank CIMB Niaga - USD | CIMB Niaga Bank - USD | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1024 | Bank Mandiri - Operasional | Mandiri Bank - Operating | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1025 | Rekening Cadangan Pajak | Tax Reserve Savings Account | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1026 | Rekening Cadangan PPn | VAT Reserve Savings Account | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1027 | Rekening Cadangan PPh Badan | Corporate Tax Reserve Account | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1030 | Deposito Berjangka < 3 Bulan | Time Deposit < 3 Months | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1031 | Reksa Dana Pasar Uang | Money Market Fund | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |

#### 1100-1199: Aset Lancar - Piutang (Current Assets - Receivables)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 1100 | **Piutang** | Receivables (Header) | `CURRENT_ASSET` | Aset Lancar | Debit | No |
| 1110 | Piutang Usaha | Accounts Receivable - Trade | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1111 | Piutang Usaha - Retail | A/R - Retail Customers | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1112 | Piutang Usaha - Grosir | A/R - Wholesale Customers | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1113 | Piutang Usaha - B2B | A/R - B2B Customers | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1114 | Piutang Usaha - GoFood/GrabFood | A/R - Food Delivery Apps | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1120 | Cadangan Kerugian Piutang | Allowance for Doubtful Accounts | `CURRENT_ASSET` | Aset Lancar | Credit | Yes |
| 1130 | Piutang Karyawan | Employee Receivables | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1140 | Piutang Lain-lain | Other Receivables | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1150 | Uang Muka Pembelian | Purchase Advances | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1151 | Uang Muka Supplier | Supplier Advances | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |

#### 1200-1299: Aset Lancar - Persediaan (Current Assets - Inventory)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 1200 | **Persediaan** | Inventory (Header) | `CURRENT_ASSET` | Aset Lancar | Debit | No |
| 1210 | Persediaan Barang Dagang | Merchandise Inventory | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1211 | Persediaan - Gudang Utama | Inventory - Main Warehouse | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1212 | Persediaan - Gudang Cabang | Inventory - Branch Warehouse | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1213 | Persediaan - Toko | Inventory - Store | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1220 | Persediaan Dalam Perjalanan | Inventory in Transit | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1230 | Persediaan Konsinyasi | Consignment Inventory | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1240 | Cadangan Penurunan Nilai Persediaan | Inventory Valuation Allowance | `CURRENT_ASSET` | Aset Lancar | Credit | Yes |
| 1250 | Persediaan Bahan Baku | Raw Materials Inventory | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1251 | Persediaan Bahan Penolong | Supplies Inventory | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1260 | Persediaan Kemasan | Packaging Inventory | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |

#### 1300-1399: Aset Lancar - Biaya Dibayar Dimuka (Current Assets - Prepaid Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 1300 | **Biaya Dibayar Dimuka** | Prepaid Expenses (Header) | `CURRENT_ASSET` | Aset Lancar | Debit | No |
| 1310 | Sewa Dibayar Dimuka | Prepaid Rent | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1320 | Asuransi Dibayar Dimuka | Prepaid Insurance | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1330 | Iklan Dibayar Dimuka | Prepaid Advertising | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1340 | Pajak Dibayar Dimuka | Prepaid Taxes | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1341 | PPh 22 Dibayar Dimuka | Prepaid Income Tax Art. 22 | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1342 | PPh 23 Dibayar Dimuka | Prepaid Income Tax Art. 23 | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1343 | PPh 25 Dibayar Dimuka | Prepaid Income Tax Art. 25 | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1350 | Perlengkapan Kantor | Office Supplies | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1360 | Perlengkapan Toko | Store Supplies | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |
| 1370 | Biaya Dibayar Dimuka Lainnya | Other Prepaid Expenses | `CURRENT_ASSET` | Aset Lancar | Debit | Yes |

#### 1400-1499: Aset Tetap (Fixed Assets)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 1400 | **Aset Tetap** | Fixed Assets (Header) | `FIXED_ASSET` | Aset Tetap | Debit | No |
| 1410 | Tanah | Land | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1420 | Bangunan | Buildings | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1421 | Akumulasi Penyusutan Bangunan | Accumulated Depreciation - Buildings | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1430 | Kendaraan | Vehicles | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1431 | Akumulasi Penyusutan Kendaraan | Accumulated Depreciation - Vehicles | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1440 | Peralatan Kantor | Office Equipment | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1441 | Akumulasi Penyusutan Peralatan Kantor | Accumulated Depreciation - Office Equipment | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1450 | Peralatan Toko | Store Equipment | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1451 | Akumulasi Penyusutan Peralatan Toko | Accumulated Depreciation - Store Equipment | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1460 | Peralatan Gudang | Warehouse Equipment | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1461 | Akumulasi Penyusutan Peralatan Gudang | Accumulated Depreciation - Warehouse Equipment | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1470 | Peralatan Komputer & IT | Computer & IT Equipment | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1471 | Akumulasi Penyusutan Peralatan Komputer | Accumulated Depreciation - Computer Equipment | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1480 | Peralatan POS | POS Equipment | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1481 | Akumulasi Penyusutan Peralatan POS | Accumulated Depreciation - POS Equipment | `FIXED_ASSET` | Aset Tetap | Credit | Yes |
| 1490 | Meubel & Perabotan | Furniture & Fixtures | `FIXED_ASSET` | Aset Tetap | Debit | Yes |
| 1491 | Akumulasi Penyusutan Meubel | Accumulated Depreciation - Furniture | `FIXED_ASSET` | Aset Tetap | Credit | Yes |

#### 1500-1599: Aset Tidak Lancar Lainnya (Other Non-Current Assets)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 1500 | **Aset Tidak Lancar Lainnya** | Other Non-Current Assets (Header) | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | No |
| 1510 | Investasi Jangka Panjang | Long-term Investments | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1520 | Uang Jaminan | Security Deposits | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1521 | Uang Jaminan Sewa | Rental Security Deposit | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1522 | Uang Jaminan Listrik/Air | Utility Security Deposit | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1530 | Aset Tak Berwujud | Intangible Assets | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1531 | Software & Lisensi | Software & Licenses | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1532 | Akumulasi Amortisasi Software | Accumulated Amortization - Software | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Credit | Yes |
| 1540 | Renovasi Bangunan Sewa | Leasehold Improvements | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Debit | Yes |
| 1541 | Akumulasi Penyusutan Renovasi | Accumulated Depreciation - Leasehold Improvements | `OTHER_NON_CURRENT_ASSET` | Aset Tidak Lancar Lainnya | Credit | Yes |

---

### 2000-2999: LIABILITAS (Liabilities) - Balance Sheet

#### 2000-2099: Liabilitas Lancar - Hutang Usaha (Current Liabilities - Trade Payables)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 2000 | **Hutang Usaha** | Trade Payables (Header) | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | No |
| 2010 | Hutang Dagang | Accounts Payable - Trade | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2011 | Hutang Dagang - Supplier Lokal | A/P - Local Suppliers | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2012 | Hutang Dagang - Supplier Impor | A/P - Import Suppliers | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2020 | Hutang Lain-lain | Other Payables | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2030 | Uang Muka Pelanggan | Customer Advances | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2031 | Uang Muka - Retail | Customer Advances - Retail | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2032 | Uang Muka - Grosir | Customer Advances - Wholesale | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2040 | Pendapatan Diterima Dimuka | Deferred Revenue | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |

#### 2100-2199: Liabilitas Lancar - Hutang Pajak (Current Liabilities - Tax Payables)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 2100 | **Hutang Pajak** | Tax Payables (Header) | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | No |
| 2110 | PPn Keluaran | VAT Output (Sales VAT) | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2111 | PPn Keluaran - POS | VAT Output - POS Sales | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2112 | PPn Keluaran - Online | VAT Output - Online Sales | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2113 | PPn Keluaran - Grosir | VAT Output - Wholesale | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2120 | PPn Masukan | VAT Input (Purchase VAT) | `CURRENT_LIABILITY` | Liabilitas Lancar | Debit | Yes |
| 2130 | Hutang PPh 21 | Income Tax Art. 21 Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2131 | Hutang PPh 23 | Income Tax Art. 23 Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2132 | Hutang PPh 25 | Income Tax Art. 25 Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2133 | Hutang PPh 29 | Income Tax Art. 29 Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2134 | Hutang PPh 4(2) | Income Tax Art. 4(2) Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2135 | Hutang PPh Final UMKM | PPh Final UMKM Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2140 | Hutang PBB | Property Tax Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |

#### 2200-2299: Liabilitas Lancar - Hutang Gaji & Beban (Current Liabilities - Accrued Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 2200 | **Hutang Gaji & Beban Akrual** | Accrued Expenses (Header) | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | No |
| 2210 | Hutang Gaji | Salaries Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2211 | Hutang Gaji Pokok | Basic Salary Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2212 | Hutang THR | Holiday Allowance Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2213 | Hutang Bonus | Bonus Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2214 | Hutang Komisi Sales | Sales Commission Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2220 | Hutang BPJS Kesehatan | BPJS Health Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2221 | Hutang BPJS Ketenagakerjaan | BPJS Employment Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2230 | Hutang Listrik & Air | Utilities Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2240 | Hutang Telepon & Internet | Telecom Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2250 | Beban Akrual Lainnya | Other Accrued Expenses | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |

#### 2300-2399: Liabilitas Lancar - Hutang Bank Jangka Pendek (Current Liabilities - Short-term Loans)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 2300 | **Hutang Bank Jangka Pendek** | Short-term Bank Loans (Header) | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | No |
| 2310 | Pinjaman Bank Jangka Pendek | Short-term Bank Loan | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2315 | Cerukan Bank (Overdraft) | Bank Overdraft | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2320 | Kredit Modal Kerja (KMK) | Working Capital Credit Line | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2330 | Hutang Kartu Kredit | Credit Card Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2331 | Hutang Kartu Kredit - BCA | Credit Card Payable - BCA | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2332 | Hutang Kartu Kredit - Mandiri | Credit Card Payable - Mandiri | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |
| 2340 | Hutang Wesel Bayar | Notes Payable | `CURRENT_LIABILITY` | Liabilitas Lancar | Credit | Yes |

#### 2400-2499: Liabilitas Jangka Panjang (Long-term Liabilities)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 2400 | **Liabilitas Jangka Panjang** | Long-term Liabilities (Header) | `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Credit | No |
| 2410 | Hutang Bank Jangka Panjang | Long-term Bank Loan | `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Credit | Yes |
| 2420 | Hutang Sewa Pembiayaan | Finance Lease Liability | `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Credit | Yes |
| 2430 | Hutang Pihak Berelasi | Related Party Loan | `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Credit | Yes |
| 2440 | Hutang Obligasi | Bonds Payable | `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Credit | Yes |
| 2450 | Liabilitas Imbalan Kerja | Employee Benefits Liability | `LONG_TERM_LIABILITY` | Liabilitas Jangka Panjang | Credit | Yes |

---

### 3000-3999: EKUITAS (Equity) - Balance Sheet

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 3000 | **Ekuitas** | Equity (Header) | `EQUITY` | Ekuitas | Credit | No |
| 3100 | Modal Disetor | Paid-in Capital | `EQUITY` | Ekuitas | Credit | Yes |
| 3110 | Modal Saham | Share Capital | `EQUITY` | Ekuitas | Credit | Yes |
| 3120 | Agio Saham | Additional Paid-in Capital | `EQUITY` | Ekuitas | Credit | Yes |
| 3200 | Laba Ditahan | Retained Earnings | `EQUITY` | Ekuitas | Credit | Yes |
| 3210 | Laba Ditahan Tahun Lalu | Prior Year Retained Earnings | `EQUITY` | Ekuitas | Credit | Yes |
| 3220 | Laba Tahun Berjalan | Current Year Earnings | `EQUITY` | Ekuitas | Credit | Yes |
| 3300 | Dividen | Dividends | `EQUITY` | Ekuitas | Debit | Yes |
| 3400 | Pendapatan Komprehensif Lain | Other Comprehensive Income | `EQUITY` | Ekuitas | Credit | Yes |
| 3410 | Selisih Kurs Penjabaran | Foreign Currency Translation | `EQUITY` | Ekuitas | Credit | Yes |
| 3500 | Prive/Penarikan Pemilik | Owner's Drawings | `EQUITY` | Ekuitas | Debit | Yes |

---

### 4000-4999: PENDAPATAN (Revenue) - Income Statement

#### 4000-4099: Pendapatan Penjualan (Sales Revenue)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 4000 | **Pendapatan Penjualan** | Sales Revenue (Header) | `REVENUE` | Pendapatan | Credit | No |
| 4010 | Penjualan - POS Retail | Sales - POS Retail | `REVENUE` | Pendapatan | Credit | Yes |
| 4011 | Penjualan - POS Toko 1 | Sales - POS Store 1 | `REVENUE` | Pendapatan | Credit | Yes |
| 4012 | Penjualan - POS Toko 2 | Sales - POS Store 2 | `REVENUE` | Pendapatan | Credit | Yes |
| 4013 | Penjualan - POS Toko 3 | Sales - POS Store 3 | `REVENUE` | Pendapatan | Credit | Yes |
| 4020 | Penjualan - Online/E-Commerce | Sales - Online/E-Commerce | `REVENUE` | Pendapatan | Credit | Yes |
| 4021 | Penjualan - Website | Sales - Website | `REVENUE` | Pendapatan | Credit | Yes |
| 4022 | Penjualan - Mobile App | Sales - Mobile App | `REVENUE` | Pendapatan | Credit | Yes |
| 4030 | Penjualan - Grosir/Wholesale | Sales - Wholesale | `REVENUE` | Pendapatan | Credit | Yes |
| 4031 | Penjualan - Grosir Reguler | Sales - Regular Wholesale | `REVENUE` | Pendapatan | Credit | Yes |
| 4032 | Penjualan - Grosir Kontrak | Sales - Contract Wholesale | `REVENUE` | Pendapatan | Credit | Yes |
| 4040 | Penjualan - B2B | Sales - B2B | `REVENUE` | Pendapatan | Credit | Yes |
| 4050 | Penjualan - Restoran | Sales - Restaurant | `REVENUE` | Pendapatan | Credit | Yes |
| 4051 | Penjualan - Dine In | Sales - Dine In | `REVENUE` | Pendapatan | Credit | Yes |
| 4052 | Penjualan - Take Away | Sales - Take Away | `REVENUE` | Pendapatan | Credit | Yes |
| 4053 | Penjualan - Delivery (Own) | Sales - Delivery (Own Fleet) | `REVENUE` | Pendapatan | Credit | Yes |
| 4054 | Penjualan - GoFood | Sales - GoFood | `REVENUE` | Pendapatan | Credit | Yes |
| 4055 | Penjualan - GrabFood | Sales - GrabFood | `REVENUE` | Pendapatan | Credit | Yes |

#### 4100-4199: Potongan & Retur Penjualan (Sales Deductions)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 4100 | **Potongan & Retur Penjualan** | Sales Deductions (Header) | `REVENUE` | Pendapatan | Debit | No |
| 4110 | Diskon Penjualan | Sales Discounts | `REVENUE` | Pendapatan | Debit | Yes |
| 4111 | Diskon Penjualan - POS | Sales Discounts - POS | `REVENUE` | Pendapatan | Debit | Yes |
| 4112 | Diskon Penjualan - Online | Sales Discounts - Online | `REVENUE` | Pendapatan | Debit | Yes |
| 4113 | Diskon Penjualan - Grosir | Sales Discounts - Wholesale | `REVENUE` | Pendapatan | Debit | Yes |
| 4120 | Retur Penjualan | Sales Returns | `REVENUE` | Pendapatan | Debit | Yes |
| 4130 | Potongan Tunai (Cash Discount) | Cash Discounts Given | `REVENUE` | Pendapatan | Debit | Yes |

#### 4200-4299: Pendapatan Lain-lain (Other Operating Revenue)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 4200 | **Pendapatan Operasional Lain** | Other Operating Revenue (Header) | `REVENUE` | Pendapatan | Credit | No |
| 4210 | Pendapatan Jasa Pengiriman | Delivery Service Income | `REVENUE` | Pendapatan | Credit | Yes |
| 4220 | Pendapatan Sewa | Rental Income | `REVENUE` | Pendapatan | Credit | Yes |
| 4230 | Pendapatan Komisi | Commission Income | `REVENUE` | Pendapatan | Credit | Yes |
| 4240 | Pendapatan Membership | Membership Fee Income | `REVENUE` | Pendapatan | Credit | Yes |

---

### 5000-5999: HARGA POKOK PENJUALAN / HPP (Cost of Goods Sold) - Income Statement

#### 5000-5099: HPP - Pembelian (COGS - Purchases)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 5000 | **Harga Pokok Penjualan** | Cost of Goods Sold (Header) | `COGS` | Harga Pokok Penjualan | Debit | No |
| 5010 | Pembelian Barang Dagang | Merchandise Purchases | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5011 | Pembelian - Supplier Lokal | Purchases - Local Suppliers | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5012 | Pembelian - Supplier Impor | Purchases - Import Suppliers | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5020 | Ongkos Kirim Pembelian | Freight-in | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5030 | Bea Masuk & Cukai | Import Duties & Customs | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5040 | Biaya Penanganan Barang | Handling Charges | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5050 | Biaya Asuransi Pengiriman | Shipping Insurance | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5090 | HPP Lain-lain | Other Cost of Goods Sold | `COGS` | Harga Pokok Penjualan | Debit | Yes |

#### 5100-5199: HPP - Potongan & Retur Pembelian (COGS - Purchase Deductions)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 5100 | **Potongan & Retur Pembelian** | Purchase Deductions (Header) | `COGS` | Harga Pokok Penjualan | Credit | No |
| 5110 | Diskon Pembelian | Purchase Discounts | `COGS` | Harga Pokok Penjualan | Credit | Yes |
| 5120 | Retur Pembelian | Purchase Returns | `COGS` | Harga Pokok Penjualan | Credit | Yes |
| 5130 | Potongan Tunai Pembelian | Cash Discounts Received | `COGS` | Harga Pokok Penjualan | Credit | Yes |

#### 5200-5299: HPP - Penyesuaian Persediaan (COGS - Inventory Adjustments)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 5200 | **Penyesuaian Persediaan** | Inventory Adjustments (Header) | `COGS` | Harga Pokok Penjualan | Debit | No |
| 5210 | HPP - Persediaan Awal | COGS - Beginning Inventory | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5220 | HPP - Persediaan Akhir | COGS - Ending Inventory | `COGS` | Harga Pokok Penjualan | Credit | Yes |
| 5230 | Penyesuaian Persediaan | Inventory Adjustments | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5231 | Selisih Stok Opname | Stock Count Variance | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5232 | Barang Rusak/Kadaluarsa | Damaged/Expired Goods | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5233 | Barang Hilang | Lost/Shrinkage | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5240 | Penyesuaian Nilai Persediaan | Inventory Valuation Adjustment | `COGS` | Harga Pokok Penjualan | Debit | Yes |

#### 5300-5399: HPP - Per Kategori/Channel (COGS by Category/Channel)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 5300 | **HPP Per Channel** | COGS by Channel (Header) | `COGS` | Harga Pokok Penjualan | Debit | No |
| 5310 | HPP - POS Retail | COGS - POS Retail | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5320 | HPP - Online/E-Commerce | COGS - Online/E-Commerce | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5330 | HPP - Grosir/Wholesale | COGS - Wholesale | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5340 | HPP - B2B | COGS - B2B | `COGS` | Harga Pokok Penjualan | Debit | Yes |
| 5350 | HPP - Restoran | COGS - Restaurant | `COGS` | Harga Pokok Penjualan | Debit | Yes |

---

### 6000-6999: BEBAN OPERASIONAL (Operating Expenses) - Income Statement

#### 6000-6099: Beban Gaji & Karyawan (Payroll & Employee Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6000 | **Beban Gaji & Karyawan** | Payroll & Employee Expenses (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6010 | Beban Gaji Pokok | Basic Salary Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6011 | Gaji - Manajemen | Salary - Management | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6012 | Gaji - Staff Kantor | Salary - Office Staff | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6013 | Gaji - Staff Toko | Salary - Store Staff | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6014 | Gaji - Staff Gudang | Salary - Warehouse Staff | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6015 | Gaji - Driver | Salary - Drivers | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6020 | Tunjangan Karyawan | Employee Allowances | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6021 | Tunjangan Makan | Meal Allowance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6022 | Tunjangan Transport | Transportation Allowance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6023 | Tunjangan Kesehatan | Health Allowance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6024 | Tunjangan Komunikasi | Communication Allowance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6030 | THR (Tunjangan Hari Raya) | Holiday Allowance (THR) | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6040 | Bonus Karyawan | Employee Bonuses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6050 | Komisi Sales | Sales Commissions | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6060 | BPJS Kesehatan - Perusahaan | BPJS Health - Company | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6061 | BPJS Ketenagakerjaan - Perusahaan | BPJS Employment - Company | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6070 | Beban Pelatihan | Training Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6080 | Beban Rekrutmen | Recruitment Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6090 | Beban Lembur | Overtime Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6100-6199: Beban Sewa & Utilitas (Rent & Utilities)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6100 | **Beban Sewa & Utilitas** | Rent & Utilities (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6110 | Beban Sewa Kantor | Office Rent Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6111 | Beban Sewa Toko | Store Rent Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6112 | Beban Sewa Gudang | Warehouse Rent Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6120 | Beban Listrik | Electricity Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6130 | Beban Air | Water Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6140 | Beban Telepon | Telephone Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6150 | Beban Internet | Internet Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6160 | Beban Gas | Gas Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6200-6299: Beban Penyusutan & Amortisasi (Depreciation & Amortization)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6200 | **Beban Penyusutan & Amortisasi** | Depreciation & Amortization (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6210 | Beban Penyusutan Bangunan | Depreciation Expense - Buildings | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6220 | Beban Penyusutan Kendaraan | Depreciation Expense - Vehicles | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6230 | Beban Penyusutan Peralatan Kantor | Depreciation Expense - Office Equipment | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6240 | Beban Penyusutan Peralatan Toko | Depreciation Expense - Store Equipment | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6250 | Beban Penyusutan Peralatan Gudang | Depreciation Expense - Warehouse Equipment | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6260 | Beban Penyusutan Komputer | Depreciation Expense - Computers | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6270 | Beban Penyusutan POS | Depreciation Expense - POS Equipment | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6280 | Beban Penyusutan Meubel | Depreciation Expense - Furniture | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6290 | Beban Amortisasi Software | Amortization Expense - Software | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6291 | Beban Amortisasi Renovasi | Amortization Expense - Leasehold Improvements | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6300-6399: Beban Pemasaran & Penjualan (Marketing & Sales Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6300 | **Beban Pemasaran & Penjualan** | Marketing & Sales Expenses (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6310 | Beban Iklan Online | Online Advertising Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6311 | Beban Iklan Google Ads | Google Ads Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6312 | Beban Iklan Facebook/Instagram | Facebook/Instagram Ads Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6313 | Beban Iklan TikTok | TikTok Ads Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6320 | Beban Iklan Offline | Offline Advertising Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6321 | Beban Iklan Cetak | Print Advertising Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6322 | Beban Spanduk/Banner | Banner/Signage Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6330 | Beban Promosi | Promotional Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6340 | Beban Sponsorship | Sponsorship Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6350 | Beban Kemasan | Packaging Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6360 | Beban Komisi Food Delivery | Food Delivery Commission | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6361 | Beban Komisi GoFood | GoFood Commission | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6362 | Beban Komisi GrabFood | GrabFood Commission | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6370 | Beban Biaya Payment Gateway | Payment Gateway Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6371 | Beban Midtrans | Midtrans Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6372 | Beban QRIS | QRIS Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6373 | Beban EDC/Kartu Kredit | EDC/Credit Card Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6400-6499: Beban Pengiriman & Logistik (Shipping & Logistics Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6400 | **Beban Pengiriman & Logistik** | Shipping & Logistics (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6410 | Beban Pengiriman | Shipping/Freight-out Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6411 | Beban Pengiriman - J&T | Shipping - J&T | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6412 | Beban Pengiriman - JNE | Shipping - JNE | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6413 | Beban Pengiriman - SiCepat | Shipping - SiCepat | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6414 | Beban Pengiriman - Lalamove | Shipping - Lalamove | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6415 | Beban Pengiriman - GoSend | Shipping - GoSend | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6416 | Beban Pengiriman - GrabExpress | Shipping - GrabExpress | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6420 | Beban Bensin/BBM | Fuel Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6430 | Beban Parkir & Tol | Parking & Toll Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6440 | Beban Pemeliharaan Kendaraan | Vehicle Maintenance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6500-6599: Beban Administrasi & Umum (Administrative & General Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6500 | **Beban Administrasi & Umum** | Admin & General Expenses (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6510 | Beban ATK (Alat Tulis Kantor) | Office Supplies Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6520 | Beban Perlengkapan Toko | Store Supplies Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6530 | Beban Perlengkapan Gudang | Warehouse Supplies Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6540 | Beban Fotocopy & Cetak | Printing & Photocopy | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6550 | Beban Pos & Kurir | Postage & Courier | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6560 | Beban Langganan Software | Software Subscription | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6561 | Beban Cloud Service | Cloud Service Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6562 | Beban Domain & Hosting | Domain & Hosting | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6570 | Beban Perizinan/Lisensi | Permits & Licenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6580 | Beban Konsultan & Profesional | Professional & Consulting Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6581 | Beban Akuntan | Accounting Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6582 | Beban Notaris | Notary Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6583 | Beban Konsultan Hukum | Legal Fees | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6590 | Beban Rapat & Meeting | Meeting Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6595 | Beban Sewa Peralatan | Equipment Rental Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6600-6699: Beban Asuransi & Keamanan (Insurance & Security)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6600 | **Beban Asuransi & Keamanan** | Insurance & Security (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6610 | Beban Asuransi Gedung | Building Insurance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6620 | Beban Asuransi Kendaraan | Vehicle Insurance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6630 | Beban Asuransi Persediaan | Inventory Insurance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6640 | Beban Keamanan/Security | Security Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6700-6799: Beban Pemeliharaan & Perbaikan (Maintenance & Repairs)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6700 | **Beban Pemeliharaan & Perbaikan** | Maintenance & Repairs (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6710 | Beban Pemeliharaan Bangunan | Building Maintenance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6720 | Beban Pemeliharaan Kendaraan | Vehicle Maintenance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6730 | Beban Pemeliharaan Peralatan | Equipment Maintenance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6740 | Beban Pemeliharaan Komputer | Computer Maintenance | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6750 | Beban Perbaikan & Renovasi | Repairs & Renovation | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6800-6899: Beban Kerugian (Loss Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6800 | **Beban Kerugian** | Loss Expenses (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6810 | Beban Kerugian Piutang | Bad Debt Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6820 | Beban Kerugian Persediaan | Inventory Loss Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6830 | Beban Kerugian Aset Tetap | Fixed Asset Loss | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

#### 6900-6999: Beban Operasional Lain-lain (Other Operating Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 6900 | **Beban Operasional Lain** | Other Operating Expenses (Header) | `OPERATING_EXPENSE` | Beban Operasional | Debit | No |
| 6910 | Beban Perjalanan Dinas | Business Travel Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6920 | Beban Jamuan & Entertaiment | Entertainment Expense | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6930 | Beban Sumbangan & CSR | Donation & CSR | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6940 | Beban Denda & Penalti | Fines & Penalties | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6950 | Beban Bank | Bank Charges | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |
| 6990 | Beban Lain-lain | Miscellaneous Expenses | `OPERATING_EXPENSE` | Beban Operasional | Debit | Yes |

---

### 7000-7999: PENDAPATAN & BEBAN LAIN-LAIN (Other Income & Expenses) - Income Statement

#### 7000-7099: Pendapatan Lain-lain (Other Income)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 7000 | **Pendapatan Lain-lain** | Other Income (Header) | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | No |
| 7010 | Pendapatan Bunga Bank | Bank Interest Income | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | Yes |
| 7020 | Pendapatan Bunga Deposito | Deposit Interest Income | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | Yes |
| 7030 | Pendapatan Selisih Kurs | Foreign Exchange Gain | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | Yes |
| 7040 | Pendapatan Penjualan Aset Tetap | Gain on Fixed Asset Sale | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | Yes |
| 7050 | Pendapatan Klaim Asuransi | Insurance Claim Income | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | Yes |
| 7060 | Pendapatan Lain-lain | Other Miscellaneous Income | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Credit | Yes |

#### 7100-7199: Beban Lain-lain (Other Expenses)

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 7100 | **Beban Lain-lain** | Other Expenses (Header) | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Debit | No |
| 7110 | Beban Bunga Pinjaman | Loan Interest Expense | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Debit | Yes |
| 7120 | Beban Bunga Leasing | Lease Interest Expense | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Debit | Yes |
| 7130 | Beban Selisih Kurs | Foreign Exchange Loss | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Debit | Yes |
| 7140 | Rugi Penjualan Aset Tetap | Loss on Fixed Asset Sale | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Debit | Yes |
| 7150 | Beban Lain-lain | Other Miscellaneous Expense | `OTHER_INCOME_EXPENSE` | Pendapatan/Beban Lain | Debit | Yes |

---

### 8000-8999: PAJAK PENGHASILAN (Income Tax) - Income Statement

| Code | Indonesian Name | English Name | Category | Category (ID) | Normal Balance | Detail |
|------|-----------------|--------------|----------|---------------|----------------|--------|
| 8000 | **Pajak Penghasilan** | Income Tax (Header) | `TAX` | Pajak | Debit | No |
| 8010 | Beban PPh Badan Kini | Current Corporate Income Tax | `TAX` | Pajak | Debit | Yes |
| 8020 | Beban PPh Tangguhan | Deferred Income Tax Expense | `TAX` | Pajak | Debit | Yes |
| 8030 | Manfaat Pajak Tangguhan | Deferred Tax Benefit | `TAX` | Pajak | Credit | Yes |
| 8040 | Beban PPh Final UMKM | PPh Final UMKM Expense (0.5%) | `TAX` | Pajak | Debit | Yes |

> **Note on Tax Accounts**:
> - Use **8010-8030** if using Regular PPh regime (revenue > Rp 4.8B or by choice)
> - Use **8040** if using PPh Final UMKM regime (0.5% of gross revenue)

---

## Financial Statement Mapping

### Balance Sheet (Neraca)

```
ASET (ASSETS)                                     LIABILITAS & EKUITAS (LIABILITIES & EQUITY)
├── Aset Lancar (Current Assets)                  ├── Liabilitas Lancar (Current Liabilities)
│   ├── Kas & Bank (1000-1039)                    │   ├── Hutang Usaha (2000-2099)
│   ├── Piutang (1100-1199)                       │   ├── Hutang Pajak (2100-2199)
│   ├── Persediaan (1200-1299)                    │   ├── Hutang Gaji & Akrual (2200-2299)
│   └── Biaya Dibayar Dimuka (1300-1399)          │   └── Hutang Bank Jangka Pendek (2300-2399)
├── Aset Tetap (Fixed Assets)                     ├── Liabilitas Jangka Panjang (Long-term Liabilities)
│   └── Tanah, Bangunan, Kendaraan (1400-1499)    │   └── (2400-2499)
└── Aset Tidak Lancar Lainnya (1500-1599)         └── Ekuitas (Equity) (3000-3999)
```

### Income Statement (Laporan Laba Rugi)

```
PENDAPATAN PENJUALAN (Sales Revenue)           4000-4199
(-) HARGA POKOK PENJUALAN (Cost of Goods Sold) 5000-5399
────────────────────────────────────────────────────────
= LABA KOTOR (Gross Profit)

(-) BEBAN OPERASIONAL (Operating Expenses)     6000-6999
────────────────────────────────────────────────────────
= LABA OPERASIONAL (Operating Income)

(+/-) PENDAPATAN/BEBAN LAIN-LAIN              7000-7199
────────────────────────────────────────────────────────
= LABA SEBELUM PAJAK (Income Before Tax)

(-) PAJAK PENGHASILAN (Income Tax)             8000-8030
────────────────────────────────────────────────────────
= LABA BERSIH (Net Income)
```

---

## Account Types and Normal Balances

| Account Type | Financial Statement | Normal Balance | Increase | Decrease |
|--------------|---------------------|----------------|----------|----------|
| Asset | Balance Sheet | Debit | Debit | Credit |
| Contra Asset | Balance Sheet | Credit | Credit | Debit |
| Liability | Balance Sheet | Credit | Credit | Debit |
| Equity | Balance Sheet | Credit | Credit | Debit |
| Revenue | Income Statement | Credit | Credit | Debit |
| Contra Revenue | Income Statement | Debit | Debit | Credit |
| COGS | Income Statement | Debit | Debit | Credit |
| Expense | Income Statement | Debit | Debit | Credit |

---

## Special Accounts Notes

> **IMPORTANT**: Tax rules in this document are **GUIDELINES**, not mandatory. The actual tax treatment depends on your business registration status (PKP/non-PKP), annual revenue threshold, and tax regime choice. Consult with your tax advisor for proper implementation.

---

### Supplies (Perlengkapan) - Asset vs Expense Treatment

The COA provides flexibility with both **Asset** and **Expense** accounts for supplies:

| Asset Account | Expense Account | Purpose |
|---------------|-----------------|---------|
| 1350 Perlengkapan Kantor | 6510 Beban ATK | Office supplies (paper, pens, ink) |
| 1360 Perlengkapan Toko | 6520 Beban Perlengkapan Toko | Store supplies (bags, labels) |

**When to Use Asset Account (1350/1360):**
- Large bulk purchases (> Rp 5,000,000)
- Supplies that will last multiple months
- Year-end when significant unused supplies remain
- For accurate financial statement presentation

**When to Use Expense Account (6510/6520):**
- Small regular purchases
- Immaterial amounts
- Supplies consumed immediately

**Accounting Flow for Asset Method:**
```
1. Purchase bulk supplies:
   Debit:  1350 Perlengkapan Kantor    Rp 10,000,000
   Credit: 1020 Bank                    Rp 10,000,000

2. Period-end adjustment (estimate usage):
   Debit:  6510 Beban ATK              Rp 7,000,000
   Credit: 1350 Perlengkapan Kantor    Rp 7,000,000
```

> **Note**: Unlike inventory (persediaan) for sale, supplies don't require detailed stock tracking. Usage is typically estimated at period-end based on remaining supplies on hand.

---

### Tax Regime Options for Indonesian Trading Company

Kidkazz can choose from different tax regimes based on annual gross revenue:

#### Option 1: PPh Final UMKM (0.5% of Gross Revenue)

**Eligibility**:
- Annual gross revenue (peredaran bruto) ≤ Rp 4.8 billion
- Available until 2029 for individual taxpayers (WP OP)
- Available for 4 years for corporate (CV, Firma, Koperasi, PT)

**Tax Calculation**:
```
PPh Final = Gross Revenue × 0.5%
```

**Exemption**: If annual gross revenue < Rp 500 million → PPh = Rp 0

**Pros**:
- Simple calculation (no need for detailed bookkeeping for tax)
- Lower tax rate for profitable businesses
- No monthly PPh 25 installments

**Cons**:
- Tax paid even if business has loss
- Cannot claim tax credits

**Relevant Accounts**:
- 8040: Beban PPh Final UMKM (PPh Final UMKM Expense)
- 2135: Hutang PPh Final (PPh Final Payable)

#### Option 2: Regular PPh (Progressive Rates)

**When Required**:
- Annual gross revenue > Rp 4.8 billion
- After PPh Final period expires
- By choice (for businesses with losses)

**Tax Calculation**:
```
Taxable Income = Gross Revenue - COGS - Operating Expenses - Other Deductions
PPh = Taxable Income × Progressive Rates (5% - 35%)
```

**Corporate Rate**: 22% flat (for PT)

**Relevant Accounts**:
- 8010: Beban PPh Badan Kini (Current Corporate Income Tax)
- 8020: Beban PPh Tangguhan (Deferred Income Tax)
- 2133: Hutang PPh 29 (Annual Income Tax Payable)

---

### PPn (VAT) Handling

> **Note**: PPn is only applicable if the business is registered as PKP (Pengusaha Kena Pajak). Non-PKP businesses do not collect or report PPn.

**PKP Registration Threshold**: Mandatory if annual revenue > Rp 4.8 billion (can register voluntarily below threshold)

Indonesian VAT (Pajak Pertambahan Nilai) is calculated as:

```
PPn yang Disetor = PPn Keluaran - PPn Masukan
```

**PPn Keluaran (2110-2113)**: VAT collected from customers on sales (11% of sales price)
**PPn Masukan (2120)**: VAT paid on purchases (recorded as debit in liability)

If PPn Keluaran > PPn Masukan: Company owes VAT to government
If PPn Masukan > PPn Keluaran: Company has VAT credit (can be restituted or carried forward)

**Non-PKP Treatment**: If not registered as PKP, PPn accounts are not used. All purchases are recorded at gross amount (including VAT paid to suppliers, which becomes part of cost).

### Multi-Channel Sales Tracking

The COA supports multi-channel sales tracking through owned channels:
- **POS Retail** (4010-4013): Multiple store locations
- **Online/E-Commerce** (4020-4022): Website and Mobile App
- **Wholesale/Grosir** (4030-4032): Regular and contract wholesale
- **B2B** (4040): Business-to-business sales
- **Restaurant** (4050-4055): Dine-in, take away, delivery, GoFood, GrabFood

Separate COGS accounts per channel (5310-5350) enable profitability analysis by channel.
Journal line segments provide additional analysis (salesChannel, warehouseId, salesPersonId).

### Restaurant Support

Restaurant operations use the same COA structure:
- Sales accounts: 4060-4064 (Dine In, Take Away, Delivery, Food Apps)
- COGS: 5360 (HPP - Restoran)
- BOM (Bill of Materials) handled via Product Bundle feature, not separate accounting

---

## Schema Enhancement

### New Field: `financial_statement_type`

Add to `chart_of_accounts` table:

```sql
ALTER TABLE chart_of_accounts
ADD COLUMN financial_statement_type TEXT
CHECK(financial_statement_type IN ('BALANCE_SHEET', 'INCOME_STATEMENT'));
```

### New Field: `account_category`

Add to `chart_of_accounts` table for explicit account categorization:

```sql
ALTER TABLE chart_of_accounts
ADD COLUMN account_category TEXT
CHECK(account_category IN (
  'CURRENT_ASSET',
  'FIXED_ASSET',
  'OTHER_NON_CURRENT_ASSET',
  'CURRENT_LIABILITY',
  'LONG_TERM_LIABILITY',
  'EQUITY',
  'REVENUE',
  'COGS',
  'OPERATING_EXPENSE',
  'OTHER_INCOME_EXPENSE',
  'TAX'
));
```

### TypeScript Schema Update

```typescript
// Account Category Types
export const AccountCategoryEnum = {
  CURRENT_ASSET: 'CURRENT_ASSET',
  FIXED_ASSET: 'FIXED_ASSET',
  OTHER_NON_CURRENT_ASSET: 'OTHER_NON_CURRENT_ASSET',
  CURRENT_LIABILITY: 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY: 'LONG_TERM_LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  COGS: 'COGS',
  OPERATING_EXPENSE: 'OPERATING_EXPENSE',
  OTHER_INCOME_EXPENSE: 'OTHER_INCOME_EXPENSE',
  TAX: 'TAX',
} as const;

export type AccountCategory = typeof AccountCategoryEnum[keyof typeof AccountCategoryEnum];

// Indonesian names for each category
export const AccountCategoryIndonesian: Record<AccountCategory, string> = {
  CURRENT_ASSET: 'Aset Lancar',
  FIXED_ASSET: 'Aset Tetap',
  OTHER_NON_CURRENT_ASSET: 'Aset Tidak Lancar Lainnya',
  CURRENT_LIABILITY: 'Liabilitas Lancar',
  LONG_TERM_LIABILITY: 'Liabilitas Jangka Panjang',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  COGS: 'Harga Pokok Penjualan',
  OPERATING_EXPENSE: 'Beban Operasional',
  OTHER_INCOME_EXPENSE: 'Pendapatan/Beban Lain',
  TAX: 'Pajak',
};

export const chartOfAccounts = sqliteTable('chart_of_accounts', {
  // ... existing fields

  // NEW: Financial Statement Classification
  financialStatementType: text('financial_statement_type', {
    enum: ['BALANCE_SHEET', 'INCOME_STATEMENT']
  }).notNull(),

  // NEW: Account Category Classification
  accountCategory: text('account_category', {
    enum: [
      'CURRENT_ASSET',
      'FIXED_ASSET',
      'OTHER_NON_CURRENT_ASSET',
      'CURRENT_LIABILITY',
      'LONG_TERM_LIABILITY',
      'EQUITY',
      'REVENUE',
      'COGS',
      'OPERATING_EXPENSE',
      'OTHER_INCOME_EXPENSE',
      'TAX',
    ]
  }).notNull(),
});
```

### Derivation Logic

```typescript
function getFinancialStatementType(accountCode: string): 'BALANCE_SHEET' | 'INCOME_STATEMENT' {
  const codeNum = parseInt(accountCode);

  if (codeNum >= 1000 && codeNum <= 3999) {
    return 'BALANCE_SHEET';  // Assets, Liabilities, Equity
  } else {
    return 'INCOME_STATEMENT';  // Revenue, COGS, Expenses, Tax
  }
}

function getAccountCategory(accountCode: string): AccountCategory {
  const codeNum = parseInt(accountCode);

  // Assets (1000-1999)
  if (codeNum >= 1000 && codeNum <= 1399) {
    return 'CURRENT_ASSET';  // Cash, Receivables, Inventory, Prepaid
  }
  if (codeNum >= 1400 && codeNum <= 1499) {
    return 'FIXED_ASSET';  // Land, Buildings, Vehicles, Equipment
  }
  if (codeNum >= 1500 && codeNum <= 1599) {
    return 'OTHER_NON_CURRENT_ASSET';  // Investments, Deposits, Intangibles
  }

  // Liabilities (2000-2999)
  if (codeNum >= 2000 && codeNum <= 2399) {
    return 'CURRENT_LIABILITY';  // Payables, Tax Payables, Accrued, Short-term Loans
  }
  if (codeNum >= 2400 && codeNum <= 2499) {
    return 'LONG_TERM_LIABILITY';  // Long-term Loans, Leases, Bonds
  }

  // Equity (3000-3999)
  if (codeNum >= 3000 && codeNum <= 3999) {
    return 'EQUITY';  // Capital, Retained Earnings, Dividends
  }

  // Revenue (4000-4299)
  if (codeNum >= 4000 && codeNum <= 4299) {
    return 'REVENUE';  // Sales, Deductions, Other Operating Revenue
  }

  // COGS (5000-5399)
  if (codeNum >= 5000 && codeNum <= 5399) {
    return 'COGS';  // Purchases, Deductions, Inventory Adjustments, Channel COGS
  }

  // Operating Expenses (6000-6999)
  if (codeNum >= 6000 && codeNum <= 6999) {
    return 'OPERATING_EXPENSE';  // Payroll, Rent, Depreciation, Marketing, Admin, etc.
  }

  // Other Income/Expense (7000-7199)
  if (codeNum >= 7000 && codeNum <= 7199) {
    return 'OTHER_INCOME_EXPENSE';  // Interest, FX Gains/Losses, Asset Sales
  }

  // Tax (8000-8999)
  if (codeNum >= 8000 && codeNum <= 8999) {
    return 'TAX';  // Income Tax Expense
  }

  throw new Error(`Unknown account code range: ${accountCode}`);
}
```

---

## Seed Data Implementation

See: `services/accounting-service/src/seed/chart-of-accounts.seed.ts`

The seed file should create all accounts listed above with proper:
- Indonesian names
- English translations (in description)
- Financial statement type
- Normal balance
- Parent-child relationships
- System account flags

---

## References

- [Indonesian Financial Accounting Standards (PSAK)](https://iaiglobal.or.id/)
- [Chart of Account Guide - Kledo](https://kledo.com/blog/chart-of-account/)
- [Indonesian Trading Company COA - Accurate](https://accurate.id/akuntansi/pengertian-chart-of-account/)
- [Mekari Jurnal COA Guide](https://www.jurnal.id/id/blog/mempelajari-klasifikasi-sistem-kode-akuntansi-chart-of-account/)
- [Indonesian VAT (PPn) Guide](https://www.online-pajak.com/tentang-ppn-efaktur/jurnal-ppn/)

---

**Document Version**: 1.0
**Created**: January 2026
**Last Updated**: January 2026
**Maintained By**: Development Team
