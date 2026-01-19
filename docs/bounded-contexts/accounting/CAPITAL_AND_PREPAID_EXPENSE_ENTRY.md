# Capital Expenditure & Prepaid Expense Entry

## Overview

This document describes the **automatic journal entry forms** for transactions that are NOT immediate expenses:

1. **Fixed Asset Acquisition** (Capital Expenditure / Investing Activities)
2. **Prepaid Expense Payment** (Rent, Insurance paid in advance)
3. **Supplies Purchase** (Asset method - stored supplies)

These transactions differ from operating expenses because they create **assets** on the Balance Sheet, not immediate expenses on the Income Statement.

**Key Feature**: All transactions support **warehouse/store tracking** via GL segmentation for multi-location cost analysis.

---

## 1. Warehouse/Store Tracking (GL Segmentation)

### 1.1 Why Track by Location?

For multi-location businesses, tracking expenses by warehouse/store enables:

| Use Case | Benefit |
|----------|---------|
| **Cost Center Analysis** | Which location incurs the most expenses? |
| **P&L by Location** | Profitability per store/warehouse |
| **Asset Register by Location** | Which location has what assets? |
| **Budget vs Actual by Location** | Track spending against location budgets |
| **Rent/Utility Allocation** | Assign prepaid expenses to specific locations |

### 1.2 Location Types

```typescript
type LocationType =
  | 'WAREHOUSE'      // Gudang
  | 'STORE'          // Toko Retail
  | 'HEAD_OFFICE'    // Kantor Pusat
  | 'BRANCH_OFFICE'  // Kantor Cabang
  | 'RESTAURANT';    // Outlet Restoran
```

### 1.3 Journal Line with Location Segment

All journal entries support the `warehouseId` field for location tracking:

```typescript
interface JournalLine {
  accountId: string;
  accountCode: string;
  direction: 'Debit' | 'Credit';
  amount: number;
  memo?: string;

  // GL Segmentation for Multi-Dimensional Analysis
  warehouseId?: string;       // Location/Cost Center
  departmentId?: string;      // Department (optional)
  projectId?: string;         // Project (optional)
}
```

### 1.4 Location Selection in Forms

All expense forms include location selection:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Cost Center / Location *                                               │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🔍 Select location...                                        ▼  │  │
│ │ ○ Kantor Pusat (HQ)                                              │  │
│ │ ○ Gudang Utama - Cakung                                          │  │
│ │ ○ Gudang Cabang - Bandung                                        │  │
│ │ ○ Toko 1 - Kelapa Gading                                         │  │
│ │ ○ Toko 2 - PIK                                                   │  │
│ │ ○ Toko 3 - Pondok Indah                                          │  │
│ │ ○ Restoran - Grand Indonesia                                     │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ [ ] Split across multiple locations                                    │
│     (Enable to allocate expense to multiple locations)                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.5 Split Across Multiple Locations

For expenses that benefit multiple locations (e.g., shared equipment):

