# Automatic Expense Journal Entry

## Overview

This document describes the **Automatic Expense Journal Entry** feature that simplifies expense recording for end users. Instead of manually creating balanced double-entry journal entries, users simply:

1. Select an **expense account** (e.g., Office Supplies, Utilities, Transportation)
2. Enter the **expense amount**
3. Select the **payment method** (Cash, Bank, Petty Cash, or Accounts Payable)
4. **Select the cost center/location** (Warehouse, Store, Office)
5. Optionally add description and reference

The system automatically creates a balanced journal entry with:
- **DEBIT**: Selected expense account (with location segment)
- **CREDIT**: Payment account based on selected payment method

**Key Feature**: All expenses support **warehouse/store tracking** via GL segmentation for multi-location cost analysis and P&L by location reporting.

---

## 1. Warehouse/Store Tracking (GL Segmentation)

### Why Track Expenses by Location?

For multi-location businesses, tracking expenses by warehouse/store enables:

| Use Case | Benefit |
|----------|---------|
| **Cost Center Analysis** | Which location incurs the most expenses? |
| **P&L by Location** | Profitability per store/warehouse |
| **Budget vs Actual** | Track spending against location budgets |
| **Expense Allocation** | Fair distribution of shared expenses |
| **Performance Metrics** | Expense ratio per location |

### Location Types

```typescript
type LocationType =
  | 'WAREHOUSE'      // Gudang
  | 'STORE'          // Toko Retail
  | 'HEAD_OFFICE'    // Kantor Pusat
  | 'BRANCH_OFFICE'  // Kantor Cabang
  | 'RESTAURANT';    // Outlet Restoran
```

### Journal Line with Location Segment

All expense journal entries include the `warehouseId` field:

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

---

## 2. User Interface Design

### Expense Entry Form

```
┌──────────────────────────────────────────────────────────────────┐
│  📝 Record Expense (Catat Pengeluaran)                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Expense Account *                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search or select expense account...              ▼     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Categories: Operating Expenses (6xxx) | Administrative (7xxx)   │
│                                                                  │
│  Amount (IDR) *                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Rp                                            0            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📍 COST CENTER / LOCATION                                  │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  Location/Warehouse *                                      │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ 🔍 Select location...                            ▼  │  │  │
│  │  │ ○ Kantor Pusat (HQ)                                  │  │  │
│  │  │ ○ Gudang Utama - Cakung                              │  │  │
│  │  │ ○ Gudang Cabang - Bandung                            │  │  │
│  │  │ ○ Toko 1 - Kelapa Gading                             │  │  │
│  │  │ ○ Toko 2 - PIK                                       │  │  │
│  │  │ ○ Toko 3 - Pondok Indah                              │  │  │
│  │  │ ○ Restoran - Grand Indonesia                         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  [ ] Split across multiple locations                       │  │
│  │      (Allocate expense to multiple locations)              │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Payment Method *                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │   💵 Cash       │ │   🏦 Bank       │ │   💰 Petty Cash │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│  ┌─────────────────┐                                             │
│  │   📋 Hutang     │ (Pay Later - Accounts Payable)             │
│  └─────────────────┘                                             │
│                                                                  │
│  [If Bank selected]                                              │
│  Bank Account                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ BCA - Giro (1121)                                    ▼    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Date                          Reference                         │
│  ┌────────────────────────┐    ┌────────────────────────────┐   │
│  │ 2025-01-17         📅 │    │ INV-001234                 │   │
│  └────────────────────────┘    └────────────────────────────┘   │
│                                                                  │
│  Description                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Pembelian alat tulis kantor                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │       Cancel           │  │     💾 Save as Draft          │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                              ┌────────────────────────────────┐ │
│                              │     ✅ Save & Post             │ │
│                              └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Split Expense Across Multiple Locations

When "[x] Split across multiple locations" is selected:

```
┌────────────────────────────────────────────────────────────────────┐
│ [x] Split across multiple locations                                │
│                                                                    │
│ Location Allocation:                                               │
│ ┌────────────────────────────────────────────────────────────────┐│
│ │ Location                          │ Percentage │ Amount        ││
│ ├───────────────────────────────────┼────────────┼───────────────┤│
│ │ Gudang Utama - Cakung             │    50%     │ Rp 1,250,000  ││
│ │ Toko 1 - Kelapa Gading            │    30%     │ Rp   750,000  ││
│ │ Toko 2 - PIK                      │    20%     │ Rp   500,000  ││
│ ├───────────────────────────────────┼────────────┼───────────────┤│
│ │ TOTAL                             │   100%     │ Rp 2,500,000  ││
│ └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│ [+ Add Location]                                                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Payment Method Mapping

