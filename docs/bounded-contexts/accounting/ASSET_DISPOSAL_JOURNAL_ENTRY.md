# Asset Disposal Journal Entry

## Overview

This document describes the **Asset Disposal Workflow** that automates journal entry creation when fixed assets are sold, scrapped, or disposed. This enhancement to the existing Asset Accounting Module ensures proper gain/loss recognition and asset removal from the books.

**Key Features:**
- Asset sale with gain/loss calculation
- Asset scrapping (write-off)
- Partial disposal (selling portion of asset)
- Automatic accumulated depreciation removal
- Cash/A/R recording for sale proceeds

---

## 1. Accounts Covered

### Asset Accounts (Removed on Disposal)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 1410 | Tanah | Land | Land disposal |
| 1420 | Bangunan | Buildings | Building disposal |
| 1430 | Kendaraan | Vehicles | Vehicle disposal |
| 1440 | Peralatan Kantor | Office Equipment | Equipment disposal |
| 1450 | Peralatan Toko | Store Equipment | Store equipment disposal |
| 1460 | Peralatan Gudang | Warehouse Equipment | Warehouse equipment disposal |
| 1470 | Peralatan Komputer & IT | Computer & IT Equipment | IT disposal |
| 1480 | Peralatan POS | POS Equipment | POS disposal |
| 1490 | Meubel & Perabotan | Furniture & Fixtures | Furniture disposal |

### Contra Asset Accounts (Removed on Disposal)

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 1421 | Akumulasi Penyusutan Bangunan | Accumulated Depreciation - Buildings | Building disposal |
| 1431 | Akumulasi Penyusutan Kendaraan | Accumulated Depreciation - Vehicles | Vehicle disposal |
| 1441 | Akumulasi Penyusutan Peralatan Kantor | Accumulated Depreciation - Office Equip | Equipment disposal |
| 1451 | Akumulasi Penyusutan Peralatan Toko | Accumulated Depreciation - Store Equip | Store equip disposal |
| 1461 | Akumulasi Penyusutan Peralatan Gudang | Accumulated Depreciation - Warehouse Equip | Warehouse disposal |
| 1471 | Akumulasi Penyusutan Peralatan Komputer | Accumulated Depreciation - Computer | IT disposal |
| 1481 | Akumulasi Penyusutan Peralatan POS | Accumulated Depreciation - POS | POS disposal |
| 1491 | Akumulasi Penyusutan Meubel | Accumulated Depreciation - Furniture | Furniture disposal |

### Gain/Loss Accounts

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 7040 | Pendapatan Penjualan Aset Tetap | Gain on Fixed Asset Sale | Sale price > Book value |
| 7140 | Rugi Penjualan Aset Tetap | Loss on Fixed Asset Sale | Sale price < Book value |

### Cash/Receivable Accounts

| Code | Indonesian Name | English Name | When Used |
|------|-----------------|--------------|-----------|
| 1010-1014 | Kas | Cash | Cash sale |
| 1020-1024 | Bank | Bank | Bank transfer |
| 1140 | Piutang Lain-lain | Other Receivables | Credit sale |

---

## 2. Disposal Types

### Sale of Asset

Asset sold to third party for cash or credit.

**Calculation:**
```
Book Value = Original Cost - Accumulated Depreciation
Gain/Loss = Sale Price - Book Value

If Sale Price > Book Value → Gain (Credit 7040)
If Sale Price < Book Value → Loss (Debit 7140)
```

### Scrapping (Write-Off)

Asset has no value and is disposed without sale proceeds.

**Calculation:**
```
Book Value = Original Cost - Accumulated Depreciation
Loss = Book Value (full write-off to 7140)
```

### Trade-In

Asset exchanged for new asset with trade-in value.

**Calculation:**
```
Book Value = Original Cost - Accumulated Depreciation
Trade-In Value = Amount credited toward new asset
Gain/Loss = Trade-In Value - Book Value
```

---

## 3. User Interface Design