```
┌────────────────────────────────────────────────────────────────────────┐
│ [x] Split across multiple locations                                    │
│                                                                        │
│ Location Allocation:                                                   │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Location                          │ Percentage │ Amount          │  │
│ ├───────────────────────────────────┼────────────┼─────────────────┤  │
│ │ Gudang Utama - Cakung             │    50%     │ Rp 7,500,000    │  │
│ │ Gudang Cabang - Bandung           │    30%     │ Rp 4,500,000    │  │
│ │ Toko 1 - Kelapa Gading            │    20%     │ Rp 3,000,000    │  │
│ ├───────────────────────────────────┼────────────┼─────────────────┤  │
│ │ TOTAL                             │   100%     │ Rp 15,000,000   │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Transaction Type Comparison

| Transaction Type | Debit Account | Credit Account | Financial Statement Impact |
|------------------|---------------|----------------|----------------------------|
| **Operating Expense** | Expense (6xxx) | Cash/Bank/AP | Income Statement (reduces profit) |
| **Fixed Asset Purchase** | Fixed Asset (14xx) | Cash/Bank/AP | Balance Sheet (increases assets) |
| **Prepaid Expense** | Prepaid (13xx) | Cash/Bank/AP | Balance Sheet (current asset) |
| **Supplies Purchase (Asset)** | Supplies (1350/1360) | Cash/Bank/AP | Balance Sheet (current asset) |

---

## 2. Fixed Asset Acquisition Entry (Investing Activities)

### 2.1 Use Cases

- Purchase of office equipment (computers, printers)
- Purchase of store equipment (POS terminals, display racks)
- Purchase of warehouse equipment (forklifts, shelving)
- Purchase of vehicles (delivery trucks, cars)
- Purchase of furniture (desks, chairs)
- Purchase of software licenses (>12 months)
- Building improvements (renovations)

### 2.2 Capitalization Threshold

Per Indonesian PSAK 16 and company policy:

| Criteria | Threshold |
|----------|-----------|
| Minimum Cost | Rp 2,500,000 |
| Useful Life | > 12 months |

Items below threshold → Record as **Operating Expense** instead.

### 2.3 User Interface Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🏢 Register Fixed Asset (Pembelian Aset Tetap)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Asset Category *                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Select category...                                          ▼  │  │
│  │ ○ Peralatan Kantor (1440)     - Office Equipment                   │  │
│  │ ○ Peralatan Toko (1450)       - Store Equipment                    │  │
│  │ ○ Peralatan Gudang (1460)     - Warehouse Equipment                │  │
│  │ ○ Peralatan Komputer (1470)   - Computer & IT Equipment            │  │
│  │ ○ Peralatan POS (1480)        - POS Equipment                      │  │
│  │ ○ Meubel & Perabotan (1490)   - Furniture & Fixtures               │  │
│  │ ○ Kendaraan (1430)            - Vehicles                           │  │
│  │ ○ Software & Lisensi (1531)   - Software & Licenses                │  │
│  │ ○ Renovasi Bangunan (1540)    - Leasehold Improvements             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Asset Name *                          Serial/Model Number               │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐  │
│  │ Laptop Dell Latitude 5540      │   │ SN-ABC123456               │  │
│  └─────────────────────────────────┘   └─────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ACQUISITION DETAILS                                                 │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Acquisition Cost (IDR) *          Acquisition Date *              │  │
│  │  ┌─────────────────────────────┐   ┌─────────────────────────────┐ │  │
│  │  │ Rp            15,000,000    │   │ 2025-01-17              📅 │ │  │
│  │  └─────────────────────────────┘   └─────────────────────────────┘ │  │
│  │                                                                     │  │
│  │  Supplier/Vendor                   Invoice/PO Number                │  │
│  │  ┌─────────────────────────────┐   ┌─────────────────────────────┐ │  │
│  │  │ PT Bhinneka Informatika     │   │ INV-2025-001234            │ │  │
│  │  └─────────────────────────────┘   └─────────────────────────────┘ │  │
│  │                                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ DEPRECIATION SETTINGS                                               │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Depreciation Method *             Useful Life *                    │  │
│  │  ┌─────────────────────────────┐   ┌─────────────────────────────┐ │  │
│  │  │ Straight Line (Garis Lurus) │   │ 48 months (4 years)        │ │  │
│  │  └─────────────────────────────┘   └─────────────────────────────┘ │  │
│  │                                                                     │  │
│  │  Salvage Value (Nilai Sisa)        Depreciation Start              │  │
│  │  ┌─────────────────────────────┐   ┌─────────────────────────────┐ │  │
│  │  │ Rp             1,500,000    │   │ 2025-02-01              📅 │ │  │
│  │  └─────────────────────────────┘   └─────────────────────────────┘ │  │
│  │                                                                     │  │
│  │  📊 Monthly Depreciation: Rp 281,250                                │  │
│  │     = (15,000,000 - 1,500,000) / 48 months                          │  │
│  │                                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ PAYMENT DETAILS                                                     │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  Payment Method *                                                   │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │  │
│  │  │   💵 Cash       │ │   🏦 Bank       │ │   📋 Hutang     │       │  │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │  │
│  │                                                                     │  │
│  │  [If Bank selected]                                                 │  │
│  │  Bank Account                                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐│  │
│  │  │ Bank BCA - Operasional (1020)                              ▼  ││  │
│  │  └────────────────────────────────────────────────────────────────┘│  │
│  │                                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Location/Assignment                                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Kantor Pusat - Ruang IT                                        ▼  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Notes                                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Laptop untuk staff IT development                                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft                   │ │
│  └────────────────────────┘  └────────────────────────────────────────┘ │
│                              ┌────────────────────────────────────────┐ │
│                              │     ✅ Register & Post                 │ │
│                              └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Account Mapping by Asset Category

| Asset Category | Asset Account | Accum. Depreciation | Depreciation Expense |
|----------------|---------------|---------------------|----------------------|
| Peralatan Kantor | 1440 | 1441 | 6230 |
| Peralatan Toko | 1450 | 1451 | 6240 |
| Peralatan Gudang | 1460 | 1461 | 6250 |
| Peralatan Komputer & IT | 1470 | 1471 | 6260 |
| Peralatan POS | 1480 | 1481 | 6270 |
| Meubel & Perabotan | 1490 | 1491 | 6280 |
| Kendaraan | 1430 | 1431 | 6220 |
| Software & Lisensi | 1531 | 1532 | 6290 |
| Renovasi Bangunan Sewa | 1540 | 1541 | 6291 |

### 2.5 Journal Entry Generation

**Example: Purchase Laptop with Bank Transfer**

```typescript
// User Input
{
  assetCategory: "COMPUTER_EQUIPMENT",
  assetName: "Laptop Dell Latitude 5540",
  acquisitionCost: 15000000,
  paymentMethod: "BANK_BCA_OPERATING",
  usefulLifeMonths: 48,
  salvageValue: 1500000,
  depreciationMethod: "STRAIGHT_LINE"
}