### Account Mapping Table

| Payment Method | Credit Account Code | Credit Account Name (ID) | Credit Account Name (EN) |
|----------------|---------------------|--------------------------|--------------------------|
| Cash | 1110 | Kas | Cash on Hand |
| Petty Cash | 1111 | Kas Kecil | Petty Cash |
| Bank - BCA Giro | 1121 | Bank BCA - Giro | Bank BCA - Current |
| Bank - BCA Tabungan | 1122 | Bank BCA - Tabungan | Bank BCA - Savings |
| Bank - Mandiri Giro | 1123 | Bank Mandiri - Giro | Bank Mandiri - Current |
| Bank - Mandiri Tabungan | 1124 | Bank Mandiri - Tabungan | Bank Mandiri - Savings |
| Bank - BRI | 1125 | Bank BRI | Bank BRI |
| Bank - CIMB Niaga | 1126 | Bank CIMB Niaga | Bank CIMB Niaga |
| Accounts Payable (Hutang) | 2110 | Hutang Usaha | Accounts Payable |

### Payment Method Selection Logic

```typescript
type PaymentMethod =
  | 'CASH'           // Kas (1110)
  | 'PETTY_CASH'     // Kas Kecil (1111)
  | 'BANK_BCA_GIRO'  // Bank BCA - Giro (1121)
  | 'BANK_BCA_TABUNGAN' // Bank BCA - Tabungan (1122)
  | 'BANK_MANDIRI_GIRO' // Bank Mandiri - Giro (1123)
  | 'BANK_MANDIRI_TABUNGAN' // Bank Mandiri - Tabungan (1124)
  | 'BANK_BRI'       // Bank BRI (1125)
  | 'BANK_CIMB'      // Bank CIMB Niaga (1126)
  | 'ACCOUNTS_PAYABLE'; // Hutang Usaha (2110) - Pay Later

/**
 * Get credit account for expense payment
 */
function getCreditAccountForExpense(paymentMethod: PaymentMethod): {
  accountId: string;
  accountCode: string;
  accountName: string;
} {
  const accountMap: Record<PaymentMethod, { accountId: string; accountCode: string; accountName: string }> = {
    'CASH': {
      accountId: 'acc-1110',
      accountCode: '1110',
      accountName: 'Kas'
    },
    'PETTY_CASH': {
      accountId: 'acc-1111',
      accountCode: '1111',
      accountName: 'Kas Kecil'
    },
    'BANK_BCA_GIRO': {
      accountId: 'acc-1121',
      accountCode: '1121',
      accountName: 'Bank BCA - Giro'
    },
    'BANK_BCA_TABUNGAN': {
      accountId: 'acc-1122',
      accountCode: '1122',
      accountName: 'Bank BCA - Tabungan'
    },
    'BANK_MANDIRI_GIRO': {
      accountId: 'acc-1123',
      accountCode: '1123',
      accountName: 'Bank Mandiri - Giro'
    },
    'BANK_MANDIRI_TABUNGAN': {
      accountId: 'acc-1124',
      accountCode: '1124',
      accountName: 'Bank Mandiri - Tabungan'
    },
    'BANK_BRI': {
      accountId: 'acc-1125',
      accountCode: '1125',
      accountName: 'Bank BRI'
    },
    'BANK_CIMB': {
      accountId: 'acc-1126',
      accountCode: '1126',
      accountName: 'Bank CIMB Niaga'
    },
    'ACCOUNTS_PAYABLE': {
      accountId: 'acc-2110',
      accountCode: '2110',
      accountName: 'Hutang Usaha'
    }
  };

  return accountMap[paymentMethod];
}
```