### Asset Disposal Form

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🗑️ Asset Disposal (Pelepasan Aset Tetap)                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Asset to Dispose *                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Search asset by name or asset number...                          ▼  │  │
│  │ ○ FA-VEH-202401-001 - Toyota Avanza - Delivery Vehicle               │  │
│  │ ○ FA-POS-202305-003 - Cash Register - POS Equipment                  │  │
│  │ ○ FA-IT-202312-002 - MacBook Pro - IT Equipment                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ ASSET DETAILS                                                            ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Asset Number:         FA-VEH-202401-001                                 ││
│  │  Asset Name:           Toyota Avanza - Delivery Vehicle                  ││
│  │  Category:             Kendaraan (Vehicles)                              ││
│  │  Location:             Gudang Utama - Cakung                             ││
│  │  Acquisition Date:     2024-01-15                                        ││
│  │                                                                          ││
│  │  ┌────────────────────────────────────────────────────────────────────┐  ││
│  │  │ BOOK VALUE CALCULATION                                             │  ││
│  │  ├────────────────────────────────────────────────────────────────────┤  ││
│  │  │                                                                    │  ││
│  │  │  Original Cost:                        Rp   250,000,000           │  ││
│  │  │  Accumulated Depreciation:             Rp   (83,333,333)          │  ││
│  │  │  ────────────────────────────────────────────────────             │  ││
│  │  │  Book Value (Nilai Buku):              Rp   166,666,667           │  ││
│  │  │                                                                    │  ││
│  │  │  Depreciation Method:    Straight-line                            │  ││
│  │  │  Useful Life:            60 months                                │  ││
│  │  │  Months Depreciated:     24 months                                │  ││
│  │  │                                                                    │  ││
│  │  └────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Disposal Type *                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │  💰 Sale        │ │  🗑️ Scrap       │ │  🔄 Trade-In    │                │
│  │  (Penjualan)    │ │  (Hapus Buku)   │ │  (Tukar Tambah) │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                              │
│  [If Sale or Trade-In]                                                       │
│  Sale Price / Trade-In Value *                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Rp                                               180,000,000           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ GAIN/LOSS CALCULATION                                                    ││
│  ├──────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Sale Price:                              Rp   180,000,000              ││
│  │  Book Value:                              Rp   166,666,667              ││
│  │  ────────────────────────────────────────────────────                   ││
│  │  💹 GAIN on Disposal:                     Rp    13,333,333              ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [If Sale]                                                                   │
│  Payment Received *                                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│  │  💵 Cash        │ │  🏦 Bank        │ │  📋 Receivable  │                │
│  │  (Tunai)        │ │  (Transfer)     │ │  (Piutang)      │                │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                              │
│  [If Bank selected]                                                          │
│  Bank Account                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Bank BCA - Operasional (1020)                                       ▼  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Disposal Date *              Disposal Reason                                │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐   │
│  │ 2026-01-15          📅  │  │ Dijual karena sudah tidak efisien       │   │
│  └─────────────────────────┘  └─────────────────────────────────────────┘   │
│                                                                              │
│  Buyer Information (Optional)                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ PT Maju Mundur - Kwitansi No. KW-2026-001                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────┐  ┌────────────────────────────────┐             │
│  │       Cancel           │  │     ✅ Process Disposal        │             │
│  └────────────────────────┘  └────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Journal Entry Patterns

### 4.1 Asset Sale with Gain

**Scenario**: Vehicle sold for Rp 180M, Book Value Rp 166.67M

**Journal Entry:**

```typescript
{
  entryNumber: "DISP-2026-01-001",
  entryDate: "2026-01-15",
  entryType: "AssetDisposal",
  description: "Asset Sale - Toyota Avanza FA-VEH-202401-001",
  reference: "SALE-ASSET-001",
  sourceService: "asset",
  lines: [
    // DEBIT: Cash/Bank received
    {
      accountCode: "1020",
      accountName: "Bank BCA - Operasional",
      direction: "Debit",
      amount: 180000000,
      memo: "Sale proceeds - Toyota Avanza"
    },
    // DEBIT: Remove accumulated depreciation
    {
      accountCode: "1431",
      accountName: "Akumulasi Penyusutan Kendaraan",
      direction: "Debit",
      amount: 83333333,
      memo: "Remove accumulated depreciation"
    },
    // CREDIT: Remove asset at cost
    {
      accountCode: "1430",
      accountName: "Kendaraan",
      direction: "Credit",
      amount: 250000000,
      memo: "Remove asset - Toyota Avanza"
    },
    // CREDIT: Recognize gain
    {
      accountCode: "7040",
      accountName: "Pendapatan Penjualan Aset Tetap",
      direction: "Credit",
      amount: 13333333,
      memo: "Gain on disposal (Sale Rp 180M - Book Value Rp 166.67M)"
    }
  ]
}
```