// Generated Journal Entry (Acquisition)
{
  entryNumber: "JE-2025-0100",
  entryDate: "2025-01-17",
  entryType: "System",
  status: "Posted",
  description: "Pembelian Aset Tetap - Laptop Dell Latitude 5540",
  reference: "FA-COMP-202501-0001",
  sourceService: "asset-accounting",
  lines: [
    {
      accountCode: "1470",
      accountName: "Peralatan Komputer & IT",
      direction: "Debit",
      amount: 15000000,
      memo: "Fixed Asset Acquisition - Laptop Dell Latitude 5540",
      warehouseId: "wh-hq-001"  // 👈 Location tracking (Kantor Pusat)
    },
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 15000000,
      memo: "Payment - Bank Transfer"
    }
  ]
}
```

**Example: Purchase with Accounts Payable (Credit)**

```typescript
// User Input - Pay Later
{
  assetCategory: "VEHICLE",
  assetName: "Honda Vario 160 - Delivery",
  acquisitionCost: 28000000,
  paymentMethod: "ACCOUNTS_PAYABLE",
  supplierId: "supplier-honda",
  usefulLifeMonths: 96,
  salvageValue: 5000000,
  depreciationMethod: "STRAIGHT_LINE"
}

// Generated Journal Entry (At Acquisition - On Credit)
{
  entryNumber: "JE-2025-0101",
  entryDate: "2025-01-17",
  entryType: "System",
  status: "Posted",
  description: "Pembelian Aset Tetap - Honda Vario 160 - Delivery",
  reference: "FA-VEH-202501-0001",
  lines: [
    {
      accountCode: "1430",
      accountName: "Kendaraan",
      direction: "Debit",
      amount: 28000000,
      memo: "Fixed Asset Acquisition - Honda Vario 160"
    },
    {
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Credit",
      amount: 28000000,
      memo: "A/P - PT Honda Motor Indonesia",
      vendorId: "supplier-honda"
    }
  ]
}