---

## 3. Expense Account Categories

### Available Expense Accounts (from Indonesian Trading COA)

Users can select from these expense categories:

#### Operating Expenses (6000-6999)

| Code | Account Name (ID) | Account Name (EN) |
|------|-------------------|-------------------|
| **6100** | **Beban Penjualan** | **Selling Expenses** |
| 6110 | Beban Gaji Sales | Sales Salaries |
| 6120 | Beban Komisi Penjualan | Sales Commissions |
| 6130 | Beban Iklan & Promosi | Advertising & Promotion |
| 6140 | Beban Pengiriman | Delivery/Shipping Expense |
| 6150 | Beban Perjalanan Dinas | Travel Expense |
| 6160 | Beban Entertaiment | Entertainment Expense |
| 6170 | Beban Kemasan | Packaging Expense |
| **6200** | **Beban Operasional Gudang** | **Warehouse Operating Expenses** |
| 6210 | Beban Gaji Gudang | Warehouse Salaries |
| 6220 | Beban Sewa Gudang | Warehouse Rent |
| 6230 | Beban Utilitas Gudang | Warehouse Utilities |
| 6240 | Beban Pemeliharaan Gudang | Warehouse Maintenance |
| 6250 | Beban Perlengkapan Gudang | Warehouse Supplies |
| **6300** | **Beban Delivery** | **Delivery Expenses** |
| 6310 | Beban BBM Kendaraan | Vehicle Fuel |
| 6320 | Beban Pemeliharaan Kendaraan | Vehicle Maintenance |
| 6330 | Beban Asuransi Kendaraan | Vehicle Insurance |
| 6340 | Beban Parkir & Tol | Parking & Toll |
| 6350 | Beban Sewa Kendaraan | Vehicle Rental |
| 6361 | Komisi GoFood | GoFood Commission |
| 6362 | Komisi GrabFood | GrabFood Commission |
| 6363 | Biaya Pengiriman Lalamove | Lalamove Delivery Fee |

#### Administrative & General Expenses (7000-7999)

| Code | Account Name (ID) | Account Name (EN) |
|------|-------------------|-------------------|
| **7100** | **Beban Gaji & Kesejahteraan** | **Salary & Benefits** |
| 7110 | Beban Gaji Karyawan | Employee Salaries |
| 7120 | Beban BPJS Kesehatan | BPJS Health Insurance |
| 7130 | Beban BPJS Ketenagakerjaan | BPJS Employment Insurance |
| 7140 | Beban THR & Bonus | THR & Bonus Expense |
| 7150 | Beban Lembur | Overtime Expense |
| **7200** | **Beban Kantor** | **Office Expenses** |
| 7210 | Beban Sewa Kantor | Office Rent |
| 7220 | Beban Listrik | Electricity Expense |
| 7230 | Beban Air | Water Expense |
| 7240 | Beban Telepon & Internet | Phone & Internet |
| 7250 | Beban Perlengkapan Kantor | Office Supplies |
| 7260 | Beban Pemeliharaan Kantor | Office Maintenance |
| **7300** | **Beban Penyusutan** | **Depreciation Expenses** |
| 7310 | Penyusutan Peralatan Kantor | Office Equipment Depreciation |
| 7320 | Penyusutan Kendaraan | Vehicle Depreciation |
| 7330 | Penyusutan Peralatan Toko | Store Equipment Depreciation |
| **7400** | **Beban Umum Lainnya** | **Other General Expenses** |
| 7410 | Beban Asuransi Umum | General Insurance |
| 7420 | Beban Legal & Perizinan | Legal & Licensing |
| 7430 | Beban Jasa Profesional | Professional Services |
| 7440 | Beban Bank | Bank Charges |
| 7450 | Beban Administrasi Lainnya | Other Admin Expenses |