### 4.2 Asset Sale with Loss

**Scenario**: POS Equipment sold for Rp 2M, Book Value Rp 3.5M

**Journal Entry:**

```typescript
{
  entryNumber: "DISP-2026-01-002",
  entryDate: "2026-01-20",
  entryType: "AssetDisposal",
  description: "Asset Sale - Cash Register FA-POS-202305-003",
  reference: "SALE-ASSET-002",
  sourceService: "asset",
  lines: [
    // DEBIT: Cash/Bank received
    {
      accountCode: "1010",
      accountName: "Kas Kecil - Kantor Pusat",
      direction: "Debit",
      amount: 2000000,
      memo: "Sale proceeds - Cash Register"
    },
    // DEBIT: Remove accumulated depreciation
    {
      accountCode: "1481",
      accountName: "Akumulasi Penyusutan Peralatan POS",
      direction: "Debit",
      amount: 4500000,
      memo: "Remove accumulated depreciation"
    },
    // DEBIT: Recognize loss
    {
      accountCode: "7140",
      accountName: "Rugi Penjualan Aset Tetap",
      direction: "Debit",
      amount: 1500000,
      memo: "Loss on disposal (Sale Rp 2M - Book Value Rp 3.5M)"
    },
    // CREDIT: Remove asset at cost
    {
      accountCode: "1480",
      accountName: "Peralatan POS",
      direction: "Credit",
      amount: 8000000,
      memo: "Remove asset - Cash Register"
    }
  ]
}
```

### 4.3 Asset Scrap (Write-Off)

**Scenario**: Damaged computer scrapped, Book Value Rp 5M

**Journal Entry:**

```typescript
{
  entryNumber: "DISP-2026-01-003",
  entryDate: "2026-01-25",
  entryType: "AssetWriteOff",
  description: "Asset Scrap - MacBook Pro FA-IT-202312-002",
  reference: "SCRAP-001",
  sourceService: "asset",
  lines: [
    // DEBIT: Remove accumulated depreciation
    {
      accountCode: "1471",
      accountName: "Akumulasi Penyusutan Peralatan Komputer",
      direction: "Debit",
      amount: 10000000,
      memo: "Remove accumulated depreciation"
    },
    // DEBIT: Recognize full loss
    {
      accountCode: "7140",
      accountName: "Rugi Penjualan Aset Tetap",
      direction: "Debit",
      amount: 5000000,
      memo: "Write-off loss - damaged beyond repair"
    },
    // CREDIT: Remove asset at cost
    {
      accountCode: "1470",
      accountName: "Peralatan Komputer & IT",
      direction: "Credit",
      amount: 15000000,
      memo: "Remove asset - MacBook Pro"
    }
  ]
}
```

### 4.4 Asset Sale on Credit

**Scenario**: Furniture sold on credit for Rp 10M

**Journal Entry:**

```typescript
{
  entryNumber: "DISP-2026-01-004",
  entryDate: "2026-01-30",
  entryType: "AssetDisposal",
  description: "Asset Sale (Credit) - Office Desk FA-FUR-202201-005",
  reference: "SALE-ASSET-003",
  sourceService: "asset",
  lines: [
    // DEBIT: Other Receivables
    {
      accountCode: "1140",
      accountName: "Piutang Lain-lain",
      direction: "Debit",
      amount: 10000000,
      memo: "Receivable - Asset sale to PT ABC"
    },
    // DEBIT: Remove accumulated depreciation
    {
      accountCode: "1491",
      accountName: "Akumulasi Penyusutan Meubel",
      direction: "Debit",
      amount: 7500000,
      memo: "Remove accumulated depreciation"
    },
    // CREDIT: Remove asset at cost
    {
      accountCode: "1490",
      accountName: "Meubel & Perabotan",
      direction: "Credit",
      amount: 15000000,
      memo: "Remove asset - Office Desk"
    },
    // CREDIT: Recognize gain
    {
      accountCode: "7040",
      accountName: "Pendapatan Penjualan Aset Tetap",
      direction: "Credit",
      amount: 2500000,
      memo: "Gain on disposal"
    }
  ]
}
```

---

## 5. API Design

### 5.1 Process Asset Disposal