// Later: Payment to Supplier (Separate Entry)
{
  entryNumber: "JE-2025-0150",
  entryDate: "2025-02-15",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran Hutang - PT Honda Motor Indonesia",
  lines: [
    {
      accountCode: "2010",
      accountName: "Hutang Dagang",
      direction: "Debit",
      amount: 28000000,
      memo: "A/P Payment",
      vendorId: "supplier-honda"
    },
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 28000000,
      memo: "Payment - Bank Transfer"
    }
  ]
}
```

### 2.6 Monthly Depreciation Entry (Automated)

System generates monthly depreciation entries on the 1st of each month:

```typescript
// Monthly Depreciation Entry (Auto-generated)
{
  entryNumber: "JE-2025-0200",
  entryDate: "2025-02-01",
  entryType: "Recurring",
  status: "Posted",
  description: "Penyusutan Bulanan - Februari 2025",
  sourceService: "asset-accounting",
  lines: [
    // Laptop depreciation
    {
      accountCode: "6260",
      accountName: "Beban Penyusutan Komputer",
      direction: "Debit",
      amount: 281250,
      memo: "Depreciation - Laptop Dell Latitude 5540 (FA-COMP-202501-0001)"
    },
    {
      accountCode: "1471",
      accountName: "Akumulasi Penyusutan Peralatan Komputer",
      direction: "Credit",
      amount: 281250,
      memo: "Accumulated Depreciation"
    },
    // Vehicle depreciation
    {
      accountCode: "6220",
      accountName: "Beban Penyusutan Kendaraan",
      direction: "Debit",
      amount: 239583,
      memo: "Depreciation - Honda Vario 160 (FA-VEH-202501-0001)"
    },
    {
      accountCode: "1431",
      accountName: "Akumulasi Penyusutan Kendaraan",
      direction: "Credit",
      amount: 239583,
      memo: "Accumulated Depreciation"
    }
  ]
}
```

---

## 3. Prepaid Expense Entry

### 3.1 Use Cases

- **Prepaid Rent** - Office/warehouse rent paid in advance (6-12 months)
- **Prepaid Insurance** - Annual insurance premium paid upfront
- **Prepaid Advertising** - Marketing campaign paid in advance
- **Prepaid Taxes** - Tax payments made before due date

### 3.2 User Interface Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Record Prepaid Expense (Biaya Dibayar Dimuka)                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Prepaid Type *                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Select type...                                              ▼  │  │
│  │ ○ Sewa Dibayar Dimuka (1310)        - Prepaid Rent                 │  │
│  │ ○ Asuransi Dibayar Dimuka (1320)    - Prepaid Insurance            │  │
│  │ ○ Iklan Dibayar Dimuka (1330)       - Prepaid Advertising          │  │
│  │ ○ Pajak Dibayar Dimuka (1340)       - Prepaid Tax                  │  │
│  │ ○ Biaya Dibayar Dimuka Lainnya (1370) - Other Prepaid Expenses     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [If Rent selected - Show Related Expense Account]                       │
│  Related Expense Account: 6110 Beban Sewa Kantor / 6111 Beban Sewa Toko  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 6110 - Beban Sewa Kantor (Office Rent Expense)                 ▼  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Description *                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Sewa Kantor Ruko Kelapa Gading - 12 bulan (Jan-Des 2025)          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Total Amount (IDR) *                 Coverage Period                    │
│  ┌─────────────────────────────────┐                                     │
│  │ Rp            60,000,000        │  From: 2025-01-01  To: 2025-12-31  │
│  └─────────────────────────────────┘                                     │
│                                                                          │
│  Number of Months                     Monthly Allocation                 │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐   │
│  │ 12 months                       │  │ Rp 5,000,000/month          │   │
│  └─────────────────────────────────┘  └─────────────────────────────┘   │
│                                                                          │
│  [x] Auto-create monthly allocation entries (Adjusting entries)          │
│                                                                          │
│  Payment Method *                                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│  │   💵 Cash       │ │   🏦 Bank       │ │   📋 Hutang     │            │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                          │
│  [If Bank selected]                                                      │
│  Bank Account                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                                  ▼  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Payment Date                         Reference                          │
│  ┌────────────────────────┐           ┌────────────────────────────┐    │
│  │ 2025-01-05         📅 │           │ KONTRAK-KG-2025            │    │
│  └────────────────────────┘           └────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft                   │ │
│  └────────────────────────┘  └────────────────────────────────────────┘ │
│                              ┌────────────────────────────────────────┐ │
│                              │     ✅ Save & Post                     │ │
│                              └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Account Mapping - Prepaid to Expense

| Prepaid Type | Prepaid Account | Related Expense Account(s) |
|--------------|-----------------|----------------------------|
| Sewa Dibayar Dimuka | 1310 | 6110 (Kantor), 6111 (Toko), 6112 (Gudang) |
| Asuransi Dibayar Dimuka | 1320 | 6610 (Gedung), 6620 (Kendaraan), 6630 (Persediaan) |
| Iklan Dibayar Dimuka | 1330 | 6310-6322 (Advertising accounts) |
| Pajak Dibayar Dimuka | 1340 | 8010-8040 (Tax expense) |
| Biaya Dibayar Dimuka Lainnya | 1370 | User selects target expense account |

### 3.4 Journal Entry Generation

**Example: Prepaid Rent Payment (12 months)**

```typescript
// User Input
{
  prepaidType: "PREPAID_RENT",
  relatedExpenseAccount: "6110", // Beban Sewa Kantor
  description: "Sewa Kantor Ruko Kelapa Gading - 12 bulan",
  totalAmount: 60000000,
  periodFrom: "2025-01-01",
  periodTo: "2025-12-31",
  numberOfMonths: 12,
  paymentMethod: "BANK_BCA_OPERATING",
  autoCreateAllocations: true
}