#### Tax Expenses (8000-8999)

| Code | Account Name (ID) | Account Name (EN) |
|------|-------------------|-------------------|
| **8100** | **Beban Pajak** | **Tax Expenses** |
| 8110 | Beban PPh 21 | Employee Income Tax (PPh 21) |
| 8120 | Beban PPh 23 | Service Withholding Tax (PPh 23) |
| 8130 | Beban PPh 25/29 | Corporate Income Tax (PPh 25/29) |
| 8140 | Beban Pajak Final UMKM | MSME Final Tax (0.5%) |
| 8150 | Beban PBB | Property Tax (PBB) |

---

## 4. Journal Entry Generation

### Example: Office Supplies Purchase (Cash) - Single Location

**User Input:**
- Expense Account: `6510 - Beban ATK`
- Amount: `Rp 500,000`
- **Location: `Kantor Pusat (HQ)`**
- Payment Method: `CASH`
- Description: `Pembelian ATK untuk bulan Januari`
- Reference: `NOTA-001`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0001",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted", // or "Draft" if user selects Save as Draft
  description: "Pembelian ATK untuk bulan Januari",
  reference: "NOTA-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-6510",
      accountCode: "6510",
      accountName: "Beban ATK",
      direction: "Debit",
      amount: 500000,
      memo: "Office Supplies - Pembelian ATK untuk bulan Januari",
      warehouseId: "wh-hq-001"  // 👈 Location tracking
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Kas",
      direction: "Credit",
      amount: 500000,
      memo: "Payment - Cash"
    }
  ]
}
```

### Example: Utility Bill (Bank Transfer) - Single Location

**User Input:**
- Expense Account: `6120 - Beban Listrik`
- Amount: `Rp 2,500,000`
- **Location: `Toko 1 - Kelapa Gading`**
- Payment Method: `BANK_BCA_GIRO`
- Description: `Pembayaran listrik Desember 2024`
- Reference: `PLN-DEC-2024`

**Generated Journal Entry:**

```typescript
{
  entryNumber: "JE-2025-0002",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran listrik Desember 2024 - Toko 1 Kelapa Gading",
  reference: "PLN-DEC-2024",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-6120",
      accountCode: "6120",
      accountName: "Beban Listrik",
      direction: "Debit",
      amount: 2500000,
      memo: "Electricity - Pembayaran listrik Desember 2024",
      warehouseId: "store-kg-001"  // 👈 Location tracking
    },
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 2500000,
      memo: "Payment - Bank Transfer"
    }
  ]
}
```

### Example: Internet Expense - Split Across Multiple Locations

**User Input:**
- Expense Account: `6150 - Beban Internet`
- Amount: `Rp 3,000,000`
- **Split Locations:**
  - Kantor Pusat: 40% = Rp 1,200,000
  - Gudang Utama: 30% = Rp 900,000
  - Toko 1: 30% = Rp 900,000
- Payment Method: `BANK_BCA_GIRO`
- Description: `Pembayaran internet bulanan - Januari 2025`

**Generated Journal Entry (Multiple Debit Lines by Location):**

```typescript
{
  entryNumber: "JE-2025-0003",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran internet bulanan - Januari 2025",
  sourceService: "manual",
  lines: [
    // Debit lines split by location
    {
      accountId: "acc-6150",
      accountCode: "6150",
      accountName: "Beban Internet",
      direction: "Debit",
      amount: 1200000,
      memo: "Internet - Kantor Pusat (40%)",
      warehouseId: "wh-hq-001"  // 👈 Head Office
    },
    {
      accountId: "acc-6150",
      accountCode: "6150",
      accountName: "Beban Internet",
      direction: "Debit",
      amount: 900000,
      memo: "Internet - Gudang Utama (30%)",
      warehouseId: "wh-cakung-001"  // 👈 Main Warehouse
    },
    {
      accountId: "acc-6150",
      accountCode: "6150",
      accountName: "Beban Internet",
      direction: "Debit",
      amount: 900000,
      memo: "Internet - Toko 1 (30%)",
      warehouseId: "store-kg-001"  // 👈 Store 1
    },
    // Single credit for total payment
    {
      accountId: "acc-1020",
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Credit",
      amount: 3000000,
      memo: "Payment - Bank Transfer"
    }
  ]
}
```

### Example: Supplier Payment (Accounts Payable - Pay Later)

**User Input:**
- Expense Account: `6250 - Beban Perlengkapan Gudang`
- Amount: `Rp 1,000,000`
- Payment Method: `ACCOUNTS_PAYABLE`
- Description: `Pembelian perlengkapan gudang - Nota Supplier ABC`
- Reference: `SUP-ABC-001`

**Generated Journal Entry (At Time of Purchase):**

```typescript
{
  entryNumber: "JE-2025-0003",
  entryDate: "2025-01-17",
  entryType: "Manual",
  status: "Posted",
  description: "Pembelian perlengkapan gudang - Nota Supplier ABC",
  reference: "SUP-ABC-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-6250",
      accountCode: "6250",
      accountName: "Beban Perlengkapan Gudang",
      direction: "Debit",
      amount: 1000000,
      memo: "Warehouse Supplies - Pembelian perlengkapan gudang"
    },
    {
      accountId: "acc-2110",
      accountCode: "2110",
      accountName: "Hutang Usaha",
      direction: "Credit",
      amount: 1000000,
      memo: "Accounts Payable - Pay Later",
      vendorId: "vendor-abc" // Track vendor for A/P aging
    }
  ]
}
```

**When Payment is Made (Separate Entry):**

```typescript
{
  entryNumber: "JE-2025-0010",
  entryDate: "2025-02-01", // Payment date
  entryType: "Manual",
  status: "Posted",
  description: "Pembayaran hutang ke Supplier ABC",
  reference: "PAY-SUP-ABC-001",
  sourceService: "manual",
  lines: [
    {
      accountId: "acc-2110",
      accountCode: "2110",
      accountName: "Hutang Usaha",
      direction: "Debit",
      amount: 1000000,
      memo: "A/P Payment - Supplier ABC",
      vendorId: "vendor-abc"
    },
    {
      accountId: "acc-1110",
      accountCode: "1110",
      accountName: "Kas",
      direction: "Credit",
      amount: 1000000,
      memo: "Payment - Cash"
    }
  ]
}
```

---

## 5. API Design

### Create Expense Entry Endpoint

```
POST /api/accounting/expenses
```

### Request Schema

```typescript
interface CreateExpenseRequest {
  // Required fields
  expenseAccountId: string;  // Account ID from COA (e.g., "acc-6510")
  amount: number;            // Positive number in IDR
  paymentMethod: PaymentMethod;