```
POST /api/accounting/assets/:assetId/dispose
```

**Request Schema:**

```typescript
interface AssetDisposalRequest {
  disposalType: 'SALE' | 'SCRAP' | 'TRADE_IN';
  disposalDate: string;

  // For SALE or TRADE_IN
  salePrice?: number;

  // Payment method for SALE
  paymentMethod?: 'CASH' | 'BANK' | 'RECEIVABLE';
  paymentAccountId?: string;

  // For RECEIVABLE
  buyerName?: string;

  // For TRADE_IN
  newAssetId?: string;

  disposalReason?: string;
  reference?: string;
}
```

**Response Schema:**

```typescript
interface AssetDisposalResponse {
  success: boolean;
  data: {
    disposalId: string;
    assetId: string;
    assetNumber: string;
    disposalType: string;
    originalCost: number;
    accumulatedDepreciation: number;
    bookValue: number;
    salePrice: number;
    gainOrLoss: number;
    journalEntryId: string;
    entryNumber: string;
  };
}
```

### 5.2 Get Asset Disposal Preview

```
GET /api/accounting/assets/:assetId/disposal-preview?salePrice=180000000
```

**Response:**

```typescript
interface DisposalPreviewResponse {
  asset: {
    id: string;
    assetNumber: string;
    name: string;
    category: string;
    originalCost: number;
    accumulatedDepreciation: number;
    bookValue: number;
  };
  preview: {
    salePrice: number;
    gainOrLoss: number;
    isGain: boolean;
    journalPreview: {
      debits: { account: string; amount: number }[];
      credits: { account: string; amount: number }[];
    };
  };
}
```

---

## 6. Business Rules

### Rule 1: Depreciation Update Before Disposal
- Run depreciation up to disposal date before recording disposal
- Ensure accumulated depreciation is current

### Rule 2: Disposal Date Validation
- Disposal date cannot be before acquisition date
- Disposal date cannot be in a closed period
- Disposal date cannot be in the future

### Rule 3: Gain/Loss Recognition
- Gain recognized as Other Income (7040)
- Loss recognized as Other Expense (7140)
- Gain/Loss = Sale Price - Book Value

### Rule 4: Fully Depreciated Assets
- Can still be sold (gain = full sale price)
- Scrapping results in zero gain/loss
- Book value is zero (Cost = Accumulated Depreciation)

### Rule 5: Land Disposal
- Land has no depreciation
- Gain/Loss = Sale Price - Original Cost

### Rule 6: Audit Trail
- Asset status changed to "DISPOSED"
- Disposal record linked to journal entry
- Cannot reverse disposal (create new asset if needed)

---

## 7. Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ASSET DISPOSAL WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SELECT ASSET                                                            │
│     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│     │ Search Asset    │ → │ Verify Asset    │ → │ Calculate       │      │
│     │ by Name/Number  │    │ Details         │    │ Book Value      │      │
│     └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                                                             │
│  2. ENTER DISPOSAL DETAILS                                                  │
│     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│     │ Select Type     │ → │ Enter Sale      │ → │ Calculate       │      │
│     │ (Sale/Scrap)    │    │ Price           │    │ Gain/Loss       │      │
│     └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                                                             │
│  3. PROCESS DISPOSAL                                                        │
│     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
│     │ Update          │ → │ Create          │ → │ Mark Asset      │      │
│     │ Depreciation    │    │ Journal Entry   │    │ as DISPOSED     │      │
│     └─────────────────┘    └─────────────────┘    └─────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Related Documentation

- [Indonesian Trading COA](./INDONESIAN_TRADING_COA.md) - Complete chart of accounts
- [Asset Accounting Architecture](./ASSET_ACCOUNTING_ARCHITECTURE.md) - Asset module design
- [Asset Accounting Business Rules](./ASSET_ACCOUNTING_BUSINESS_RULES.md) - Asset rules
- [Capital & Prepaid Expense Entry](./CAPITAL_AND_PREPAID_EXPENSE_ENTRY.md) - Asset acquisition
- [Business Rules](./BUSINESS_RULES.md) - Accounting business rules
- [Gap Analysis](./AUTOMATED_JOURNAL_ENTRY_GAP_ANALYSIS.md) - Coverage analysis

---

**Document Version**: 1.0
**Created**: January 2026
**Maintained By**: Development Team