// Journal Entry 1: Initial Payment
{
  entryNumber: "JE-2025-0010",
  entryDate: "2025-01-05",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran Sewa Dimuka - Kantor Kelapa Gading 12 bulan",
  reference: "KONTRAK-KG-2025",
  sourceService: "manual",
  lines: [
    {
      accountCode: "1310",
      accountName: "Sewa Dibayar Dimuka",
      direction: "Debit",
      amount: 60000000,
      memo: "Prepaid Rent - Jan to Dec 2025",
      warehouseId: "store-kg-001"  // 👈 Location tracking (Toko Kelapa Gading)
    },
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 60000000,
      memo: "Payment - Bank Transfer"
    }
  ]
}
```

### 3.5 Monthly Allocation Entry (Automated Adjusting Entry)

System generates monthly allocation entries at month-end:

```typescript
// Monthly Allocation Entry - January 2025
{
  entryNumber: "JE-2025-0050",
  entryDate: "2025-01-31",
  entryType: "Adjusting",
  status: "Posted",
  description: "Alokasi Sewa Bulanan - Januari 2025 - Toko Kelapa Gading",
  sourceService: "prepaid-expense",
  sourceReferenceId: "prepaid-rent-kg-2025",
  lines: [
    {
      accountCode: "6110",
      accountName: "Beban Sewa Kantor",
      direction: "Debit",
      amount: 5000000,
      memo: "Rent Expense - January 2025",
      warehouseId: "store-kg-001"  // 👈 Same location as prepaid
    },
    {
      accountCode: "1310",
      accountName: "Sewa Dibayar Dimuka",
      direction: "Credit",
      amount: 5000000,
      memo: "Prepaid Rent Allocation - January 2025",
      warehouseId: "store-kg-001"  // 👈 Same location as prepaid
    }
  ]
}

// Balance after 12 months:
// 1310 Sewa Dibayar Dimuka: Rp 0 (fully allocated)
// 6110 Beban Sewa Kantor: Rp 60,000,000 (recognized over 12 months)
```

### 3.6 Prepaid Expense Schedule

Database tracks allocation schedule:

```typescript
interface PrepaidExpenseSchedule {
  id: string;
  prepaidType: PrepaidType;
  prepaidAccountId: string;
  expenseAccountId: string;
  description: string;
  totalAmount: number;
  periodFrom: Date;
  periodTo: Date;
  numberOfPeriods: number;
  amountPerPeriod: number;

  // Tracking
  allocatedAmount: number;      // Total allocated so far
  remainingAmount: number;      // Amount still to allocate
  lastAllocationDate?: Date;
  nextAllocationDate?: Date;

  // Status
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

  // Source
  originalJournalEntryId: string;
  reference?: string;

  // Audit
  createdBy: string;
  createdAt: Date;
}