  // Location / Cost Center (Required for expense tracking)
  warehouseId?: string;      // Single location
  locationAllocations?: LocationAllocation[];  // Multiple locations (if split)

  // Optional fields
  entryDate?: string;        // ISO date, defaults to today
  description?: string;      // Expense description
  reference?: string;        // External reference (invoice #, receipt #)
  vendorId?: string;         // For A/P tracking
  saveAsDraft?: boolean;     // If true, save as Draft; otherwise Post immediately
}

// For splitting expense across multiple locations
interface LocationAllocation {
  warehouseId: string;
  percentage: number;        // 0-100, must sum to 100
  amount?: number;           // Auto-calculated if percentage provided
}

type PaymentMethod =
  | 'CASH'
  | 'PETTY_CASH'
  | 'BANK_BCA_GIRO'
  | 'BANK_BCA_TABUNGAN'
  | 'BANK_MANDIRI_GIRO'
  | 'BANK_MANDIRI_TABUNGAN'
  | 'BANK_BRI'
  | 'BANK_CIMB'
  | 'ACCOUNTS_PAYABLE';
```

### Response Schema

```typescript
interface CreateExpenseResponse {
  success: boolean;
  data: {
    journalEntryId: string;
    entryNumber: string;
    status: 'Draft' | 'Posted';
    lines: {
      accountCode: string;
      accountName: string;
      direction: 'Debit' | 'Credit';
      amount: number;
    }[];
  };
}
```

### Example API Call

```bash
curl -X POST /api/accounting/expenses \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "expenseAccountId": "acc-7250",
    "amount": 500000,
    "paymentMethod": "CASH",
    "description": "Pembelian ATK untuk bulan Januari",
    "reference": "NOTA-001",
    "saveAsDraft": false
  }'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "journalEntryId": "je-2025-0001",
    "entryNumber": "JE-2025-0001",
    "status": "Posted",
    "lines": [
      {
        "accountCode": "7250",
        "accountName": "Beban Perlengkapan Kantor",
        "direction": "Debit",
        "amount": 500000
      },
      {
        "accountCode": "1110",
        "accountName": "Kas",
        "direction": "Credit",
        "amount": 500000
      }
    ]
  }
}
```

---

## 6. Validation Rules

### Business Rules

1. **Expense Account Validation**
   - Account must exist in Chart of Accounts
   - Account type must be `Expense` (codes 6000-8999)
   - Account must be active (`status = 'Active'`)
   - Account must be a detail account (`isDetailAccount = true`)

2. **Amount Validation**
   - Amount must be greater than 0
   - Amount cannot exceed configured maximum (optional: Rp 1,000,000,000)

3. **Payment Method Validation**
   - Payment method must be valid enum value
   - Credit account for payment method must exist and be active

4. **Date Validation**
   - Entry date cannot be in the future
   - Entry date cannot be in a closed fiscal period

5. **Reference Uniqueness**
   - Reference should be unique within the same day (optional: warn if duplicate)

### Error Responses

```typescript
// Invalid expense account
{
  "success": false,
  "error": {
    "code": "INVALID_EXPENSE_ACCOUNT",
    "message": "Account acc-1110 is not an expense account. Please select an account from expense categories (6000-8999)."
  }
}

// Amount validation
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Amount must be greater than 0."
  }
}

// Closed period
{
  "success": false,
  "error": {
    "code": "PERIOD_CLOSED",
    "message": "Cannot create entries in closed fiscal period December 2024."
  }
}
```

---

## 7. Use Case Implementation

### CreateExpenseEntry Use Case

```typescript
interface CreateExpenseEntryInput {
  expenseAccountId: string;
  amount: number;
  paymentMethod: PaymentMethod;

  // Location / Cost Center
  warehouseId?: string;
  locationAllocations?: LocationAllocation[];

  entryDate?: Date;
  description?: string;
  reference?: string;
  vendorId?: string;
  saveAsDraft?: boolean;
  createdBy: string;
}

interface LocationAllocation {
  warehouseId: string;
  percentage: number;
  amount?: number;
}

interface CreateExpenseEntryOutput {
  journalEntryId: string;
  entryNumber: string;
  status: 'Draft' | 'Posted';
  lines: JournalLineDTO[];
}

class CreateExpenseEntry {
  constructor(
    private accountRepository: IAccountRepository,
    private journalEntryRepository: IJournalEntryRepository,
    private entryNumberGenerator: IEntryNumberGenerator
  ) {}

  async execute(input: CreateExpenseEntryInput): Promise<CreateExpenseEntryOutput> {
    // 1. Validate expense account
    const expenseAccount = await this.accountRepository.findById(input.expenseAccountId);
    if (!expenseAccount) {
      throw new Error('Expense account not found');
    }
    if (expenseAccount.accountType !== 'Expense') {
      throw new Error('Selected account is not an expense account');
    }
    if (expenseAccount.status !== 'Active') {
      throw new Error('Expense account is not active');
    }
    if (!expenseAccount.isDetailAccount) {
      throw new Error('Cannot post to summary account');
    }

    // 2. Get credit account based on payment method
    const creditAccount = this.getCreditAccountForPaymentMethod(input.paymentMethod);
    const creditAccountEntity = await this.accountRepository.findByCode(creditAccount.accountCode);
    if (!creditAccountEntity || creditAccountEntity.status !== 'Active') {
      throw new Error('Payment account is not available');
    }

    // 3. Validate amount
    if (input.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // 4. Generate entry number
    const entryNumber = await this.entryNumberGenerator.generate();

    // 5. Create journal entry
    const journalEntry = JournalEntry.create({
      entryNumber,
      entryDate: input.entryDate || new Date(),
      description: input.description || `Expense - ${expenseAccount.name}`,
      reference: input.reference,
      entryType: 'Manual',
      status: input.saveAsDraft ? 'Draft' : 'Posted',
      sourceService: 'manual',
      createdBy: input.createdBy,
      lines: [
        // Debit: Expense account
        {
          accountId: input.expenseAccountId,
          direction: 'Debit',
          amount: input.amount,
          memo: `${expenseAccount.name} - ${input.description || ''}`
        },
        // Credit: Payment account (Cash/Bank/A/P)
        {
          accountId: creditAccountEntity.id,
          direction: 'Credit',
          amount: input.amount,
          memo: `Payment - ${creditAccount.accountName}`,
          vendorId: input.paymentMethod === 'ACCOUNTS_PAYABLE' ? input.vendorId : undefined
        }
      ]
    });

    // 6. Save journal entry
    await this.journalEntryRepository.save(journalEntry);

    // 7. Return result
    return {
      journalEntryId: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      status: journalEntry.status,
      lines: journalEntry.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        direction: line.direction,
        amount: line.amount
      }))
    };
  }

  private getCreditAccountForPaymentMethod(paymentMethod: PaymentMethod) {
    const accountMap = {
      'CASH': { accountCode: '1110', accountName: 'Kas' },
      'PETTY_CASH': { accountCode: '1111', accountName: 'Kas Kecil' },
      'BANK_BCA_GIRO': { accountCode: '1121', accountName: 'Bank BCA - Giro' },
      'BANK_BCA_TABUNGAN': { accountCode: '1122', accountName: 'Bank BCA - Tabungan' },
      'BANK_MANDIRI_GIRO': { accountCode: '1123', accountName: 'Bank Mandiri - Giro' },
      'BANK_MANDIRI_TABUNGAN': { accountCode: '1124', accountName: 'Bank Mandiri - Tabungan' },
      'BANK_BRI': { accountCode: '1125', accountName: 'Bank BRI' },
      'BANK_CIMB': { accountCode: '1126', accountName: 'Bank CIMB Niaga' },
      'ACCOUNTS_PAYABLE': { accountCode: '2110', accountName: 'Hutang Usaha' }
    };
    return accountMap[paymentMethod];
  }
}
```

---

## 8. Additional Features

### A. Recurring Expenses

For regular monthly expenses (rent, utilities, subscriptions):

```typescript
interface RecurringExpenseConfig {
  expenseAccountId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  frequency: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY';
  startDate: Date;
  endDate?: Date;
  dayOfMonth?: number; // For monthly (1-28)
}
```

### B. Expense Attachments

Allow users to attach receipts/invoices:

```typescript
interface ExpenseAttachment {
  id: string;
  journalEntryId: string;
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf';
  fileUrl: string; // R2 storage URL
  uploadedAt: Date;
  uploadedBy: string;
}
```

### C. Expense Approval Workflow (Optional)

For larger expenses requiring approval:

```typescript
interface ExpenseApproval {
  id: string;
  journalEntryId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalThreshold: number; // e.g., Rp 5,000,000
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}
```

---

## 9. Expense Reports by Location

### 9.1 Available Reports

With location tracking enabled, the following reports can be generated:

| Report | Description | Filters |
|--------|-------------|---------|
| **Expense by Location** | Total expenses per warehouse/store | Date range, Expense category |
| **P&L by Location** | Income Statement per location | Date range |
| **Budget vs Actual** | Compare budgeted vs actual expenses | Period, Location |
| **Expense Trend** | Monthly expense trend per location | Date range, Location |
| **Top Expenses by Location** | Ranked expense categories per location | Date range |

### 9.2 Expense by Location Report Example

```
                    EXPENSE BY LOCATION REPORT
                    Period: January 2025