// Schedule entries
interface PrepaidAllocationEntry {
  id: string;
  scheduleId: string;
  periodDate: Date;           // End of month
  amount: number;
  journalEntryId?: string;    // Linked when posted
  status: 'PENDING' | 'POSTED';
}
```

---

## 4. Supplies Purchase Entry (Asset Method)

### 4.1 When to Use Asset Method

Use the **Asset Method** (debit Supplies account) when:
- Bulk purchase > Rp 5,000,000
- Supplies will last multiple months
- Need accurate financial statement presentation

Use **Direct Expense Method** when:
- Small regular purchases
- Immaterial amounts
- Supplies consumed immediately

### 4.2 User Interface Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 Record Supplies Purchase (Pembelian Perlengkapan)                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Recording Method *                                                      │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐   │
│  │  📊 Asset Method              │  │  📉 Direct Expense Method     │   │
│  │  (Record as Prepaid Asset)    │  │  (Record as Immediate Expense)│   │
│  │  Use for bulk purchases       │  │  Use for small purchases      │   │
│  └───────────────────────────────┘  └───────────────────────────────┘   │
│                                                                          │
│  [If Asset Method selected]                                              │
│                                                                          │
│  Supplies Type *                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Perlengkapan Kantor (1350) - Office Supplies                     │  │
│  │ ○ Perlengkapan Toko (1360)   - Store Supplies                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Related Expense Account: 6510 Beban ATK / 6520 Beban Perlengkapan Toko  │
│                                                                          │
│  Description                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Pembelian ATK bulk untuk Q1 2025 (kertas, tinta, alat tulis)      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Total Amount (IDR) *             Estimated Usage Period                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ Rp            10,000,000    │  │ 3 months (Q1 2025)              │   │
│  └─────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                          │
│  [x] Auto-create period-end adjustment entries                           │
│      (Allocate to expense based on estimated usage)                      │
│                                                                          │
│  Payment Method *                                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│  │   💵 Cash       │ │   🏦 Bank       │ │   📋 Hutang     │            │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                          │
│  [If Bank selected]                                                      │
│  Bank Account                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                                  ▼  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Payment Date                         Reference                          │
│  ┌────────────────────────┐           ┌────────────────────────────┐    │
│  │ 2025-01-10         📅 │           │ NOTA-ATK-001               │    │
│  └────────────────────────┘           └────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft                   │ │
│  └────────────────────────┘  └────────────────────────────────────────┘ │
│                              ┌────────────────────────────────────────┐ │
│                              │     ✅ Save & Post                     │ │
│                              └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Journal Entry Generation

**Example: Bulk Office Supplies Purchase (Asset Method)**

```typescript
// User Input
{
  recordingMethod: "ASSET",
  suppliesType: "OFFICE_SUPPLIES",
  relatedExpenseAccount: "6510", // Beban ATK
  description: "Pembelian ATK bulk Q1 2025",
  totalAmount: 10000000,
  estimatedUsagePeriod: 3, // months
  paymentMethod: "BANK_BCA_OPERATING",
  autoCreateAllocations: true
}

// Journal Entry 1: Initial Purchase (Asset)
{
  entryNumber: "JE-2025-0020",
  entryDate: "2025-01-10",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian Perlengkapan Kantor - ATK Q1 2025",
  reference: "NOTA-ATK-001",
  lines: [
    {
      accountCode: "1350",
      accountName: "Perlengkapan Kantor",
      direction: "Debit",
      amount: 10000000,
      memo: "Office Supplies - Bulk purchase Q1 2025"
    },
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 10000000,
      memo: "Payment - Bank Transfer"
    }
  ]
}
```

### 4.4 Period-End Adjustment Entry

Unlike prepaid expenses (which have fixed schedules), supplies usage is estimated at period-end based on remaining supplies.

**Option A: Automatic Allocation (Equal Distribution)**

```typescript
// Monthly Allocation Entry - January 2025
{
  entryNumber: "JE-2025-0060",
  entryDate: "2025-01-31",
  entryType: "Adjusting",
  status: "Posted",
  description: "Penyesuaian Pemakaian Perlengkapan - Januari 2025",
  lines: [
    {
      accountCode: "6510",
      accountName: "Beban ATK",
      direction: "Debit",
      amount: 3333333, // 10,000,000 / 3 months
      memo: "Supplies Used - January 2025"
    },
    {
      accountCode: "1350",
      accountName: "Perlengkapan Kantor",
      direction: "Credit",
      amount: 3333333,
      memo: "Supplies Allocation - January 2025"
    }
  ]
}
```

**Option B: Manual Physical Count Adjustment**

User conducts physical count and records actual usage:

```typescript
// User enters: Remaining supplies worth Rp 6,500,000
// System calculates: Usage = 10,000,000 - 6,500,000 = 3,500,000