────────────────────────────────────────────────────────────────────────
Location                    │ Expenses      │ % of Total
────────────────────────────┼───────────────┼────────────
Kantor Pusat (HQ)           │ Rp 25,500,000 │    34.0%
Gudang Utama - Cakung       │ Rp 18,750,000 │    25.0%
Toko 1 - Kelapa Gading      │ Rp 15,000,000 │    20.0%
Toko 2 - PIK                │ Rp  9,000,000 │    12.0%
Toko 3 - Pondok Indah       │ Rp  6,750,000 │     9.0%
────────────────────────────┼───────────────┼────────────
TOTAL                       │ Rp 75,000,000 │   100.0%
```

### 9.3 Expense Detail by Location Report

```
                    EXPENSE DETAIL - Toko 1 Kelapa Gading
                    Period: January 2025
────────────────────────────────────────────────────────────────────────
Account                     │ Amount        │ % of Location Total
────────────────────────────┼───────────────┼────────────
6111 Beban Sewa Toko        │ Rp  5,000,000 │    33.3%
6120 Beban Listrik          │ Rp  2,500,000 │    16.7%
6013 Gaji - Staff Toko      │ Rp  4,500,000 │    30.0%
6520 Beban Perlengkapan Toko│ Rp  1,500,000 │    10.0%
6150 Beban Internet         │ Rp    900,000 │     6.0%
6640 Beban Keamanan         │ Rp    600,000 │     4.0%
────────────────────────────┼───────────────┼────────────
TOTAL                       │ Rp 15,000,000 │   100.0%
```

### 9.4 API Endpoints for Location Reports

```
# Expense summary by location
GET /api/accounting/reports/expenses/by-location
    ?from=2025-01-01&to=2025-01-31

# Expense detail for specific location
GET /api/accounting/reports/expenses/location/:warehouseId
    ?from=2025-01-01&to=2025-01-31

# P&L by location
GET /api/accounting/reports/income-statement/by-location
    ?from=2025-01-01&to=2025-01-31

# Budget vs Actual by location
GET /api/accounting/reports/budget-variance/by-location
    ?period=2025-01
```

---

## 10. Summary

### Key Points

1. **Simplified User Experience**
   - User only selects expense account, enters amount, and chooses payment method
   - System automatically creates balanced double-entry journal

2. **Location Tracking (GL Segmentation)**
   - Every expense tracked by warehouse/store/office
   - Support for splitting expenses across multiple locations
   - Enables P&L by location and cost center analysis

3. **Payment Method Options**
   - Cash (1010-1014)
   - Petty Cash (1010/1011)
   - Bank accounts (1020-1024)
   - Accounts Payable (2010) - for pay later

4. **Validation**
   - Expense account must be valid and active
   - Amount must be positive
   - Date cannot be in closed period
   - Location allocation must sum to 100%

5. **Draft vs Posted**
   - Users can save as draft for review
   - Or post immediately for finalization

6. **Audit Trail**
   - All entries tracked with createdBy, createdAt
   - Reference field for external document linking
   - VendorId for A/P tracking
   - warehouseId for location tracking

---

## 11. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Capital & Prepaid Expense Entry](./CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md) - Fixed assets, prepaid expenses
- [Payment Method and Journal Entry Logic](./PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md) - Sales journal entries
- [Accounting Service Architecture](./ACCOUNTING_SERVICE_ARCHITECTURE.md) - Service design
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