{
  entryNumber: "JE-2025-0061",
  entryDate: "2025-01-31",
  entryType: "Adjusting",
  status: "Posted",
  description: "Penyesuaian Pemakaian Perlengkapan (Berdasarkan Stock Opname)",
  lines: [
    {
      accountCode: "6510",
      accountName: "Beban ATK",
      direction: "Debit",
      amount: 3500000,
      memo: "Supplies Used - Based on physical count"
    },
    {
      accountCode: "1350",
      accountName: "Perlengkapan Kantor",
      direction: "Credit",
      amount: 3500000,
      memo: "Supplies reduction per physical count"
    }
  ]
}
```

---

## 5. API Design

### 5.1 Fixed Asset Acquisition Endpoint

```
POST /api/accounting/assets/acquire
```

**Request Schema:**
```typescript
interface AcquireAssetRequest {
  // Asset Information
  categoryId: string;
  name: string;
  description?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;

  // Acquisition Details
  acquisitionDate: string;       // ISO date
  acquisitionCost: number;
  supplierId?: string;
  invoiceNumber?: string;

  // Depreciation Settings
  usefulLifeMonths: number;
  salvageValue: number;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'SUM_OF_YEARS' | 'UNITS_OF_PRODUCTION';
  depreciationStartDate?: string;

  // Location / Cost Center (Required)
  warehouseId: string;           // Primary location for this asset
  departmentId?: string;
  assignedToUserId?: string;

  // Payment
  paymentMethod: PaymentMethod;
  bankAccountId?: string;        // If bank payment

  // Options
  saveAsDraft?: boolean;
}
```

**Response Schema:**
```typescript
interface AcquireAssetResponse {
  success: boolean;
  data: {
    assetId: string;
    assetNumber: string;
    journalEntryId: string;
    journalEntryNumber: string;
    status: 'DRAFT' | 'ACTIVE';
  };
}
```

### 5.2 Prepaid Expense Endpoint

```
POST /api/accounting/prepaid-expenses
```

**Request Schema:**
```typescript
interface CreatePrepaidExpenseRequest {
  prepaidType: 'RENT' | 'INSURANCE' | 'ADVERTISING' | 'TAX' | 'OTHER';
  prepaidAccountId: string;
  expenseAccountId: string;

  description: string;
  totalAmount: number;
  periodFrom: string;
  periodTo: string;
  numberOfPeriods: number;

  // Location / Cost Center (Required)
  warehouseId: string;           // Location this prepaid expense belongs to
  // OR split across multiple locations
  locationAllocations?: LocationAllocation[];

  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  reference?: string;

  autoCreateAllocations: boolean;
  saveAsDraft?: boolean;
}

interface LocationAllocation {
  warehouseId: string;
  percentage: number;     // Must sum to 100
  amount?: number;        // Auto-calculated
}
```

### 5.3 Supplies Purchase Endpoint

```
POST /api/accounting/supplies
```

**Request Schema:**
```typescript
interface CreateSuppliesPurchaseRequest {
  recordingMethod: 'ASSET' | 'EXPENSE';
  suppliesType: 'OFFICE' | 'STORE';
  expenseAccountId: string;      // Target expense account

  description: string;
  amount: number;
  estimatedUsagePeriods?: number;  // For asset method

  // Location / Cost Center (Required)
  warehouseId: string;           // Location this supplies purchase belongs to
  // OR split across multiple locations
  locationAllocations?: LocationAllocation[];

  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  reference?: string;

  autoCreateAllocations?: boolean;  // For asset method
  saveAsDraft?: boolean;
}
```

---

## 6. Business Rules

### 6.1 Fixed Asset Acquisition Rules

| Rule | Description |
|------|-------------|
| **FA-01** | Acquisition cost must be >= Rp 2,500,000 for capitalization |
| **FA-02** | Useful life must be > 12 months |
| **FA-03** | Salvage value must be >= 0 and < acquisition cost |
| **FA-04** | Depreciation start date defaults to 1st of next month |
| **FA-05** | Asset number auto-generated: `FA-{CATEGORY}-{YYYYMM}-{SEQ}` |
| **FA-06** | Items below capitalization threshold → direct expense |

### 6.2 Prepaid Expense Rules

| Rule | Description |
|------|-------------|
| **PE-01** | Coverage period must be in the future (from payment date) |
| **PE-02** | Number of periods derived from date range (rounded to months) |
| **PE-03** | Monthly allocation = total amount / number of periods |
| **PE-04** | Allocations posted on last day of each period |
| **PE-05** | Cannot delete/modify prepaid with existing allocations |
| **PE-06** | Early termination → remaining balance expensed immediately |

### 6.3 Supplies Purchase Rules

| Rule | Description |
|------|-------------|
| **SP-01** | Asset method recommended for purchases > Rp 5,000,000 |
| **SP-02** | Direct expense method for purchases < Rp 1,000,000 |
| **SP-03** | Between Rp 1M - 5M: user chooses method |
| **SP-04** | Period-end adjustment based on physical count or estimate |
| **SP-05** | Supplies don't have detailed stock tracking (unlike inventory) |

---

## 7. Cash Flow Statement Classification

These transactions affect the Cash Flow Statement differently:

| Transaction | Cash Flow Classification | Impact |
|-------------|-------------------------|--------|
| Fixed Asset Purchase | **Investing Activities** | Cash outflow |
| Prepaid Rent Payment | **Operating Activities** | Cash outflow |
| Prepaid Insurance Payment | **Operating Activities** | Cash outflow |
| Supplies Purchase | **Operating Activities** | Cash outflow |
| Depreciation Expense | **Operating Activities** | Add-back (non-cash) |
| Prepaid Allocation | Non-cash | No cash flow impact |

---

## 8. Reports by Location

### 8.1 Available Location Reports

With location tracking enabled on all capital and prepaid expenses:

| Report | Description |
|--------|-------------|
| **Fixed Asset Register by Location** | List of assets per warehouse/store |
| **Depreciation by Location** | Monthly depreciation expense per location |
| **Prepaid Expense by Location** | Prepaid balances and allocations per location |
| **Capital Expenditure by Location** | Asset purchases per location |

### 8.2 Fixed Asset Register by Location Example

```
                    FIXED ASSET REGISTER - Toko 1 Kelapa Gading
                    As of: January 31, 2025
────────────────────────────────────────────────────────────────────────────────
Asset No        │ Description         │ Cost        │ Accum Depr  │ Book Value
────────────────┼─────────────────────┼─────────────┼─────────────┼────────────
FA-POS-202401-01│ POS Terminal TSP650 │ Rp 8,500,000│ Rp 1,416,667│ Rp 7,083,333
FA-FURN-202401-03│ Display Rack Set   │ Rp 12,000,000│ Rp 1,000,000│ Rp 11,000,000
FA-COMP-202501-01│ Laptop Dell        │ Rp 15,000,000│ Rp   281,250│ Rp 14,718,750
────────────────┼─────────────────────┼─────────────┼─────────────┼────────────
TOTAL           │                     │ Rp 35,500,000│ Rp 2,697,917│ Rp 32,802,083
```

### 8.3 API Endpoints for Location Reports

```
# Fixed assets by location
GET /api/accounting/reports/assets/by-location
    ?asOf=2025-01-31

# Asset register for specific location
GET /api/accounting/reports/assets/location/:warehouseId
    ?asOf=2025-01-31

# Depreciation expense by location
GET /api/accounting/reports/depreciation/by-location
    ?from=2025-01-01&to=2025-01-31

# Prepaid expense by location
GET /api/accounting/reports/prepaid/by-location
    ?asOf=2025-01-31
```

---

## 9. Summary

### Transaction Types Covered

| Form | Debit Account | Use Case |
|------|---------------|----------|
| Fixed Asset Acquisition | 1400s (Fixed Assets) | Buying equipment, vehicles, furniture |
| Prepaid Expense | 1300s (Prepaid) | Rent, insurance paid in advance |
| Supplies Purchase (Asset) | 1350/1360 (Supplies) | Bulk supplies lasting months |

### Key Features

1. **Balance Sheet Impact**: These create assets, not immediate P&L impact
2. **Deferred Recognition**: Expense recognized over time (depreciation/allocation)
3. **Automated Entries**: System generates periodic adjustment entries
4. **Asset Tracking**: Fixed assets tracked in asset register
5. **Location Tracking**: All transactions tracked by warehouse/store for multi-location analysis

---

## 10. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Automatic Expense Journal Entry](./AUTOMATIC_EXPENSE_JOURNAL_ENTRY.md) - Direct operating expenses
- [Asset Accounting Architecture](./ASSET_ACCOUNTING_ARCHITECTURE.md) - Fixed asset domain model
- [Asset Accounting Business Rules](./ASSET_ACCOUNTING_BUSINESS_RULES.md) - Detailed asset rules
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
